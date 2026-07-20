import { describe, it, expect } from "vitest";
import {
  blockEffectiveness,
  overallSlScore,
  computeCategoryScores,
  getStateEffectiveness,
} from "../../src/engine/scoring";
import { getAiCapability } from "../../src/engine/ai-curve";
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

describe("State Effectiveness", () => {
  it("maps states to correct values", () => {
    expect(getStateEffectiveness("not_started")).toBe(0.0);
    expect(getStateEffectiveness("investing")).toBe(0.1);
    expect(getStateEffectiveness("implementing")).toBe(0.4);
    expect(getStateEffectiveness("deployed")).toBe(0.85);
    expect(getStateEffectiveness("mature")).toBe(1.0);
  });
});

describe("AI Capability Curve", () => {
  it("returns 0 at 2024, 1 at 2030 (default slider)", () => {
    expect(getAiCapability(2024)).toBe(0.0);
    expect(getAiCapability(2030)).toBe(1.0);
  });

  it("interpolates mid-years correctly", () => {
    const cap2027 = getAiCapability(2027);
    expect(cap2027).toBeCloseTo(0.65, 1);
  });

  it("pessimistic slider slows advancement", () => {
    const defaultCap = getAiCapability(2027, 0.5);
    const pessimisticCap = getAiCapability(2027, 0.0);
    expect(pessimisticCap).toBeLessThan(defaultCap);
  });

  it("optimistic slider accelerates advancement", () => {
    const defaultCap = getAiCapability(2027, 0.5);
    const optimisticCap = getAiCapability(2027, 1.0);
    expect(optimisticCap).toBeGreaterThan(defaultCap);
  });
});

describe("Block Effectiveness", () => {
  const blocks = loadBlocks();
  const net01 = blocks.find((b) => b.id === "NET-01")!;
  const ai03 = blocks.find((b) => b.id === "AI-03")!;

  it("hard stop blocks have no AI degradation", () => {
    const eff2026 = blockEffectiveness(net01, "deployed", 2026);
    const eff2030 = blockEffectiveness(net01, "deployed", 2030);
    expect(eff2026).toBe(eff2030);
    expect(eff2026).toBe(0.85);
  });

  it("probabilistic blocks degrade over time", () => {
    const eff2026 = blockEffectiveness(ai03, "deployed", 2026);
    const eff2030 = blockEffectiveness(ai03, "deployed", 2030);
    expect(eff2030).toBeLessThan(eff2026);
  });

  it("not_started always returns 0", () => {
    expect(blockEffectiveness(net01, "not_started", 2026)).toBe(0);
    expect(blockEffectiveness(ai03, "not_started", 2030)).toBe(0);
  });
});

describe("Category and Overall Scores", () => {
  const blocks = loadBlocks();

  it("Scenario 1: Baseline 2026 matches Python (~1.76)", () => {
    const baselineStates: Record<string, string> = {};
    for (const b of blocks) {
      baselineStates[b.id] = b.current_state.baseline_state;
    }
    const catScores = computeCategoryScores(blocks, baselineStates, 2026);
    const overall = overallSlScore(catScores);
    expect(overall).toBeCloseTo(1.76, 1);
  });

  it("Scenario 2: All implementing 2026 matches Python (~2.54)", () => {
    const states: Record<string, string> = {};
    for (const b of blocks) states[b.id] = "implementing";
    const catScores = computeCategoryScores(blocks, states, 2026);
    const overall = overallSlScore(catScores);
    expect(overall).toBeCloseTo(2.54, 1);
  });

  it("Scenario 3: All deployed 2029 (~4.12 under 0.5/0.5 hybrid)", () => {
    const states: Record<string, string> = {};
    for (const b of blocks) states[b.id] = "deployed";
    const catScores = computeCategoryScores(blocks, states, 2029);
    const overall = overallSlScore(catScores);
    expect(overall).toBeCloseTo(4.12, 1);
  });

  it("Scenario 4: Network+Physical deployed, AI absent 2028 (~1.52 under 0.5/0.5 hybrid)", () => {
    const states: Record<string, string> = {};
    for (const b of blocks) {
      if (b.category === "network" || b.category === "physical") {
        states[b.id] = "deployed";
      } else if (b.category === "machine" || b.category === "personnel") {
        states[b.id] = "implementing";
      } else if (b.category === "supply_chain") {
        states[b.id] = "investing";
      } else {
        states[b.id] = "not_started";
      }
    }
    const catScores = computeCategoryScores(blocks, states, 2028);
    const overall = overallSlScore(catScores);
    expect(overall).toBeCloseTo(1.52, 1);
  });

  it("weakest link dominates: absent category drags overall down", () => {
    const states: Record<string, string> = {};
    for (const b of blocks) {
      states[b.id] = b.category === "ai_specific" ? "not_started" : "deployed";
    }
    const catScores = computeCategoryScores(blocks, states, 2028);
    const overall = overallSlScore(catScores);
    // AI-specific at baseline (1.0) should pull overall far below deployed categories (~4.2)
    expect(overall).toBeLessThan(2.5);
  });
});
