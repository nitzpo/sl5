import type { Block, BlockState, Sliders } from "./types";
import { getAiCapability } from "./ai-curve";
import { blockEffectiveness } from "./scoring";
import { resolveLayer } from "../utils/ring-geometry";

const DEFAULT_SIGMOID_STEEPNESS = 1.5;
const DEFAULT_HARD_STOP_BYPASS = 0.02;
const DEFAULT_PROBABILISTIC_BYPASS = 0.15;
const DEFAULT_IMPLEMENTING_BYPASS = 0.5;
// Mirrors public/data/simulation-config.json breach_probability.defense_in_depth_discount
// (that file is not fetched at runtime; engine constants are hard-coded by convention)
const DEFAULT_PER_ADDITIONAL_LAYER_FACTOR = 0.6;
const DEFAULT_CORRELATION_PENALTY = 0.2;

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
  sliders: Sliders | number = 0.5
): number {
  const aiTimelineSlider = typeof sliders === "number" ? sliders : sliders.ai_timeline;
  const eff = blockEffectiveness(block, state, year, sliders);

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
 * Defense-in-depth discount: each additional independent defense layer that is
 * actually deployed along the chain multiplies breach probability by 0.6.
 * Layers whose blocks share a dependency (e.g., same vendor firmware) are
 * partially correlated, weakening the discount factor to 0.8.
 */
export function defenseInDepthDiscount(
  chainBlocks: Block[],
  blockStates: Record<string, BlockState | string>
): number {
  const deployed = chainBlocks.filter((b) => {
    const s = blockStates[b.id] ?? "not_started";
    return s === "deployed" || s === "mature";
  });

  const layers = new Set<string>();
  for (const block of deployed) {
    for (const raw of block.defense_in_depth.layer_contributions) {
      const layer = resolveLayer(raw);
      if (layer) layers.add(layer);
    }
  }
  if (layers.size < 2) return 1;

  const sharedDepCounts = new Map<string, number>();
  for (const block of deployed) {
    for (const dep of block.defense_in_depth.shared_dependencies) {
      sharedDepCounts.set(dep, (sharedDepCounts.get(dep) ?? 0) + 1);
    }
  }
  const correlated = [...sharedDepCounts.values()].some((n) => n >= 2);

  const factor = Math.min(
    1,
    DEFAULT_PER_ADDITIONAL_LAYER_FACTOR + (correlated ? DEFAULT_CORRELATION_PENALTY : 0)
  );
  return factor ** (layers.size - 1);
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
  sliders: Sliders | number = 0.5
): number {
  const blockMap = new Map(allBlocks.map((b) => [b.id, b]));
  const chainBlocks: Block[] = [];

  let probability = 1.0;
  for (const blockId of chainBlockIds) {
    const block = blockMap.get(blockId);
    if (!block) continue;
    chainBlocks.push(block);
    const state = blockStates[blockId] ?? "not_started";
    probability *= blockExploitProbability(
      block,
      state,
      adversaryOc,
      year,
      sliders
    );
  }

  probability *= defenseInDepthDiscount(chainBlocks, blockStates);

  return Math.max(0, Math.min(1, probability));
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
  sliders: Sliders | number = 0.5
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const chain of chains) {
    result[chain.id] = chainBreachProbability(
      chain.blocks_exploited,
      allBlocks,
      blockStates,
      adversaryOc,
      year,
      sliders
    );
  }
  return result;
}
