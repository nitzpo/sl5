import { getAiCapability } from "./ai-curve";

const DEFAULT_BASE_RATE = 0.005; // 0.5% per month
const DEFAULT_AI_MULTIPLIER_AT_FULL = 4.0;
const DEFAULT_COMPROMISE_THRESHOLD = 0.8;

// Per-defense rate reductions, composed multiplicatively (independent effects).
export const OUTBOUND_DEFENSE_REDUCTION = 0.6; // AI-07 inference-channel outbound defense
export const RATE_LIMIT_REDUCTION = 0.4;       // NET-04 bandwidth/rate limitation

export interface DistillationParams {
  baseRate?: number;
  aiMultiplierAtFull?: number;
  compromiseThreshold?: number;
}

/** Combined extraction-rate reduction from the deployed anti-distillation
 * defenses. Effects compose multiplicatively: both AI-07 and NET-04 → 0.76. */
export function distillationDefenseReduction(flags: {
  outboundDefense?: boolean;
  rateLimiting?: boolean;
}): number {
  const passthrough =
    (flags.outboundDefense ? 1 - OUTBOUND_DEFENSE_REDUCTION : 1) *
    (flags.rateLimiting ? 1 - RATE_LIMIT_REDUCTION : 1);
  return 1 - passthrough;
}

/**
 * Compute cumulative extraction progress for a model served externally.
 * Integrates monthly extraction rate from start_year to target year.
 * `defenseReduction` is the fraction (0–1) shaved off the extraction rate by
 * deployed defenses — see distillationDefenseReduction.
 */
export function distillationProgress(
  targetYear: number,
  startYear: number = 2026,
  defenseReduction: number = 0,
  aiTimelineSlider: number = 0.5,
  params: DistillationParams = {}
): number {
  const baseRate = params.baseRate ?? DEFAULT_BASE_RATE;
  const aiMultAtFull = params.aiMultiplierAtFull ?? DEFAULT_AI_MULTIPLIER_AT_FULL;

  if (targetYear <= startYear) return 0.0;

  const months = Math.floor((targetYear - startYear) * 12);
  let progress = 0.0;

  for (let m = 0; m < months; m++) {
    const fracYear = startYear + m / 12.0;
    const aiCap = getAiCapability(fracYear, aiTimelineSlider);
    const aiMult = 1.0 + aiMultAtFull * aiCap;
    progress += baseRate * aiMult * (1 - defenseReduction);
  }

  return Math.min(progress, 1.0);
}

/**
 * Monthly extraction rate at a given year (for display purposes).
 */
export function monthlyExtractionRate(
  year: number,
  defenseReduction: number = 0,
  aiTimelineSlider: number = 0.5,
  params: DistillationParams = {}
): number {
  const baseRate = params.baseRate ?? DEFAULT_BASE_RATE;
  const aiMultAtFull = params.aiMultiplierAtFull ?? DEFAULT_AI_MULTIPLIER_AT_FULL;

  const aiCap = getAiCapability(year, aiTimelineSlider);
  const aiMult = 1.0 + aiMultAtFull * aiCap;
  return baseRate * aiMult * (1 - defenseReduction);
}

/**
 * Is the model effectively compromised via distillation?
 */
export function isModelCompromised(
  extractionProgress: number,
  threshold: number = DEFAULT_COMPROMISE_THRESHOLD
): boolean {
  return extractionProgress >= threshold;
}
