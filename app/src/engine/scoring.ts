import type { Block, BlockState, Category, Sliders } from "./types";
import { getAiCapability } from "./ai-curve";

/**
 * Programme completeness — the coverage score that used to be "the SL".
 *
 * Phase 2 made the security level threat-relative (`threat-sl.ts`: SL-n holds
 * OC-n). This file keeps the old coverage number as `programCompleteness`, a
 * secondary readout: how much of the threat-relevant catalogue is in place,
 * with defender-side AI erosion of probabilistic blocks. Same formula as
 * before; relevance now comes from the vector map instead of chain names.
 */
export interface ScoringConfig {
  /** Overall = weakest_link_weight·min(categories) + (1−weakest_link_weight)·mean.
   * A small weakest-link term keeps defense-in-depth honest (a wide-open category
   * still drags the score) while the average lets broad coverage dominate. */
  weakest_link_weight: number;
  baseline_floor: number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  weakest_link_weight: 0.3,
  baseline_floor: 1.0,
};

/**
 * How much a block that only partially counters the threat counts, relative to
 * one that strongly counters at least one vector. Kept at the old chain model's
 * supporting-defense weight so the completeness number moves the way it did.
 */
export const SUPPORTING_WEIGHT = 0.34;

/**
 * How much each block counts toward completeness, keyed by block id.
 *
 * A `Map` rather than a `Set` because relevance is not binary: a block that is
 * a strong counter on at least one vector counts fully (1); a block with only
 * partial counters counts at `SUPPORTING_WEIGHT`.
 */
export type RelevanceWeights = Map<string, number>;

/**
 * Relevance from the vector map: every block counters at least one vector
 * (the data-integrity test enforces it), so every block is relevant; strong
 * counters weigh 1, partial-only blocks `SUPPORTING_WEIGHT`. Future-capability
 * blocks are left out — completeness measures today's programme against
 * today's catalogue, whatever the world toggle says.
 */
export function counterRelevance(blocks: Block[]): RelevanceWeights {
  const weights: RelevanceWeights = new Map();
  for (const b of blocks) {
    if (b.future) continue;
    const counters = b.counters ?? [];
    if (counters.length === 0) continue;
    weights.set(b.id, counters.some((c) => c.strength === "strong") ? 1 : SUPPORTING_WEIGHT);
  }
  return weights;
}

// Keyed by `string`, not `BlockState`, on purpose: `partially_deployed` is NOT a
// BlockState and is unreachable through the UI's advancement cycle. It stays
// because many blocks in public/data still declare it as their `baseline_state`,
// and callers that read those files directly (scoring.test.ts) need a sane value.
// The app never scores a block at 0.6: `baselineStates` (engine/baseline.ts) maps
// `partially_deployed` onto `implementing`, and the other out-of-cycle baselines
// onto `not_started`, before a posture reaches the engine.
const STATE_EFFECTIVENESS: Record<string, number> = {
  not_started: 0.0,
  investing: 0.1,
  implementing: 0.4,
  partially_deployed: 0.6,
  deployed: 0.85,
  mature: 1.0,
};

export function getStateEffectiveness(state: BlockState | string): number {
  return STATE_EFFECTIVENESS[state] ?? 0.0;
}

/**
 * How much of a `hybrid` block is structural rather than probabilistic.
 *
 * `hybrid` means a hard-stop core with a probabilistic wrapper — a data diode
 * enforces direction in hardware and inspects content in software; zone
 * architecture is a physical boundary policed by procedure. Both halves are real,
 * so the type belongs between the other two on both AI channels, and half is the
 * honest split absent per-block data saying otherwise.
 *
 * Used by `aiDegradation` (defender channel, completeness) and by
 * `counterRetention` in breach.ts (attacker channel, the vector model), so the
 * two can't disagree about what a hybrid is. Both treat it as a lerp between the
 * hard-stop and probabilistic branches, which keeps it bracketed by them by
 * construction rather than by a tuned constant.
 *
 * Before this existed, both call sites branched only on `hard_stop`, so all three
 * hybrid blocks fell through to the pure-probabilistic path — NET-05 got no credit
 * at all for the half of it that is physics.
 */
export const HYBRID_STRUCTURAL_SHARE = 0.5;

/**
 * AI degrades probabilistic blocks over time. Hard stops are immune; hybrids
 * erode only over their probabilistic share.
 */
export function aiDegradation(
  block: Block,
  year: number,
  aiTimelineSlider: number
): number {
  if (block.defense_type === "hard_stop") return 0.0;
  const aiShift = block.adversary_exploitation.ai_oc_shift;
  const aiCap = getAiCapability(year, aiTimelineSlider);
  // Max degradation: ai_oc_shift=3, ai_cap=1.0 → 30%
  const full = aiShift * aiCap * 0.1;
  return block.defense_type === "hybrid" ? full * (1 - HYBRID_STRUCTURAL_SHARE) : full;
}

// What counts as a companion actually being there. `implementing` deliberately
// doesn't: a diode being installed is not a diode you can move data through.
// Neither do the non-BlockState baselines in public/data (`partially_deployed`
// and the like) — `baselineStates` maps them onto the cycle before the running
// app sees them anyway, and a half-there companion closing a gap fully would be
// the wrong way to round.
const OPERATIONAL: ReadonlySet<string> = new Set(["deployed", "mature"]);

/**
 * How much of a block's effectiveness it actually gets, given which of its
 * `completed_by` companions are operational.
 *
 * Returns 1 for every block that declares no companions (just over half the
 * catalogue), so for those it is a no-op. For the rest it interpolates from
 * `standalone_share` (none of them present) to 1 (all of them), linearly in the
 * count.
 *
 * The mini-game is what made this necessary. On a $150M budget the air gap is a
 * single click that drops four of seven chains by ~60 points, which teaches a
 * lesson the deck spends two slides arguing against: that one structural purchase
 * is most of security. It isn't. An air gap with no controlled crossing is an air
 * gap people carry drives across, and an air gap with a live BMC on the management
 * VLAN still has a route in — so NET-01 alone should buy most, not all, of what
 * NET-01 buys.
 *
 * Deliberately soft rather than another hard `requires` gate:
 *
 *  - `requires` says the block cannot function. An air gap without a data diode
 *    functions fine; it is just less than the standard means by "air gap". Capping
 *    it at implementing would be a lie in the other direction, and would also make
 *    the shortlist unbuyable — every cap a reader can't clear reads as a bug.
 *  - Linear in the count, not a product of per-companion factors, so the wording
 *    "each companion closes an equal part of the gap" is literally what the
 *    arithmetic does and the floor is exactly `standalone_share` rather than
 *    something that depends on how many companions were authored.
 *
 * Monotone in the only direction that matters: the factor rises with the number of
 * operational companions and never falls, so bringing a companion online can only
 * raise this block's effectiveness. That is what keeps the breach model's
 * monotonicity guarantee intact — `tests/engine/monotonicity.test.ts` advances one
 * block at a time from random postures and would catch a violation.
 */
export function enablementFactor(
  block: Block,
  blockStates: Record<string, BlockState | string>
): number {
  const completed = block.dependencies?.completed_by;
  if (!completed || completed.blocks.length === 0) return 1;
  const present = completed.blocks.filter((id) =>
    OPERATIONAL.has(blockStates[id] ?? "not_started")
  ).length;
  const share = completed.standalone_share;
  return share + (1 - share) * (present / completed.blocks.length);
}

function orgTransformMultiplier(block: Block, orgTransformation: number): number {
  const readiness = block.dimensions.organizational_readiness.value;
  if (readiness >= 50) return 1.0;
  const penalty = (1 - orgTransformation) * (1 - readiness / 100) * 0.3;
  return 1 - penalty;
}

function vendorCoopMultiplier(block: Block, vendorCooperation: number): number {
  const dep = block.dimensions.vendor_dependency.value;
  if (dep <= 50) return 1.0;
  const penalty = (1 - vendorCooperation) * (dep / 100) * 0.3;
  return 1 - penalty;
}

function govCoopMultiplier(block: Block, govCooperation: number): number {
  if (block.category !== "supply_chain" && block.category !== "personnel") return 1.0;
  const penalty = (1 - govCooperation) * 0.25;
  return 1 - penalty;
}

/**
 * Effective defense contribution of a block given its state, year, and sliders.
 *
 * AI affects the simulation through two deliberately separate channels, each
 * counted exactly once:
 *  - the DEFENDER channel (here): probabilistic defenses erode as AI advances
 *    (`aiDegradation`), which lowers SL scores;
 *  - the ATTACKER channel (vector-model.ts): AI lifts the attacker's effective
 *    tier per vector, which raises feasibility and erodes counters.
 * The vector model therefore evaluates blocks with `opts.aiErosion: false` so
 * AI is never counted twice in one number.
 *
 * Pass `opts.blockStates` to apply `enablementFactor` — a control declaring
 * `completed_by` companions is worth less while they're missing. Omitted, the
 * block is scored as if fully enabled, which is the right default for the UI's
 * single-block readouts ("what is this worth once it's built") and back-compatible
 * for the 40 blocks that declare no companions at all.
 */
export function blockEffectiveness(
  block: Block,
  state: BlockState | string,
  year: number,
  sliders: Sliders | number = 0.5,
  opts: { aiErosion?: boolean; blockStates?: Record<string, BlockState | string> } = {}
): number {
  // Backward compat: accept bare ai_timeline number
  const s: Sliders = typeof sliders === "number"
    ? { ai_timeline: sliders, gov_cooperation: 1, vendor_cooperation: 1, budget_millions: 2000, org_transformation: 1, risk_tolerance: 0.5, sl_bar: 0.2, ai_propensity: 0.5 }
    : sliders;

  const base = getStateEffectiveness(state);
  const degradation = opts.aiErosion === false ? 0 : aiDegradation(block, year, s.ai_timeline);
  const orgMult = orgTransformMultiplier(block, s.org_transformation);
  const vendorMult = vendorCoopMultiplier(block, s.vendor_cooperation);
  const govMult = govCoopMultiplier(block, s.gov_cooperation);
  const enablement = opts.blockStates ? enablementFactor(block, opts.blockStates) : 1;
  return Math.max(0, base * (1 - degradation) * orgMult * vendorMult * govMult * enablement);
}

/**
 * Score for a single category (0-5 SL scale).
 *
 * The score is a WEIGHTED mean of effectiveness over the category's
 * *threat-relevant* blocks (`relevantIds`): strong counters at full weight,
 * partial-only blocks at `SUPPORTING_WEIGHT` (see `counterRelevance`).
 *
 * Two "no relevant blocks" cases are handled distinctly:
 *  - `relevantIds` omitted → no relevance context; score over the full
 *    category at equal weight (back-compat for callers/tests);
 *  - `relevantIds` given but this category has none of them → the category has
 *    no exposure in the current threat model, so return the neutral baseline
 *    floor rather than diluting with the full catalog (which would re-introduce
 *    the very dilution this fix removes).
 */
export function categoryScore(
  blocksInCategory: Block[],
  blockStates: Record<string, BlockState | string>,
  year: number,
  sliders: Sliders | number = 0.5,
  relevantIds?: RelevanceWeights,
  baselineFloor: number = DEFAULT_CONFIG.baseline_floor
): number {
  if (blocksInCategory.length === 0) return baselineFloor;

  const pool = relevantIds
    ? blocksInCategory
        .filter((b) => relevantIds.has(b.id))
        .map((b) => ({ block: b, weight: relevantIds.get(b.id)! }))
    : blocksInCategory.map((b) => ({ block: b, weight: 1 }));
  // Chain context, but no threat-relevant block in this category: not scoreable
  // against the threat model — stay at the neutral floor, don't fall back to the
  // full catalog (that would dilute) and don't fabricate a perfect 5.0.
  if (pool.length === 0) return baselineFloor;

  let weighted = 0;
  let weightSum = 0;
  for (const { block, weight } of pool) {
    if (weight <= 0) continue;
    const state = blockStates[block.id] ?? "not_started";
    // `blockStates` is passed on so a control missing its `completed_by`
    // companions scores as the partial thing it is — the air gap with no
    // controlled crossing, not the air gap the standard describes.
    weighted += weight * blockEffectiveness(block, state, year, sliders, { blockStates });
    weightSum += weight;
  }
  if (weightSum <= 0) return baselineFloor;

  const raw = weighted / weightSum;
  return baselineFloor + raw * (5.0 - baselineFloor);
}

/**
 * Overall SL: weakest_link_weight·min(categories) + (1−weakest_link_weight)·mean.
 * A small weakest-link term keeps a gaping-hole category honest; the average lets
 * broad, threat-relevant coverage move the score (see ScoringConfig).
 */
export function overallSlScore(
  categoryScores: Record<Category, number>,
  config: ScoringConfig = DEFAULT_CONFIG
): number {
  const scores = Object.values(categoryScores);
  if (scores.length === 0) return 0;

  const minScore = Math.min(...scores);
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  const wl = config.weakest_link_weight;
  return wl * minScore + (1 - wl) * mean;
}

/**
 * Compute all category scores from blocks and states.
 *
 * Pass `relevantIds` (from `counterRelevance(blocks)`) so each category is
 * scored over its threat-relevant blocks at their relevance weight. Omit it and
 * categories score over the full catalog at equal weight (back-compat for tests).
 */
export function computeCategoryScores(
  blocks: Block[],
  blockStates: Record<string, BlockState | string>,
  year: number,
  sliders: Sliders | number = 0.5,
  relevantIds?: RelevanceWeights,
  baselineFloor: number = DEFAULT_CONFIG.baseline_floor
): Record<Category, number> {
  const categories: Record<Category, Block[]> = {
    network: [],
    machine: [],
    physical: [],
    personnel: [],
    supply_chain: [],
    ai_specific: [],
  };

  for (const block of blocks) {
    if (block.category in categories) {
      categories[block.category].push(block);
    }
  }

  const result: Record<Category, number> = {} as Record<Category, number>;
  for (const [cat, catBlocks] of Object.entries(categories)) {
    result[cat as Category] = categoryScore(
      catBlocks,
      blockStates,
      year,
      sliders,
      relevantIds,
      baselineFloor
    );
  }

  return result;
}
