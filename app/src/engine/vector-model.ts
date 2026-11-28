import type {
  AcTable,
  Approach,
  AttackVector,
  Block,
  BlockState,
  CounterStrength,
  DefenseType,
  OcTable,
  Sliders,
  Stage,
  ThreatModel,
} from "./types";
import { STAGES } from "./types";
import { counterRetention } from "./breach";
import { blockEffectiveness } from "./scoring";
import { getAiCapability } from "./ai-curve";

/**
 * The vector backbone: RAND's attack vectors, staged into approaches, against
 * the blocks that counter them.
 *
 *   vector p     = feasibility(effective tier) × counter stack × government relief
 *   path         = one vector per stage (entry → reach the weights → get them out)
 *   approach p   = the attacker's easiest path within the approach
 *   campaign p   = at least one headline approach works, tried most-likely first,
 *                  with a chance q that a failed attempt is caught and stops it
 *   final        = max(campaign, residual floor)          — floor once per campaign
 *
 * A counter's erosion is read relative to the tier the control was built for
 * (`DESIGN_TIER_RELIEF`), and AI-augmented defenses win back part of the
 * attacker's AI uplift (`DEFENDER_AI_SHARE`).
 *
 * Everything here is a pure function of (threat model, catalogue, effective
 * block states, year, sliders). See research/scoring-model.md for the
 * constants' rationale and the calibration they produce.
 */

// --------------------------------------------------------------------------
// Constants (authored; each is explained in research/scoring-model.md)
// --------------------------------------------------------------------------

/** RAND Table 5.2 score → probability that one operation completes this step
 * against an SL1-grade victim. 2–5 are the midpoints of RAND's bins; a 1
 * ("up to 20%", RAND calls it likely infeasible) is read as 0.02 rather than
 * the 0.10 midpoint, which is what lets an undefended lab hold OC1. */
export const SCORE_TO_P: Readonly<Record<number, number>> = { 1: 0.02, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.9 };

/** The best strong counter on a vector multiplies it by this. */
export const STRONG_MULTIPLIER = 0.3;
/** Every further counter (extra strong ones first, then partials), most
 * durable first, multiplies by the next rung. Counters past the last rung add
 * nothing: diminishing returns. */
export const LADDER: readonly number[] = [0.8, 0.9, 0.95];

/** Detection: the chance a failed attempt is caught and the campaign stopped,
 * built from DET-01 (security operations) and DEC-01 (deception). Mature both:
 * 0.4 + 0.1 = 0.5. */
export const DETECTION_BLOCKS: Readonly<Record<string, number>> = { "DET-01": 0.4, "DEC-01": 0.1 };
/** q falls by this share at full AI capability (AI-assisted evasion). */
export const DETECTION_AI_EROSION = 0.4;

/** The residual floor is this share of what the same attacker achieves against
 * an undefended lab in the same year. Applied once per campaign. */
export const RESIDUAL_FLOOR_SHARE = 0.03;

/** At full government cooperation, a `needs_government` vector is halved. */
export const GOVERNMENT_RELIEF = 0.5;

/** Erosion is read relative to what a control was built for: a control first
 * required at SL-d (`sl_requirement.first_required`) reads its erosion band
 * this many tiers lower per level above SL1, i.e. at
 * max(1, tier − DESIGN_TIER_RELIEF·(d − 1)). RAND specifies SL-n's measures to
 * thwart OC-n, so an SL5-grade insider programme holds up against OC5 better
 * than an SL2-grade background check does. 0.75 is the reading that lets the
 * mature catalogue — RAND's SL5 benchmark plus the SL5 Standard — hold OC5 in
 * the app's default world, as RAND defines SL5 to; it still leaves SL5-grade
 * monitoring losing about a fifth of its effect against OC5, and commodity
 * controls losing about half. See research/scoring-model.md, Part 3. */
export const DESIGN_TIER_RELIEF = 0.75;

/** Defender AI: an AI-augmented defense (a block flagged `defender_ai`:
 * detection, monitoring, review, patching) wins back this share of the
 * attacker's AI uplift on the vectors it counters, and the same share of the
 * AI erosion of detection q. It is bounded by the attacker's uplift, so it can
 * never make a later year safer than an earlier one, and never acts where
 * attacker AI does not. */
export const DEFENDER_AI_SHARE = 0.5;

// --------------------------------------------------------------------------
// Options (the defaults are the app's model; tests reproduce the probe with them)
// --------------------------------------------------------------------------

export interface ModelOptions {
  /** Override the score → probability table (the reference probe reads a 1 as 0.05). */
  scoreToP?: Readonly<Record<number, number>>;
  /** Counter erosion with attacker tier (default true). */
  erosion?: boolean;
  /** Override the year's AI capability (0–1). */
  aiCapability?: number;
  /** Campaign-level detection q (default true). */
  detection?: boolean;
  /** Residual floor (default true). */
  residualFloor?: boolean;
  /** Read erosion relative to each control's design tier (default true). */
  designTierRelief?: boolean;
  /** Defender AI on `defender_ai` blocks (default true). */
  defenderAi?: boolean;
  /** Treat every operational counter as fully effective (state 1.0, no slider
   * penalties, no enablement discount) — the reference probe's "all mature". */
  idealCounters?: boolean;
}

// --------------------------------------------------------------------------
// Counters in force
// --------------------------------------------------------------------------

export interface CounterInForce {
  blockId: string;
  strength: CounterStrength;
  type: DefenseType;
  /** Block effectiveness 0–1: state × slider multipliers × enablement, with NO
   * defender-side AI erosion (AI enters through the attacker's tier instead). */
  effectiveness: number;
  /** The SL that first requires this control (`sl_requirement.first_required`):
   * the tier it was built to hold. Absent: 1 (no relief). */
  designTier?: number;
  /** The block is AI-augmented (`defender_ai`). */
  defenderAi?: boolean;
}

/** Vector id → the counters the deployed posture puts on it. */
export type CounterIndex = Map<string, CounterInForce[]>;

export function buildCounterIndex(
  blocks: Block[],
  states: Record<string, BlockState | string>,
  year: number,
  sliders: Sliders,
  opts: ModelOptions = {}
): CounterIndex {
  const index: CounterIndex = new Map();
  for (const block of blocks) {
    const state = states[block.id] ?? "not_started";
    let effectiveness: number;
    if (opts.idealCounters) {
      effectiveness = state === "deployed" || state === "mature" ? 1 : 0;
    } else {
      effectiveness = blockEffectiveness(block, state, year, sliders, {
        aiErosion: false,
        blockStates: states,
      });
    }
    if (effectiveness <= 0) continue;
    for (const c of block.counters ?? []) {
      const list = index.get(c.vector_id) ?? [];
      list.push({
        blockId: block.id,
        strength: c.strength,
        type: c.type_override ?? block.defense_type,
        effectiveness,
        designTier: block.sl_requirement?.first_required ?? 1,
        defenderAi: !!block.defender_ai,
      });
      index.set(c.vector_id, list);
    }
  }
  return index;
}

// --------------------------------------------------------------------------
// Counter stacking
// --------------------------------------------------------------------------

/**
 * The tier a counter's erosion band is read at.
 *
 *   max(1, tier − DESIGN_TIER_RELIEF·(design − 1))   relative to what it was built for
 *     − DEFENDER_AI_SHARE·aiUplift                   AI-augmented defenses only
 *
 * `tier` is the attacker's effective tier on the vector and `aiUplift` the part
 * of it AI added (see `evaluateVector`). Non-decreasing in the attacker's tier
 * and in the year: the defender-AI term never exceeds the uplift it offsets.
 * `counterRetention` clamps the result to the band.
 */
export function erosionTier(
  c: Pick<CounterInForce, "designTier" | "defenderAi">,
  tier: number,
  aiUplift = 0,
  opts: Pick<ModelOptions, "designTierRelief" | "defenderAi"> = {}
): number {
  const relief = opts.designTierRelief === false ? 0 : DESIGN_TIER_RELIEF * Math.max(0, (c.designTier ?? 1) - 1);
  const won = opts.defenderAi !== false && c.defenderAi ? DEFENDER_AI_SHARE * Math.max(0, aiUplift) : 0;
  return Math.max(1, tier - relief) - won;
}

export interface AppliedCounter {
  blockId: string;
  strength: CounterStrength;
  type: DefenseType;
  /** The rung this counter took (0.3 for the best strong, then the ladder);
   * null when it was past the last rung and added nothing. */
  rung: number | null;
  /** The factor it multiplied the vector by (1 = nothing). */
  multiplier: number;
}

/**
 * Stack the counters on one vector at one effective tier.
 *
 * Each counter's reach x = retention(type, tier) × effectiveness. One strong
 * counter takes the 0.3 rung; every other counter (strong or partial) takes
 * the ladder 0.8, 0.9, 0.95 in order of reach, most effective first; counters
 * past the last rung add nothing. A counter on rung r multiplies by
 * 1 − (1 − r)·x, so an absent or eroded counter falls back toward 1.
 *
 * Which strong counter takes the 0.3 rung is chosen to give the defender the
 * most credit (usually the one with the highest reach). Equivalently, the
 * result is the minimum over every valid rung assignment — and that is what
 * makes it monotone: raising one counter's reach lowers every assignment's
 * product, and adding a counter only adds assignments, so the minimum can
 * never rise. (The reference probe put extra strong counters ahead of partials
 * on the ladder. With fractional effectiveness that is not monotone: a
 * barely-started strong counter took the 0.8 rung and pushed a mature partial
 * down, so starting a block raised success.)
 *
 * Partials alone can never beat one strong counter: with three rungs the best
 * they reach is 0.8·0.9·0.95 = 0.684 > 0.3.
 */
export function stackCounters(
  counters: CounterInForce[],
  tier: number,
  erosion = true,
  aiUplift = 0,
  opts: Pick<ModelOptions, "designTierRelief" | "defenderAi"> = {}
): { multiplier: number; applied: AppliedCounter[] } {
  const reach = (c: CounterInForce) =>
    (erosion ? counterRetention(c.type, erosionTier(c, tier, aiUplift, opts)) : 1) * c.effectiveness;
  const byReach = (a: CounterInForce, b: CounterInForce) =>
    reach(b) - reach(a) || a.blockId.localeCompare(b.blockId);

  // The ladder for a given set: most effective first onto 0.8, 0.9, 0.95.
  const ladder = (cs: CounterInForce[]) => {
    const sorted = [...cs].sort(byReach);
    let m = 1;
    const applied: AppliedCounter[] = sorted.map((c, i) => {
      const rung = i < LADDER.length ? LADDER[i] : null;
      const f = rung === null ? 1 : 1 - (1 - rung) * reach(c);
      m *= f;
      return { blockId: c.blockId, strength: c.strength, type: c.type, rung, multiplier: f };
    });
    return { multiplier: m, applied };
  };

  let best = ladder(counters);
  for (const c of [...counters].sort(byReach)) {
    if (c.strength !== "strong") continue;
    const f = 1 - (1 - STRONG_MULTIPLIER) * reach(c);
    const rest = ladder(counters.filter((x) => x !== c));
    const m = f * rest.multiplier;
    if (m < best.multiplier - 1e-15) {
      best = {
        multiplier: m,
        applied: [{ blockId: c.blockId, strength: c.strength, type: c.type, rung: STRONG_MULTIPLIER, multiplier: f }, ...rest.applied],
      };
    }
  }
  return best;
}

// --------------------------------------------------------------------------
// Vector probabilities
// --------------------------------------------------------------------------

function lerpTable(values: number[], tier: number): number {
  const t = Math.min(5, Math.max(1, tier));
  const lo = Math.floor(t);
  const hi = Math.ceil(t);
  const a = values[lo - 1];
  const b = values[hi - 1];
  return a + (b - a) * (t - lo);
}

const OC_KEYS = ["oc1", "oc2", "oc3", "oc4", "oc5"] as const;
const AC_KEYS = ["ac1", "ac2", "ac3", "ac4", "ac5"] as const;

/** Feasibility of a vector at a (fractional) tier, before counters. RAND and
 * authored scores map through `scoreToP` and interpolate linearly in
 * probability between whole tiers; the top tier is a cap. */
export function baseFeasibility(
  vector: AttackVector,
  tier: number,
  scoreToP: Readonly<Record<number, number>> = SCORE_TO_P
): number {
  if (vector.source === "structural") {
    const sp = vector.structural_p as OcTable;
    return lerpTable(OC_KEYS.map((k) => sp[k]), tier);
  }
  const table =
    vector.source === "authored"
      ? AC_KEYS.map((k) => (vector.ai_feasibility as AcTable)[k])
      : OC_KEYS.map((k) => (vector.rand_feasibility as OcTable)[k]);
  return lerpTable(table.map((s) => scoreToP[s]), tier);
}

/** The tier a vector is scored at. Human-attacker vectors: OC + ai_shift ×
 * aiCap, capped at 5 — AI lifts the attacker, once, here. The lab's own model
 * is scored on its AC band directly. */
export function effectiveTier(vector: AttackVector, tier: number, aiCap: number): number {
  if (vector.source === "authored") return Math.min(5, Math.max(1, tier));
  return Math.min(5, Math.max(1, tier + (vector.ai_shift ?? 0) * aiCap));
}

export interface VectorEval {
  vectorId: string;
  /** Effective tier it was scored at. */
  tier: number;
  /** Feasibility before counters. */
  baseP: number;
  /** After counters and government relief. */
  p: number;
  multiplier: number;
  governmentRelief: number;
  applied: AppliedCounter[];
}

export interface EvalContext {
  model: ThreatModel;
  vectorsById: Map<string, AttackVector>;
  counters: CounterIndex;
  aiCap: number;
  sliders: Sliders;
  opts: ModelOptions;
}

/** The part of a vector's effective tier that AI added: for a human attacker
 * the lift above its OC (after the cap at 5); for the lab's own model, whose
 * capability is its AC band, the band's AI share (AC − 1)/4 — at most one tier,
 * as for a human attacker. Defender AI offsets a share of this. */
export function aiUpliftOf(vector: AttackVector, tier: number, effective: number): number {
  if (vector.source === "authored") return Math.max(0, effective - 1) / 4;
  return Math.max(0, effective - Math.min(5, Math.max(1, tier)));
}

export function evaluateVector(ctx: EvalContext, vector: AttackVector, tier: number): VectorEval {
  const t = effectiveTier(vector, tier, ctx.aiCap);
  const baseP = baseFeasibility(vector, t, ctx.opts.scoreToP);
  const { multiplier, applied } = stackCounters(
    ctx.counters.get(vector.id) ?? [],
    t,
    ctx.opts.erosion ?? true,
    aiUpliftOf(vector, tier, t),
    ctx.opts
  );
  const governmentRelief = vector.needs_government ? 1 - GOVERNMENT_RELIEF * ctx.sliders.gov_cooperation : 1;
  return {
    vectorId: vector.id,
    tier: t,
    baseP,
    p: baseP * multiplier * governmentRelief,
    multiplier,
    governmentRelief,
    applied,
  };
}

// --------------------------------------------------------------------------
// Paths and approaches
// --------------------------------------------------------------------------

export interface PathStep {
  stage: Stage;
  vectorId: string;
  p: number;
}

export interface ApproachEval {
  approachId: string;
  p: number;
  path: PathStep[];
}

/**
 * The attacker's easiest path within an approach: one vector per stage, the
 * product of their probabilities, skipping any stage a chosen vector makes
 * unnecessary (`stages_skipped`). Each stage otherwise takes its best vector.
 *
 * Residual vectors (`assumes_defense`) are always candidates. RAND scored them
 * as if the defense they defeat exists, so their score is a lower bound on the
 * stage when it doesn't, and the defenses they assume never counter them. (The
 * reference probe admitted them only once the assumed defense was deployed,
 * which let deploying it raise the stage — e.g. mantraps opening "evasion of
 * physical access control". Always-on is the monotone reading and agrees with
 * the probe whenever the assumed defense is in place.)
 */
export function evaluateApproach(
  approach: Approach,
  evalVector: (vectorId: string) => VectorEval | undefined,
  vectorsById: Map<string, AttackVector>
): ApproachEval {
  const stages = STAGES.filter((s) => approach.stages[s].length > 0);
  const best = new Map<Stage, { p: number; vectorId: string | null }>();
  for (const s of stages) {
    let top: { p: number; vectorId: string | null } = { p: 0, vectorId: null };
    for (const vid of approach.stages[s]) {
      const e = evalVector(vid);
      if (e && (top.vectorId === null || e.p > top.p)) top = { p: e.p, vectorId: vid };
    }
    best.set(s, top);
  }

  let result: ApproachEval = { approachId: approach.id, p: 0, path: [] };
  let found = false;
  for (const s of stages) {
    for (const vid of approach.stages[s]) {
      const e = evalVector(vid);
      if (!e) continue;
      const skipped = vectorsById.get(vid)?.stages_skipped ?? [];
      let p = e.p;
      const path: PathStep[] = [];
      for (const t of stages) {
        if (t === s) {
          path.push({ stage: s, vectorId: vid, p: e.p });
          continue;
        }
        if (skipped.includes(t)) continue;
        const b = best.get(t)!;
        p *= b.p;
        if (b.vectorId) path.push({ stage: t, vectorId: b.vectorId, p: b.p });
      }
      if (!found || p > result.p) {
        result = { approachId: approach.id, p, path };
        found = true;
      }
    }
  }
  return result;
}

// --------------------------------------------------------------------------
// Campaign
// --------------------------------------------------------------------------

/**
 * Campaign success across approaches, tried in descending p (the attacker's
 * best order), where each failed attempt is caught — and the campaign stopped —
 * with probability q:
 *
 *   campaign = Σ_k p_k · Π_{j<k} (1 − p_j)(1 − q)
 *
 * q = 0 is the plain union 1 − Π(1 − p). Non-decreasing in every p (for any
 * fixed order, and descending order is the maximum over orders), and
 * non-increasing in q.
 */
export function campaignSuccess(ps: number[], q = 0): number {
  const sorted = [...ps].sort((a, b) => b - a);
  let reach = 1;
  let total = 0;
  for (const p of sorted) {
    total += reach * p;
    reach *= (1 - p) * (1 - q);
  }
  return Math.min(1, Math.max(0, total));
}

/** q from the detection blocks' effectiveness, eroded by AI-assisted evasion;
 * an AI-augmented detection block (`defender_ai`) wins back
 * `DEFENDER_AI_SHARE` of that erosion. */
export function detectionQ(
  blocks: Block[],
  states: Record<string, BlockState | string>,
  year: number,
  sliders: Sliders,
  aiCap: number,
  opts: ModelOptions = {}
): number {
  if (opts.detection === false) return 0;
  let q = 0;
  for (const block of blocks) {
    const weight = DETECTION_BLOCKS[block.id];
    if (!weight) continue;
    const state = states[block.id] ?? "not_started";
    const e = opts.idealCounters
      ? state === "deployed" || state === "mature"
        ? 1
        : 0
      : blockEffectiveness(block, state, year, sliders, { aiErosion: false, blockStates: states });
    const won = opts.defenderAi !== false && block.defender_ai ? DEFENDER_AI_SHARE : 0;
    q += weight * e * (1 - DETECTION_AI_EROSION * (1 - won) * aiCap);
  }
  return q;
}

// --------------------------------------------------------------------------
// The whole model at one tier
// --------------------------------------------------------------------------

export interface TierEval {
  tier: number;
  approaches: Array<ApproachEval & { active: boolean }>;
  /** Campaign before the residual floor. */
  campaignRaw: number;
  /** What the same attacker gets against an undefended lab this year. */
  undefended: number;
  floor: number;
  /** max(campaignRaw, floor). */
  p: number;
  q: number;
}

export function aiCapabilityFor(year: number, sliders: Sliders, opts: ModelOptions = {}): number {
  return opts.aiCapability ?? getAiCapability(year, sliders.ai_timeline);
}

/** A memoising vector evaluator at one tier. */
export function vectorEvaluator(ctx: EvalContext, tier: number) {
  const cache = new Map<string, VectorEval>();
  return (vectorId: string): VectorEval | undefined => {
    let e = cache.get(vectorId);
    if (!e) {
      const v = ctx.vectorsById.get(vectorId);
      if (!v) return undefined;
      e = evaluateVector(ctx, v, tier);
      cache.set(vectorId, e);
    }
    return e;
  };
}

export function humanCampaignApproaches(model: ThreatModel): Approach[] {
  return model.approaches.filter((a) => a.adversary === "human" && a.headline);
}

export function evaluateTier(
  ctx: EvalContext,
  undefendedCtx: EvalContext,
  tier: number,
  served: boolean,
  q: number
): TierEval {
  const evalV = vectorEvaluator(ctx, tier);
  const evalU = vectorEvaluator(undefendedCtx, tier);
  const approaches = humanCampaignApproaches(ctx.model).map((a) => {
    const active = !a.requires_external_serving || served;
    const r = evaluateApproach(a, evalV, ctx.vectorsById);
    return { ...r, p: active ? r.p : 0, active };
  });
  const undefendedPs = humanCampaignApproaches(ctx.model)
    .filter((a) => !a.requires_external_serving || served)
    .map((a) => evaluateApproach(a, evalU, ctx.vectorsById).p);
  const campaignRaw = campaignSuccess(
    approaches.filter((a) => a.active).map((a) => a.p),
    q
  );
  const undefended = campaignSuccess(undefendedPs, 0);
  const floor = ctx.opts.residualFloor === false ? 0 : RESIDUAL_FLOOR_SHARE * undefended;
  return { tier, approaches, campaignRaw, undefended, floor, p: Math.max(campaignRaw, floor), q };
}

/** The lab's own model's AI-capability band this year: AC = 1 + 4·aiCap. */
export function acBand(aiCap: number): number {
  return 1 + 4 * Math.min(1, Math.max(0, aiCap));
}
