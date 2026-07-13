import type { AttackChain, Block, BlockState, Sliders } from "./types";
import { getAiCapability } from "./ai-curve";
import { blockEffectiveness } from "./scoring";
import { resolveLayer } from "../utils/ring-geometry";

const DEFAULT_SIGMOID_STEEPNESS = 1.5;

// --- Breach model constants (monotonic get-past + capability gate) ---
// Capability gate calibration: OC tiers are qualitative jumps, so the gate is
// steep. Solving gate(min_oc) ≈ 0.85 and gate(min_oc − 1) ≈ 0.10 gives
// steepness ≈ 3.9, offset ≈ 0.44 — rounded to 4.0 / 0.45. An adversary a full
// tier below a chain's minimum is largely locked out until AI capability
// lifts its effective OC.
const GATE_STEEPNESS = 4.0;
const GATE_OFFSET = 0.45;
// How reliably a fully-deployed defense resists, by type:
const HARD_STOP_RESIST = 0.98;        // deterministic, OC-independent → mature hard stop get-past ≈ 0.02
const PROB_BYPASS_SCALE = 0.6;        // probabilistic defenses lose up to this much resist vs strong OC
const PROB_RESIST_FLOOR = 0.35;       // even vs a much stronger adversary, a mature prob. defense resists this much
const PROB_RESIST_CEIL = 0.95;        // vs a much weaker adversary, resists this much (not 100% — nothing is perfect)

// Defense-in-depth: each additional effective layer multiplies breach by this.
const PER_ADDITIONAL_LAYER_FACTOR = 0.6;
// A layer whose block shares a failure mode with another block on the chain
// (same `shared_dependencies` entry) earns only half a layer of depth credit.
const CORRELATED_LAYER_WEIGHT = 0.5;
// Blocks still implementing provide partial depth, so the discount phases in
// smoothly instead of jumping at the implementing→deployed transition.
const IMPLEMENTING_LAYER_WEIGHT = 0.5;

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
 *
 * AI's attacker-side lift is already inside `effectiveOc`, so effectiveness is
 * evaluated WITHOUT the defender-side AI erosion (see blockEffectiveness).
 */
export function blockExploitProbability(
  block: Block,
  state: BlockState | string,
  effectiveOc: number,
  year: number,
  sliders: Sliders | number = 0.5
): number {
  const eff = blockEffectiveness(block, state, year, sliders, { aiErosion: false });
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

/**
 * Effective adversary OC for a chain: base OC plus AI-driven capability lift.
 * The lift averages over the blocks the attack exploits (attack-side property),
 * not over the defenses that might stop it.
 */
function chainEffectiveOc(
  exploitedBlocks: Block[],
  adversaryOc: number,
  year: number,
  aiTimelineSlider: number
): number {
  const aiCap = getAiCapability(year, aiTimelineSlider);
  const avgShift =
    exploitedBlocks.length > 0
      ? exploitedBlocks.reduce((s, b) => s + b.adversary_exploitation.ai_oc_shift, 0) /
        exploitedBlocks.length
      : 0;
  return adversaryOc + avgShift * aiCap;
}

/** A block's primary defense-in-depth layer: the first contribution that
 * resolves to a canonical layer. One block can never earn multi-layer credit
 * by itself. */
function primaryLayer(block: Block): string | null {
  for (const raw of block.defense_in_depth?.layer_contributions ?? []) {
    const layer = resolveLayer(raw);
    if (layer) return layer;
  }
  return null;
}

/**
 * Defense-in-depth discount: breach probability is multiplied by
 * 0.6^(depth − 1), where depth sums per-layer credit over the chain's defenses.
 *
 * Monotone by construction — advancing or adding a block can only raise depth:
 *  - each block credits at most its PRIMARY layer (no self-depth from one block);
 *  - a layer's credit is the best contributing block's weight
 *    (mature/deployed = 1, implementing = 0.5, otherwise 0);
 *  - correlation is an ARCHITECTURAL property: a block that shares a
 *    `shared_dependencies` entry with any other block on the chain earns
 *    half-weight credit, regardless of what happens to be deployed today.
 *    Because the correlation census is computed over the chain's full block
 *    list (state-independent), deploying one more block never re-weights an
 *    already-counted layer downward.
 */
export function defenseInDepthDiscount(
  chainBlocks: Block[],
  blockStates: Record<string, BlockState | string>
): number {
  // Static census: which shared dependencies appear on ≥2 blocks of this chain
  const depCounts = new Map<string, number>();
  for (const block of chainBlocks) {
    for (const dep of new Set(block.defense_in_depth?.shared_dependencies ?? [])) {
      depCounts.set(dep, (depCounts.get(dep) ?? 0) + 1);
    }
  }
  const correlatedBlocks = new Set<string>();
  for (const block of chainBlocks) {
    const deps = block.defense_in_depth?.shared_dependencies ?? [];
    if (deps.some((dep) => (depCounts.get(dep) ?? 0) >= 2)) {
      correlatedBlocks.add(block.id);
    }
  }

  const layerCredit = new Map<string, number>();
  for (const block of chainBlocks) {
    const state = blockStates[block.id] ?? "not_started";
    const stateWeight =
      state === "deployed" || state === "mature"
        ? 1
        : state === "implementing"
          ? IMPLEMENTING_LAYER_WEIGHT
          : 0;
    if (stateWeight === 0) continue;
    const layer = primaryLayer(block);
    if (!layer) continue;
    const credit = stateWeight * (correlatedBlocks.has(block.id) ? CORRELATED_LAYER_WEIGHT : 1);
    layerCredit.set(layer, Math.max(layerCredit.get(layer) ?? 0, credit));
  }

  const depth = [...layerCredit.values()].reduce((a, b) => a + b, 0);
  if (depth <= 1) return 1;
  return PER_ADDITIONAL_LAYER_FACTOR ** (depth - 1);
}

/**
 * Probability that an adversary succeeds along an attack chain.
 *
 *   P = preconditionLive × capabilityGate(min_oc) × ∏ getPast(block) × defenseInDepthDiscount
 *
 * The capability gate (can this adversary even attempt the chain) is separate from
 * defense bypass (do the deployed defenses stop them), so with no defenses the
 * result scales with adversary capability, and adding defenses only lowers it.
 *
 * The defenses evaluated are the union of the chain's `blocks_exploited` and
 * its `stoppers` — every block the data names as stopping this chain is
 * mechanically real, not narrative-only.
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
  const exploitedBlocks = chain.blocks_exploited
    .map((id) => blockMap.get(id))
    .filter((b): b is Block => b !== undefined);
  const defenseIds = new Set<string>([...chain.blocks_exploited, ...(chain.stoppers ?? [])]);
  const defenseBlocks = [...defenseIds]
    .map((id) => blockMap.get(id))
    .filter((b): b is Block => b !== undefined);

  const effectiveOc = chainEffectiveOc(exploitedBlocks, adversaryOc, year, aiTimelineSlider);

  // Capability gate: comfortably attemptable at min_oc, largely closed a tier below.
  const gate = sigmoidProbability(
    effectiveOc - (chain.adversary_profile.min_oc - GATE_OFFSET),
    GATE_STEEPNESS
  );

  let pass = 1.0;
  for (const block of defenseBlocks) {
    const state = blockStates[block.id] ?? "not_started";
    pass *= blockExploitProbability(block, state, effectiveOc, year, sliders);
  }

  pass *= defenseInDepthDiscount(defenseBlocks, blockStates);

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
