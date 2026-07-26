import { describe, it, expect } from "vitest";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { computeScriptBlockStates } from "../../src/timelapse/compute-script-state";
import { applyBudgetConstraint, blockCostBasis } from "../../src/engine/budget";
import { computeBreachProbabilities } from "../../src/engine/breach";
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

describe("time-lapse scripts", () => {
  it("reference every deployment against a real block", () => {
    for (const script of SCRIPTS) {
      for (const dep of script.deployments ?? []) {
        expect(blockById.has(dep.blockId), `${script.id}: ${dep.blockId}`).toBe(true);
      }
    }
  });

  it("all plan at the same risk tolerance", () => {
    // One cost basis for every story. Proactive plans at 0.65 and deliberately
    // overruns; if another story planned at 1.0 it would be budgeting every
    // program at its best-case price — the exact thing that made security too
    // cheap — so the model would be punishing optimism in one story and
    // rewarding it in another.
    for (const script of SCRIPTS) {
      if (script.type !== "scripted" || !script.deployments?.length) continue;
      expect(script.sliderOverrides?.risk_tolerance, `${script.id}`).toBe(0.65);
    }
  });

  it("cost out against the risk tolerance they actually plan at", () => {
    // Stories are costed at their OWN `risk_tolerance`, which selects where in
    // each block's authored min–max range the plan is budgeted (see
    // `blockCostBasis`). Planning every one of ~30 programs at its best-case
    // price is not a realistic program, so Proactive deliberately plans at 0.65
    // and DOES outrun its budget — the capped blocks are the point, they are the
    // gaps that keep a fully-funded-looking program from reading as "solved".
    //
    // What must stay true is that the overrun is intentional and bounded: a
    // story may plan for more than it can pay, but not so much more that the
    // posture it narrates bears no relation to its budget. 2.5x is the ceiling;
    // Proactive sits at ~2.03x ($1,624M against $800M).
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
        `${script.id} plans $${total.toFixed(0)}M at risk_tolerance ${rt} — more than 2.5x its $${budget}M budget`
      ).toBeLessThanOrEqual(budget * 2.5);
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
    // Proactive: a ~$1.6B plan on an $800M budget still leaves real exposure.
    expect(proactive, `proactive at ${(proactive * 100).toFixed(1)}%`).toBeGreaterThan(0.15);
    expect(proactive, `proactive at ${(proactive * 100).toFixed(1)}%`).toBeLessThan(0.32);
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
