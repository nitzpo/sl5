import type { TimeLapseScript } from "./types";
import { TIMELINE_START, TIMELINE_END } from "../utils/timeline";

/** A moment where something happens in a story: a narrative beat, one or more
 * programmes starting, or both at once. */
export interface StoryEvent {
  year: number;
  /** Ids of blocks whose build starts here. Empty for a pure narrative beat. */
  deployments: string[];
  /** The annotation landing here, if any. */
  message?: string;
}

/** Group years to the month so 2028.25 and 2028.2500001 are the same moment. */
function monthKey(year: number): number {
  return Math.round(year * 12);
}

/**
 * Every moment where the story does something, sorted and de-duplicated.
 *
 * This is what the transport steps between: "next" should land on a beat or on
 * the month a programme breaks ground, not on an arbitrary half-year that may
 * be six months of nothing.
 */
export function storyEvents(script: TimeLapseScript): StoryEvent[] {
  const start = script.startYear ?? TIMELINE_START;
  const end = script.endYear ?? TIMELINE_END;
  const byKey = new Map<number, StoryEvent>();

  const at = (year: number): StoryEvent | null => {
    if (year < start || year > end) return null;
    const k = monthKey(year);
    let event = byKey.get(k);
    if (!event) {
      event = { year: k / 12, deployments: [] };
      byKey.set(k, event);
    }
    return event;
  };

  for (const dep of script.deployments ?? []) {
    at(dep.startYear)?.deployments.push(dep.blockId);
  }
  for (const annotation of script.annotations ?? []) {
    const event = at(annotation.atYear);
    // Two annotations on the same month would be a scripting mistake; the later
    // one wins, matching the caption the playback loop would end up showing.
    if (event) event.message = annotation.message;
  }

  return [...byKey.values()].sort((a, b) => a.year - b.year);
}

/**
 * Years the transport can step to: every story event, plus the story's own two
 * ends so stepping always terminates somewhere meaningful.
 */
export function storyStops(script: TimeLapseScript): number[] {
  const start = script.startYear ?? TIMELINE_START;
  const end = script.endYear ?? TIMELINE_END;
  const years = new Set<number>([start, end]);
  for (const event of storyEvents(script)) years.add(event.year);
  return [...years].sort((a, b) => a - b);
}

/**
 * The story's next (or previous) moment-something-happens, or null when there
 * is nothing to aim at — which is the caller's cue to fall back to a flat step.
 */
export function adjacentStop(
  script: TimeLapseScript,
  currentYear: number,
  direction: 1 | -1
): number | null {
  const stops = storyStops(script);
  // Only the story's own two ends: nothing worth stepping between.
  if (stops.length < 3) return null;
  const EPSILON = 1e-6;
  const candidates =
    direction === 1
      ? stops.filter((y) => y > currentYear + EPSILON)
      : stops.filter((y) => y < currentYear - EPSILON).reverse();
  return candidates[0] ?? null;
}
