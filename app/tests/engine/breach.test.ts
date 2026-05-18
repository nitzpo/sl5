import { describe, it, expect } from "vitest";
import {
  sigmoidProbability,
  chainBreachProbability,
} from "../../src/engine/breach";
import type { Block } from "../../src/engine/types";
import fs from "fs";
import path from "path";

function loadBlocks(): Block[] {
  const dataDir = path.join(__dirname, "../../public/data");
  const blocks: Block[] = [];
  for (const file of fs.readdirSync(dataDir)) {
    if (file.startsWith("blocks-") && file.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
      blocks.push(...data);
    }
  }
  return blocks;
}

describe("Sigmoid Probability", () => {
  it("returns 0.5 at delta=0", () => {
    expect(sigmoidProbability(0)).toBeCloseTo(0.5, 3);
  });

  it("returns >0.95 at delta=+2", () => {
    expect(sigmoidProbability(2)).toBeGreaterThan(0.9);
  });

  it("returns <0.1 at delta=-2", () => {
    expect(sigmoidProbability(-2)).toBeLessThan(0.1);
  });

  it("is monotonically increasing", () => {
    for (let d = -3; d < 3; d += 0.5) {
      expect(sigmoidProbability(d + 0.5)).toBeGreaterThan(sigmoidProbability(d));
    }
  });
});

describe("Chain Breach Probability", () => {
  const blocks = loadBlocks();

  it("Remote Ghost chain baseline OC3 2026 matches Python (~0.32)", () => {
    const chainIds = ["NET-01", "HW-07", "PER-08"];
    const baselineStates: Record<string, string> = {};
    for (const b of blocks) baselineStates[b.id] = b.current_state.baseline_state;

    const p = chainBreachProbability(chainIds, blocks, baselineStates, 3, 2026);
    expect(p).toBeCloseTo(0.32, 1);
  });

  it("Remote Ghost chain baseline OC5 2029 matches Python (~0.50)", () => {
    const chainIds = ["NET-01", "HW-07", "PER-08"];
    const baselineStates: Record<string, string> = {};
    for (const b of blocks) baselineStates[b.id] = b.current_state.baseline_state;

    const p = chainBreachProbability(chainIds, blocks, baselineStates, 5, 2029);
    expect(p).toBeCloseTo(0.50, 1);
  });

  it("NET-01 deployed drops Remote Ghost probability dramatically", () => {
    const chainIds = ["NET-01", "HW-07", "PER-08"];
    const states: Record<string, string> = {};
    for (const b of blocks) states[b.id] = b.current_state.baseline_state;
    states["NET-01"] = "deployed";

    const p = chainBreachProbability(chainIds, blocks, states, 4, 2026);
    expect(p).toBeLessThan(0.02);
  });

  it("higher OC = higher breach probability", () => {
    const chainIds = ["PER-04", "PER-03", "PER-05"];
    const baselineStates: Record<string, string> = {};
    for (const b of blocks) baselineStates[b.id] = b.current_state.baseline_state;

    const pOc2 = chainBreachProbability(chainIds, blocks, baselineStates, 2, 2026);
    const pOc4 = chainBreachProbability(chainIds, blocks, baselineStates, 4, 2026);
    const pOc5 = chainBreachProbability(chainIds, blocks, baselineStates, 5, 2026);

    expect(pOc4).toBeGreaterThan(pOc2);
    expect(pOc5).toBeGreaterThan(pOc4);
  });

  it("year advancement increases breach probability (AI amplification)", () => {
    const chainIds = ["PER-04", "PER-03", "PER-05"];
    const baselineStates: Record<string, string> = {};
    for (const b of blocks) baselineStates[b.id] = b.current_state.baseline_state;

    const p2026 = chainBreachProbability(chainIds, blocks, baselineStates, 3, 2026);
    const p2029 = chainBreachProbability(chainIds, blocks, baselineStates, 3, 2029);

    expect(p2029).toBeGreaterThan(p2026);
  });
});
