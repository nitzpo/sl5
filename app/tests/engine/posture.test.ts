import { describe, it, expect } from "vitest";
import {
  counterRelevance,
  scorePosture,
  targetSl,
  threatRelevance,
  type PostureInput,
} from "../../src/engine";
import { deriveScore } from "../../src/store/derived";
import { RACE_YEARS, slOverYears } from "../../src/model/race";
import { recommendInvestments } from "../../src/utils/ciso-recommendations";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { computeScriptBlockStates } from "../../src/timelapse/compute-script-state";
import type { BlockState } from "../../src/engine/types";
import { DEFAULT_SLIDERS } from "../../src/store/simulation";
import { allAt, APP_SLIDERS, loadBlocks, loadModel } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();

/** Reactive CISO at 2030, made deliberately awkward: a budget that can't pay for
 * the whole plan, and a block deployed without its prerequisite, so the budget
 * cap, the dependency cap and the slider multipliers all bite. */
function awkwardPosture(): PostureInput {
  const script = SCRIPTS.find((s) => s.id === "reactive-ciso")!;
  const blockStates: Record<string, BlockState> = {
    ...computeScriptBlockStates(script, 2030, blocks),
    "HW-07": "deployed", // requires HW-01, which nobody bought
  };
  return {
    blocks,
    model,
    blockStates,
    // HW-07 first, so it is funded — and then capped by its missing prerequisite.
    advanceOrder: ["HW-07", ...(script.deployments ?? []).map((d) => d.blockId)],
    year: 2030,
    sliders: { ...APP_SLIDERS, ...script.sliderOverrides, budget_millions: 600 },
    adversaryOc: 4,
    modelServedExternally: true,
  };
}

describe("one source of truth for derived numbers", () => {
  const input = awkwardPosture();
  const reference = scorePosture(input);

  it("the reference posture really is non-trivial", () => {
    expect(reference.budgetExceededIds.size).toBeGreaterThan(0);
    expect(reference.dependencyUnmetIds.has("HW-07")).toBe(true);
    expect(reference.programCompleteness).toBeGreaterThan(1.2);
    expect(reference.campaign).toBeGreaterThan(0.05);
  });

  it("the test helpers use the store's own default sliders", () => {
    expect(APP_SLIDERS).toEqual(DEFAULT_SLIDERS);
  });

  it("the rail, the race strip and the next-defense ranking agree exactly", () => {
    // Before the shared pipeline the v1 panels read 2.02 / 2.12 / 2.46 for
    // Reactive 2030. Every v2 readout goes through the same `scorePosture`.
    const rail = deriveScore({
      ...input,
      threatModel: model,
      advanceOrder: input.advanceOrder!,
      futureCapabilities: false,
    });
    const { year: _year, ...rest } = input;
    void _year;
    const strip = slOverYears(rest);
    const idx = RACE_YEARS.indexOf(2030);
    expect(idx).toBeGreaterThanOrEqual(0);
    const ranked = recommendInvestments(input).baseline;

    for (const [name, score] of [
      ["rail", rail],
      ["next-defense ranking", ranked],
    ] as const) {
      expect(score.sl, `${name} SL`).toEqual(reference.sl);
      expect(score.tiers, `${name} tiers`).toEqual(reference.tiers);
      expect(score.approaches, `${name} approaches`).toEqual(reference.approaches);
      expect(score.aiInsider, `${name} own model`).toEqual(reference.aiInsider);
      expect(score.scenarios, `${name} scenarios`).toEqual(reference.scenarios);
    }
    expect(strip[idx].value, "race strip SL at 2030").toBe(reference.sl.value);
    expect(strip[idx].level).toBe(reference.sl.level);
    expect(rail.categoryScores).toEqual(reference.categoryScores);
    expect(rail.effectiveStates).toEqual(reference.effectiveStates);
    expect(rail.blockRelevance).toEqual(reference.blockRelevance);
  });

  it("reports the campaign at the adversary tier, and no chain-era fields", () => {
    expect(reference.campaign).toBe(reference.tiers[3].p);
    for (const gone of ["overallSl", "breachProbabilities", "residualFloors", "bestChain", "breach"]) {
      expect(reference, gone).not.toHaveProperty(gone);
    }
  });

  it("scores completeness over every block that counters something, weighting strong counters fully", () => {
    const full = threatRelevance(blocks);
    expect(full).toEqual(counterRelevance(blocks));
    expect(full.size).toBe(blocks.filter((b) => !b.future).length);
    expect([...full.values()].some((w) => w < 1)).toBe(true);
    // Memoized on identity, so the hot path doesn't rebuild it.
    expect(threatRelevance(blocks)).toBe(full);
  });

  it("the race strip holds the posture fixed and moves only the clock", () => {
    const { year: _year, ...rest } = input;
    void _year;
    const strip = slOverYears(rest);
    for (const sample of strip.filter((_, i) => i % 3 === 0)) {
      const direct = scorePosture({ ...input, year: sample.year });
      expect(sample.value).toBe(direct.sl.value);
      expect(sample.marginal).toBe(direct.sl.marginal);
    }
  });
});

describe("residual floor", () => {
  it("is applied once per campaign, at the share of the undefended attacker, and binds a mature posture's low tiers", () => {
    const score = scorePosture({
      blocks,
      model,
      blockStates: allAt(blocks, "mature"),
      year: 2030,
      sliders: { ...APP_SLIDERS, budget_millions: 1e6 },
      adversaryOc: 4,
      modelServedExternally: true,
    });
    for (const t of score.tiers) {
      expect(t.p).toBeGreaterThanOrEqual(t.floor);
      expect(t.floor).toBeCloseTo(0.03 * t.undefended, 12);
    }
    // A mature posture sits on the floor at the low tiers.
    expect(score.tiers[0].p).toBe(score.tiers[0].floor);
    expect(score.aiInsider.p).toBeGreaterThanOrEqual(score.aiInsider.floor);
  });

  it("is zero for a scenario held inert by its precondition", () => {
    const score = scorePosture({
      blocks,
      model,
      blockStates: allAt(blocks, "not_started"),
      year: 2030,
      sliders: APP_SLIDERS,
      adversaryOc: 5,
      modelServedExternally: false,
    });
    const api = model.scenarios.find((s) => s.requires_external_serving)!;
    expect(score.scenarios[api.id]).toBe(0);
  });
});

describe("target SL", () => {
  it("is the adversary tier — SL-n is meant to stop OC-n — whatever the risk tolerance", () => {
    expect([1, 2, 3, 4, 5].map(targetSl)).toEqual([1, 2, 3, 4, 5]);
    expect(targetSl(0)).toBe(1);
    expect(targetSl(6)).toBe(5);
  });
});
