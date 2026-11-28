/**
 * Threat-relative security level: SL-n means the posture holds OC-n.
 *
 *   tier n holds   ⇔  campaign success for OC-n < τ           (τ = sliders.sl_bar)
 *   SL             =  the highest n such that every tier ≤ n holds
 *                     (SL5 also requires the AI-insider approach below τ)
 *   level 0        =  OC1 not held
 *
 * Progress toward the next level is continuous: on a log scale, how far the
 * first failing tier has come from certain success (p = 1) to the bar,
 * `log(p) / log(τ)` clamped to [0, 1]. It depends only on that tier's p and τ,
 * so it never falls when a block is advanced and never rises when the clock
 * moves forward (both p's move the right way), and it is exactly 1 at the
 * moment the tier starts to hold.
 */

export const SL_BAR_PRESETS = { strict: 0.1, standard: 0.2, lenient: 0.33 } as const;
export const DEFAULT_SL_BAR = SL_BAR_PRESETS.standard;
export const DEFAULT_AI_PROPENSITY = 0.5;

/** A held tier this close to the bar (within 25% of τ) is flagged marginal. */
export const MARGINAL_SHARE = 0.75;
/** Above this a tier "usually succeeds"; between τ and it, "contested". */
export const SUCCEEDS_ABOVE = 0.55;

export type BandWord = "usually fails" | "contested" | "usually succeeds";

/** ICD 203 estimative language, for the hover detail. */
export type Icd203Word =
  | "almost no chance"
  | "very unlikely"
  | "unlikely"
  | "roughly even chance"
  | "likely"
  | "very likely"
  | "almost certain";

export function bandWord(p: number, bar: number): BandWord {
  if (p < bar) return "usually fails";
  if (p <= SUCCEEDS_ABOVE) return "contested";
  return "usually succeeds";
}

export function icd203Word(p: number): Icd203Word {
  if (p < 0.05) return "almost no chance";
  if (p < 0.2) return "very unlikely";
  if (p < 0.45) return "unlikely";
  if (p <= 0.55) return "roughly even chance";
  if (p <= 0.8) return "likely";
  if (p <= 0.95) return "very likely";
  return "almost certain";
}

/** log(p)/log(τ), clamped: 0 at certain success, 1 at the bar. */
export function progressToward(p: number, bar: number): number {
  if (p < bar) return 1;
  if (p >= 1) return 0;
  if (p <= 0) return 1;
  return Math.min(1, Math.max(0, Math.log(p) / Math.log(bar)));
}

export interface LevelInput {
  /** Campaign p for OC1..OC5, index 0 = OC1. */
  tierP: number[];
  aiInsiderP: number;
  bar: number;
}

export interface LevelResult {
  level: number;
  progress: number;
  /** level + progress, capped at 5 — the continuous readout (decimal on hover). */
  value: number;
  marginal: boolean;
  /** The tier (1–5) that blocks the next level, and whether it is the AI-insider
   * condition at SL5 rather than OC5 itself; null at SL5. */
  blocking: { tier: number; aiInsider: boolean } | null;
}

export function securityLevel({ tierP, aiInsiderP, bar }: LevelInput): LevelResult {
  let level = 0;
  for (let n = 1; n <= 5; n++) {
    const held = tierP[n - 1] < bar && (n < 5 || aiInsiderP < bar);
    if (!held) break;
    level = n;
  }
  if (level === 5) {
    const marginal = tierP[4] >= MARGINAL_SHARE * bar || aiInsiderP >= MARGINAL_SHARE * bar;
    return { level, progress: 1, value: 5, marginal, blocking: null };
  }
  const next = level + 1;
  const tierProgress = progressToward(tierP[next - 1], bar);
  let progress = tierProgress;
  let aiInsider = false;
  if (next === 5) {
    // SL5 needs both OC5 and the AI insider held; progress is the further of
    // the two from the bar, and the AI insider is what blocks when it fails and
    // is at least as far from the bar as OC5 (or OC5 already holds).
    const aiProgress = progressToward(aiInsiderP, bar);
    progress = Math.min(tierProgress, aiProgress);
    aiInsider = aiInsiderP >= bar && (tierP[4] < bar || aiProgress <= tierProgress);
  }
  const marginal = level > 0 && tierP[level - 1] >= MARGINAL_SHARE * bar;
  return {
    level,
    progress,
    value: Math.min(5, level + progress),
    marginal,
    blocking: { tier: next, aiInsider },
  };
}
