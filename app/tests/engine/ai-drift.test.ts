import { describe, it, expect } from "vitest";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { computeScriptBlockStates } from "../../src/timelapse/compute-script-state";
import { scorePosture } from "../../src/engine/posture";
import { TIMELINE_START, TIMELINE_END } from "../../src/utils/timeline";
import type { Block, BlockState, Sliders } from "../../src/engine/types";
import { loadBlocks, loadModel, NEUTRAL_SLIDERS } from "../load-data";

/**
 * WHY campaign success drifts upward between block completions.
 *
 * Playback advances the year monthly, so the gaps between completions are
 * visible, and in them success ticks *up*. `scripts.test.ts` bounds how big
 * that drift may get; this file pins what causes it.
 *
 * In the vector model `year` reaches the campaign only through the AI
 * capability curve, and only on the attacker's side (rewritten in Phase 2; the
 * chain model also had a defender-side erosion term):
 *   1. each vector's effective tier, OC + ai_shift × aiCap, which raises its
 *      feasibility and erodes the counters on it;
 *   2. the lab's own model's AC band;
 *   3. the detection q, which AI-assisted evasion erodes.
 * Everything else that moves during playback is block state, which only ever
 * improves.
 */

const blocks = loadBlocks();
const model = loadModel();
const script = SCRIPTS.find((s) => s.id === "proactive-program")!;
const order = (script.deployments ?? []).map((d) => d.blockId);
const sliders: Sliders = { ...NEUTRAL_SLIDERS, ...(script.sliderOverrides ?? {}) } as Sliders;

/** Campaign success against OC4 for a posture, scored at a given year. */
function breachAt(states: Record<string, BlockState>, year: number, catalogue: Block[] = blocks): number {
  return scorePosture({
    blocks: catalogue,
    model,
    blockStates: states,
    advanceOrder: order,
    year,
    sliders,
    adversaryOc: 4,
    modelServedExternally: true,
  }).campaign;
}

/** One sample per month across the whole timeline. */
function byMonth(f: (year: number) => number): { year: number; p: number }[] {
  const out: { year: number; p: number }[] = [];
  for (let m = TIMELINE_START * 12; m <= TIMELINE_END * 12; m++) out.push({ year: m / 12, p: f(m / 12) });
  return out;
}

/** Every block of one defense type fully built, everything else absent. */
function postureOf(type: Block["defense_type"]): Record<string, BlockState> {
  const states: Record<string, BlockState> = {};
  for (const b of blocks) states[b.id] = b.defense_type === type ? "mature" : "not_started";
  return states;
}

describe("what makes campaign success drift up between completions", () => {
  it("is not the posture: advancing it with the year held still never raises breach", () => {
    // The rival explanation, and the one that would be a bug: block states
    // regressing under the `higherOf` clamp in compute-script-state.ts. Freeze
    // the year so the AI terms are constant, and only the posture moves.
    const series = byMonth((year) => breachAt(computeScriptBlockStates(script, year, blocks), TIMELINE_START));
    for (let i = 1; i < series.length; i++) {
      expect(
        series[i].p,
        `posture regressed at ${series[i].year.toFixed(2)}: ${(series[i - 1].p * 100).toFixed(2)}% → ${(series[i].p * 100).toFixed(2)}%`
      ).toBeLessThanOrEqual(series[i - 1].p + 1e-9);
    }
  });

  it("is the year: advancing it with the posture held still never lowers breach", () => {
    // The mirror image. Together with the test above this accounts for the
    // whole sawtooth: the posture can only help, the year can only hurt, and
    // between completions only the year is moving.
    const frozen = computeScriptBlockStates(script, TIMELINE_START, blocks);
    const series = byMonth((year) => breachAt(frozen, year));
    for (let i = 1; i < series.length; i++) {
      expect(
        series[i].p,
        `the year term helped at ${series[i].year.toFixed(2)}: ${(series[i - 1].p * 100).toFixed(2)}% → ${(series[i].p * 100).toFixed(2)}%`
      ).toBeGreaterThanOrEqual(series[i - 1].p - 1e-9);
    }
  });

  it("is the adversary getting stronger, and erodible counters lose more ground", () => {
    // A posture of nothing but hard stops still loses ground as AI lifts the
    // attacker's tier: feasibility rises, and even hard stops keep a little
    // less of their effect at a higher tier. Swap in a posture of probabilistic
    // counters — whose band is far wider — and the rise grows.
    const hardStop = byMonth((year) => breachAt(postureOf("hard_stop"), year));
    const probabilistic = byMonth((year) => breachAt(postureOf("probabilistic"), year));
    const rise = (s: { p: number }[]) => s[s.length - 1].p - s[0].p;

    const ocLift = rise(hardStop);
    expect(
      ocLift,
      `erosion-immune posture should still lose ground; it moved ${(ocLift * 100).toFixed(2)}pp`
    ).toBeGreaterThan(0.02);

    expect(
      rise(probabilistic),
      `erodible posture ${(rise(probabilistic) * 100).toFixed(2)}pp vs erosion-immune ${(ocLift * 100).toFixed(2)}pp`
    ).toBeGreaterThan(ocLift);
  });

  it("counts AI once: the blocks' defender-side erosion figures never reach the campaign", () => {
    // `ai_oc_shift` on a block drives the defender-side erosion that programme
    // completeness uses. The vector model reads the attacker's tier instead, so
    // zeroing every block's ai_oc_shift must leave every campaign number alone.
    const zeroed = blocks.map((b) => ({ ...b, adversary_exploitation: { ...b.adversary_exploitation, ai_oc_shift: 0 } }));
    const states = computeScriptBlockStates(script, 2028, blocks);
    for (const year of [2026, 2028, 2030]) {
      expect(breachAt(states, year, zeroed)).toBeCloseTo(breachAt(states, year), 12);
    }
  });
});
