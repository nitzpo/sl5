import type { Block, BlockState, Category, SimulationConfig } from "./types";
import { getAiCapability } from "./ai-curve";

const DEFAULT_CONFIG: SimulationConfig["scoring"] = {
  method: "hybrid",
  hybrid_weights: { weakest_link_weight: 0.6, harmonic_mean_weight: 0.4 },
  category_weights: {
    network: 0.2,
    machine: 0.2,
    physical: 0.15,
    personnel: 0.2,
    supply_chain: 0.1,
    ai_specific: 0.15,
  },
  baseline_floor: 1.0,
};

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

/**
 * Effective defense contribution of a block given its state, year, and AI curve.
 */
export function blockEffectiveness(
  block: Block,
  state: BlockState | string,
  year: number,
  aiTimelineSlider: number = 0.5
): number {
  const base = getStateEffectiveness(state);
  const degradation = aiDegradation(block, year, aiTimelineSlider);
  return Math.max(0, base * (1 - degradation));
}

/**
 * Score for a single category (0-5 SL scale).
 */
export function categoryScore(
  blocksInCategory: Block[],
  blockStates: Record<string, BlockState | string>,
  year: number,
  aiTimelineSlider: number = 0.5,
  baselineFloor: number = DEFAULT_CONFIG.baseline_floor
): number {
  if (blocksInCategory.length === 0) return baselineFloor;

  const total = blocksInCategory.reduce((sum, block) => {
    const state = blockStates[block.id] ?? "not_started";
    return sum + blockEffectiveness(block, state, year, aiTimelineSlider);
  }, 0);

  const raw = total / blocksInCategory.length;
  return baselineFloor + raw * (5.0 - baselineFloor);
}

/**
 * Overall SL score using hybrid formula: 0.6*min + 0.4*harmonic_mean.
 */
export function overallSlScore(
  categoryScores: Record<Category, number>,
  config: SimulationConfig["scoring"] = DEFAULT_CONFIG
): number {
  const scores = Object.values(categoryScores);
  if (scores.length === 0) return 0;

  const minScore = Math.min(...scores);

  const nonzero = scores.filter((s) => s > 0);
  if (nonzero.length === 0) return 0;
  const harmonicMean =
    nonzero.length / nonzero.reduce((sum, s) => sum + 1.0 / s, 0);

  return (
    config.hybrid_weights.weakest_link_weight * minScore +
    config.hybrid_weights.harmonic_mean_weight * harmonicMean
  );
}

/**
 * Compute all category scores from blocks and states.
 */
export function computeCategoryScores(
  blocks: Block[],
  blockStates: Record<string, BlockState | string>,
  year: number,
  aiTimelineSlider: number = 0.5,
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
      aiTimelineSlider,
      baselineFloor
    );
  }

  return result;
}
