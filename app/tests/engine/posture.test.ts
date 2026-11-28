import { describe, it, expect } from "vitest";
import {
  counterRelevance,
  isHeldAtResidualFloor,
  scorePosture,
  targetSl,
  threatRelevance,
  type PostureInput,
} from "../../src/engine";
import { deriveSimulationResults } from "../../src/store/derived";
import { sampleAt, sampleRiskCurve, SAMPLE_YEARS } from "../../src/utils/risk-samples";
import { policyLeverImpacts } from "../../src/utils/policy-levers";
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

  it("the Score card, timeline, Policy view and CISO view agree exactly", () => {
    // Before the shared pipeline these read 2.02 / 2.12 / 2.46 for Reactive 2030.
    const card = deriveSimulationResults({
      ...input,
      threatModel: model,
      advanceOrder: input.advanceOrder!,
      futureCapabilities: false,
    });
    const curve = sampleRiskCurve(input);
    const idx = SAMPLE_YEARS.indexOf(2030);
    expect(idx).toBeGreaterThanOrEqual(0);
    const timeline = curve[idx];
    const policy = policyLeverImpacts(input).current;
    const ciso = recommendInvestments(input).baseline;

    for (const [name, sl, breach, perChain] of [
      ["score card", card.overallSl, card.campaign, card.breachProbabilities],
      ["timeline", timeline.sl, timeline.threat, timeline.chainProbs],
      ["timeline (read at the store year)", sampleAt(curve, 2030).sl, sampleAt(curve, 2030).threat, sampleAt(curve, 2030).chainProbs],
      ["policy view", policy.overallSl, policy.breach, policy.breachProbabilities],
      ["ciso view", ciso.overallSl, ciso.breach, ciso.breachProbabilities],
    ] as const) {
      expect(sl, `${name} SL`).toBe(reference.overallSl);
      expect(breach, `${name} breach`).toBe(reference.breach);
      expect(perChain, `${name} per-scenario success`).toEqual(reference.breachProbabilities);
    }
    expect(card.categoryScores).toEqual(reference.categoryScores);
    expect(card.effectiveStates).toEqual(reference.effectiveStates);
    // The new API reaches the store unchanged.
    expect(card.sl).toEqual(reference.sl);
    expect(card.tiers).toEqual(reference.tiers);
    expect(card.approaches).toEqual(reference.approaches);
    expect(card.aiInsider).toEqual(reference.aiInsider);
    expect(card.extractionProgress).toBe(reference.capabilityLeakage.cumulative);
    expect(card.breachByOc[4]).toBe(reference.tiers[3].p);
  });

  it("exposes the compatibility fields as views of the new numbers", () => {
    expect(reference.overallSl).toBe(reference.sl.value);
    expect(reference.breach).toBe(reference.campaign);
    expect(reference.campaign).toBe(reference.tiers[3].p);
    expect(reference.breachProbabilities).toEqual(reference.scenarios);
  });

  it("scores completeness over every block that counters something, weighting strong counters fully", () => {
    const full = threatRelevance(blocks);
    expect(full).toEqual(counterRelevance(blocks));
    expect(full.size).toBe(blocks.filter((b) => !b.future).length);
    expect([...full.values()].some((w) => w < 1)).toBe(true);
    // Memoized on identity, so the hot path doesn't rebuild it.
    expect(threatRelevance(blocks)).toBe(full);
  });

  it("the timeline holds the posture fixed and moves only the clock", () => {
    const curve = sampleRiskCurve(input);
    for (const sample of curve.filter((_, i) => i % 6 === 0)) {
      const direct = scorePosture({ ...input, year: sample.year });
      expect(sample.sl).toBe(direct.overallSl);
      expect(sample.threat).toBe(direct.campaign);
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
    // Every scenario carries the campaign floor it sits under (compatibility).
    for (const s of model.scenarios) {
      const isAi = model.approaches.find((a) => a.id === s.approach)!.adversary === "ai";
      const live = !s.requires_external_serving;
      if (!live) continue;
      expect(score.residualFloors[s.id]).toBe(isAi ? score.aiInsider.floor : s.approach === "capability_copy" ? 0 : score.tiers[3].floor);
    }
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
    expect(score.residualFloors[api.id]).toBe(0);
    expect(isHeldAtResidualFloor(0, 0)).toBe(true);
  });

  it("files a number as held within half a point of its floor, and no further", () => {
    expect(isHeldAtResidualFloor(0.026, 0.026)).toBe(true);
    expect(isHeldAtResidualFloor(0.0309, 0.026)).toBe(true);
    expect(isHeldAtResidualFloor(0.0311, 0.026)).toBe(false);
  });
});

describe("target SL", () => {
  it("is the adversary tier — SL-n is meant to stop OC-n — whatever the risk tolerance", () => {
    expect([1, 2, 3, 4, 5].map(targetSl)).toEqual([1, 2, 3, 4, 5]);
    expect(targetSl(0)).toBe(1);
    expect(targetSl(6)).toBe(5);
  });
});
