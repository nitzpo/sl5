import { TIMELINE_START, TIMELINE_END } from "./timeline";

/**
 * Sampling the risk curves, and reading a value off them at an arbitrary year.
 *
 * Its own module rather than part of `TimelineTrack`: the track is a component
 * file, and the repo's `react-refresh/only-export-components` rule reserves
 * those for components. Pure and React-free, so it is directly testable.
 */

/** The curves are sampled on this grid, not on the seven whole-year ticks.
 * Every scripted deployment starts on a .0/.25/.5 boundary, so a quarter-year
 * grid lands exactly on them and the defense line finally shows the step where
 * a block arrives instead of a straight line drawn through it. */
export const SAMPLE_STEP = 0.25;

export const SAMPLE_YEARS: number[] = Array.from(
  { length: Math.round((TIMELINE_END - TIMELINE_START) / SAMPLE_STEP) + 1 },
  (_, i) => TIMELINE_START + i * SAMPLE_STEP
);

export interface RiskSample {
  year: number;
  threat: number;
  defense: number;
  aiCap: number;
  chainProbs: Record<string, number>;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The curve values at an arbitrary year, interpolated between the two samples
 * that bracket it.
 *
 * This used to be `riskData.find((d) => d.year === year)`, which silently fell
 * back to 2024's numbers the moment the year stopped being one of seven exact
 * integers — which is precisely what continuous playback made it.
 */
export function sampleAt(data: RiskSample[], year: number): RiskSample {
  const first = data[0];
  const last = data[data.length - 1];
  // A year from a truncated share link or stale localStorage reaches the store
  // unvalidated, and NaN fails every comparison below -- it would index the
  // array with NaN and blank the app. The lookup this replaced degraded to a
  // sample instead of throwing, so keep doing that. An infinity still clamps to
  // the end it actually means.
  if (year === Infinity) return last;
  if (!Number.isFinite(year)) return first;
  if (year <= first.year) return first;
  if (year >= last.year) return last;
  const i = Math.min(data.length - 2, Math.floor((year - first.year) / SAMPLE_STEP));
  const a = data[i];
  const b = data[i + 1];
  const t = (year - a.year) / (b.year - a.year);
  const chainProbs: Record<string, number> = {};
  for (const id of Object.keys(a.chainProbs)) {
    chainProbs[id] = lerp(a.chainProbs[id], b.chainProbs[id] ?? a.chainProbs[id], t);
  }
  return {
    year,
    threat: lerp(a.threat, b.threat, t),
    defense: lerp(a.defense, b.defense, t),
    aiCap: lerp(a.aiCap, b.aiCap, t),
    chainProbs,
  };
}
