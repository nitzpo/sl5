import { describe, it, expect } from "vitest";
import { sampleAt, type RiskSample } from "../../src/utils/risk-samples";

/** A stand-in for the quarter-year grid the track builds, on a rising ramp. */
const grid: RiskSample[] = Array.from({ length: 25 }, (_, i) => {
  const year = 2024 + i * 0.25;
  return { year, threat: i / 24, defense: 1 - i / 24, aiCap: i / 24, chainProbs: { "a-chain": i / 24 } };
});

describe("sampleAt", () => {
  it("interpolates between the two samples that bracket the year", () => {
    // Halfway between grid points, on a linear ramp: the exact midpoint.
    const mid = sampleAt(grid, 2024.125);
    expect(mid.threat).toBeCloseTo(0.5 / 24, 10);
    expect(mid.defense).toBeCloseTo(1 - 0.5 / 24, 10);
    expect(mid.chainProbs["a-chain"]).toBeCloseTo(0.5 / 24, 10);
  });

  it("returns grid points exactly", () => {
    expect(sampleAt(grid, 2027).threat).toBeCloseTo(12 / 24, 10);
  });

  it("clamps outside the timeline instead of extrapolating", () => {
    expect(sampleAt(grid, 1999).threat).toBe(grid[0].threat);
    expect(sampleAt(grid, 2099).threat).toBe(grid[grid.length - 1].threat);
  });

  it("degrades to the first sample on a non-finite year rather than throwing", () => {
    // A year reaches the store unvalidated from `#state=` share links and from
    // localStorage. NaN fails every range comparison, so without a guard the
    // index math produces `data[NaN]` — undefined — and the whole app blanks.
    // The lookup this function replaced returned the first sample instead.
    for (const bad of [NaN, -Infinity, undefined as unknown as number]) {
      expect(() => sampleAt(grid, bad)).not.toThrow();
      expect(sampleAt(grid, bad)).toBe(grid[0]);
    }
    // An infinity is not garbage, just out of range: clamp to the end it means.
    expect(sampleAt(grid, Infinity)).toBe(grid[grid.length - 1]);
  });
});
