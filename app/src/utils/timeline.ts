/**
 * The one place the explorable's time axis is defined.
 *
 * The range used to be spelled out as literals in ~10 places (the track's YEARS
 * array, the header slider's min/max, a `?? 2024` / `?? 2030` in every playback
 * default, the decision-window deadline), so extending it meant finding all of
 * them. `app/public/data/world-state.json` carries the canonical values;
 * `tests/engine/data-integrity.test.ts` asserts these match it, which closes the
 * drift without threading async-loaded data into module constants.
 */
export const TIMELINE_START = 2024;
export const TIMELINE_END = 2030;

/** Where the app opens: the present, not the start of the axis. */
export const TIMELINE_REFERENCE = 2026;

/** Whole years on the axis — tick marks, labels, and the header slider's stops. */
export const TIMELINE_YEARS: number[] = Array.from(
  { length: TIMELINE_END - TIMELINE_START + 1 },
  (_, i) => TIMELINE_START + i
);

/** One month, in years. The engine already thinks in months
 * (`time_to_deploy_months`, `blockStateAtYear`), so this is time's natural grain. */
export const MONTH = 1 / 12;

export function clampYear(year: number): number {
  return Math.min(TIMELINE_END, Math.max(TIMELINE_START, year));
}

/**
 * Snap a year to the nearest month, clamped to the timeline.
 *
 * Playback runs on a continuous clock but writes the year into the simulation
 * store, and every store write re-runs the whole engine for every subscriber.
 * Monthly is the resolution that makes the readouts *move* — twelve small steps
 * a year instead of one leap — without paying for a recompute every frame.
 */
export function quantizeYear(year: number): number {
  // Round through integer months rather than multiplying by MONTH: 1/12 is not
  // exact in binary, so `Math.round(y / MONTH) * MONTH` returns 2023.9999999998
  // for a whole year, and that misses every `=== year` comparison downstream.
  return clampYear(Math.round(year * 12) / 12);
}
