import type { DefenseType } from "./types";
import { HYBRID_STRUCTURAL_SHARE } from "./scoring";

/**
 * Counter erosion: how much of a counter's effect survives against a stronger
 * attacker.
 *
 * This file used to hold the chain breach model (capability gate, get-past
 * product, depth discount, per-chain residual floor). Phase 2 replaced chains
 * with the vector backbone in `vector-model.ts`; what survives here are the
 * erosion bands, which the vector model reuses unchanged.
 *
 * The bands are the ones the chain model was calibrated on. A hard stop is
 * structural, so it keeps nearly all of its effect against any tier — but not
 * all of it: a top-tier adversary bribes someone to carry a drive across the
 * air gap. A probabilistic control (monitoring, vetting, review) keeps much
 * less. Hybrids sit halfway, by the same `HYBRID_STRUCTURAL_SHARE` the
 * defender-side SL channel uses, so the two can't disagree about what a hybrid
 * is.
 *
 *   hard_stop      0.98 at tier 1 → 0.86 at tier 5   (narrow band)
 *   probabilistic  0.95 at tier 1 → 0.40 at tier 5   (wide band)
 *   hybrid         halfway between the two at every tier
 *
 * Per whole tier the bands are the reviewed table (tier 1..5), linear between
 * the ends and rounded to two decimals — the values the calibration probe was
 * run on, so the engine reproduces it exactly. Fractional tiers (AI lifts a
 * vector's tier by a fraction) interpolate linearly between whole tiers.
 *
 * The chain model reached the same ends through a sigmoid on each block's
 * `oc_threshold_to_exploit`; the vector model has a tier per vector instead, so
 * it reads the band directly. `oc_threshold_to_exploit` is not used by the
 * vector model.
 */
export const HARD_STOP_RESIST_CEIL = 0.98;
export const HARD_STOP_RESIST_FLOOR = 0.86;
export const PROB_RESIST_CEIL = 0.95;
export const PROB_RESIST_FLOOR = 0.4;

/** Retention at tiers 1..5. */
export const RETENTION_BY_TIER: Readonly<Record<"hard_stop" | "probabilistic", readonly number[]>> = {
  hard_stop: [HARD_STOP_RESIST_CEIL, 0.95, 0.92, 0.89, HARD_STOP_RESIST_FLOOR],
  probabilistic: [PROB_RESIST_CEIL, 0.81, 0.68, 0.54, PROB_RESIST_FLOOR],
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function bandAt(values: readonly number[], tier: number): number {
  const t = clamp(tier, 1, 5);
  const lo = Math.floor(t);
  const hi = Math.ceil(t);
  return values[lo - 1] + (values[hi - 1] - values[lo - 1]) * (t - lo);
}

/** Share of a counter's effect that survives at `tier` (1–5, fractional
 * allowed: tiers lifted by AI are fractional). Non-increasing in tier for every
 * type, and hybrid always sits between the other two. */
export function counterRetention(type: DefenseType, tier: number): number {
  const hard = bandAt(RETENTION_BY_TIER.hard_stop, tier);
  const prob = bandAt(RETENTION_BY_TIER.probabilistic, tier);
  if (type === "hard_stop") return hard;
  if (type === "probabilistic") return prob;
  return HYBRID_STRUCTURAL_SHARE * hard + (1 - HYBRID_STRUCTURAL_SHARE) * prob;
}
