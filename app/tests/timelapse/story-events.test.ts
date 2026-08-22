import { describe, it, expect } from "vitest";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { storyEvents, storyStops, adjacentStop } from "../../src/timelapse/events";
import { TIMELINE_START, TIMELINE_END } from "../../src/utils/timeline";
import type { TimeLapseScript } from "../../src/timelapse/types";

describe.each(SCRIPTS.map((s) => [s.id, s] as const))("story events: %s", (_id, script) => {
  const start = script.startYear ?? TIMELINE_START;
  const end = script.endYear ?? TIMELINE_END;

  it("are sorted, de-duplicated, and inside the story's own range", () => {
    const events = storyEvents(script);
    const years = events.map((e) => e.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(new Set(years).size).toBe(years.length);
    for (const y of years) {
      expect(y).toBeGreaterThanOrEqual(start);
      expect(y).toBeLessThanOrEqual(end);
    }
  });

  it("carry every annotation and every deployment the script declares", () => {
    const events = storyEvents(script);
    const messages = new Set(events.map((e) => e.message).filter(Boolean));
    for (const a of script.annotations ?? []) {
      if (a.atYear >= start && a.atYear <= end) expect(messages.has(a.message)).toBe(true);
    }
    const started = new Set(events.flatMap((e) => e.deployments));
    for (const d of script.deployments ?? []) {
      if (d.startYear >= start && d.startYear <= end) expect(started.has(d.blockId)).toBe(true);
    }
  });

  it("group a beat and the programmes starting with it into one moment", () => {
    // Two markers stacked on the same month would be indistinguishable on the
    // track and would make the step buttons appear to do nothing.
    for (const event of storyEvents(script)) {
      expect(event.message !== undefined || event.deployments.length > 0).toBe(true);
    }
  });

  it("include both ends as navigable stops", () => {
    const stops = storyStops(script);
    expect(stops[0]).toBe(start);
    expect(stops[stops.length - 1]).toBe(end);
  });

  it("let the transport walk every stop forward and back again", () => {
    const stops = storyStops(script);
    const forward: number[] = [start];
    let cursor: number | null = start;
    // +1 guards against a non-terminating walk turning into an infinite loop.
    for (let i = 0; i < stops.length + 1 && cursor !== null; i++) {
      cursor = adjacentStop(script, cursor, 1);
      if (cursor !== null) forward.push(cursor);
    }
    expect(forward).toEqual(stops);

    const backward: number[] = [end];
    cursor = end;
    for (let i = 0; i < stops.length + 1 && cursor !== null; i++) {
      cursor = adjacentStop(script, cursor, -1);
      if (cursor !== null) backward.push(cursor);
    }
    expect(backward.reverse()).toEqual(stops);
  });

  it("land on a beat or a deployment, never in six months of nothing", () => {
    // The point of the change: "next" means the next thing that happens.
    const moments = new Set(storyEvents(script).map((e) => e.year));
    let cursor = adjacentStop(script, start, 1);
    while (cursor !== null && cursor < end) {
      expect(moments.has(cursor)).toBe(true);
      cursor = adjacentStop(script, cursor, 1);
    }
  });
});

describe("a stop never precedes what it stands for", () => {
  // Moments are GROUPED by month, and `Math.round` can pull a mid-month year
  // backwards. If the stop took the rounded value, stepping to a deployment
  // would land just BEFORE the build starts -- the block would still look
  // untouched at the moment you stepped to it. No current script is off-month,
  // so only a synthetic one exercises this.
  const offMonth: TimeLapseScript = {
    id: "off-month",
    name: "Off-month",
    description: "deployments that do not land on a month boundary",
    type: "scripted",
    startYear: 2024,
    endYear: 2030,
    deployments: [
      { blockId: "NET-01", startYear: 2026.04 },  // rounds DOWN to 2026.00
      { blockId: "PER-01", startYear: 2027.96 },  // rounds UP to 2028.00
    ],
    annotations: [{ atYear: 2026.04, message: "same month as NET-01" }],
  };

  it("places every stop at or after each source it groups", () => {
    const events = storyEvents(offMonth);
    for (const dep of offMonth.deployments ?? []) {
      const event = events.find((e) => e.deployments.includes(dep.blockId))!;
      expect(event, `no event carries ${dep.blockId}`).toBeDefined();
      expect(
        event.year,
        `stepping to ${dep.blockId} lands at ${event.year} — before its ${dep.startYear} start`
      ).toBeGreaterThanOrEqual(dep.startYear);
    }
  });

  it("still merges a beat and a deployment sharing a month into one stop", () => {
    // The guard must not defeat the grouping it guards.
    const events = storyEvents(offMonth);
    const merged = events.filter((e) => e.deployments.includes("NET-01"));
    expect(merged).toHaveLength(1);
    expect(merged[0].message).toBe("same month as NET-01");
  });
});
