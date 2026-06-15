import { describe, it, expect } from "vitest";
import {
  sigmoidProbability,
  chainBreachProbability,
  computeBreachProbabilities,
} from "../../src/engine/breach";
import type { AttackChain, Block, BlockState, Sliders } from "../../src/engine/types";
import fs from "fs";
import path from "path";

const DATA = path.join(__dirname, "../../public/data");

function loadBlocks(): Block[] {
  const blocks: Block[] = [];
  for (const file of fs.readdirSync(DATA)) {
    if (file.startsWith("blocks-") && file.endsWith(".json")) {
      blocks.push(...JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8")));
    }
  }
  return blocks;
}

function loadChains(): AttackChain[] {
  return JSON.parse(fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8"));
}

const blocks = loadBlocks();
const chains = loadChains();

const SLIDERS: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.5,
  vendor_cooperation: 0.5,
  budget_millions: 2000,
  org_transformation: 0.5,
  risk_tolerance: 0.5,
};
const STATES: BlockState[] = ["not_started", "investing", "implementing", "deployed", "mature"];
const YEAR = 2024;

const allState = (s: BlockState): Record<string, BlockState> =>
  Object.fromEntries(blocks.map((b) => [b.id, s]));

const maxChain = (states: Record<string, BlockState>, oc: number, served = true): number =>
  Math.max(
    ...Object.values(computeBreachProbabilities(chains, blocks, states, oc, YEAR, SLIDERS, served)),
    0
  );

describe("sigmoidProbability", () => {
  it("returns 0.5 at delta=0", () => {
    expect(sigmoidProbability(0)).toBeCloseTo(0.5, 3);
  });
  it("returns >0.9 at delta=+2", () => {
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

describe("chain breach model", () => {
  it("is monotonic in defense state: advancing any one block never raises chain breach", () => {
    for (const chain of chains) {
      for (const oc of [1, 2, 3, 4, 5]) {
        for (const bid of chain.blocks_exploited) {
          let prev = Infinity;
          for (const st of STATES) {
            const states = allState("not_started");
            states[bid] = st;
            const p = chainBreachProbability(chain, blocks, states, oc, YEAR, SLIDERS, true);
            expect(p).toBeLessThanOrEqual(prev + 1e-9);
            prev = p;
          }
        }
      }
    }
  });

  it("undefended: breach scales with adversary capability and is high", () => {
    const none = allState("not_started");
    const byOc = [1, 2, 3, 4, 5].map((oc) => maxChain(none, oc));
    for (let i = 1; i < byOc.length; i++) {
      expect(byOc[i]).toBeGreaterThanOrEqual(byOc[i - 1] - 1e-9);
    }
    expect(byOc[1]).toBeGreaterThan(0.4); // OC2 clearly exposed
    expect(byOc[4]).toBeGreaterThan(0.85); // OC5 near-certain
  });

  it("fully matured: low for weak adversaries, residual for the top tier", () => {
    const mature = allState("mature");
    expect(maxChain(mature, 2)).toBeLessThan(0.1);
    expect(maxChain(mature, 5)).toBeGreaterThan(maxChain(mature, 2));
  });

  it("maturing a stopper lowers its chain's breach probability", () => {
    const pd = chains.find((c) => c.id === "patient-distillation")!;
    const before = chainBreachProbability(pd, blocks, allState("not_started"), 2, YEAR, SLIDERS, true);
    const after = chainBreachProbability(
      pd,
      blocks,
      { ...allState("not_started"), "AI-07": "mature" },
      2,
      YEAR,
      SLIDERS,
      true
    );
    expect(after).toBeLessThan(before);
  });

  it("a matured hard-stop sharply reduces the chains it gates", () => {
    const zd = chains.find((c) => c.id === "zero-day-cascade")!; // NET-01 air gap is a stopper
    const none = allState("not_started");
    const before = chainBreachProbability(zd, blocks, none, 5, YEAR, SLIDERS, true);
    const after = chainBreachProbability(
      zd,
      blocks,
      { ...none, "NET-01": "mature" },
      5,
      YEAR,
      SLIDERS,
      true
    );
    expect(after).toBeLessThan(before * 0.25);
  });

  it("air-gap precondition: external-serving chains are inert when not served externally", () => {
    const pd = chains.find((c) => c.id === "patient-distillation")!;
    expect(pd.requires_external_serving).toBe(true);
    const none = allState("not_started");
    expect(chainBreachProbability(pd, blocks, none, 5, YEAR, SLIDERS, false)).toBe(0);
    // air-gapping removes the easy distillation win, lowering the undefended max chain
    expect(maxChain(none, 2, false)).toBeLessThan(maxChain(none, 2, true));
  });

  it("AI capability raises breach over time", () => {
    const none = allState("not_started");
    const max2024 = Math.max(
      ...Object.values(computeBreachProbabilities(chains, blocks, none, 3, 2024, SLIDERS, true)),
      0
    );
    const max2030 = Math.max(
      ...Object.values(computeBreachProbabilities(chains, blocks, none, 3, 2030, SLIDERS, true)),
      0
    );
    expect(max2030).toBeGreaterThan(max2024);
  });
});
