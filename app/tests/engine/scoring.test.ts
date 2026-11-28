import { describe, it, expect } from "vitest";
// Programme completeness: the old coverage score, kept as a secondary readout.
// (The threat-relative SL has its own tests: breach / calibration /
// monotonicity.) Rewritten in Phase 2 where the meaning changed: relevance now
// comes from the vector map, and the calibration pins are over today's
// 56-block catalogue.
import {
  blockEffectiveness,
  categoryScore,
  overallSlScore,
  computeCategoryScores,
  counterRelevance,
  enablementFactor,
  getStateEffectiveness,
  SUPPORTING_WEIGHT,
} from "../../src/engine/scoring";
import { getAiCapability } from "../../src/engine/ai-curve";
import type { Block } from "../../src/engine/types";
import { loadBlocks as loadAll } from "../load-data";

/** The catalogue (the Nov 2026 recalibration retired the future blocks). */
function loadBlocks(): Block[] {
  return loadAll();
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
  const per03 = blocks.find((b) => b.id === "PER-03")!;

  it("hard stop blocks have no AI degradation", () => {
    const eff2026 = blockEffectiveness(net01, "deployed", 2026);
    const eff2030 = blockEffectiveness(net01, "deployed", 2030);
    expect(eff2026).toBe(eff2030);
    expect(eff2026).toBe(0.85);
  });

  it("probabilistic blocks degrade over time", () => {
    expect(per03.defense_type).toBe("probabilistic");
    const eff2026 = blockEffectiveness(per03, "deployed", 2026);
    const eff2030 = blockEffectiveness(per03, "deployed", 2030);
    expect(eff2030).toBeLessThan(eff2026);
  });

  it("not_started always returns 0", () => {
    expect(blockEffectiveness(net01, "not_started", 2026)).toBe(0);
    expect(blockEffectiveness(per03, "not_started", 2030)).toBe(0);
  });

  it("hybrid blocks erode, but only over their probabilistic half", () => {
    // `hybrid` was unimplemented on this channel too: `aiDegradation` returned
    // early for `hard_stop` and gave everything else the full probabilistic
    // erosion, so a data diode's hardware one-way flow decayed as if it were a
    // monitoring rule. Vary only `defense_type` so the comparison isn't
    // confounded by a different block's `ai_oc_shift`.
    const net05 = blocks.find((b) => b.id === "NET-05")!;
    expect(net05.defense_type).toBe("hybrid");
    const asType = (t: Block["defense_type"]) =>
      blockEffectiveness({ ...net05, defense_type: t }, "deployed", 2030);

    expect(asType("hybrid")).toBeLessThan(asType("hard_stop"));
    expect(asType("hybrid")).toBeGreaterThan(asType("probabilistic"));

    // Still erodes over time — half-structural, not immune.
    expect(blockEffectiveness(net05, "deployed", 2030)).toBeLessThan(
      blockEffectiveness(net05, "deployed", 2026)
    );
  });
});

describe("Enablement (completed_by)", () => {
  const blocks = loadBlocks();
  const net01 = blocks.find((b) => b.id === "NET-01")!;
  const companions = net01.dependencies.completed_by!;

  // The mini-game's air gap is the reason this mechanic exists: one click bought
  // ~60 points of breach reduction, teaching that a single structural purchase is
  // most of security. NET-01 is therefore the test's type specimen.
  it("NET-01 declares the companions that make an air gap real", () => {
    expect(companions.blocks.length).toBeGreaterThan(1);
    expect(companions.standalone_share).toBeGreaterThan(0);
    expect(companions.standalone_share).toBeLessThan(1);
  });

  it("is a no-op for a block that declares no companions", () => {
    const plain = blocks.find((b) => !b.dependencies.completed_by)!;
    expect(enablementFactor(plain, {})).toBe(1);
    expect(blockEffectiveness(plain, "mature", 2026, 0.5, { blockStates: {} })).toBe(
      blockEffectiveness(plain, "mature", 2026)
    );
  });

  it("floors at exactly standalone_share with no companion operational", () => {
    expect(enablementFactor(net01, {})).toBeCloseTo(companions.standalone_share, 10);
  });

  it("reaches 1 when every companion is operational", () => {
    const all = Object.fromEntries(companions.blocks.map((id) => [id, "mature"]));
    expect(enablementFactor(net01, all)).toBeCloseTo(1, 10);
    // `deployed` counts too — the companion is doing its job, not perfected.
    const deployed = Object.fromEntries(companions.blocks.map((id) => [id, "deployed"]));
    expect(enablementFactor(net01, deployed)).toBeCloseTo(1, 10);
  });

  it("only counts operational companions, not merely started ones", () => {
    for (const state of ["not_started", "investing", "implementing"]) {
      const states = Object.fromEntries(companions.blocks.map((id) => [id, state]));
      expect(enablementFactor(net01, states)).toBeCloseTo(companions.standalone_share, 10);
    }
  });

  // The property that keeps the breach model monotone: a companion coming online
  // can only ever raise this block's effectiveness.
  it("rises monotonically as companions come online", () => {
    const states: Record<string, string> = {};
    let previous = enablementFactor(net01, states);
    for (const id of companions.blocks) {
      states[id] = "deployed";
      const next = enablementFactor(net01, states);
      expect(next).toBeGreaterThan(previous);
      previous = next;
    }
    expect(previous).toBeCloseTo(1, 10);
  });

  it("discounts effectiveness only when blockStates is supplied", () => {
    // Omitted, a block reads as fully enabled — the right default for the UI's
    // "what is this worth once it's built" readouts.
    expect(blockEffectiveness(net01, "mature", 2026)).toBe(1);
    const discounted = blockEffectiveness(net01, "mature", 2026, 0.5, { blockStates: {} });
    expect(discounted).toBeCloseTo(companions.standalone_share, 10);
  });
});

describe("Category and Overall Scores", () => {
  const blocks = loadBlocks();

  // Overall SL uses the 0.3·min + 0.7·mean aggregation over category scores
  // (all-catalog denominator here, since these tests pass no relevantIds set).
  //
  // These four are calibration pins, and three of them moved down when
  // `completed_by` landed. That is the mechanic, not a regression: 19 blocks are
  // now worth `standalone_share` until their companions are operational, so any
  // PARTIAL posture scores lower than it did. The ceiling is deliberately
  // untouched — Scenario 3 (all deployed) is unchanged, because in a complete
  // posture every companion is operational and every factor is 1. If a future
  // change moves Scenario 3, something is wrong with the mechanic; if it moves
  // 1/2/4, check the annotations before re-baselining.
  //
  // Phase 2 re-baselined all four (1.82 → 1.85, 2.33 → 2.30, 4.18 → 4.17,
  // 2.14 → 2.12) because the catalogue changed under them: 47 → 56 blocks, six
  // merges and five reclassifications to hybrid. The ceiling held to 0.01.

  it("Scenario 1: Baseline 2026 (~1.94)", () => {
    // Feeds `baseline_state` straight into the engine, so it exercises the raw
    // data path and scores `partially_deployed` at the 0.6 shim — NOT what the
    // app shows, which maps that state onto the advancement cycle. Moved 1.75 →
    // 1.90 in the 2026 value audit when PER-06, AI-01 and SC-01 were corrected
    // from "no lab has done this" to `partially_deployed` against published lab
    // disclosures, then back to 1.82 when NET-04 returned to `not_started`: the
    // deployed egress controls are software rate limits, not the hardware-
    // enforced physical cap that block actually specifies. 1.85 → 1.94 in the
    // Nov 2026 recalibration: seven controls labs demonstrably run are now
    // `deployed` at baseline, and NET-04 is `partially_deployed` from 2025 (the
    // ASL-3 software egress limits are the partial version of the block).
    const baselineStates: Record<string, string> = {};
    for (const b of blocks) {
      baselineStates[b.id] = b.current_state.baseline_state;
    }
    const catScores = computeCategoryScores(blocks, baselineStates, 2026);
    const overall = overallSlScore(catScores);
    expect(overall).toBeCloseTo(1.94, 1);
  });

  it("Scenario 2: All implementing 2026 (~2.30)", () => {
    const states: Record<string, string> = {};
    for (const b of blocks) states[b.id] = "implementing";
    const catScores = computeCategoryScores(blocks, states, 2026);
    const overall = overallSlScore(catScores);
    expect(overall).toBeCloseTo(2.3, 1);
  });

  it("Scenario 3: All deployed 2029 (~4.17)", () => {
    const states: Record<string, string> = {};
    for (const b of blocks) states[b.id] = "deployed";
    const catScores = computeCategoryScores(blocks, states, 2029);
    const overall = overallSlScore(catScores);
    expect(overall).toBeCloseTo(4.17, 1);
  });

  it("Scenario 4: Network+Physical deployed, AI absent 2028 (~2.12)", () => {
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
    expect(overall).toBeCloseTo(2.12, 1);
  });

  it("an absent category still drags overall below full coverage", () => {
    const allDeployed: Record<string, string> = {};
    for (const b of blocks) allDeployed[b.id] = "deployed";
    const fullOverall = overallSlScore(computeCategoryScores(blocks, allDeployed, 2028));

    const states: Record<string, string> = {};
    for (const b of blocks) {
      states[b.id] = b.category === "ai_specific" ? "not_started" : "deployed";
    }
    const overall = overallSlScore(computeCategoryScores(blocks, states, 2028));
    // The weakest-link term still bites: a wide-open AI category pulls overall
    // meaningfully below full coverage (~4.18), even though breadth now dominates.
    expect(overall).toBeLessThan(fullOverall - 0.8);
  });
});

describe("Threat relevance weighting", () => {
  const blocks = loadBlocks();

  it("weights strong counters fully and partial-only blocks at the supporting weight", () => {
    const weights = counterRelevance(blocks);
    // Every block counters something, so every block is relevant.
    expect(weights.size).toBe(blocks.length);
    for (const b of blocks) {
      const strong = b.counters.some((c) => c.strength === "strong");
      expect(weights.get(b.id), b.id).toBe(strong ? 1 : SUPPORTING_WEIGHT);
    }
    expect([...weights.values()].filter((w) => w === 1).length).toBeGreaterThan(0);
    expect([...weights.values()].filter((w) => w === SUPPORTING_WEIGHT).length).toBeGreaterThan(0);
  });

  it("lets a strong counter move a category score more than a partial-only one", () => {
    const weights = counterRelevance(blocks);
    const cat = (["network", "physical", "personnel", "machine"] as const).find((c) => {
      const inCat = blocks.filter((b) => b.category === c);
      return inCat.some((b) => weights.get(b.id) === 1) && inCat.some((b) => weights.get(b.id) === SUPPORTING_WEIGHT);
    })!;
    const catBlocks = blocks.filter((b) => b.category === cat);
    // Same state and no companions, so only the weight differs.
    const plain = (b: Block) => !b.dependencies.completed_by && b.defense_type === "hard_stop";
    const strongBlock = catBlocks.find((b) => weights.get(b.id) === 1 && plain(b)) ?? catBlocks.find((b) => weights.get(b.id) === 1)!;
    const partialBlock =
      catBlocks.find((b) => weights.get(b.id) === SUPPORTING_WEIGHT && plain(b)) ??
      catBlocks.find((b) => weights.get(b.id) === SUPPORTING_WEIGHT)!;
    const base: Record<string, string> = {};
    for (const b of blocks) base[b.id] = "not_started";
    const score = (id: string) => categoryScore(catBlocks, { ...base, [id]: "mature" }, 2024, 1, weights);
    expect(score(strongBlock.id)).toBeGreaterThan(score(partialBlock.id));
    // ...but a partial-only block is not inert: it still moves the number.
    expect(score(partialBlock.id)).toBeGreaterThan(categoryScore(catBlocks, base, 2024, 1, weights));
  });
});
