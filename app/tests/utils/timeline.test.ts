import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  TIMELINE_START,
  TIMELINE_END,
  TIMELINE_REFERENCE,
  TIMELINE_YEARS,
  clampYear,
  quantizeYear,
} from "../../src/utils/timeline";
import { formatYear } from "../../src/utils/format";

const worldState = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../public/data/world-state.json"), "utf-8")
);

describe("timeline constants", () => {
  it("match the canonical range in world-state.json", () => {
    // The range used to be spelled out as literals in ~10 places while this
    // JSON — the declared source of truth — went unread. Pin them together.
    expect(TIMELINE_START).toBe(worldState.timeline.start_year);
    expect(TIMELINE_END).toBe(worldState.timeline.end_year);
    expect(TIMELINE_REFERENCE).toBe(worldState.timeline.reference_year);
  });

  it("expand to every whole year on the axis", () => {
    expect(TIMELINE_YEARS[0]).toBe(TIMELINE_START);
    expect(TIMELINE_YEARS[TIMELINE_YEARS.length - 1]).toBe(TIMELINE_END);
    expect(TIMELINE_YEARS).toHaveLength(TIMELINE_END - TIMELINE_START + 1);
  });
});

describe("quantizeYear", () => {
  it("snaps to the nearest month", () => {
    expect(quantizeYear(2027.5)).toBeCloseTo(2027.5, 10);
    expect(quantizeYear(2027 + 1 / 24)).toBeCloseTo(2027 + 1 / 12, 10);
    expect(quantizeYear(2027 + 0.001)).toBe(2027);
  });

  it("returns whole years exactly, not 2026.9999999998", () => {
    // Several call sites compare the quantized year against a whole year; a
    // float-drifted result would silently miss every one of them.
    for (const y of TIMELINE_YEARS) {
      expect(quantizeYear(y)).toBe(y);
    }
  });

  it("clamps to the timeline", () => {
    expect(quantizeYear(1999)).toBe(TIMELINE_START);
    expect(quantizeYear(2099)).toBe(TIMELINE_END);
    expect(clampYear(2027)).toBe(2027);
  });
});

describe("formatYear", () => {
  it("names the year on a boundary and the month inside one", () => {
    expect(formatYear(2027)).toBe("2027");
    expect(formatYear(2027.5)).toBe("Jul 2027");
    expect(formatYear(2027 + 1 / 12)).toBe("Feb 2027");
    expect(formatYear(2028.25)).toBe("Apr 2028");
  });

  it("rolls the last sliver of a year up rather than calling it December", () => {
    // The marker sits on the 2028 tick at 2027.99; labelling it "Dec 2027"
    // would contradict the tick it is standing on.
    expect(formatYear(2027.99)).toBe("2028");
  });
});
