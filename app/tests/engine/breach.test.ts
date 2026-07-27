import { describe, it, expect } from "vitest";
import {
  sigmoidProbability,
  chainBreachProbability,
  computeBreachProbabilities,
  blockExploitProbability,
} from "../../src/engine/breach";
import { supportingBlocks } from "../../src/engine/supporting";
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

  it("never reaches zero: even a fully mature posture leaves residual risk", () => {
    // The irreducible residual (insider never caught, zero-day nobody found).
    // A posture that read as ~0% made near-perfect defense look free, which is
    // the opposite of the SL5 premise.
    const mature = allState("mature");
    for (const chain of chains) {
      const p = chainBreachProbability(chain, blocks, mature, 4, YEAR, SLIDERS, true);
      expect(p, `${chain.id} drove to zero despite the residual floor`).toBeGreaterThan(0.01);
    }
  });

  it("residual floor is gated: a far-underqualified adversary gets no free shot", () => {
    // The floor scales with the capability gate, so it applies only to chains
    // the adversary could actually attempt — an OC1 actor doesn't get 3% at a
    // chain needing OC4+.
    const mature = allState("mature");
    const oc4Chain = chains.find((c) => c.adversary_profile.min_oc >= 4)!;
    const weak = chainBreachProbability(oc4Chain, blocks, mature, 1, YEAR, SLIDERS, true);
    expect(weak).toBeLessThan(0.01);
  });

  it("residual floor does not resurrect a precondition-inert chain", () => {
    const mature = allState("mature");
    const pd = chains.find((c) => c.requires_external_serving)!;
    expect(chainBreachProbability(pd, blocks, mature, 5, YEAR, SLIDERS, false)).toBe(0);
  });

  it("supporting defenses matter: maturing a chain's family lowers its breach", () => {
    // Blocks sharing a `summary_group` with a named step are no longer inert.
    // Before this, ~28 of 47 blocks changed no number when deployed.
    const chain = chains.find((c) => c.id === "quiet-tap")!;
    const support = supportingBlocks(chain, blocks);
    expect(support.length).toBeGreaterThan(0);

    const none = allState("not_started");
    const withSupport = { ...none };
    for (const b of support) withSupport[b.id] = "mature";

    const before = chainBreachProbability(chain, blocks, none, 4, YEAR, SLIDERS, true);
    const after = chainBreachProbability(chain, blocks, withSupport, 4, YEAR, SLIDERS, true);
    expect(after).toBeLessThan(before);
  });

  it("supporting defenses count for less than the chain's own named steps", () => {
    // They harden a path without being steps you read in the story, so a single
    // named block must outweigh a single supporting one. Compared one-for-one so
    // the residual floor (which both saturate when fully built out) can't mask
    // the difference.
    const chain = chains.find((c) => c.id === "quiet-tap")!;
    const namedId = chain.stoppers![0];
    const supportId = supportingBlocks(chain, blocks)[0].id;
    const none = allState("not_started");

    const pNamed = chainBreachProbability(
      chain, blocks, { ...none, [namedId]: "mature" }, 4, YEAR, SLIDERS, true
    );
    const pSupport = chainBreachProbability(
      chain, blocks, { ...none, [supportId]: "mature" }, 4, YEAR, SLIDERS, true
    );
    expect(pNamed).toBeLessThan(pSupport);
  });

  it("hard stops erode against a stronger adversary, unlike before", () => {
    // Hard stops used to be OC-independent: an identical wall for OC3 and OC6.
    // They should still be the best buy, but a top-tier adversary bribes someone
    // to carry a drive across the air gap.
    const netOne = blocks.find((b) => b.id === "NET-01")!;
    expect(netOne.defense_type).toBe("hard_stop");
    const atOc3 = blockExploitProbability(netOne, "mature", 3, YEAR, SLIDERS);
    const atOc6 = blockExploitProbability(netOne, "mature", 6, YEAR, SLIDERS);
    expect(atOc6).toBeGreaterThan(atOc3);

    // ...but they erode far less than probabilistic controls do.
    const prob = blocks.find((b) => b.id === "PER-02")!;
    expect(prob.defense_type).toBe("probabilistic");
    const probSpread =
      blockExploitProbability(prob, "mature", 6, YEAR, SLIDERS) -
      blockExploitProbability(prob, "mature", 3, YEAR, SLIDERS);
    expect(atOc6 - atOc3).toBeLessThan(probSpread);
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
    // Hard stops are strong but not absolute: resist erodes from 0.98 toward
    // 0.86 as the adversary outclasses the block, so a single matured air gap
    // cuts a chain to roughly a quarter — not to nothing. This is measured at
    // OC5, the tier where that erosion is largest.
    expect(after).toBeLessThan(before * 0.3);
  });

  it("air-gap precondition: external-serving chains are inert when not served externally", () => {
    const pd = chains.find((c) => c.id === "patient-distillation")!;
    expect(pd.requires_external_serving).toBe(true);
    const none = allState("not_started");
    expect(chainBreachProbability(pd, blocks, none, 5, YEAR, SLIDERS, false)).toBe(0);
    // air-gapping removes the easy distillation win, lowering the undefended max chain
    expect(maxChain(none, 2, false)).toBeLessThan(maxChain(none, 2, true));
  });

  it("OC tiers gate qualitatively: one tier below min_oc is largely locked out", () => {
    // At year 2024 (no AI lift) an undefended chain reduces to its gate.
    const none = allState("not_started");
    for (const chain of chains) {
      const minOc = chain.adversary_profile.min_oc;
      const atMin = chainBreachProbability(chain, blocks, none, minOc, 2024, SLIDERS, true);
      expect(atMin, `${chain.id} at min_oc`).toBeGreaterThan(0.7);
      if (minOc > 1) {
        const below = chainBreachProbability(chain, blocks, none, minOc - 1, 2024, SLIDERS, true);
        expect(below, `${chain.id} one tier below min_oc`).toBeLessThan(0.2);
      }
    }
  });

  it("AI lift reopens the gate for a below-threshold adversary over time", () => {
    // The 'AI compresses the OC scale' thesis: an OC3 adversary against an
    // OC4-minimum chain gains meaningfully by 2030 as AI capability grows.
    const none = allState("not_started");
    const chain = chains.find((c) => c.id === "zero-day-cascade")!;
    const early = chainBreachProbability(chain, blocks, none, 3, 2024, SLIDERS, true);
    const late = chainBreachProbability(chain, blocks, none, 3, 2030, SLIDERS, true);
    expect(early).toBeLessThan(0.2);
    expect(late).toBeGreaterThan(early * 2);
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
