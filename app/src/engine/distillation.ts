import { getAiCapability } from "./ai-curve";

const DEFAULT_BASE_RATE = 0.005; // 0.5% per month
const DEFAULT_AI_MULTIPLIER_AT_FULL = 4.0;
const DEFAULT_DEFENSE_REDUCTION = 0.6;
const DEFAULT_COMPROMISE_THRESHOLD = 0.8;

export interface DistillationParams {
  baseRate?: number;
  aiMultiplierAtFull?: number;
  defenseReduction?: number;
  compromiseThreshold?: number;
}

/**
 * Compute cumulative extraction progress for a model served externally.
 * Integrates monthly extraction rate from start_year to target year.
 */
export function distillationProgress(
  targetYear: number,
  startYear: number = 2026,
  defensesDeployed: boolean = false,
  aiTimelineSlider: number = 0.5,
  params: DistillationParams = {}
): number {
  const baseRate = params.baseRate ?? DEFAULT_BASE_RATE;
  const aiMultAtFull = params.aiMultiplierAtFull ?? DEFAULT_AI_MULTIPLIER_AT_FULL;
  const defReduction = params.defenseReduction ?? DEFAULT_DEFENSE_REDUCTION;

  if (targetYear <= startYear) return 0.0;

  const months = Math.floor((targetYear - startYear) * 12);
  let progress = 0.0;

  for (let m = 0; m < months; m++) {
    const fracYear = startYear + m / 12.0;
    const aiCap = getAiCapability(fracYear, aiTimelineSlider);
    const aiMult = 1.0 + aiMultAtFull * aiCap;
    const effectiveRate =
      baseRate * aiMult * (defensesDeployed ? 1.0 - defReduction : 1.0);
    progress += effectiveRate;
  }

  return Math.min(progress, 1.0);
}

/**
 * Monthly extraction rate at a given year (for display purposes).
 */
export function monthlyExtractionRate(
  year: number,
  defensesDeployed: boolean = false,
  aiTimelineSlider: number = 0.5,
  params: DistillationParams = {}
): number {
  const baseRate = params.baseRate ?? DEFAULT_BASE_RATE;
  const aiMultAtFull = params.aiMultiplierAtFull ?? DEFAULT_AI_MULTIPLIER_AT_FULL;
  const defReduction = params.defenseReduction ?? DEFAULT_DEFENSE_REDUCTION;

  const aiCap = getAiCapability(year, aiTimelineSlider);
  const aiMult = 1.0 + aiMultAtFull * aiCap;
  return baseRate * aiMult * (defensesDeployed ? 1.0 - defReduction : 1.0);
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
