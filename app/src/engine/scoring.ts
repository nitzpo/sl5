import type { AttackChain, Block, BlockState, Category, Sliders } from "./types";
import { getAiCapability } from "./ai-curve";

export interface ScoringConfig {
  /** Overall SL = weakest_link_weight·min(categories) + (1−weakest_link_weight)·mean.
   * A small weakest-link term keeps defense-in-depth honest (a wide-open category
   * still drags the score) while the average lets broad coverage dominate — so a
   * program that buys the controls that matter isn't pinned to its single most
   * expensive-to-defend category. */
  weakest_link_weight: number;
  baseline_floor: number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  weakest_link_weight: 0.3,
  baseline_floor: 1.0,
};

/**
 * The blocks that actually matter to the threat model: every block any attack
 * chain exploits or is stopped by. Category scores are measured over these, not
 * the full catalog — otherwise deep catalogs of exotic, never-deployed controls
 * dilute a category's score and make real coverage look worse than it is.
 */
export function relevantBlockIds(chains: AttackChain[]): Set<string> {
  const ids = new Set<string>();
  for (const chain of chains) {
    for (const id of chain.blocks_exploited ?? []) ids.add(id);
    for (const id of chain.stoppers ?? []) ids.add(id);
  }
  return ids;
}

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
 * AI degrades probabilistic blocks over time. Hard stops are immune.
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
  return aiShift * aiCap * 0.1;
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
 *  - the ATTACKER channel (breach.ts): AI lifts the adversary's effective OC,
 *    which raises the capability gate and lowers probabilistic resist.
 * Breach therefore evaluates blocks with `opts.aiErosion: false` so the same
 * `ai_oc_shift` is never double-counted in one number.
 */
export function blockEffectiveness(
  block: Block,
  state: BlockState | string,
  year: number,
  sliders: Sliders | number = 0.5,
  opts: { aiErosion?: boolean } = {}
): number {
  // Backward compat: accept bare ai_timeline number
  const s: Sliders = typeof sliders === "number"
    ? { ai_timeline: sliders, gov_cooperation: 1, vendor_cooperation: 1, budget_millions: 2000, org_transformation: 1, risk_tolerance: 0.5 }
    : sliders;

  const base = getStateEffectiveness(state);
  const degradation = opts.aiErosion === false ? 0 : aiDegradation(block, year, s.ai_timeline);
  const orgMult = orgTransformMultiplier(block, s.org_transformation);
  const vendorMult = vendorCoopMultiplier(block, s.vendor_cooperation);
  const govMult = govCoopMultiplier(block, s.gov_cooperation);
  return Math.max(0, base * (1 - degradation) * orgMult * vendorMult * govMult);
}

/**
 * Score for a single category (0-5 SL scale).
 *
 * The score measures coverage over the category's *threat-relevant* blocks —
 * those any attack chain exploits or is stopped by (`relevantIds`). Scoring over
 * the whole catalog instead would divide by exotic controls no threat exercises,
 * making a well-covered category look like a D. When `relevantIds` is omitted (or
 * a category has none of them), it falls back to the full category — preserving
 * the old behavior for callers without chain context.
 */
export function categoryScore(
  blocksInCategory: Block[],
  blockStates: Record<string, BlockState | string>,
  year: number,
  sliders: Sliders | number = 0.5,
  relevantIds?: Set<string>,
  baselineFloor: number = DEFAULT_CONFIG.baseline_floor
): number {
  if (blocksInCategory.length === 0) return baselineFloor;

  const relevant = relevantIds
    ? blocksInCategory.filter((b) => relevantIds.has(b.id))
    : blocksInCategory;
  const pool = relevant.length > 0 ? relevant : blocksInCategory;

  const total = pool.reduce((sum, block) => {
    const state = blockStates[block.id] ?? "not_started";
    return sum + blockEffectiveness(block, state, year, sliders);
  }, 0);

  const raw = total / pool.length;
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
 * Pass `relevantIds` (from `relevantBlockIds(chains)`) so each category is scored
 * over its threat-relevant blocks. Omit it and categories score over the full
 * catalog (back-compat for tests / callers without chain context).
 */
export function computeCategoryScores(
  blocks: Block[],
  blockStates: Record<string, BlockState | string>,
  year: number,
  sliders: Sliders | number = 0.5,
  relevantIds?: Set<string>,
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
