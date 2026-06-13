import type { AttackChain, Block, BlockState, Sliders } from "./types";
import { getAiCapability } from "./ai-curve";
import { blockEffectiveness } from "./scoring";
import { resolveLayer } from "../utils/ring-geometry";

const DEFAULT_SIGMOID_STEEPNESS = 1.5;

// --- Breach model constants (see plan: monotonic get-past + capability gate) ---
// Capability gate: at oc == chain.min_oc the adversary can comfortably attempt it.
const GATE_OFFSET = 0.5;
// How reliably a fully-deployed defense resists, by type:
const HARD_STOP_RESIST = 0.98;        // deterministic, OC-independent → mature hard stop get-past ≈ 0.02
const PROB_BYPASS_SCALE = 0.6;        // probabilistic defenses lose up to this much resist vs strong OC
const PROB_RESIST_FLOOR = 0.35;       // even vs a much stronger adversary, a mature prob. defense resists this much
const PROB_RESIST_CEIL = 0.95;        // vs a much weaker adversary, resists this much (not 100% — nothing is perfect)

// Mirrors public/data/simulation-config.json breach_probability.defense_in_depth_discount
// (that file is not fetched at runtime; engine constants are hard-coded by convention)
const DEFAULT_PER_ADDITIONAL_LAYER_FACTOR = 0.6;
const DEFAULT_CORRELATION_PENALTY = 0.2;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

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
 * Probability that an adversary gets *past* a single block on an attack path.
 *
 * Monotonic by construction: an absent block is no obstacle (returns 1); as the
 * block matures, effectiveness rises 0→1 and the term falls toward (1 - resist),
 * so improving a defense can never raise breach probability. `resist` captures how
 * reliably a *fully* deployed version stops THIS adversary — hard stops are
 * deterministic, probabilistic defenses weaken against stronger adversaries.
 */
export function blockExploitProbability(
  block: Block,
  state: BlockState | string,
  effectiveOc: number,
  year: number,
  sliders: Sliders | number = 0.5
): number {
  const eff = blockEffectiveness(block, state, year, sliders);
  if (eff <= 0) return 1.0;

  let resist: number;
  if (block.defense_type === "hard_stop") {
    resist = HARD_STOP_RESIST;
  } else {
    const threshold = block.adversary_exploitation.oc_threshold_to_exploit;
    resist = clamp(
      1 - PROB_BYPASS_SCALE * sigmoidProbability(effectiveOc - threshold),
      PROB_RESIST_FLOOR,
      PROB_RESIST_CEIL
    );
  }
  return 1 - eff * resist;
}

/** Effective adversary OC for a chain: base OC plus AI-driven capability lift. */
function chainEffectiveOc(
  chainBlocks: Block[],
  adversaryOc: number,
  year: number,
  aiTimelineSlider: number
): number {
  const aiCap = getAiCapability(year, aiTimelineSlider);
  const avgShift =
    chainBlocks.length > 0
      ? chainBlocks.reduce((s, b) => s + b.adversary_exploitation.ai_oc_shift, 0) /
        chainBlocks.length
      : 0;
  return adversaryOc + avgShift * aiCap;
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
    for (const raw of block.defense_in_depth?.layer_contributions ?? []) {
      const layer = resolveLayer(raw);
      if (layer) layers.add(layer);
    }
  }
  if (layers.size < 2) return 1;

  const sharedDepCounts = new Map<string, number>();
  for (const block of deployed) {
    for (const dep of block.defense_in_depth?.shared_dependencies ?? []) {
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
 *
 *   P = preconditionLive × capabilityGate(min_oc) × ∏ getPast(block) × defenseInDepthDiscount
 *
 * The capability gate (can this adversary even attempt the chain) is separate from
 * defense bypass (do the deployed defenses stop them), so with no defenses the
 * result scales with adversary capability, and adding defenses only lowers it.
 */
export function chainBreachProbability(
  chain: AttackChain,
  allBlocks: Block[],
  blockStates: Record<string, BlockState | string>,
  adversaryOc: number,
  year: number,
  sliders: Sliders | number = 0.5,
  modelServedExternally: boolean = true
): number {
  // Precondition: API-extraction chains are inert unless the model is served externally.
  if (chain.requires_external_serving && !modelServedExternally) return 0;

  const aiTimelineSlider = typeof sliders === "number" ? sliders : sliders.ai_timeline;
  const blockMap = new Map(allBlocks.map((b) => [b.id, b]));
  const chainBlocks = chain.blocks_exploited
    .map((id) => blockMap.get(id))
    .filter((b): b is Block => b !== undefined);

  const effectiveOc = chainEffectiveOc(chainBlocks, adversaryOc, year, aiTimelineSlider);

  // Capability gate: at oc == min_oc the adversary can comfortably attempt the chain.
  const gate = sigmoidProbability(effectiveOc - (chain.adversary_profile.min_oc - GATE_OFFSET));

  let pass = 1.0;
  for (const block of chainBlocks) {
    const state = blockStates[block.id] ?? "not_started";
    pass *= blockExploitProbability(block, state, effectiveOc, year, sliders);
  }

  pass *= defenseInDepthDiscount(chainBlocks, blockStates);

  return clamp(gate * pass, 0, 1);
}

/**
 * Compute breach probability across all attack chains.
 * Returns probability per chain; callers take the max (most dangerous chain).
 */
export function computeBreachProbabilities(
  chains: AttackChain[],
  allBlocks: Block[],
  blockStates: Record<string, BlockState | string>,
  adversaryOc: number,
  year: number,
  sliders: Sliders | number = 0.5,
  modelServedExternally: boolean = true
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const chain of chains) {
    result[chain.id] = chainBreachProbability(
      chain,
      allBlocks,
      blockStates,
      adversaryOc,
      year,
      sliders,
      modelServedExternally
    );
  }
  return result;
}
