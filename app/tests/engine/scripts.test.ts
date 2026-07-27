import { describe, it, expect } from "vitest";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { computeScriptBlockStates } from "../../src/timelapse/compute-script-state";
import { applyBudgetConstraint, blockCostBasis } from "../../src/engine/budget";
import { computeBreachProbabilities } from "../../src/engine/breach";
import { computeCategoryScores, overallSlScore, relevantBlockIds } from "../../src/engine/scoring";
import type { Block, BlockState, Sliders } from "../../src/engine/types";
import fs from "fs";
import path from "path";

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
const blockById = new Map(blocks.map((b) => [b.id, b]));

// Sliders as a story actually plays them: neutral defaults, then the story's own
// overrides. The budget MUST come from `sliderOverrides` — a literal here would
// let a cost or schedule regression be checked against a more-funded posture
// than playback ever runs (Proactive is a $1,400M plan, not the $2,000M default).
function scriptSliders(script: (typeof SCRIPTS)[number]): Sliders {
  return {
    ai_timeline: 0.5,
    gov_cooperation: 0.5,
    vendor_cooperation: 0.5,
    budget_millions: 2000,
    org_transformation: 0.5,
    risk_tolerance: 0.5,
    ...(script.sliderOverrides ?? {}),
  } as Sliders;
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
    // outruns its funding gets capped at `implementing` by the funding queue, and
    // the start years past the budget line stop meaning anything — the blocks sit
    // frozen regardless of when the story says they began.
    //
    // Proactive used to overrun deliberately ($1,624M on $800M), which froze 20
    // of its 31 deployments for six years. Its residual risk now comes from what
    // the plan LEAVES OUT rather than from what it cannot pay for, which is the
    // honest version of the same lesson.
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

  it("never cap a scripted deployment at implementing", () => {
    // The corollary of the affordability test, checked through the engine rather
    // than by summing costs: no story should be narrating a block that the
    // funding queue has frozen. If this fails, some story's start years are
    // decorative for the blocks past its budget line.
    for (const script of SCRIPTS) {
      const budget = script.sliderOverrides?.budget_millions;
      if (budget === undefined || !script.deployments?.length) continue;
      const rt = script.sliderOverrides?.risk_tolerance ?? 0.5;
      const raw = computeScriptBlockStates(script, 2030, blocks) as Record<string, BlockState>;
      const { exceededIds } = applyBudgetConstraint(blocks, raw, budget, {
        order: script.deployments.map((d) => d.blockId),
        riskTolerance: rt,
      });
      expect(
        [...exceededIds],
        `${script.id} caps ${exceededIds.size} block(s) at implementing`
      ).toEqual([]);
    }
  });

  it("keep the Proactive curve monotonically improving", () => {
    // The story's whole claim is that starting early and staying inside the
    // budget keeps paying off. A step where nothing completes is a step where AI
    // advances unopposed and breach ticks back UP — which reads as the program
    // losing ground and previously happened for the last three years of the
    // playback. The deployment schedule is staged so every half-year lands at
    // least one completion; this pins that.
    const chains = JSON.parse(fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8"));
    const script = SCRIPTS.find((s) => s.id === "proactive-program")!;
    const sliders = scriptSliders(script);
    const order = (script.deployments ?? []).map((d) => d.blockId);

    let prev = Infinity;
    for (let year = 2024; year <= 2030 + 1e-9; year += 0.5) {
      const raw = computeScriptBlockStates(script, year, blocks) as Record<string, BlockState>;
      const { effectiveStates } = applyBudgetConstraint(blocks, raw, sliders.budget_millions, {
        order,
        riskTolerance: sliders.risk_tolerance,
      });
      const p = Math.max(
        ...Object.values(
          computeBreachProbabilities(chains, blocks, effectiveStates, 4, year, sliders, true)
        ),
        0
      );
      expect(
        p,
        `proactive rises at ${year.toFixed(1)}: ${(prev * 100).toFixed(1)}% → ${(p * 100).toFixed(1)}%`
      ).toBeLessThanOrEqual(prev + 1e-9);
      prev = p;
    }
  });

  it("rank sensibly at 2030 against an OC4 adversary", () => {
    // The calibration contract for the four narrative stories. Numbers will
    // drift as data and constants are tuned; the ORDER and the size of the gaps
    // are the thing being asserted:
    //   Do Nothing ~100%  >  Budget-Constrained  >  Reactive  >>  Proactive
    // and Proactive must land in a band that reads as "serious program, real
    // residual risk" — not as "solved". Cheap near-perfect defense is the exact
    // failure mode this model was recalibrated to remove.
    const chains = JSON.parse(fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8"));
    const worst = (id: string): number => {
      const script = SCRIPTS.find((s) => s.id === id)!;
      const sliders = {
        ai_timeline: 0.5,
        gov_cooperation: 0.5,
        vendor_cooperation: 0.5,
        budget_millions: 2000,
        org_transformation: 0.5,
        risk_tolerance: 0.5,
        ...(script.sliderOverrides ?? {}),
      } as Sliders;
      const raw = computeScriptBlockStates(script, 2030, blocks) as Record<string, BlockState>;
      const { effectiveStates } = applyBudgetConstraint(blocks, raw, sliders.budget_millions, {
        order: (script.deployments ?? []).map((d) => d.blockId),
        riskTolerance: sliders.risk_tolerance,
      });
      return Math.max(
        ...Object.values(
          computeBreachProbabilities(chains, blocks, effectiveStates, 4, 2030, sliders, true)
        ),
        0
      );
    };

    const proactive = worst("proactive-program");
    const reactive = worst("reactive-ciso");
    const constrained = worst("budget-constrained");
    const nothing = worst("do-nothing");

    expect(nothing).toBeGreaterThan(0.95);
    // The top of the ordering, pinned relatively too: doing nothing must never
    // come out better than spending $200M badly.
    expect(nothing).toBeGreaterThan(constrained);
    expect(constrained).toBeGreaterThan(reactive);
    expect(reactive).toBeGreaterThan(proactive * 1.5); // substantially better, not marginally
    // Proactive: $1,330M of a $1,400M budget, every program matured, and an
    // all-personnel chain still gets through ~15% of the time. The floor matters
    // as much as the ceiling — if this ever drops into single digits the story
    // reads as "solved", which is the failure mode the recalibration removed.
    // Both bounds are load-bearing: every measured plan that ALSO closes PER-02
    // and PER-04 collapses to ~4.7%, because the other six chains are then all
    // sitting on the residual floor and breach is a max.
    expect(proactive, `proactive at ${(proactive * 100).toFixed(1)}%`).toBeGreaterThan(0.10);
    expect(proactive, `proactive at ${(proactive * 100).toFixed(1)}%`).toBeLessThan(0.20);
  });

  it("land Proactive at SL 3.5-4.0 by 2030", () => {
    // The other half of the calibration contract, and previously unpinned: the
    // breach band alone let the story drift to SL 2.5, which reads as a failing
    // grade on a $1.3B program that cut its worst path by 85%.
    //
    // SL is a BREADTH measure — 45 of 47 blocks are threat-relevant, so a plan
    // that buys 23 of them structurally caps near 2.5 no matter which 23. 3.5
    // takes 33 blocks. The ceiling is 4.39 (whole catalog matured, $3,668M), not
    // 5.0, because slider penalties and AI erosion never fully clear.
    const chains = JSON.parse(fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8"));
    const script = SCRIPTS.find((s) => s.id === "proactive-program")!;
    const sliders = scriptSliders(script);
    // Calibrate against the budget the story is documented and validated at, so
    // this never silently grades a better-funded posture than playback runs.
    expect(sliders.budget_millions, "proactive must calibrate at its own budget").toBe(1400);
    const raw = computeScriptBlockStates(script, 2030, blocks) as Record<string, BlockState>;
    const { effectiveStates } = applyBudgetConstraint(blocks, raw, sliders.budget_millions, {
      order: (script.deployments ?? []).map((d) => d.blockId),
      riskTolerance: sliders.risk_tolerance,
    });
    const sl = overallSlScore(
      computeCategoryScores(blocks, effectiveStates, 2030, sliders, relevantBlockIds(chains, blocks))
    );
    expect(sl, `proactive SL at 2030 is ${sl.toFixed(2)}`).toBeGreaterThanOrEqual(3.5);
    expect(sl, `proactive SL at 2030 is ${sl.toFixed(2)}`).toBeLessThanOrEqual(4.0);
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
