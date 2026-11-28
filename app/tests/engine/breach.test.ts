// Breach mechanics of the vector model (rewritten in Phase 2: the chain model's
// gate / get-past / depth-discount tests no longer describe anything the engine
// does). Each test pins one rule from research/scoring-model.md.
import { describe, it, expect } from "vitest";
import { counterRetention } from "../../src/engine/breach";
import {
  baseFeasibility,
  buildCounterIndex,
  campaignSuccess,
  DEFENDER_AI_SHARE,
  DESIGN_TIER_RELIEF,
  detectionQ,
  effectiveTier,
  erosionTier,
  stackCounters,
  type CounterInForce,
} from "../../src/engine/vector-model";
import { scorePosture, type PostureInput } from "../../src/engine/posture";
import type { BlockState, DefenseType } from "../../src/engine/types";
import { allAt, loadBlocks, loadModel, NEUTRAL_SLIDERS } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();
const vec = (id: string) => model.vectors.find((v) => v.id === id)!;
const counter = (strength: "strong" | "partial", type: DefenseType, effectiveness = 1, id = "X"): CounterInForce => ({
  blockId: id,
  strength,
  type,
  effectiveness,
});
const NONE = allAt(blocks, "not_started");

function score(over: Partial<PostureInput> = {}) {
  return scorePosture({
    blocks,
    model,
    blockStates: NONE,
    year: 2026,
    sliders: { ...NEUTRAL_SLIDERS, budget_millions: 1e6 },
    adversaryOc: 4,
    modelServedExternally: true,
    ...over,
  });
}

describe("RAND score → probability", () => {
  it("reads 1→0.02, 2→0.3, 3→0.5, 4→0.7, 5→0.9", () => {
    // V-CODE-3 is 1 2 4 5 5 across OC1..OC5.
    expect([1, 2, 3, 4, 5].map((t) => baseFeasibility(vec("V-CODE-3"), t))).toEqual([0.02, 0.3, 0.7, 0.9, 0.9]);
  });

  it("interpolates between whole tiers and caps at the top tier", () => {
    const v = vec("V-CODE-3");
    expect(baseFeasibility(v, 1.5)).toBeCloseTo((0.02 + 0.3) / 2, 12);
    expect(baseFeasibility(v, 7)).toBe(0.9);
  });
});

describe("attacker AI uplift", () => {
  it("lifts a vector's tier by ai_shift × aiCapability, capped at OC5", () => {
    expect(effectiveTier(vec("V-CODE-1"), 2, 0.5)).toBeCloseTo(2 + vec("V-CODE-1").ai_shift! * 0.5, 12);
    expect(effectiveTier(vec("V-CODE-1"), 5, 1)).toBe(5);
  });

  it("leaves vectors with no shift alone, and scores the lab's own model on its AC band", () => {
    expect(effectiveTier(vec("V-PHYS-7"), 3, 1)).toBe(3);
    expect(effectiveTier(vec("V-SELF-2"), 2.4, 1)).toBe(2.4);
  });

  it("lifts code, credential and ML vectors more than physical and human ones", () => {
    const shift = (cat: string) =>
      Math.max(...model.vectors.filter((v) => v.category === cat).map((v) => v.ai_shift ?? 0));
    for (const high of ["code", "credentials", "ai_specific"]) {
      for (const low of ["physical", "humint"]) expect(shift(high)).toBeGreaterThan(shift(low));
    }
  });
});

describe("counter stacking (diminishing returns)", () => {
  it("the best strong counter multiplies by 0.3", () => {
    expect(stackCounters([counter("strong", "hard_stop")], 1, false).multiplier).toBeCloseTo(0.3, 12);
  });

  it("further counters take 0.8, then 0.9, then 0.95, and past that add nothing", () => {
    const cs = [counter("strong", "hard_stop"), ...[1, 2, 3, 4].map((i) => counter("partial", "hard_stop", 1, `P${i}`))];
    const r = stackCounters(cs, 1, false);
    expect(r.multiplier).toBeCloseTo(0.3 * 0.8 * 0.9 * 0.95, 12);
    expect(r.applied.map((a) => a.rung)).toEqual([0.3, 0.8, 0.9, 0.95, null]);
  });

  it("partial counters together never beat one strong counter", () => {
    const partials = [1, 2, 3, 4, 5].map((i) => counter("partial", "hard_stop", 1, `P${i}`));
    expect(stackCounters(partials, 1, false).multiplier).toBeGreaterThan(
      stackCounters([counter("strong", "probabilistic", 1)], 1, false).multiplier
    );
  });

  it("a block's state scales its effect", () => {
    const at = (state: BlockState) =>
      score({ blockStates: { ...NONE, "NET-01": state } }).approaches.find((a) => a.id === "remote")!.p;
    expect(at("implementing")).toBeLessThan(at("investing"));
    expect(at("deployed")).toBeLessThan(at("implementing"));
    expect(at("mature")).toBeLessThan(at("deployed"));
  });

  it("honours a link's type_override", () => {
    // AI-06 is declared hybrid but is a response (probabilistic) against V-SELF-1.
    const ai06 = blocks.find((b) => b.id === "AI-06")!;
    expect(ai06.defense_type).toBe("hybrid");
    const index = buildCounterIndex([ai06], { "AI-06": "mature" }, 2026, NEUTRAL_SLIDERS, { idealCounters: true });
    expect(index.get("V-SELF-1")![0].type).toBe("probabilistic");
    const unoverridden = ai06.counters.find((c) => !c.type_override);
    if (unoverridden) expect(index.get(unoverridden.vector_id)![0].type).toBe("hybrid");
  });
});

describe("erosion bands", () => {
  it("hard stops erode in a narrow band, probabilistic counters in a wide one", () => {
    expect(counterRetention("hard_stop", 1)).toBeCloseTo(0.98, 12);
    expect(counterRetention("hard_stop", 5)).toBeCloseTo(0.86, 12);
    expect(counterRetention("probabilistic", 1)).toBeCloseTo(0.95, 12);
    expect(counterRetention("probabilistic", 5)).toBeCloseTo(0.4, 12);
  });

  it("a hybrid sits between the two at every tier, and every band erodes monotonically", () => {
    let last = { hard_stop: 1, hybrid: 1, probabilistic: 1 } as Record<DefenseType, number>;
    for (let t = 1; t <= 5; t += 0.25) {
      const r = {
        hard_stop: counterRetention("hard_stop", t),
        hybrid: counterRetention("hybrid", t),
        probabilistic: counterRetention("probabilistic", t),
      };
      expect(r.hybrid).toBeLessThanOrEqual(r.hard_stop);
      expect(r.hybrid).toBeGreaterThanOrEqual(r.probabilistic);
      for (const k of Object.keys(r) as DefenseType[]) expect(r[k]).toBeLessThanOrEqual(last[k] + 1e-12);
      last = r;
    }
  });
});

describe("campaign", () => {
  it("with q = 0 is the plain union across approaches", () => {
    const ps = [0.3, 0.1, 0.05];
    expect(campaignSuccess(ps, 0)).toBeCloseTo(1 - 0.7 * 0.9 * 0.95, 12);
  });

  it("detection q stops the campaign after a caught failure", () => {
    const ps = [0.3, 0.1, 0.05];
    const q = 0.4;
    // Tried in descending p: 0.3, then 0.1 if not caught, then 0.05.
    const want = 0.3 + 0.7 * 0.6 * 0.1 + 0.7 * 0.6 * 0.9 * 0.6 * 0.05;
    expect(campaignSuccess(ps, q)).toBeCloseTo(want, 12);
    expect(campaignSuccess(ps, q)).toBeLessThan(campaignSuccess(ps, 0));
  });

  it("tries approaches most-likely first (the order that is best for the attacker)", () => {
    expect(campaignSuccess([0.05, 0.3, 0.1], 0.4)).toBeCloseTo(campaignSuccess([0.3, 0.1, 0.05], 0.4), 12);
  });

  it("q grows with DET-01 and DEC-01 to about 0.5 at maturity, and erodes with AI", () => {
    const q = (states: Record<string, BlockState>, year: number) =>
      score({ blockStates: { ...NONE, ...states }, year, options: { idealCounters: true } }).detection.q;
    expect(q({}, 2024)).toBe(0);
    expect(q({ "DET-01": "mature", "DEC-01": "mature" }, 2024)).toBeCloseTo(0.5, 12);
    expect(q({ "DET-01": "mature", "DEC-01": "mature" }, 2030)).toBeLessThan(0.5);
  });

  it("the residual floor applies once per campaign, scales with the undefended attacker, and does not depend on blocks", () => {
    const bare = score();
    const full = score({ blockStates: allAt(blocks, "mature") });
    for (let n = 0; n < 5; n++) {
      expect(full.tiers[n].floor).toBeCloseTo(bare.tiers[n].floor, 12);
      expect(full.tiers[n].floor).toBeCloseTo(0.03 * bare.tiers[n].undefended, 12);
      expect(full.tiers[n].p).toBeGreaterThanOrEqual(full.tiers[n].floor);
    }
  });
});

describe("erosion relative to a control's design tier", () => {
  it("reads the band DESIGN_TIER_RELIEF tiers lower per SL above 1 the control is first required at", () => {
    expect(erosionTier({ designTier: 1 }, 5)).toBe(5);
    expect(erosionTier({ designTier: 5 }, 5)).toBeCloseTo(5 - 4 * DESIGN_TIER_RELIEF, 12);
    expect(erosionTier({ designTier: 3 }, 2)).toBe(Math.max(1, 2 - 2 * DESIGN_TIER_RELIEF));
    // Never below tier 1, and off in the probe's conditions.
    expect(erosionTier({ designTier: 5 }, 1)).toBe(1);
    expect(erosionTier({ designTier: 5 }, 5, 0, { designTierRelief: false })).toBe(5);
  });

  it("an SL5-grade control erodes less against OC5 than an SL2-grade one of the same type", () => {
    const sl5 = { ...counter("strong", "probabilistic"), designTier: 5 };
    const sl2 = { ...counter("strong", "probabilistic"), designTier: 2 };
    expect(stackCounters([sl5], 5).multiplier).toBeLessThan(stackCounters([sl2], 5).multiplier);
    // Erosion still bites: even the SL5-grade probabilistic counter is short of its un-eroded 0.3.
    expect(stackCounters([sl5], 5).multiplier).toBeGreaterThan(0.3);
    // ...and a hard stop still out-lasts a probabilistic control built to the same grade.
    const hard = { ...counter("strong", "hard_stop"), designTier: 5 };
    expect(stackCounters([hard], 5).multiplier).toBeLessThan(stackCounters([sl5], 5).multiplier);
  });
});

describe("defender AI", () => {
  it("wins back DEFENDER_AI_SHARE of the attacker's uplift, on flagged blocks only", () => {
    expect(erosionTier({ designTier: 1, defenderAi: true }, 4, 1)).toBeCloseTo(4 - DEFENDER_AI_SHARE, 12);
    expect(erosionTier({ designTier: 1, defenderAi: false }, 4, 1)).toBe(4);
    expect(erosionTier({ designTier: 1, defenderAi: true }, 4, 1, { defenderAi: false })).toBe(4);
    // Bounded by the uplift: with no attacker AI it does nothing.
    expect(erosionTier({ designTier: 1, defenderAi: true }, 4, 0)).toBe(4);
  });

  it("never makes a later year safer: the erosion tier still rises with the attacker's AI", () => {
    const c = { designTier: 3, defenderAi: true };
    let last = -Infinity;
    for (let ai = 0; ai <= 1.0001; ai += 0.05) {
      // OC3 on a 1.0-shift vector: effective tier 3 + ai, uplift ai.
      const t = erosionTier(c, 3 + ai, ai);
      expect(t).toBeGreaterThanOrEqual(last - 1e-12);
      last = t;
    }
  });

  it("only detection, monitoring, review and patching blocks carry it", () => {
    const flagged = blocks.filter((b) => b.defender_ai).map((b) => b.id);
    expect(flagged).toEqual(expect.arrayContaining(["DET-01", "DEC-01", "PER-03", "END-01", "SW-01", "AI-10"]));
    const index = buildCounterIndex(blocks, allAt(blocks, "mature"), 2030, NEUTRAL_SLIDERS);
    for (const list of index.values()) {
      for (const c of list) expect(c.defenderAi, c.blockId).toBe(flagged.includes(c.blockId));
    }
  });

  it("halves the AI erosion of detection q for AI-augmented detection", () => {
    const states = allAt(blocks, "mature");
    const q = (aiCap: number, defenderAi = true) => detectionQ(blocks, states, 2030, NEUTRAL_SLIDERS, aiCap, { defenderAi });
    expect(q(0)).toBeCloseTo(q(0, false), 12);
    expect(q(1)).toBeGreaterThan(q(1, false));
    expect(q(1, false)).toBeCloseTo(q(0) * 0.6, 9);
    expect(q(1)).toBeCloseTo(q(0) * (1 - 0.4 * (1 - DEFENDER_AI_SHARE)), 9);
  });
});

describe("world toggles", () => {
  it("serving switches the served approach and the capability meter on and off", () => {
    const on = score({ modelServedExternally: true });
    const off = score({ modelServedExternally: false });
    expect(on.approaches.find((a) => a.id === "served")!.active).toBe(true);
    expect(off.approaches.find((a) => a.id === "served")!.active).toBe(false);
    expect(off.capabilityLeakage.p).toBe(0);
    expect(off.capabilityLeakage.cumulative).toBe(0);
    expect(on.capabilityLeakage.p).toBeGreaterThan(0);
    for (let n = 0; n < 5; n++) expect(off.tiers[n].p).toBeLessThanOrEqual(on.tiers[n].p);
  });

  it("government cooperation relieves the vectors no lab can counter alone", () => {
    const flagged = model.vectors.filter((v) => v.needs_government).map((v) => v.id);
    expect(flagged).toEqual(expect.arrayContaining(["V-PHYS-7", "V-HUM-5"]));
    const at = (gov: number) =>
      score({ sliders: { ...NEUTRAL_SLIDERS, gov_cooperation: gov }, adversaryOc: 5 }).approaches.find(
        (a) => a.id === "physical"
      )!;
    // Undefended, V-PHYS-7 never binds the physical approach, so compare the vector itself.
    const lo = score({ sliders: { ...NEUTRAL_SLIDERS, gov_cooperation: 0 } });
    const hi = score({ sliders: { ...NEUTRAL_SLIDERS, gov_cooperation: 1 } });
    expect(hi.tiers[4].p).toBeLessThanOrEqual(lo.tiers[4].p);
    expect(at(1).p).toBeLessThanOrEqual(at(0).p);
  });
});

describe("the lab's own model", () => {
  it("is scored on the AC band 1 + 4·aiCapability, times the propensity to try", () => {
    const r = score({ year: 2026 });
    expect(r.aiInsider.acBand).toBeCloseTo(1 + 4 * 0.35, 9);
    const half = score({ sliders: { ...NEUTRAL_SLIDERS, ai_propensity: 0.5 } });
    const full = score({ sliders: { ...NEUTRAL_SLIDERS, ai_propensity: 1 } });
    expect(half.aiInsider.pathP).toBeCloseTo(full.aiInsider.pathP, 12);
    expect(half.aiInsider.p).toBeCloseTo(Math.max(0.5 * half.aiInsider.pathP, half.aiInsider.floor), 12);
    expect(full.aiInsider.p).toBeGreaterThan(half.aiInsider.p);
  });

  it("keeps sabotage (V-SELF-5) out of SL and on the integrity meter", () => {
    const ai = model.approaches.find((a) => a.id === "ai_insider")!;
    expect(Object.values(ai.stages).flat()).not.toContain("V-SELF-5");
    const r = score();
    expect(r.integrity.path.map((s) => s.vectorId)).toEqual(["V-SELF-5"]);
    expect(r.integrity.p).toBeGreaterThan(0);
  });

  it("keeps distillation (V-ML-5) out of the campaign and on the capability meter", () => {
    for (const a of model.approaches.filter((x) => x.headline)) {
      expect(Object.values(a.stages).flat()).not.toContain("V-ML-5");
    }
    expect(score().capabilityLeakage.path.map((s) => s.vectorId)).toEqual(["V-ML-5"]);
  });
});

describe("adversary capability", () => {
  it("undefended, campaign success rises with the OC tier", () => {
    const r = score();
    for (let n = 1; n < 5; n++) expect(r.tiers[n].p).toBeGreaterThanOrEqual(r.tiers[n - 1].p);
    expect(r.tiers[0].p).toBeLessThan(0.5);
    expect(r.tiers[4].p).toBeGreaterThan(0.95);
  });

  it("AI capability raises success over time against a fixed posture", () => {
    const states = allAt(blocks, "mature");
    const early = score({ blockStates: states, year: 2024 });
    const late = score({ blockStates: states, year: 2030 });
    for (let n = 0; n < 5; n++) expect(late.tiers[n].p).toBeGreaterThan(early.tiers[n].p);
  });
});
