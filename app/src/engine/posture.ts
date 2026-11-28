import type {
  Block,
  BlockState,
  Category,
  CounterStrength,
  DefenseType,
  Scenario,
  Sliders,
  Stage,
  ThreatModel,
} from "./types";
import { STAGES } from "./types";
import { applyBudgetConstraint } from "./budget";
import { isAtOrBelowBaseline } from "./baseline";
import { applyDependencyConstraint } from "./dependencies";
import { computeCategoryScores, counterRelevance, overallSlScore, type RelevanceWeights } from "./scoring";
import {
  acBand,
  aiCapabilityFor,
  buildCounterIndex,
  detectionQ,
  evaluateApproach,
  evaluateTier,
  RESIDUAL_FLOOR_SHARE,
  vectorEvaluator,
  type CounterIndex,
  type EvalContext,
  type ModelOptions,
  type PathStep,
  type TierEval,
  type VectorEval,
} from "./vector-model";
import { distillationProgress } from "./distillation";
import {
  bandWord,
  DEFAULT_AI_PROPENSITY,
  DEFAULT_SL_BAR,
  icd203Word,
  securityLevel,
  type BandWord,
  type Icd203Word,
} from "./threat-sl";

/**
 * The one pipeline every derived number goes through.
 *
 *   budget → prerequisites → (catalogue in force) → vector model at every tier
 *          → campaign per tier → threat-relative SL, approaches, AI insider,
 *            meters, per-block relevance, programme completeness
 *
 * Before this existed the Score card, the timeline and the Policy view each
 * re-assembled the engine calls themselves and disagreed about the same
 * posture. Everything that shows a score, a level or a recommendation calls
 * `scorePosture`, so they cannot disagree; `tests/engine/posture.test.ts`
 * asserts it.
 */

export interface PostureInput {
  blocks: Block[];
  model: ThreatModel;
  /** What the reader clicked — before any budget or prerequisite cap. */
  blockStates: Record<string, BlockState>;
  /** Funding priority (see `applyBudgetConstraint`). */
  advanceOrder?: string[];
  year: number;
  sliders: Sliders;
  /** The adversary tier the approach and scenario readouts are for (1–5). The
   * SL itself is computed over every tier. */
  adversaryOc: number;
  modelServedExternally: boolean;
  /** World toggle: count the FUT-xx future-capability blocks. Default off. */
  futureCapabilities?: boolean;
  /** Where an unfunded block falls back to. Omitted = its real-world baseline;
   * the mini-game, which builds from nothing, passes all-`not_started`. */
  budgetFloorStates?: Record<string, BlockState>;
  /** Model switches for tests and the reference-probe fixture. */
  options?: ModelOptions;
}

export interface TierResult {
  tier: number;
  /** Campaign success for OC-tier this year (after detection and the floor). */
  p: number;
  band: BandWord;
  detail: Icd203Word;
  held: boolean;
  easiestApproach: string | null;
  /** The residual floor that applied (state-independent). */
  floor: number;
  /** The same attacker against an undefended lab, same year. */
  undefended: number;
}

export interface PathCounter {
  blockId: string;
  strength: CounterStrength;
  type: DefenseType;
  /** Factor this counter multiplies the vector by (1 = nothing). */
  multiplier: number;
  /** Share of the vector's success it removes: 1 − multiplier. */
  effect: number;
}

export interface ApproachPathStep {
  stage: Stage;
  vectorId: string;
  p: number;
  baseP: number;
  /** Effective tier the vector was scored at. */
  tier: number;
  counters: PathCounter[];
}

export interface ApproachResult {
  id: string;
  name: string;
  adversary: "human" | "ai";
  /** False for the served approach when the model is not served externally. */
  active: boolean;
  /** OC for human approaches; the AC band for the lab's own model. */
  tier: number;
  /** For the AI insider this includes `ai_propensity`. */
  p: number;
  path: ApproachPathStep[];
  needsGovernment: boolean;
}

export interface BlockRelevance {
  /** Approaches with a candidate vector this block counters. */
  approaches: string[];
  /** Approaches whose easiest path (at the adversary tier) runs through a
   * vector this block counters — where it is doing the work right now. */
  binding: string[];
  vectors: Array<{
    vectorId: string;
    strength: CounterStrength;
    /** Factor it applies at the current tier; 1 when not in force. */
    multiplier: number;
    approaches: string[];
  }>;
}

export interface SlResult {
  level: number;
  /** 0–1 toward the next level (1 at SL5). */
  progress: number;
  /** level + progress, capped at 5. */
  value: number;
  marginal: boolean;
  bar: number;
  limitedBy: { tier: number; approach: string | null; path: ApproachPathStep[] } | null;
}

export interface PostureScore {
  /** What each block counts as after the budget and prerequisite caps. */
  effectiveStates: Record<string, BlockState>;
  budgetExceededIds: Set<string>;
  spentMillions: number;
  dependencyUnmetIds: Set<string>;
  dependencyUnmetRequires: Map<string, string[]>;
  /** The blocks in force: future blocks only with `futureCapabilities`. */
  catalogue: Block[];

  /** The old coverage SL, kept as a secondary readout (1–5). */
  programCompleteness: number;
  categoryScores: Record<Category, number>;

  /** OC1..OC5, index 0 = OC1. */
  tiers: TierResult[];
  sl: SlResult;
  /** Headline approaches: human ones at the adversary OC, the AI insider at
   * this year's AC band. */
  approaches: ApproachResult[];
  aiInsider: {
    acBand: number;
    /** propensity × path success, floored. */
    p: number;
    pathP: number;
    propensity: number;
    held: boolean;
    band: BandWord;
    detail: Icd203Word;
    floor: number;
    path: ApproachPathStep[];
  };
  /** API distillation (V-ML-5): capability copied, not weights. Outside SL. */
  capabilityLeakage: {
    active: boolean;
    /** Per campaign at the adversary OC. */
    p: number;
    band: BandWord;
    detail: Icd203Word;
    /** Cumulative extraction since 2026 (`distillationProgress`), with the
     * rate cut by the counters on V-ML-5. */
    cumulative: number;
    path: ApproachPathStep[];
  };
  /** Sabotage by the lab's own model (V-SELF-5). Outside SL. */
  integrity: { acBand: number; p: number; band: BandWord; detail: Icd203Word; path: ApproachPathStep[] };
  detection: { q: number };
  /** Campaign success against the adversary OC: tiers[adversaryOc − 1].p. */
  campaign: number;
  /** Scenario (story) path success, by scenario id. */
  scenarios: Record<string, number>;
  blockRelevance: Record<string, BlockRelevance>;
}

/**
 * The security level a posture needs to stop this adversary: SL-n stops OC-n,
 * so the target is the adversary tier, clamped to the 1–5 scale.
 */
export function targetSl(adversaryOc: number): number {
  return Math.min(5, Math.max(1, adversaryOc));
}

// Relevance depends only on the catalogue, so cache it by identity.
const relevanceCache = new WeakMap<Block[], RelevanceWeights>();

/** `counterRelevance(blocks)`, memoized on the array's identity. */
export function threatRelevance(blocks: Block[]): RelevanceWeights {
  let weights = relevanceCache.get(blocks);
  if (!weights) {
    weights = counterRelevance(blocks);
    relevanceCache.set(blocks, weights);
  }
  return weights;
}

/** The blocks in force for a world: future blocks only when the toggle is on. */
export function catalogueInForce(blocks: Block[], futureCapabilities = false): Block[] {
  return futureCapabilities ? blocks : blocks.filter((b) => !b.future);
}

/**
 * The funding order after the program starts paying for `ids`, in that
 * sequence. Any of them not already costing money joins the END of the queue
 * — the same rule the store applies — so a what-if can only ever unfund its
 * own blocks, never an earlier commitment.
 */
export function orderAfterActivating(
  input: Pick<PostureInput, "blocks" | "blockStates" | "advanceOrder">,
  ids: string[]
): string[] {
  const byId = new Map(input.blocks.map((b) => [b.id, b]));
  const costing = (id: string) => {
    const block = byId.get(id);
    const state = input.blockStates[id] ?? "not_started";
    return !!block && state !== "not_started" && !isAtOrBelowBaseline(block, state);
  };
  const joining = ids.filter((id) => !costing(id));
  return [...(input.advanceOrder ?? []).filter((id) => !joining.includes(id)), ...joining];
}

/** The budget then the prerequisite cap, in that order — the states a posture
 * actually delivers. Future blocks outside a future world are not in the
 * catalogue, so they never spend money. */
export function effectivePosture(
  input: Pick<
    PostureInput,
    "blocks" | "blockStates" | "advanceOrder" | "sliders" | "budgetFloorStates" | "futureCapabilities"
  >
) {
  const catalogue = catalogueInForce(input.blocks, input.futureCapabilities);
  const {
    effectiveStates: budgeted,
    exceededIds: budgetExceededIds,
    spentMillions,
  } = applyBudgetConstraint(catalogue, input.blockStates, input.sliders.budget_millions, {
    order: input.advanceOrder,
    riskTolerance: input.sliders.risk_tolerance,
    floorStates: input.budgetFloorStates,
  });
  const {
    effectiveStates,
    unmetIds: dependencyUnmetIds,
    unmetRequires: dependencyUnmetRequires,
  } = applyDependencyConstraint(catalogue, budgeted);
  return {
    catalogue,
    effectiveStates,
    budgetExceededIds,
    spentMillions,
    dependencyUnmetIds,
    dependencyUnmetRequires,
  };
}

function describePath(path: PathStep[], evalV: (id: string) => VectorEval | undefined): ApproachPathStep[] {
  return path.map((s) => {
    const e = evalV(s.vectorId)!;
    return {
      stage: s.stage,
      vectorId: s.vectorId,
      p: e.p,
      baseP: e.baseP,
      tier: e.tier,
      counters: e.applied
        .filter((a) => a.multiplier < 1)
        .map((a) => ({
          blockId: a.blockId,
          strength: a.strength,
          type: a.type,
          multiplier: a.multiplier,
          effect: 1 - a.multiplier,
        })),
    };
  });
}

/** A scenario's success as told: every step has to work, so it is the product
 * over its distinct vectors (a vector used in two steps counts once). Unlike an
 * approach, a scenario is one specific way in, not the attacker's easiest, so
 * every block that counters one of its vectors moves it. */
function scenarioSuccess(s: Scenario, evalV: (id: string) => VectorEval | undefined) {
  if (s.vectors.length === 0) return 0;
  return [...new Set(s.vectors)].reduce((p, id) => p * (evalV(id)?.p ?? 0), 1);
}

/** Score a posture. */
export function scorePosture(input: PostureInput): PostureScore {
  const posture = effectivePosture(input);
  const { effectiveStates, catalogue } = posture;
  const opts = input.options ?? {};
  const sliders = input.sliders;
  const bar = sliders.sl_bar ?? DEFAULT_SL_BAR;
  const propensity = sliders.ai_propensity ?? DEFAULT_AI_PROPENSITY;
  const served = input.modelServedExternally;
  const model = input.model;
  const vectorsById = new Map(model.vectors.map((v) => [v.id, v]));
  const aiCap = aiCapabilityFor(input.year, sliders, opts);
  const adversaryOc = Math.min(5, Math.max(1, Math.round(input.adversaryOc)));

  // Programme completeness: the old coverage score, today's catalogue only.
  const completenessBlocks = input.blocks.filter((b) => !b.future);
  const categoryScores = computeCategoryScores(
    completenessBlocks,
    effectiveStates,
    input.year,
    sliders,
    threatRelevance(input.blocks)
  );
  const programCompleteness = overallSlScore(categoryScores);

  // The vector model.
  const counters: CounterIndex = buildCounterIndex(catalogue, effectiveStates, input.year, sliders, opts);
  const ctx: EvalContext = { model, vectorsById, counters, aiCap, sliders, opts };
  const undefendedCtx: EvalContext = { ...ctx, counters: new Map() };
  const q = detectionQ(catalogue, effectiveStates, input.year, sliders, aiCap, opts);

  const tierEvals: TierEval[] = [1, 2, 3, 4, 5].map((n) => evaluateTier(ctx, undefendedCtx, n, served, q));
  const tiers: TierResult[] = tierEvals.map((t) => {
    const easiest = t.approaches
      .filter((a) => a.active)
      .reduce<(typeof t.approaches)[number] | null>((m, a) => (!m || a.p > m.p ? a : m), null);
    return {
      tier: t.tier,
      p: t.p,
      band: bandWord(t.p, bar),
      detail: icd203Word(t.p),
      held: t.p < bar,
      easiestApproach: easiest?.approachId ?? null,
      floor: t.floor,
      undefended: t.undefended,
    };
  });

  // The lab's own model, at this year's AC band.
  const ac = acBand(aiCap);
  const evalAi = vectorEvaluator(ctx, ac);
  const evalAiU = vectorEvaluator(undefendedCtx, ac);
  const aiApproach = model.approaches.find((a) => a.adversary === "ai" && a.headline);
  const aiEval = aiApproach ? evaluateApproach(aiApproach, evalAi, vectorsById) : { p: 0, path: [] };
  const aiUndefended = aiApproach ? evaluateApproach(aiApproach, evalAiU, vectorsById).p : 0;
  const aiFloor = opts.residualFloor === false ? 0 : RESIDUAL_FLOOR_SHARE * propensity * aiUndefended;
  const aiP = Math.max(propensity * aiEval.p, aiFloor);

  const level = securityLevel({ tierP: tiers.map((t) => t.p), aiInsiderP: aiP, bar });

  // Approaches at the adversary tier.
  const evalAt = vectorEvaluator(ctx, adversaryOc);
  const atTier = tierEvals[adversaryOc - 1];
  const nameOf = new Map(model.approaches.map((a) => [a.id, a.name]));
  const needsGov = (path: PathStep[]) => path.some((s) => vectorsById.get(s.vectorId)?.needs_government);
  const approaches: ApproachResult[] = atTier.approaches.map((a) => ({
    id: a.approachId,
    name: nameOf.get(a.approachId) ?? a.approachId,
    adversary: "human",
    active: a.active,
    tier: adversaryOc,
    p: a.p,
    path: describePath(a.path, evalAt),
    needsGovernment: needsGov(a.path),
  }));
  const aiPath = describePath(aiEval.path, evalAi);
  if (aiApproach) {
    approaches.push({
      id: aiApproach.id,
      name: aiApproach.name,
      adversary: "ai",
      active: true,
      tier: ac,
      p: propensity * aiEval.p,
      path: aiPath,
      needsGovernment: needsGov(aiEval.path),
    });
  }

  // Meters outside SL.
  const capApproach = model.approaches.find((a) => a.meter === "capability_leakage");
  const capEval = capApproach ? evaluateApproach(capApproach, evalAt, vectorsById) : { p: 0, path: [] };
  const capActive = !!capApproach && (!capApproach.requires_external_serving || served);
  const capP = capActive ? capEval.p : 0;
  const capVector = capEval.path[0] ? evalAt(capEval.path[0].vectorId) : undefined;
  const cumulative = capActive
    ? distillationProgress(input.year, 2026, 1 - (capVector?.multiplier ?? 1), sliders.ai_timeline)
    : 0;
  const intApproach = model.approaches.find((a) => a.meter === "integrity");
  const intEval = intApproach ? evaluateApproach(intApproach, evalAi, vectorsById) : { p: 0, path: [] };
  const intP = propensity * intEval.p;

  // Scenarios (stories): each told as one specific path.
  const scenarios: Record<string, number> = {};
  for (const s of model.scenarios) {
    const approach = model.approaches.find((a) => a.id === s.approach);
    const isAi = approach?.adversary === "ai";
    const live = !s.requires_external_serving || served;
    const p = live ? scenarioSuccess(s, isAi ? evalAi : evalAt) : 0;
    scenarios[s.id] = isAi ? propensity * p : p;
  }

  // Which approaches and vectors each block touches, at the current posture.
  const candidateApproaches = new Map<string, string[]>();
  for (const a of model.approaches) {
    for (const st of STAGES) {
      for (const vid of a.stages[st]) {
        const list = candidateApproaches.get(vid) ?? [];
        if (!list.includes(a.id)) list.push(a.id);
        candidateApproaches.set(vid, list);
      }
    }
  }
  const onPath = new Map<string, Set<string>>(); // vector → approaches whose easiest path uses it
  const notePath = (approachId: string, path: PathStep[]) => {
    for (const s of path) {
      const set = onPath.get(s.vectorId) ?? new Set();
      set.add(approachId);
      onPath.set(s.vectorId, set);
    }
  };
  for (const a of atTier.approaches) if (a.active) notePath(a.approachId, a.path);
  if (aiApproach) notePath(aiApproach.id, aiEval.path);
  if (capApproach && capActive) notePath(capApproach.id, capEval.path);
  if (intApproach) notePath(intApproach.id, intEval.path);

  const blockRelevance: Record<string, BlockRelevance> = {};
  for (const b of catalogue) {
    const approachesTouched = new Set<string>();
    const binding = new Set<string>();
    const vectors: BlockRelevance["vectors"] = [];
    for (const c of b.counters ?? []) {
      const v = vectorsById.get(c.vector_id);
      if (!v) continue;
      const e = v.source === "authored" ? evalAi(c.vector_id) : evalAt(c.vector_id);
      const applied = e?.applied.find((a) => a.blockId === b.id);
      const aps = candidateApproaches.get(c.vector_id) ?? [];
      aps.forEach((x) => approachesTouched.add(x));
      onPath.get(c.vector_id)?.forEach((x) => binding.add(x));
      vectors.push({ vectorId: c.vector_id, strength: c.strength, multiplier: applied?.multiplier ?? 1, approaches: aps });
    }
    blockRelevance[b.id] = { approaches: [...approachesTouched], binding: [...binding], vectors };
  }

  // limitedBy: the tier that blocks the next level and its easiest path there.
  let limitedBy: SlResult["limitedBy"] = null;
  if (level.blocking) {
    if (level.blocking.aiInsider) {
      limitedBy = { tier: 5, approach: aiApproach?.id ?? null, path: aiPath };
    } else {
      const t = tierEvals[level.blocking.tier - 1];
      const top = t.approaches.filter((a) => a.active).reduce<(typeof t.approaches)[number] | null>(
        (m, a) => (!m || a.p > m.p ? a : m),
        null
      );
      limitedBy = {
        tier: level.blocking.tier,
        approach: top?.approachId ?? null,
        path: top ? describePath(top.path, vectorEvaluator(ctx, level.blocking.tier)) : [],
      };
    }
  }

  const campaign = tiers[adversaryOc - 1].p;
  return {
    ...posture,
    programCompleteness,
    categoryScores,
    tiers,
    sl: { ...level, bar, limitedBy },
    approaches,
    aiInsider: {
      acBand: ac,
      p: aiP,
      pathP: aiEval.p,
      propensity,
      held: aiP < bar,
      band: bandWord(aiP, bar),
      detail: icd203Word(aiP),
      floor: aiFloor,
      path: aiPath,
    },
    capabilityLeakage: {
      active: capActive,
      p: capP,
      band: bandWord(capP, bar),
      detail: icd203Word(capP),
      cumulative,
      path: capActive ? describePath(capEval.path, evalAt) : [],
    },
    integrity: {
      acBand: ac,
      p: intP,
      band: bandWord(intP, bar),
      detail: icd203Word(intP),
      path: describePath(intEval.path, evalAi),
    },
    detection: { q },
    campaign,
    scenarios,
    blockRelevance,
  };
}
