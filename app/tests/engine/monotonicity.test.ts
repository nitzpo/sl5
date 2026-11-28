// Monotonicity is the property every term of the model is built to keep:
//   - advancing any block never raises any tier's campaign success (nor the AI
//     insider, nor any approach, scenario or meter);
//   - a stronger adversary never does worse; a later year never does better
//     for the attacker... never lowers success.
// Rewritten in Phase 2 for the vector model (the chain-level and
// depth-discount properties it used to check describe mechanics that no
// longer exist); the budget and dependency properties are unchanged.
import { describe, it, expect } from "vitest";
import { applyBudgetConstraint, blockCostBasis } from "../../src/engine/budget";
import { baselineStateFor, baselineStates } from "../../src/engine/baseline";
import { orderAfterActivating, scorePosture, type PostureInput, type PostureScore } from "../../src/engine/posture";
import { applyDependencyConstraint } from "../../src/engine/dependencies";
import { computeCategoryScores, overallSlScore } from "../../src/engine/scoring";
import { stackCounters, type CounterInForce } from "../../src/engine/vector-model";
import type { BlockState, DefenseType, Sliders } from "../../src/engine/types";
import { allAt, APP_SLIDERS, loadBlocks, loadModel } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();

const SLIDERS: Sliders = { ...APP_SLIDERS, budget_millions: 2000 };
const STATES: BlockState[] = ["not_started", "investing", "implementing", "deployed", "mature"];

const allState = (s: BlockState): Record<string, BlockState> => allAt(blocks, s);

// Deterministic LCG so property-test failures are reproducible
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Every success number a posture reports, flattened, keyed for messages. */
function successNumbers(r: PostureScore): Record<string, number> {
  const out: Record<string, number> = {};
  r.tiers.forEach((t) => (out[`OC${t.tier}`] = t.p));
  out.aiInsider = r.aiInsider.p;
  out.integrity = r.integrity.p;
  out.capability = r.capabilityLeakage.p;
  for (const a of r.approaches) out[`approach:${a.id}`] = a.p;
  for (const [id, p] of Object.entries(r.scenarios)) out[`scenario:${id}`] = p;
  return out;
}

function randomInput(rng: () => number): Omit<PostureInput, "blockStates"> & { blockStates: Record<string, BlockState> } {
  const states = baselineStates(blocks);
  for (const b of blocks) if (rng() < 0.45) states[b.id] = STATES[Math.floor(rng() * STATES.length)];
  return {
    blocks,
    model,
    blockStates: states,
    year: [2024, 2026, 2027.5, 2030][Math.floor(rng() * 4)],
    sliders: {
      ...SLIDERS,
      budget_millions: 1e6,
      gov_cooperation: rng(),
      vendor_cooperation: rng(),
      org_transformation: rng(),
      ai_propensity: rng(),
    },
    adversaryOc: 1 + Math.floor(rng() * 5),
    modelServedExternally: rng() < 0.5,
  };
}

describe("monotonicity of the vector model", () => {
  it("advancing any block never raises any success number, from random postures", () => {
    const rng = makeRng(42);
    for (let trial = 0; trial < 120; trial++) {
      const input = randomInput(rng);
      const target = blocks[Math.floor(rng() * blocks.length)];
      const from = STATES.indexOf(input.blockStates[target.id]);
      if (from === STATES.length - 1) continue;
      const before = successNumbers(scorePosture(input));
      const after = successNumbers(
        scorePosture({ ...input, blockStates: { ...input.blockStates, [target.id]: STATES[from + 1] } })
      );
      for (const k of Object.keys(before)) {
        expect(after[k], `${k}: advancing ${target.id} ${STATES[from]}→${STATES[from + 1]}`).toBeLessThanOrEqual(
          before[k] + 1e-12
        );
      }
    }
  });

  it("advancing any block never lowers the threat-relative SL", () => {
    const rng = makeRng(7);
    for (let trial = 0; trial < 120; trial++) {
      const input = randomInput(rng);
      const target = blocks[Math.floor(rng() * blocks.length)];
      const from = STATES.indexOf(input.blockStates[target.id]);
      if (from === STATES.length - 1) continue;
      const before = scorePosture(input).sl;
      const after = scorePosture({ ...input, blockStates: { ...input.blockStates, [target.id]: STATES[from + 1] } }).sl;
      expect(after.value, `advancing ${target.id}`).toBeGreaterThanOrEqual(before.value - 1e-12);
      expect(after.level).toBeGreaterThanOrEqual(before.level);
    }
  });

  it("raising the adversary tier never lowers campaign success", () => {
    const rng = makeRng(5);
    for (let trial = 0; trial < 60; trial++) {
      const r = scorePosture(randomInput(rng));
      for (let n = 1; n < 5; n++) {
        expect(r.tiers[n].p, `OC${n + 1} < OC${n}`).toBeGreaterThanOrEqual(r.tiers[n - 1].p - 1e-12);
      }
    }
  });

  it("each approach is no easier for a weaker adversary", () => {
    const rng = makeRng(11);
    for (let trial = 0; trial < 30; trial++) {
      const input = randomInput(rng);
      let last: Record<string, number> | null = null;
      for (let oc = 1; oc <= 5; oc++) {
        const now = Object.fromEntries(
          scorePosture({ ...input, adversaryOc: oc }).approaches.filter((a) => a.adversary === "human").map((a) => [a.id, a.p])
        );
        if (last) for (const k of Object.keys(now)) expect(now[k], `${k} OC${oc}`).toBeGreaterThanOrEqual(last[k] - 1e-12);
        last = now;
      }
    }
  });

  it("a later year never lowers any success number, the posture held fixed", () => {
    const rng = makeRng(13);
    for (let trial = 0; trial < 40; trial++) {
      const input = randomInput(rng);
      let last: Record<string, number> | null = null;
      for (const year of [2024, 2025, 2026, 2026.5, 2027, 2028, 2029, 2030, 2031]) {
        const now = successNumbers(scorePosture({ ...input, year }));
        if (last) {
          for (const k of Object.keys(now)) {
            if (k.startsWith("capability")) continue; // per-campaign; the cumulative meter is separate
            expect(now[k], `${k} at ${year}`).toBeGreaterThanOrEqual(last[k] - 1e-12);
          }
        }
        last = now;
      }
    }
  });

  it("counter stacking never gets worse when one counter gets stronger", () => {
    const rng = makeRng(3);
    const types: DefenseType[] = ["hard_stop", "probabilistic", "hybrid"];
    for (let trial = 0; trial < 500; trial++) {
      const cs: CounterInForce[] = Array.from({ length: 1 + Math.floor(rng() * 6) }, (_, i) => ({
        blockId: `B${i}`,
        strength: rng() < 0.4 ? "strong" : "partial",
        type: types[Math.floor(rng() * 3)],
        effectiveness: rng(),
      }));
      const tier = 1 + rng() * 4;
      const i = Math.floor(rng() * cs.length);
      const stronger = cs.map((c, j) => (j === i ? { ...c, effectiveness: Math.min(1, c.effectiveness + rng() * 0.5) } : c));
      expect(stackCounters(stronger, tier).multiplier).toBeLessThanOrEqual(stackCounters(cs, tier).multiplier + 1e-12);
      // ...and adding a counter never hurts either.
      const more = [...cs, { blockId: "Z", strength: "partial" as const, type: "probabilistic" as const, effectiveness: rng() }];
      expect(stackCounters(more, tier).multiplier).toBeLessThanOrEqual(stackCounters(cs, tier).multiplier + 1e-12);
    }
  });
});

describe("determinism", () => {
  it("the same input gives the same output, with no NaN anywhere", () => {
    const rng = makeRng(17);
    for (let trial = 0; trial < 20; trial++) {
      const input = randomInput(rng);
      const a = scorePosture(input);
      const b = scorePosture(structuredClone(input));
      expect(JSON.stringify(a, (_k, v) => (v instanceof Set || v instanceof Map ? [...v] : v))).toBe(
        JSON.stringify(b, (_k, v) => (v instanceof Set || v instanceof Map ? [...v] : v))
      );
      const walk = (x: unknown, path: string) => {
        if (typeof x === "number") expect(Number.isFinite(x), path).toBe(true);
        else if (Array.isArray(x)) x.forEach((y, i) => walk(y, `${path}[${i}]`));
        else if (x && typeof x === "object" && !(x instanceof Set) && !(x instanceof Map)) {
          for (const [k, v] of Object.entries(x)) if (k !== "blocks" && k !== "catalogue") walk(v, `${path}.${k}`);
        }
      };
      walk(a, "score");
    }
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
    // Unfunded means unbuilt: it falls back to what the lab already ran.
    expect(effectiveStates[cheap.id]).toBe(baselineStateFor(cheap));
  });

  it("an unaffordable block falls back to its baseline, not to a free `implementing`", () => {
    // Was: capped at implementing, which handed every unpaid click 0.4
    // effectiveness and half a layer of depth. Now an over-budget block counts
    // as exactly what the lab already runs — and that holds for every state it
    // might have been advanced to, not just deployed/mature.
    const partial = blocks.find(
      (b) => b.current_state.baseline_state === "partially_deployed" && !b.current_state.baseline_since
    )!;
    const none = blocks.find((b) => baselineStateFor(b) === "not_started")!;
    for (const state of ["investing", "implementing", "deployed", "mature"] as BlockState[]) {
      const states = { [partial.id]: "mature", [none.id]: state } as Record<string, BlockState>;
      const { effectiveStates, exceededIds } = applyBudgetConstraint(blocks, states, 0, {
        order: [partial.id, none.id],
      });
      expect(exceededIds.has(none.id), `${none.id} at ${state} costs money`).toBe(true);
      expect(effectiveStates[none.id], `${none.id} at ${state}`).toBe("not_started");
      expect(effectiveStates[partial.id]).toBe("implementing");
    }
  });

  it("a $0 budget buys nothing: clicking everything leaves the starting posture's numbers", () => {
    // The bug this pins: with every block clicked to mature and no money, breach
    // still fell ~65% → ~44%, because every unpaid block counted as implementing.
    const base = baselineStates(blocks);
    const score = (states: Record<string, BlockState>, budget: number) =>
      scorePosture({
        blocks,
        model,
        blockStates: states,
        advanceOrder: blocks.map((b) => b.id),
        year: 2026,
        sliders: { ...SLIDERS, budget_millions: budget },
        adversaryOc: 4,
        modelServedExternally: true,
      });
    const start = score(base, 0);
    const everything = score(allState("mature"), 0);
    expect(everything.campaign).toBeCloseTo(start.campaign, 12);
    expect(everything.sl.value).toBeCloseTo(start.sl.value, 12);
    expect(everything.programCompleteness).toBeCloseTo(start.programCompleteness, 12);
    // ...and money is what buys the difference.
    expect(score(allState("mature"), 100_000).campaign).toBeLessThan(start.campaign - 0.3);
  });

  it("advancing any block never raises breach through the full pipeline, under any budget", () => {
    // The engine-level property, re-asserted with the budget and prerequisite
    // caps in the loop: a block that becomes costly joins the end of the funding
    // queue (as the store does), so it can only unfund itself — and an unfunded
    // block sits at its baseline, never below what it held for free.
    const rng = makeRng(2027);
    for (let trial = 0; trial < 60; trial++) {
      const states = baselineStates(blocks);
      for (const b of blocks) if (rng() < 0.35) states[b.id] = STATES[Math.floor(rng() * STATES.length)];
      // The store keeps every active block in the funding order (it seeds the
      // baseline in, and appends a block when it first costs money), so draw a
      // random order over the active blocks — not a random subset of them.
      const order = blocks
        .map((b) => b.id)
        .filter((id) => states[id] !== "not_started")
        .map((id) => ({ id, k: rng() }))
        .sort((a, b) => a.k - b.k)
        .map((x) => x.id);
      const target = blocks[Math.floor(rng() * blocks.length)];
      const fromIdx = STATES.indexOf(states[target.id]);
      if (fromIdx === STATES.length - 1) continue;
      const input = {
        blocks,
        model,
        advanceOrder: order,
        year: rng() < 0.5 ? 2026 : 2030,
        sliders: { ...SLIDERS, budget_millions: rng() * 600 },
        adversaryOc: 3 + Math.floor(rng() * 3),
        modelServedExternally: true,
      };
      const before = scorePosture({ ...input, blockStates: states });
      const advancedStates = { ...states, [target.id]: STATES[fromIdx + 1] };
      const after = scorePosture({
        ...input,
        blockStates: advancedStates,
        advanceOrder: orderAfterActivating({ blocks, blockStates: states, advanceOrder: order }, [
          target.id,
        ]),
      });
      const b = successNumbers(before);
      const a = successNumbers(after);
      for (const k of Object.keys(b)) {
        expect(a[k], `${k}: advancing ${target.id} ${states[target.id]}→${STATES[fromIdx + 1]} raised it`).toBeLessThanOrEqual(
          b[k] + 1e-9
        );
      }
    }
  });

  it("programme completeness never drops when one more block is activated", () => {
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

describe("scenario stoppers are mechanically real", () => {
  it("maturing any listed stopper or step gap measurably reduces its scenario", () => {
    for (const sc of model.scenarios) {
      const base = (states: Record<string, BlockState>) =>
        scorePosture({
          blocks,
          model,
          blockStates: states,
          year: 2026,
          sliders: { ...SLIDERS, budget_millions: 1e6 },
          adversaryOc: sc.adversary_profile.typical_oc,
          modelServedExternally: true,
        }).scenarios[sc.id];
      const none = allState("not_started");
      const p0 = base(none);
      const ids = new Set([
        ...sc.stopper_details.map((d) => d.block_id),
        ...sc.steps.map((st) => st.block_gap_used).filter((x): x is string => !!x),
      ]);
      for (const id of ids) {
        // Bring its hard prerequisites along, as anyone deploying it would.
        const states = { ...none };
        const visit = (bid: string) => {
          states[bid] = "mature";
          for (const r of blocks.find((b) => b.id === bid)!.dependencies.requires) visit(r);
        };
        visit(id);
        expect(base(states), `${sc.id}: maturing ${id} did not reduce it`).toBeLessThan(p0 * 0.99);
      }
    }
  });
});
