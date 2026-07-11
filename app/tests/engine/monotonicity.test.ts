import { describe, it, expect } from "vitest";
import { chainBreachProbability, defenseInDepthDiscount } from "../../src/engine/breach";
import { applyBudgetConstraint, blockCostBasis } from "../../src/engine/budget";
import { applyDependencyConstraint } from "../../src/engine/dependencies";
import { computeCategoryScores, overallSlScore } from "../../src/engine/scoring";
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

const blocks = loadBlocks();
const chains: AttackChain[] = JSON.parse(
  fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8")
);

const SLIDERS: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.2,
  vendor_cooperation: 0.3,
  budget_millions: 2000,
  org_transformation: 0.3,
  risk_tolerance: 0.5,
};
const STATES: BlockState[] = ["not_started", "investing", "implementing", "deployed", "mature"];

const allState = (s: BlockState): Record<string, BlockState> =>
  Object.fromEntries(blocks.map((b) => [b.id, s]));

// Deterministic LCG so property-test failures are reproducible
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const chainDefenseIds = (chain: AttackChain): string[] => [
  ...new Set([...chain.blocks_exploited, ...(chain.stoppers ?? [])]),
];

describe("breach monotonicity under arbitrary multi-block contexts", () => {
  it("advancing any block never raises breach, from random starting postures", () => {
    const rng = makeRng(42);
    for (const chain of chains) {
      const ids = chainDefenseIds(chain);
      for (let trial = 0; trial < 30; trial++) {
        const states = allState("not_started");
        for (const id of ids) {
          states[id] = STATES[Math.floor(rng() * STATES.length)];
        }
        const target = ids[Math.floor(rng() * ids.length)];
        const fromIdx = STATES.indexOf(states[target]);
        if (fromIdx === STATES.length - 1) continue;

        const year = rng() < 0.5 ? 2026 : 2030;
        const oc = 3 + Math.floor(rng() * 3);
        const before = chainBreachProbability(chain, blocks, states, oc, year, SLIDERS, true);
        const advanced = { ...states, [target]: STATES[fromIdx + 1] };
        const after = chainBreachProbability(chain, blocks, advanced, oc, year, SLIDERS, true);
        expect(
          after,
          `${chain.id}: advancing ${target} ${states[target]}→${STATES[fromIdx + 1]} raised breach (oc=${oc}, year=${year})`
        ).toBeLessThanOrEqual(before + 1e-9);
      }
    }
  });

  it("defense-in-depth discount never increases when a block is added or advanced", () => {
    const rng = makeRng(7);
    for (const chain of chains) {
      const chainBlocks = chainDefenseIds(chain)
        .map((id) => blocks.find((b) => b.id === id))
        .filter((b): b is Block => !!b);
      for (let trial = 0; trial < 30; trial++) {
        const states: Record<string, BlockState> = {};
        for (const b of chainBlocks) states[b.id] = STATES[Math.floor(rng() * STATES.length)];
        const target = chainBlocks[Math.floor(rng() * chainBlocks.length)];
        const fromIdx = STATES.indexOf(states[target.id]);
        if (fromIdx === STATES.length - 1) continue;

        const before = defenseInDepthDiscount(chainBlocks, states);
        const after = defenseInDepthDiscount(chainBlocks, {
          ...states,
          [target.id]: STATES[fromIdx + 1],
        });
        expect(after, `${chain.id}: DiD discount rose when advancing ${target.id}`)
          .toBeLessThanOrEqual(before + 1e-9);
      }
    }
  });

  it("a single deployed block earns no defense-in-depth discount by itself", () => {
    for (const block of blocks) {
      const discount = defenseInDepthDiscount([block], { [block.id]: "mature" });
      expect(discount, `${block.id} self-discounted`).toBe(1);
    }
  });

  it("correlated blocks earn less depth than independent ones", () => {
    // Two deployed blocks in different layers, sharing a dependency, must
    // discount less deeply than two fully independent layers would.
    const shared = blocks.filter(
      (b) => (b.defense_in_depth?.shared_dependencies ?? []).length > 0
    );
    const byDep = new Map<string, Block[]>();
    for (const b of shared) {
      for (const dep of b.defense_in_depth.shared_dependencies) {
        byDep.set(dep, [...(byDep.get(dep) ?? []), b]);
      }
    }
    const pair = [...byDep.values()].find((list) => list.length >= 2);
    expect(pair, "no correlated pair exists in the data").toBeDefined();
    const [a, b] = pair!;
    const states = { [a.id]: "mature", [b.id]: "mature" } as Record<string, BlockState>;
    const correlated = defenseInDepthDiscount([a, b], states);
    // 2 fully independent layers → 0.6; correlated must be strictly weaker (closer to 1)
    expect(correlated).toBeGreaterThan(0.6 - 1e-9);
  });
});

describe("budget constraint (advancement order)", () => {
  const expensive = blocks.find((b) => b.id === "NET-01")!; // $50M min
  const cheap = blocks.find((b) => b.id === "NET-04")!; // $2M min

  it("activating a later cheap block never evicts an earlier expensive one", () => {
    const states: Record<string, BlockState> = {
      [expensive.id]: "deployed",
      [cheap.id]: "deployed",
    };
    // Budget covers the expensive block only; cheap was advanced second.
    const { exceededIds, effectiveStates } = applyBudgetConstraint(
      blocks,
      states,
      blockCostBasis(expensive, 0.5) + 1,
      { order: [expensive.id, cheap.id], riskTolerance: 0.5 }
    );
    expect(exceededIds.has(expensive.id)).toBe(false);
    expect(exceededIds.has(cheap.id)).toBe(true);
    expect(effectiveStates[expensive.id]).toBe("deployed");
    expect(effectiveStates[cheap.id]).toBe("implementing");
  });

  it("overall SL never drops when one more block is activated", () => {
    const rng = makeRng(99);
    for (let trial = 0; trial < 25; trial++) {
      const order: string[] = [];
      const states = allState("not_started");
      for (const b of blocks) {
        if (rng() < 0.4) {
          states[b.id] = STATES[1 + Math.floor(rng() * 4)];
          order.push(b.id);
        }
      }
      const inactive = blocks.filter((b) => states[b.id] === "not_started");
      if (inactive.length === 0) continue;
      const addition = inactive[Math.floor(rng() * inactive.length)];
      const budget = 100 + rng() * 900;
      const sliders = { ...SLIDERS, budget_millions: budget };

      const score = (st: Record<string, BlockState>, ord: string[]) => {
        const { effectiveStates } = applyBudgetConstraint(blocks, st, budget, {
          order: ord,
          riskTolerance: sliders.risk_tolerance,
        });
        const { effectiveStates: finalStates } = applyDependencyConstraint(
          blocks,
          effectiveStates
        );
        return overallSlScore(computeCategoryScores(blocks, finalStates, 2026, sliders));
      };

      const before = score(states, order);
      const after = score(
        { ...states, [addition.id]: "deployed" },
        [...order, addition.id]
      );
      expect(
        after,
        `activating ${addition.id} dropped SL ${before.toFixed(3)}→${after.toFixed(3)}`
      ).toBeGreaterThanOrEqual(before - 1e-9);
    }
  });

  it("risk tolerance moves the planning cost basis between min and max", () => {
    const b = blocks.find((x) => x.id === "NET-01")!;
    expect(blockCostBasis(b, 1)).toBe(b.dimensions.cost.upfront_millions.min);
    expect(blockCostBasis(b, 0)).toBe(b.dimensions.cost.upfront_millions.max);
    expect(blockCostBasis(b, 0.5)).toBeGreaterThan(blockCostBasis(b, 1));
    expect(blockCostBasis(b, 0.5)).toBeLessThan(blockCostBasis(b, 0));
  });
});

describe("hard dependency enforcement", () => {
  it("a block deployed without its prerequisites is capped at implementing", () => {
    const dependent = blocks.find((b) => (b.dependencies?.requires ?? []).length > 0)!;
    const states = allState("not_started");
    states[dependent.id] = "mature";
    const { effectiveStates, unmetIds } = applyDependencyConstraint(blocks, states);
    expect(unmetIds.has(dependent.id)).toBe(true);
    expect(effectiveStates[dependent.id]).toBe("implementing");
  });

  it("satisfied prerequisites leave the block untouched", () => {
    const dependent = blocks.find((b) => (b.dependencies?.requires ?? []).length > 0)!;
    const states = allState("not_started");
    states[dependent.id] = "mature";
    for (const req of dependent.dependencies.requires) states[req] = "deployed";
    // prerequisites may themselves have prerequisites — satisfy transitively
    const { effectiveStates, unmetIds } = applyDependencyConstraint(blocks, {
      ...allState("deployed"),
      [dependent.id]: "mature",
    });
    expect(unmetIds.size).toBe(0);
    expect(effectiveStates[dependent.id]).toBe("mature");
    void states;
  });

  it("caps cascade: capping a prerequisite caps its dependents", () => {
    // find a chain A requires B in the data
    const dependent = blocks.find((b) => (b.dependencies?.requires ?? []).length > 0)!;
    const prereq = dependent.dependencies.requires[0];
    const states = allState("not_started");
    states[dependent.id] = "deployed";
    states[prereq] = "implementing"; // present but not operational
    const { effectiveStates } = applyDependencyConstraint(blocks, states);
    expect(effectiveStates[dependent.id]).toBe("implementing");
  });
});

describe("stoppers are mechanically real", () => {
  it("maturing any listed stopper measurably reduces its chain's breach", () => {
    for (const chain of chains) {
      const oc = Math.min(5, chain.adversary_profile.min_oc + 1);
      const base = chainBreachProbability(
        chain, blocks, allState("not_started"), oc, 2026, SLIDERS, true
      );
      for (const stopperId of chain.stoppers ?? []) {
        const withStopper = chainBreachProbability(
          chain,
          blocks,
          { ...allState("not_started"), [stopperId]: "mature" },
          oc,
          2026,
          SLIDERS,
          true
        );
        expect(
          withStopper,
          `${chain.id}: maturing stopper ${stopperId} did not reduce breach`
        ).toBeLessThan(base * 0.9);
      }
    }
  });
});
