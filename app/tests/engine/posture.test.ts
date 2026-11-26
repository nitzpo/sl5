import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  chainResidualFloor,
  isHeldAtResidualFloor,
  relevantBlockIds,
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
import type { AttackChain, Block, BlockState, Sliders } from "../../src/engine/types";

const DATA = path.join(__dirname, "../../public/data");
const blocks: Block[] = fs
  .readdirSync(DATA)
  .filter((f) => f.startsWith("blocks-") && f.endsWith(".json"))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8")) as Block[]);
const chains: AttackChain[] = JSON.parse(
  fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8")
);

// The app's own default sliders (store/simulation.ts) — gov/vendor/org well
// below 1, which is exactly what a path passing the bare AI-timeline number
// silently threw away.
const APP_SLIDERS: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.2,
  vendor_cooperation: 0.3,
  budget_millions: 200,
  org_transformation: 0.3,
  risk_tolerance: 0.5,
};

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
    chains,
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
    expect(reference.overallSl).toBeGreaterThan(1.2);
    expect(reference.breach).toBeGreaterThan(0.05);
  });

  it("the Score card, timeline, Policy view and CISO view agree exactly", () => {
    // Before the shared pipeline these read 2.02 / 2.12 / 2.46 for Reactive 2030.
    const card = deriveSimulationResults({ ...input, attackChains: chains, advanceOrder: input.advanceOrder! });
    const curve = sampleRiskCurve(input);
    const idx = SAMPLE_YEARS.indexOf(2030);
    expect(idx).toBeGreaterThanOrEqual(0);
    const timeline = curve[idx];
    const policy = policyLeverImpacts(input).current;
    const ciso = recommendInvestments(input).baseline;

    for (const [name, sl, breach, perChain] of [
      ["score card", card.overallSl, card.bestChain!.probability, card.breachProbabilities],
      ["timeline", timeline.sl, timeline.threat, timeline.chainProbs],
      ["timeline (read at the store year)", sampleAt(curve, 2030).sl, sampleAt(curve, 2030).threat, sampleAt(curve, 2030).chainProbs],
      ["policy view", policy.overallSl, policy.breach, policy.breachProbabilities],
      ["ciso view", ciso.overallSl, ciso.breach, ciso.breachProbabilities],
    ] as const) {
      expect(sl, `${name} SL`).toBe(reference.overallSl);
      expect(breach, `${name} breach`).toBe(reference.breach);
      expect(perChain, `${name} per-chain breach`).toEqual(reference.breachProbabilities);
    }
    expect(card.categoryScores).toEqual(reference.categoryScores);
    expect(card.effectiveStates).toEqual(reference.effectiveStates);
  });

  it("scores over the 45 threat-relevant blocks, not the 19 named ones", () => {
    const named = relevantBlockIds(chains);
    const full = threatRelevance(chains, blocks);
    expect(full).toEqual(relevantBlockIds(chains, blocks));
    expect(full.size).toBeGreaterThan(named.size);
    // Memoized on identity, so the hot path doesn't rebuild it.
    expect(threatRelevance(chains, blocks)).toBe(full);
  });

  it("the timeline holds the posture fixed and moves only the clock", () => {
    const curve = sampleRiskCurve(input);
    for (const sample of curve.filter((_, i) => i % 6 === 0)) {
      const direct = scorePosture({ ...input, year: sample.year });
      expect(sample.sl).toBe(direct.overallSl);
      expect(sample.threat).toBe(direct.breach);
    }
  });
});

describe("residual floor", () => {
  it("is exactly what the breach model floors a live chain at", () => {
    // Every block mature and nothing capped: the secondary chains sit on the
    // floor, and the floor is what the engine reports.
    const mature = Object.fromEntries(blocks.map((b) => [b.id, "mature"])) as Record<string, BlockState>;
    const score = scorePosture({
      blocks,
      chains,
      blockStates: mature,
      year: 2030,
      sliders: { ...APP_SLIDERS, budget_millions: 1e6 },
      adversaryOc: 4,
      modelServedExternally: true,
    });
    let onFloor = 0;
    for (const chain of chains) {
      const floor = chainResidualFloor(chain, blocks, 4, 2030, APP_SLIDERS, true);
      expect(score.residualFloors[chain.id]).toBe(floor);
      expect(score.breachProbabilities[chain.id]).toBeGreaterThanOrEqual(floor);
      if (score.breachProbabilities[chain.id] === floor) onFloor++;
    }
    expect(onFloor).toBeGreaterThan(0);
  });

  it("puts every OC4 chain above the old fixed 2% 'blocked' line against OC4", () => {
    // Which is why the Attacker view's "blocked below 2%" could never fire.
    for (const chain of chains.filter((c) => c.adversary_profile.min_oc === 4)) {
      expect(chainResidualFloor(chain, blocks, 4, 2026, APP_SLIDERS, true)).toBeGreaterThan(0.02);
    }
  });

  it("is zero for a chain held inert by its precondition", () => {
    const api = chains.find((c) => c.requires_external_serving)!;
    expect(chainResidualFloor(api, blocks, 5, 2030, APP_SLIDERS, false)).toBe(0);
    expect(isHeldAtResidualFloor(0, 0)).toBe(true);
  });

  it("files a chain as held within half a point of its floor, and no further", () => {
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
