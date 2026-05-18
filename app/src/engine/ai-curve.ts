import type { AiCapabilityCurve } from "./types";

const DEFAULT_CURVE: AiCapabilityCurve = {
  default_curve: [
    { year: 2024, capability: 0.0 },
    { year: 2025, capability: 0.15 },
    { year: 2026, capability: 0.35 },
    { year: 2027, capability: 0.65 },
    { year: 2028, capability: 0.82 },
    { year: 2029, capability: 0.93 },
    { year: 2030, capability: 1.0 },
  ],
  optimistic_multiplier: 0.7,
  pessimistic_multiplier: 1.5,
};

/**
 * Interpolate AI capability for a given year, adjusted by the AI timeline slider.
 * Slider: 0 = pessimistic (slower), 0.5 = default, 1 = optimistic (faster).
 */
export function getAiCapability(
  year: number,
  aiTimelineSlider: number = 0.5,
  curve: AiCapabilityCurve = DEFAULT_CURVE
): number {
  // Adjust the effective year based on slider
  // Optimistic: time moves faster (multiply elapsed years)
  // Pessimistic: time moves slower
  const baseYear = curve.default_curve[0].year;
  const elapsed = year - baseYear;

  let timeMultiplier: number;
  if (aiTimelineSlider >= 0.5) {
    // 0.5→1.0 maps to 1.0→(1/optimistic_multiplier)
    const t = (aiTimelineSlider - 0.5) * 2;
    timeMultiplier = 1.0 + t * (1.0 / curve.optimistic_multiplier - 1.0);
  } else {
    // 0.0→0.5 maps to (1/pessimistic_multiplier)→1.0
    const t = aiTimelineSlider * 2;
    timeMultiplier = 1.0 / curve.pessimistic_multiplier + t * (1.0 - 1.0 / curve.pessimistic_multiplier);
  }

  const effectiveYear = baseYear + elapsed * timeMultiplier;

  // Interpolate on the curve
  const points = curve.default_curve;
  if (effectiveYear <= points[0].year) return points[0].capability;
  if (effectiveYear >= points[points.length - 1].year)
    return points[points.length - 1].capability;

  for (let i = 0; i < points.length - 1; i++) {
    if (effectiveYear >= points[i].year && effectiveYear <= points[i + 1].year) {
      const t =
        (effectiveYear - points[i].year) /
        (points[i + 1].year - points[i].year);
      return points[i].capability + t * (points[i + 1].capability - points[i].capability);
    }
  }

  return 0;
}
