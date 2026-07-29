import type { AttackChain, Block, BlockState, Sliders } from "./types";
import { getAiCapability } from "./ai-curve";
import { blockEffectiveness, HYBRID_STRUCTURAL_SHARE } from "./scoring";
import { SUPPORTING_WEIGHT, supportingBlocks } from "./supporting";
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
// Hard stops are structural (an air gap either exists or it doesn't), so they
// resist far better than probabilistic controls and degrade only slowly with
// adversary capability. They are NOT absolute, though: a top-tier adversary
// bribes someone to carry a drive across the gap. Resist falls from
// HARD_STOP_RESIST_CEIL toward HARD_STOP_RESIST_FLOOR as effective OC rises past
// the block's exploitation threshold — a much narrower band than the
// probabilistic one (0.98→0.86 against 0.95→0.40), which is what still makes
// hard stops the best buy.
const HARD_STOP_BYPASS_SCALE = 0.12;
const HARD_STOP_RESIST_FLOOR = 0.86;
const HARD_STOP_RESIST_CEIL = 0.98;
// Probabilistic defenses lose up to PROB_BYPASS_SCALE of their resist against a
// strong adversary, so `1 − scale × bypass` asymptotes at 0.40 — that, not the
// clamp below, is the effective floor. PROB_RESIST_FLOOR sits under that
// asymptote and is unreachable today (bypass is sigmoid-bounded to (0, 1), so
// no retune of the scale alone can cross it); it guards future changes — an
// erosion coefficient past 0.65, or a bypass that stops being sigmoid-bounded.
const PROB_BYPASS_SCALE = 0.6;
const PROB_RESIST_FLOOR = 0.35;
const PROB_RESIST_CEIL = 0.95;        // vs a much weaker adversary, resists this much (not 100% — nothing is perfect)

// Defense-in-depth: each additional effective layer multiplies breach by this.
// Deliberately mild, because the per-block `∏ getPast` product ALREADY rewards
// having more layers — this factor is only a small extra credit for those layers
// being *independent* (different failure modes), not a second helping of depth.
// It was 0.6, which double-counted depth hard enough that a chain collapsed to
// near-zero once a handful of blocks matured.
const PER_ADDITIONAL_LAYER_FACTOR = 0.85;
// A layer whose block shares a failure mode with another block on the chain
// (same `shared_dependencies` entry) earns only half a layer of depth credit.
const CORRELATED_LAYER_WEIGHT = 0.5;
// Blocks still implementing provide partial depth, so the discount phases in
// smoothly instead of jumping at the implementing→deployed transition.
const IMPLEMENTING_LAYER_WEIGHT = 0.5;

// --- Irreducible residual risk ---
// No posture drives a live chain to zero. Even a fully mature program faces the
// insider who is never caught, the zero-day nobody has found, and the failure
// mode nobody modelled — and the SL5 premise is explicitly that full SL5 may not
// be achievable at all. Without a floor, maturing a chain's handful of named
// blocks drove it to ~0.1%, which read as "solved" and made near-perfect defense
// look cheap.
//
// The floor is scaled by the capability gate, so it is a floor on chains the
// adversary can actually attempt: an OC2 actor does not get a free 3% shot at a
// chain that needs OC4+. It is NOT applied to a chain held inert by a
// precondition (external serving), which stays exactly 0.
const RESIDUAL_RISK = 0.03;

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
 * reliably a *fully* deployed version stops THIS adversary — hard stops hold up
 * against a strong adversary nearly as well as a weak one, probabilistic defenses
 * do not, and hybrids fall between the two.
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

  // Every defense type erodes against a stronger adversary; hard stops just erode
  // far less (a narrow 0.98→0.86 band vs the probabilistic 0.95→0.40), and a
  // hybrid sits between the two — see HYBRID_STRUCTURAL_SHARE.
  const threshold = block.adversary_exploitation.oc_threshold_to_exploit;
  const bypass = sigmoidProbability(effectiveOc - threshold);
  const hardResist = clamp(
    HARD_STOP_RESIST_CEIL - HARD_STOP_BYPASS_SCALE * bypass,
    HARD_STOP_RESIST_FLOOR,
    HARD_STOP_RESIST_CEIL
  );
  const probResist = clamp(1 - PROB_BYPASS_SCALE * bypass, PROB_RESIST_FLOOR, PROB_RESIST_CEIL);
  // Interpolating between the two branches rather than picking a third constant:
  // a hybrid is then bracketed by them at every adversary capability by
  // construction, which is the property the tests assert and the one a future
  // retune of either band can't break.
  const resist =
    block.defense_type === "hard_stop"
      ? hardResist
      : block.defense_type === "hybrid"
        ? HYBRID_STRUCTURAL_SHARE * hardResist + (1 - HYBRID_STRUCTURAL_SHARE) * probResist
        : probResist;
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
      ? exploitedBlocks.reduce((s, b) => s + (b.adversary_exploitation?.ai_oc_shift ?? 0), 0) /
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
 * PER_ADDITIONAL_LAYER_FACTOR^(depth − 1), where depth sums per-layer credit
 * over the chain's defenses.
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

  // Supporting defenses (same defense family, not narrative steps) count at
  // reduced weight: the get-past term is interpolated toward 1, so a mature
  // supporting block removes ~a third of what a named block would.
  for (const block of supportingBlocks(chain, allBlocks)) {
    const state = blockStates[block.id] ?? "not_started";
    const getPast = blockExploitProbability(block, state, effectiveOc, year, sliders);
    pass *= 1 - SUPPORTING_WEIGHT * (1 - getPast);
  }

  pass *= defenseInDepthDiscount(defenseBlocks, blockStates);

  // Defenses can drive the modelled paths arbitrarily low, but never below the
  // residual: gate × RESIDUAL_RISK is the floor for an adversary who can attempt
  // this chain at all. Monotonicity is preserved — the floor depends only on the
  // adversary and the chain, never on block states, so advancing a block still
  // cannot raise the result.
  const floor = gate * RESIDUAL_RISK;
  return clamp(Math.max(gate * pass, floor), 0, 1);
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
