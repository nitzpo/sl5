import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { computeScriptBlockStates } from "../../src/timelapse/compute-script-state";
import { applyBudgetConstraint } from "../../src/engine/budget";
import { computeBreachProbabilities } from "../../src/engine/breach";
import { TIMELINE_START, TIMELINE_END } from "../../src/utils/timeline";
import type { Block, BlockState, Sliders } from "../../src/engine/types";

/**
 * WHY the breach curve drifts upward between block completions.
 *
 * Playback advances the year monthly, so the gaps between completions are
 * visible for the first time, and in them breach ticks *up*. `scripts.test.ts`
 * bounds how big that drift may get; this file pins what causes it, which is
 * the part that would rot silently if someone changed how the engine reads the
 * year.
 *
 * `year` reaches breach through exactly two paths, both via `getAiCapability`:
 *   1. `aiDegradation` (scoring.ts) erodes probabilistic blocks, half-erodes
 *      hybrids, and leaves hard stops alone.
 *   2. `chainEffectiveOc` (breach.ts) lifts the attacker's effective OC by
 *      `avgShift × aiCap`, whatever the defenses are made of.
 * Everything else that moves during playback is block state, which only ever
 * improves. These tests take those apart one at a time.
 */

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
const chains = JSON.parse(fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8"));
const script = SCRIPTS.find((s) => s.id === "proactive-program")!;
const order = (script.deployments ?? []).map((d) => d.blockId);
const sliders: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.5,
  vendor_cooperation: 0.5,
  budget_millions: 2000,
  org_transformation: 0.5,
  risk_tolerance: 0.5,
  ...(script.sliderOverrides ?? {}),
} as Sliders;

/** Worst-case breach for a posture, scored at a given year. */
function breachAt(states: Record<string, BlockState>, year: number): number {
  const { effectiveStates } = applyBudgetConstraint(blocks, states, sliders.budget_millions, {
    order,
    riskTolerance: sliders.risk_tolerance,
  });
  return Math.max(
    ...Object.values(
      computeBreachProbabilities(chains, blocks, effectiveStates, 4, year, sliders, true)
    ),
    0
  );
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

describe("what makes breach drift up between completions", () => {
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

  it("is mostly the adversary getting stronger, not defenses eroding", () => {
    // A posture of nothing but hard stops cannot erode — `aiDegradation`
    // returns 0.0 for them by construction — so every point of rise it shows is
    // `chainEffectiveOc` lifting the attacker. It is the larger share of the
    // effect, which is why this is "the adversary climbs past the defense"
    // rather than "the defense decays". Erosion is real but secondary: swap in
    // a posture that CAN erode and the rise grows, it does not appear.
    const hardStop = byMonth((year) => breachAt(postureOf("hard_stop"), year));
    const probabilistic = byMonth((year) => breachAt(postureOf("probabilistic"), year));
    const rise = (s: { p: number }[]) => s[s.length - 1].p - s[0].p;

    const ocLift = rise(hardStop);
    expect(
      ocLift,
      `erosion-immune posture should still lose ground; it moved ${(ocLift * 100).toFixed(2)}pp`
    ).toBeGreaterThan(0.05);

    expect(
      rise(probabilistic),
      `erodible posture ${(rise(probabilistic) * 100).toFixed(2)}pp vs erosion-immune ${(ocLift * 100).toFixed(2)}pp`
    ).toBeGreaterThan(ocLift);
  });
});
