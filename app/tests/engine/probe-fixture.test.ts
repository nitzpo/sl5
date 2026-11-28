// The reference calibration probe, reproduced through the engine.
//
// `fixtures/probe-results.json` is the output of the reviewed Python probe
// (scratchpad/vectors/src/probe.py) on the approved vector backbone. These
// tests run the app's own pipeline — `scorePosture` on the shipped JSON — in
// the probe's conditions and require the same numbers. That pins the port of
// the data (vectors, counters, approaches) and of the rules (score bins,
// stages, stacking, erosion, union) before any app-only mechanic is layered on.
//
// Probe conditions, as engine options:
//   - a RAND "1" read as 0.05 (the app reads it as 0.02)
//   - no AI uplift (aiCapability 0), no detection, no residual floor
//   - every block either absent or fully effective (`idealCounters`)
//   - no government relief (gov_cooperation 0), AI propensity 1
//
// The probe ran on the reviewed vector map. The Nov 2026 recalibration changed
// that map (new strong counters, the inference-API exfil stage V-X-5, V-ML-4 no
// longer skipping exfil, V-PHYS-5 no longer assuming HW-04) and added two
// app-only rules (erosion read relative to a control's design tier; defender
// AI). So these tests run on `fixtures/approved-map.json`, the map as reviewed,
// with both new rules switched off: they pin the engine's rules against the
// probe, not today's data. Part 12 of research/scoring-model.md lists the map
// changes.
//
// Three documented departures, all asserted below:
//   1. The probe admitted a residual vector only once its assumed defense was
//      deployed; the engine always admits it (the monotone reading). They agree
//      whenever the assumed defenses are in place — every catalogue row here —
//      and differ only undefended, where "evasion of physical access control"
//      (V-PHYS-4, RAND 5 at OC5) now sets the physical approach at OC5.
//   2. The lab's own model no longer has sabotage (V-SELF-5) among its reach
//      vectors; it moved to the integrity meter. It never bound the probe's AI
//      insider, so the AI numbers are unchanged.
//   3. Counter stacking. The probe put extra strong counters ahead of partials
//      on the 0.8/0.9/0.95 ladder; the engine orders the ladder by reach and
//      picks the 0.3 counter to give the defender the most credit, because the
//      probe's order is not monotone once effectiveness is fractional. With no
//      erosion every reach is 1 and the two agree exactly; eroded, the engine
//      is never above the probe and at most 0.015 below it (OC5 not served: 0.500 vs 0.511).
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/probe-results.json";
import { scorePosture } from "../../src/engine/posture";
import {
  baseFeasibility,
  campaignSuccess,
  evaluateApproach,
  type ModelOptions,
  type VectorEval,
} from "../../src/engine/vector-model";
import type { BlockState, Sliders } from "../../src/engine/types";
import approved from "./fixtures/approved-map.json";
import type { Approach, AttackVector, Block, DefenseType } from "../../src/engine/types";
import { allAt, APP_SLIDERS, loadBlocks, loadModel } from "../load-data";

const shipped = loadModel();
const approvedBlocks = approved.blocks as unknown as Record<string, Pick<Block, "defense_type" | "counters">>;
/** Today's blocks with the counters (and defense types) the probe ran on. */
const today: Block[] = loadBlocks()
  .filter((b) => approvedBlocks[b.id])
  .map((b) => ({ ...b, defense_type: approvedBlocks[b.id].defense_type as DefenseType, counters: approvedBlocks[b.id].counters }));
const shippedVectors = new Map(shipped.vectors.map((v) => [v.id, v]));
const model = {
  vectors: (approved.vectors as unknown as AttackVector[]).map((v) => ({ ...shippedVectors.get(v.id)!, ...v })),
  approaches: approved.approaches as unknown as Approach[],
  scenarios: shipped.scenarios,
};
const PROBE_P = { 1: 0.05, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.9 };
const SLIDERS: Sliders = { ...APP_SLIDERS, gov_cooperation: 0, budget_millions: 1e9, ai_propensity: 1 };
/** The probe's conditions, plus the two rules added after it switched off. */
const PROBE_OPTS: ModelOptions = {
  scoreToP: PROBE_P,
  aiCapability: 0,
  detection: false,
  residualFloor: false,
  idealCounters: true,
  designTierRelief: false,
  defenderAi: false,
};

function probeRun(states: Record<string, BlockState>, served: boolean, erosion: boolean, aiCapability = 0) {
  const options: ModelOptions = { ...PROBE_OPTS, erosion, aiCapability };
  return scorePosture({
    blocks: today,
    model,
    blockStates: states,
    year: 2026,
    sliders: SLIDERS,
    adversaryOc: 4,
    modelServedExternally: served,
    options,
  });
}

const NONE = allAt(today, "not_started");
const FULL = allAt(today, "mature");
type Row = { campaign_oc: number[]; ai_insider_ac: number[] };
const rows = fixture.scenarios as unknown as Record<string, Record<string, Row>>;

function campaignByTier(states: Record<string, BlockState>, served: boolean, erosion: boolean) {
  return probeRun(states, served, erosion).tiers.map((t) => t.p);
}

/** The AI insider is scored on the AC band 1 + 4·aiCap, so AC n is aiCap (n−1)/4. */
function aiByBand(states: Record<string, BlockState>, erosion: boolean) {
  return [1, 2, 3, 4, 5].map((n) => probeRun(states, false, erosion, (n - 1) / 4).aiInsider.pathP);
}

describe("reference probe, reproduced by the engine", () => {
  for (const served of [true, false]) {
    const key = `served=${served ? "True" : "False"}`;

    it(`full proposed catalogue, no erosion (${key})`, () => {
      const want = rows.proposed_no_erosion[key];
      campaignByTier(FULL, served, false).forEach((p, i) => expect(p).toBeCloseTo(want.campaign_oc[i], 6));
      aiByBand(FULL, false).forEach((p, i) => expect(p).toBeCloseTo(want.ai_insider_ac[i], 6));
    });

    it(`full proposed catalogue, eroded (${key})`, () => {
      const want = rows.proposed_eroded[key];
      const close = (got: number, w: number) => {
        expect(got).toBeLessThanOrEqual(w + 1e-9);
        expect(got).toBeGreaterThanOrEqual(w - 0.015);
      };
      campaignByTier(FULL, served, true).forEach((p, i) => close(p, want.campaign_oc[i]));
      aiByBand(FULL, true).forEach((p, i) => close(p, want.ai_insider_ac[i]));
    });

    it(`undefended (${key})`, () => {
      const want = rows.undefended[key];
      const got = campaignByTier(NONE, served, true);
      // OC1–OC4 exactly. At OC5 the physical approach is 0.9 instead of the
      // probe's 0.7 (departure 1), and that is the whole difference.
      got.slice(0, 4).forEach((p, i) => expect(p).toBeCloseTo(want.campaign_oc[i], 6));
      const probeMiss = 1 - want.campaign_oc[4];
      expect(got[4]).toBeCloseTo(1 - (probeMiss * (1 - 0.9)) / (1 - 0.7), 9);
      aiByBand(NONE, true).forEach((p, i) => expect(p).toBeCloseTo(want.ai_insider_ac[i], 6));
    });

    it(`every vector strongly countered, x0.3 (${key})`, () => {
      // No catalogue gives "every vector ×0.3", so this row exercises the path
      // and union machinery directly on a hand-built vector map.
      const want = rows.uniform_strong[key];
      const byId = new Map(model.vectors.map((v) => [v.id, v]));
      const at = (tier: number) => (id: string): VectorEval | undefined => {
        const v = byId.get(id);
        if (!v) return undefined;
        const p = baseFeasibility(v, tier, PROBE_P) * 0.3;
        return { vectorId: id, tier, baseP: p / 0.3, p, multiplier: 0.3, governmentRelief: 1, applied: [] };
      };
      for (let tier = 1; tier <= 5; tier++) {
        const ps = model.approaches
          .filter((a) => a.adversary === "human" && a.headline && (served || !a.requires_external_serving))
          .map((a) => evaluateApproach(a, at(tier), byId).p);
        expect(campaignSuccess(ps)).toBeCloseTo(want.campaign_oc[tier - 1], 6);
        const ai = model.approaches.find((a) => a.id === "ai_insider")!;
        expect(evaluateApproach(ai, at(tier), byId).p).toBeCloseTo(want.ai_insider_ac[tier - 1], 6);
      }
    });
  }

  it("per-approach success and binding paths, full proposed catalogue, eroded, served (departure 3 tolerance)", () => {
    const want = rows.proposed_eroded as unknown as {
      routes_served: Record<string, number[]>;
      binding_tier4: Record<string, Record<string, string>>;
      binding_tier5: Record<string, Record<string, string>>;
    };
    for (let tier = 1; tier <= 5; tier++) {
      const r = scorePosture({
        blocks: today,
        model,
        blockStates: FULL,
        year: 2026,
        sliders: SLIDERS,
        adversaryOc: tier,
        modelServedExternally: true,
        options: PROBE_OPTS,
      });
      for (const a of r.approaches.filter((x) => x.adversary === "human")) {
        expect(a.p, `${a.id} at OC${tier}`).toBeLessThanOrEqual(want.routes_served[a.id][tier - 1] + 1e-9);
        expect(a.p, `${a.id} at OC${tier}`).toBeGreaterThanOrEqual(want.routes_served[a.id][tier - 1] - 0.015);
        if (tier >= 4) {
          const binding = (tier === 4 ? want.binding_tier4 : want.binding_tier5)[a.id];
          const path = Object.fromEntries(a.path.map((s) => [s.stage, s.vectorId]));
          expect(path, `${a.id} binding path at OC${tier}`).toEqual(binding);
        }
      }
    }
  });

  it("undefended per-approach success, served — physical at OC5 is the one documented departure", () => {
    const want = (rows.undefended as unknown as { routes_served: Record<string, number[]> }).routes_served;
    for (let tier = 1; tier <= 5; tier++) {
      const at = scorePosture({
        blocks: today,
        model,
        blockStates: NONE,
        year: 2026,
        sliders: SLIDERS,
        adversaryOc: tier,
        modelServedExternally: true,
        options: PROBE_OPTS,
      });
      for (const a of at.approaches.filter((x) => x.adversary === "human")) {
        if (a.id === "physical" && tier === 5) {
          // Probe 0.7 (V-PHYS-1); engine 0.9 (V-PHYS-4 always admitted).
          expect(want.physical[4]).toBeCloseTo(0.7, 6);
          expect(a.p).toBeCloseTo(0.9, 6);
          expect(a.path[0].vectorId).toBe("V-PHYS-4");
          continue;
        }
        expect(a.p, `${a.id} at OC${tier}`).toBeCloseTo(want[a.id][tier - 1], 6);
      }
    }
  });

  it("sensitivity of OC1/OC2 to the value read for a RAND '1'", () => {
    const sens = fixture.sensitivity_score1 as Record<string, number[]>;
    for (const [one, want] of Object.entries(sens)) {
      const scoreToP = { ...PROBE_P, 1: Number(one) };
      const got = [true, false].flatMap((served) => {
        const r = scorePosture({
          blocks: today,
          model,
          blockStates: NONE,
          year: 2026,
          sliders: SLIDERS,
          adversaryOc: 1,
          modelServedExternally: served,
          options: { ...PROBE_OPTS, scoreToP },
        });
        return [r.tiers[0].p, r.tiers[1].p];
      });
      // The probe printed this table rounded to three decimals.
      got.forEach((p, i) => expect(Math.abs(p - want[i])).toBeLessThanOrEqual(0.0005 + 1e-9));
    }
  });
});
