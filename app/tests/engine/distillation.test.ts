import { describe, it, expect } from "vitest";
import {
  distillationProgress,
  isModelCompromised,
  monthlyExtractionRate,
} from "../../src/engine/distillation";

describe("Distillation Accumulator", () => {
  it("returns 0 before start year", () => {
    expect(distillationProgress(2025)).toBe(0);
    expect(distillationProgress(2026)).toBe(0);
  });

  it("2027 no defenses matches Python (~17.7%)", () => {
    const p = distillationProgress(2027, 2026, false);
    expect(p).toBeCloseTo(0.177, 1);
  });

  it("2028 no defenses matches Python (~41%)", () => {
    const p = distillationProgress(2028, 2026, false);
    expect(p).toBeCloseTo(0.41, 1);
  });

  it("2030 no defenses matches Python (~97%)", () => {
    const p = distillationProgress(2030, 2026, false);
    expect(p).toBeCloseTo(0.97, 1);
  });

  it("defenses significantly slow extraction", () => {
    const noDefense = distillationProgress(2029, 2026, false);
    const withDefense = distillationProgress(2029, 2026, true);
    expect(withDefense).toBeLessThan(noDefense * 0.5);
  });

  it("2030 with defenses matches Python (~39%)", () => {
    const p = distillationProgress(2030, 2026, true);
    expect(p).toBeCloseTo(0.39, 1);
  });

  it("capped at 1.0", () => {
    const p = distillationProgress(2035, 2026, false);
    expect(p).toBe(1.0);
  });
});

describe("Model Compromise Check", () => {
  it("below threshold = not compromised", () => {
    expect(isModelCompromised(0.5)).toBe(false);
    expect(isModelCompromised(0.79)).toBe(false);
  });

  it("at/above threshold = compromised", () => {
    expect(isModelCompromised(0.8)).toBe(true);
    expect(isModelCompromised(0.95)).toBe(true);
  });
});

describe("Monthly Extraction Rate", () => {
  it("increases over time (AI amplification)", () => {
    const rate2026 = monthlyExtractionRate(2026);
    const rate2029 = monthlyExtractionRate(2029);
    expect(rate2029).toBeGreaterThan(rate2026);
  });

  it("defenses reduce rate", () => {
    const noDefense = monthlyExtractionRate(2028, false);
    const withDefense = monthlyExtractionRate(2028, true);
    expect(withDefense).toBeLessThan(noDefense);
  });
});
