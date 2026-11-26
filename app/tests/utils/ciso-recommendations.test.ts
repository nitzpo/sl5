import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { baselineStates } from "../../src/engine/baseline";
import { blockCostBasis } from "../../src/engine/budget";
import { orderAfterActivating, scorePosture, type PostureInput } from "../../src/engine/posture";
import {
  combinedCostMillions,
  recommendInvestments,
} from "../../src/utils/ciso-recommendations";
import type { AttackChain, Block, BlockState } from "../../src/engine/types";

const DATA = path.join(__dirname, "../../public/data");
const blocks: Block[] = fs
  .readdirSync(DATA)
  .filter((f) => f.startsWith("blocks-") && f.endsWith(".json"))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8")) as Block[]);
const chains: AttackChain[] = JSON.parse(
  fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8")
);
const byId = new Map(blocks.map((b) => [b.id, b]));

/** The app as it opens: researched baseline, default sliders, 2026, OC4. */
function appDefault(overrides: Partial<PostureInput> = {}): PostureInput {
  const states = baselineStates(blocks);
  return {
    blocks,
    chains,
    blockStates: states,
    advanceOrder: Object.keys(states).filter((id) => states[id] !== "not_started"),
    year: 2026,
    sliders: {
      ai_timeline: 0.5,
      gov_cooperation: 0.2,
      vendor_cooperation: 0.3,
      budget_millions: 200,
      org_transformation: 0.3,
      risk_tolerance: 0.5,
    },
    adversaryOc: 4,
    modelServedExternally: true,
    ...overrides,
  };
}

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, p) => a + p, 0);

describe("CISO priority investments", () => {
  const input = appDefault();
  const analysis = recommendInvestments(input);

  it("recommends something at the default posture", () => {
    expect(analysis.candidates.length).toBeGreaterThan(5);
  });

  it("reports exactly what the engine says each move does", () => {
    // The heuristic this replaced showed NET-06 at +0.49 SL against a real
    // +0.05. Every number here must be the pipeline's own.
    for (const c of analysis.candidates) {
      const states: Record<string, BlockState> = { ...input.blockStates };
      for (const id of c.blockIds) states[id] = "deployed";
      const after = scorePosture({
        ...input,
        blockStates: states,
        advanceOrder: orderAfterActivating(input, c.blockIds),
      });
      expect(c.slDelta, c.block.id).toBeCloseTo(after.overallSl - analysis.baseline.overallSl, 12);
      expect(c.breachDelta, c.block.id).toBeCloseTo(after.breach - analysis.baseline.breach, 12);
      expect(c.pathReduction, c.block.id).toBeCloseTo(
        sum(analysis.baseline.breachProbabilities) - sum(after.breachProbabilities),
        12
      );
      // Every recommended move lands: nothing capped by budget or prerequisite.
      for (const id of c.blockIds) expect(after.effectiveStates[id], `${c.block.id}: ${id}`).toBe("deployed");
    }
    const net06 = analysis.candidates.find((c) => c.block.id === "NET-06");
    if (net06) expect(net06.slDelta).toBeLessThan(0.1);
  });

  it("ranks by breach taken off all paths per $M", () => {
    const keys = analysis.candidates.map((c) => c.reductionPerMillion);
    expect([...keys].sort((a, b) => b - a)).toEqual(keys);
    for (const c of analysis.candidates) {
      expect(c.reductionPerMillion).toBeCloseTo(c.pathReduction / Math.max(c.costMillions, 1), 12);
      expect(c.pathReduction).toBeGreaterThanOrEqual(-1e-12);
      expect(c.breachDelta).toBeLessThanOrEqual(1e-12);
    }
  });

  it("bundles a block with the hard prerequisites it is missing, deepest first", () => {
    const bundles = analysis.candidates.filter((c) => c.prerequisites.length > 0);
    expect(bundles.length).toBeGreaterThan(0);
    for (const c of bundles) {
      expect(c.blockIds[c.blockIds.length - 1]).toBe(c.block.id);
      // Each block's prerequisites come before it in the funding order.
      for (const [i, id] of c.blockIds.entries()) {
        for (const req of byId.get(id)!.dependencies?.requires ?? []) {
          const j = c.blockIds.indexOf(req);
          if (j >= 0) expect(j, `${c.block.id}: ${req} before ${id}`).toBeLessThan(i);
        }
      }
    }
    // A requires-free block is never a bundle.
    for (const c of analysis.candidates.filter((x) => !(x.block.dependencies?.requires ?? []).length)) {
      expect(c.prerequisites).toEqual([]);
    }
  });

  it("prices moves on the budget model's own cost basis", () => {
    for (const c of analysis.candidates) {
      const expected = c.blockIds.reduce(
        (s, id) => s + blockCostBasis(byId.get(id)!, input.sliders.risk_tolerance),
        0
      );
      // At the default posture nothing is being paid for yet, so every block costs.
      expect(c.costMillions, c.block.id).toBeCloseTo(expected, 9);
    }
    // And the risk-tolerance slider moves it, as it moves the budget line.
    const optimistic = recommendInvestments(appDefault({ sliders: { ...input.sliders, risk_tolerance: 1 } }));
    const c0 = analysis.candidates[0];
    const c1 = optimistic.candidates.find((c) => c.block.id === c0.block.id)!;
    expect(c1.costMillions).toBeLessThanOrEqual(c0.costMillions);
  });

  it("counts a shared prerequisite once when moves are taken together", () => {
    const withShared = analysis.candidates.filter((c) => c.prerequisites.some((p) => p.id === "PER-01"));
    if (withShared.length >= 2) {
      const [a, b] = withShared;
      expect(combinedCostMillions([a, b])).toBeLessThan(a.costMillions + b.costMillions);
    }
  });

  it("never recommends a move the budget can't pay for, but says how many there are", () => {
    const broke = recommendInvestments(appDefault({ sliders: { ...input.sliders, budget_millions: 0 } }));
    expect(broke.candidates).toEqual([]);
    expect(broke.unaffordableCount).toBeGreaterThan(0);
    for (const c of analysis.candidates) {
      expect(c.costMillions).toBeLessThanOrEqual(analysis.remainingMillions + 1e-9);
    }
  });

  it("charges nothing to finish a block the program is already funding", () => {
    // Advance an affordable block to implementing first: it is then in the
    // funding queue, so deploying it costs no new money.
    const id = "PER-07";
    const states = { ...input.blockStates, [id]: "implementing" as BlockState };
    const funded = recommendInvestments({
      ...input,
      blockStates: states,
      advanceOrder: [...(input.advanceOrder ?? []), id],
    });
    const c = funded.candidates.find((x) => x.block.id === id);
    expect(c, `${id} should still be recommended`).toBeDefined();
    expect(c!.costMillions).toBe(0);
  });

  it("explains itself truthfully", () => {
    for (const c of analysis.candidates) {
      if (c.narrowed.length > 0) {
        expect(c.reason).toContain(c.narrowed[0].chain.name);
        for (const n of c.narrowed) expect(n.drop).toBeGreaterThanOrEqual(0.001);
      }
      const more = c.narrowed.length - 1;
      if (more > 0) expect(c.reason).toContain(`${more} more path`);
    }
  });
});
