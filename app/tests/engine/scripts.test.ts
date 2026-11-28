// The four narrative stories, through the same pipeline playback runs.
// Rewritten in Phase 2: the ordering and the Proactive bands are now on the
// threat-relative SL (level + progress) and campaign success, not on the old
// worst-chain breach and coverage SL.
import { describe, it, expect } from "vitest";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { computeScriptBlockStates } from "../../src/timelapse/compute-script-state";
import { applyBudgetConstraint, blockCostBasis } from "../../src/engine/budget";
import { scorePosture } from "../../src/engine/posture";
import type { BlockState, Sliders } from "../../src/engine/types";
import { loadBlocks, loadModel, NEUTRAL_SLIDERS } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();
const blockById = new Map(blocks.map((b) => [b.id, b]));

/** A story at one year, scored as playback scores it (OC4, model served). */
function storyAt(id: string, year: number, served = true) {
  const script = SCRIPTS.find((s) => s.id === id)!;
  const raw = computeScriptBlockStates(script, year, blocks) as Record<string, BlockState>;
  return scorePosture({
    blocks,
    model,
    blockStates: raw,
    advanceOrder: (script.deployments ?? []).map((d) => d.blockId),
    year,
    sliders: scriptSliders(script),
    adversaryOc: 4,
    modelServedExternally: served,
  });
}

// Sliders as a story actually plays them: neutral defaults, then the story's own
// overrides. The budget MUST come from `sliderOverrides` — a literal here would
// let a cost or schedule regression be checked against a more-funded posture
// than playback ever runs (Proactive is a $2,800M plan, not the $2,000M default).
function scriptSliders(script: (typeof SCRIPTS)[number]): Sliders {
  return { ...NEUTRAL_SLIDERS, ...(script.sliderOverrides ?? {}) } as Sliders;
}

describe("time-lapse scripts", () => {
  it("reference every deployment against a real block", () => {
    for (const script of SCRIPTS) {
      for (const dep of script.deployments ?? []) {
        expect(blockById.has(dep.blockId), `${script.id}: ${dep.blockId}`).toBe(true);
      }
    }
  });

  it("all plan at the same risk tolerance", () => {
    // One cost basis for every story. If one planned at 1.0 it would be
    // budgeting every program at its best-case price — the exact thing that made
    // security too cheap — so the model would be punishing optimism in one story
    // and rewarding it in another.
    for (const script of SCRIPTS) {
      if (script.type !== "scripted" || !script.deployments?.length) continue;
      expect(script.sliderOverrides?.risk_tolerance, `${script.id}`).toBe(0.65);
    }
  });

  it("plan within the budget they claim to have", () => {
    // Stories are costed at their OWN `risk_tolerance`, which selects where in
    // each block's authored min–max range the plan is budgeted (see
    // `blockCostBasis`). Every story must plan inside its own budget: a plan that
    // outruns its funding is left at its baseline by the funding queue, and
    // the start years past the budget line stop meaning anything — the blocks sit
    // frozen regardless of when the story says they began.
    //
    // Proactive used to overrun deliberately ($1,624M on $800M), which froze 20
    // of its 31 deployments for six years. Its residual risk now comes from what
    // no catalogue block can stop rather than from what it cannot pay for.
    for (const script of SCRIPTS) {
      const budget = script.sliderOverrides?.budget_millions;
      if (budget === undefined || !script.deployments?.length) continue;
      const rt = script.sliderOverrides?.risk_tolerance ?? 0.5;
      const total = script.deployments.reduce((sum, dep) => {
        const block = blockById.get(dep.blockId);
        // A missing block must fail loudly: silently contributing $0 would let a
        // typo'd blockId make an unaffordable plan look affordable.
        expect(block, `${script.id}: unknown block ${dep.blockId}`).toBeDefined();
        return sum + blockCostBasis(block!, rt);
      }, 0);
      expect(
        total,
        `${script.id} plans $${total.toFixed(0)}M at risk_tolerance ${rt} — over its $${budget}M budget`
      ).toBeLessThanOrEqual(budget);
    }
  });

  it("never leave a scripted deployment unfunded", () => {
    // The corollary of the affordability test, checked through the engine rather
    // than by summing costs: no story should be narrating a block that the
    // funding queue has frozen. If this fails, some story's start years are
    // decorative for the blocks past its budget line.
    for (const script of SCRIPTS) {
      const budget = script.sliderOverrides?.budget_millions;
      if (budget === undefined || !script.deployments?.length) continue;
      const rt = script.sliderOverrides?.risk_tolerance ?? 0.5;
      const raw = computeScriptBlockStates(script, 2030, blocks) as Record<string, BlockState>;
      const { exceededIds } = applyBudgetConstraint(blocks.filter((b) => !b.future), raw, budget, {
        order: script.deployments.map((d) => d.blockId),
        riskTolerance: rt,
      });
      expect(
        [...exceededIds],
        `${script.id} leaves ${exceededIds.size} block(s) unfunded`
      ).toEqual([]);
    }
  });

  it("keep the Proactive curve monotonically improving", () => {
    // The story's whole claim is that starting early and staying inside the
    // budget keeps paying off. A step where nothing completes is a step where AI
    // advances unopposed and campaign success ticks back UP. The schedule is
    // staged so every half-year step holds the line; this pins it, on campaign
    // success against OC4 with the model served (what playback shows).
    let prev = Infinity;
    for (let year = 2024; year <= 2030 + 1e-9; year += 0.5) {
      const p = storyAt("proactive-program", year).campaign;
      expect(
        p,
        `proactive rises at ${year.toFixed(1)}: ${(prev * 100).toFixed(1)}% → ${(p * 100).toFixed(1)}%`
      ).toBeLessThanOrEqual(prev + 1e-9);
      prev = p;
    }
  });

  it("keep the Proactive curve from sawtoothing at the resolution playback shows", () => {
    // Playback advances the year monthly, so the space *between* completions
    // is visible. In that space AI advances against defenses that haven't
    // finished and success genuinely ticks up a little — that is the
    // futureproofing race, not a bug — so this does not assert strict
    // monotonicity. It pins that the drift stays below a point a month and
    // never accumulates: every rolling 12 months is still downward.
    const MAX_MONTHLY_RISE = 0.01;
    const series: { year: number; p: number }[] = [];
    for (let month = 2024 * 12; month <= 2030 * 12; month++) {
      const year = month / 12;
      series.push({ year, p: storyAt("proactive-program", year).campaign });
    }
    for (let i = 1; i < series.length; i++) {
      const rise = series[i].p - series[i - 1].p;
      expect(
        rise,
        `month-on-month jump at ${series[i].year.toFixed(2)}: +${(rise * 100).toFixed(2)}pp`
      ).toBeLessThanOrEqual(MAX_MONTHLY_RISE);
    }
    for (let i = 12; i < series.length; i++) {
      const change = series[i].p - series[i - 12].p;
      expect(
        change,
        `the year ending ${series[i].year.toFixed(2)} lost ground: +${(change * 100).toFixed(2)}pp`
      ).toBeLessThanOrEqual(1e-9);
    }
  });

  it("rank Do Nothing ≤ Budget-Constrained ≤ Reactive ≤ Proactive at 2030 on SL plus progress", () => {
    // The calibration contract for the four narrative stories, on the
    // threat-relative SL (level + progress toward the next level), measured at
    // 2030 vs OC4 with the model served. Numbers drift as data and constants are
    // tuned; the ORDER is the thing asserted, with real gaps between stories.
    const value = (id: string) => storyAt(id, 2030).sl.value;
    const nothing = value("do-nothing");
    const constrained = value("budget-constrained");
    const reactive = value("reactive-ciso");
    const proactive = value("proactive-program");
    expect(constrained).toBeGreaterThanOrEqual(nothing);
    expect(reactive).toBeGreaterThanOrEqual(constrained);
    expect(proactive).toBeGreaterThanOrEqual(reactive);
    // And the gaps are real, not ties.
    expect(proactive - nothing).toBeGreaterThan(2);
    // Doing nothing is today's controls eroding as AI improves: by 2030 even OC1
    // gets through more than a fifth of the time.
    expect(storyAt("do-nothing", 2030).sl.level).toBe(0);
  });

  it("land Proactive at SL3 or better by 2030, but not SL5", () => {
    // A $3B programme that starts in 2024 holds OC3 against 2030's AI-lifted
    // attackers — with the model served externally, only just (it is flagged
    // marginal) — and is still well short of OC4 and the own-model insider.
    const script = SCRIPTS.find((s) => s.id === "proactive-program")!;
    expect(scriptSliders(script).budget_millions, "proactive must calibrate at its own budget").toBe(3000);
    for (const served of [true, false]) {
      const r = storyAt("proactive-program", 2030, served);
      expect(r.sl.level, `served=${served}: SL ${r.sl.value.toFixed(2)}`).toBeGreaterThanOrEqual(3);
      expect(r.sl.level).toBeLessThan(5);
      expect(r.tiers[3].held, "OC4 should still get through").toBe(false);
    }
  });

  it("never leave a scripted deployment stuck before deployed by 2030", () => {
    // Guards the open-ended deploy-time sentinel (e.g. 999 months): a block a
    // story deploys early should actually reach deployed within the horizon.
    for (const script of SCRIPTS) {
      if (script.type !== "scripted" || !script.deployments?.length) continue;
      const states = computeScriptBlockStates(script, 2030, blocks);
      for (const dep of script.deployments) {
        if (dep.startYear <= 2026) {
          const state = states[dep.blockId];
          expect(
            state === "deployed" || state === "mature",
            `${script.id}: ${dep.blockId} started ${dep.startYear} but is only ${state} by 2030`
          ).toBe(true);
        }
      }
    }
  });
});
