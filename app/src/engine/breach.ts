import type { Block, BlockState } from "./types";
import { getAiCapability } from "./ai-curve";
import { blockEffectiveness } from "./scoring";

const DEFAULT_SIGMOID_STEEPNESS = 1.5;
const DEFAULT_HARD_STOP_BYPASS = 0.02;
const DEFAULT_PROBABILISTIC_BYPASS = 0.15;
const DEFAULT_IMPLEMENTING_BYPASS = 0.5;

/**
 * Sigmoid mapping from OC delta to exploitation probability.
 * delta = effective_OC - block_threshold
 * At delta=0: P=0.5, delta=-2: P≈5%, delta=+2: P≈95%
 */
export function sigmoidProbability(
  delta: number,
  steepness: number = DEFAULT_SIGMOID_STEEPNESS
): number {
  return 1.0 / (1.0 + Math.exp(-steepness * delta));
}

/**
 * Probability that an adversary successfully exploits a single block's absence/weakness.
 */
export function blockExploitProbability(
  block: Block,
  state: BlockState | string,
  adversaryOc: number,
  year: number,
  aiTimelineSlider: number = 0.5
): number {
  const eff = blockEffectiveness(block, state, year, aiTimelineSlider);

  if (eff >= 0.85) {
    // Block deployed — hard to bypass
    return block.defense_type === "hard_stop"
      ? DEFAULT_HARD_STOP_BYPASS
      : DEFAULT_PROBABILISTIC_BYPASS;
  }

  if (eff >= 0.4) {
    // Block implementing — partial defense
    return DEFAULT_IMPLEMENTING_BYPASS;
  }

  // Block absent — sigmoid based on effective OC vs threshold
  const threshold = block.adversary_exploitation.oc_threshold_to_exploit;
  const aiShift = block.adversary_exploitation.ai_oc_shift;
  const aiCap = getAiCapability(year, aiTimelineSlider);
  const effectiveOc = adversaryOc + aiShift * aiCap;
  const delta = effectiveOc - threshold;

  return sigmoidProbability(delta);
}

/**
 * Probability that an adversary succeeds along an attack chain.
 * Chain success requires overcoming (or exploiting absence of) each block in the chain.
 */
export function chainBreachProbability(
  chainBlockIds: string[],
  allBlocks: Block[],
  blockStates: Record<string, BlockState | string>,
  adversaryOc: number,
  year: number,
  aiTimelineSlider: number = 0.5
): number {
  const blockMap = new Map(allBlocks.map((b) => [b.id, b]));

  let probability = 1.0;
  for (const blockId of chainBlockIds) {
    const block = blockMap.get(blockId);
    if (!block) continue;
    const state = blockStates[blockId] ?? "not_started";
    probability *= blockExploitProbability(
      block,
      state,
      adversaryOc,
      year,
      aiTimelineSlider
    );
  }

  return probability;
}

/**
 * Compute breach probability across all attack chains.
 * Returns max probability (most dangerous chain) per the "chain_max" model.
 */
export function computeBreachProbabilities(
  chains: Array<{ id: string; blocks_exploited: string[] }>,
  allBlocks: Block[],
  blockStates: Record<string, BlockState | string>,
  adversaryOc: number,
  year: number,
  aiTimelineSlider: number = 0.5
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const chain of chains) {
    result[chain.id] = chainBreachProbability(
      chain.blocks_exploited,
      allBlocks,
      blockStates,
      adversaryOc,
      year,
      aiTimelineSlider
    );
  }
  return result;
}
