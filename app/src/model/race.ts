import { getAiCapability } from "../engine/ai-curve";
import { scorePosture, type PostureInput } from "../engine/posture";
import type { AttackVector } from "../engine/types";
import { TIMELINE_END, TIMELINE_START } from "../utils/timeline";

/**
 * The race: when does AI lift the selected adversary into the next tier, and
 * where does the current posture's SL go meanwhile.
 *
 * THE THREAT FRONT. The engine scores an OC-n attacker on each vector at
 * `n + ai_shift × aiCapability(year)` (vector-model.ts `effectiveTier`). The
 * front is the first month in which that lift, on the vectors AI helps most
 * (the largest `ai_shift` in the data), reaches a whole tier: from then on an
 * OC-n attacker on code, credential and ML-stack work scores as OC-(n+1). It
 * depends only on the AI timeline, so it is the same line for every posture
 * (2030 on the default timeline, sooner on a faster one).
 */
export const FRONT_LIFT = 1;

/** The race shows defenses whose slowest estimate is at least this long. */
export const LONG_LEAD_MONTHS = 24;

export function maxAiShift(vectors: AttackVector[]): number {
  return vectors.reduce((m, v) => Math.max(m, v.ai_shift ?? 0), 0);
}

/** The year the front arrives, or null if it stays beyond `horizon`. Monthly. */
export function threatFrontYear(aiTimeline: number, shift: number, horizon = 2036): number | null {
  if (shift <= 0) return null;
  for (let m = 0; m <= (horizon - TIMELINE_START) * 12; m++) {
    const year = TIMELINE_START + m / 12;
    if (shift * getAiCapability(year, aiTimeline) >= FRONT_LIFT - 1e-9) return year;
  }
  return null;
}

export interface SlSample {
  year: number;
  level: number;
  progress: number;
  /** level + progress; tooltip only. */
  value: number;
  marginal: boolean;
}

/** Half-year grid across the timeline. */
export const RACE_YEARS: number[] = Array.from(
  { length: (TIMELINE_END - TIMELINE_START) * 2 + 1 },
  (_, i) => TIMELINE_START + i / 2
);

/** The current posture held fixed, scored at each year — through
 * `scorePosture`, so the strip at the store's year reads the rail's SL. */
export function slOverYears(input: Omit<PostureInput, "year">, years: number[] = RACE_YEARS): SlSample[] {
  return years.map((year) => {
    const { sl } = scorePosture({ ...input, year });
    return { year, level: sl.level, progress: sl.progress, value: sl.value, marginal: sl.marginal };
  });
}
