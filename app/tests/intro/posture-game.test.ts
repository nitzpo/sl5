// The introduction's mini-game is the only place in the intro that runs the real
// engine over the real shipped data. Two things can quietly break it:
//
//  1. A block id on its shortlist gets renamed or repriced, and the game silently
//     offers nine blocks, or one that eats the whole budget in a single click.
//  2. Someone "simplifies" the scoring and the numbers stop agreeing with the
//     app's own Security Posture card, which is the game's entire claim.
//
// So these tests load blocks-*.json and attack-chains.json off disk, exactly as
// the browser fetches them, and drive `evaluatePosture` directly.

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import type { AttackChain, Block } from "../../src/engine/types";
import {
  ADVERSARY_OC,
  BLOCK_FILES,
  BUDGET_MILLIONS,
  SHORTLIST,
  SLIDERS,
  VIABLE_THRESHOLD,
  YEAR,
  costOf,
  evaluatePosture,
} from "../../src/intro/posture-game";
import {
  applyBudgetConstraint,
  applyDependencyConstraint,
  computeBreachProbabilities,
  computeCategoryScores,
  overallSlScore,
  relevantBlockIds,
} from "../../src/engine";
import { BLOCK_SHORT_LABELS } from "../../src/utils/geometry";

const DATA = path.join(__dirname, "../../public/data");
const read = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8"));

const blocks: Block[] = BLOCK_FILES.flatMap((f) => read(f) as Block[]);
const chains: AttackChain[] = read("attack-chains.json");
const data = { blocks, chains };
const byId = new Map(blocks.map((b) => [b.id, b]));

describe("the mini-game's shortlist", () => {
  it("names the files the app itself ships", () => {
    // The component fetches exactly these; a renamed data file would 404 in the
    // browser and show the game's error state instead of the game.
    for (const file of BLOCK_FILES) {
      expect(fs.existsSync(path.join(DATA, file)), `${file} missing`).toBe(true);
    }
    // Relational, not the current 47: adding a block to the catalogue is
    // routine and shouldn't fail the intro suite.
    expect(blocks.length).toBeGreaterThan(SHORTLIST.length);
  });

  it("is ten real blocks with short labels for the hexes", () => {
    expect(SHORTLIST.length).toBe(10);
    expect(new Set(SHORTLIST).size).toBe(10);
    for (const id of SHORTLIST) {
      expect(byId.get(id), `${id} is not in the shipped data`).toBeTruthy();
      expect(BLOCK_SHORT_LABELS[id], `${id} has no short label`).toBeTruthy();
    }
  });

  it("spans all three defense types, so the erosion lesson is reachable", () => {
    const types = new Set(SHORTLIST.map((id) => byId.get(id)!.defense_type));
    expect(types).toContain("hard_stop");
    expect(types).toContain("probabilistic");
    expect(types).toContain("hybrid");
  });

  it("covers all six categories, so no lesson is unreachable", () => {
    expect(new Set(SHORTLIST.map((id) => byId.get(id)!.category)).size).toBe(6);
  });

  it("costs more than the budget, but every block is individually affordable", () => {
    // If everything fit, the budget would teach nothing; if a block couldn't fit
    // even picked first, clicking it would be a dead end the reader can't undo
    // their way out of.
    const total = SHORTLIST.reduce((sum, id) => sum + costOf(byId.get(id)!), 0);
    expect(total).toBeGreaterThan(BUDGET_MILLIONS * 1.5);
    for (const id of SHORTLIST) {
      expect(costOf(byId.get(id)!), `${id} can't fit even on its own`).toBeLessThanOrEqual(
        BUDGET_MILLIONS
      );
    }
    // And the cheapest is small enough that a first click isn't a commitment.
    expect(Math.min(...SHORTLIST.map((id) => costOf(byId.get(id)!)))).toBeLessThan(
      BUDGET_MILLIONS / 4
    );
  });

  it("includes a block whose prerequisite is also on the shortlist", () => {
    // The dependency cap is one of the two lessons the game exists to make
    // physical, so at least one pair has to be buyable in the wrong order.
    const pairs = SHORTLIST.filter((id) =>
      (byId.get(id)!.dependencies?.requires ?? []).some((r) =>
        (SHORTLIST as readonly string[]).includes(r)
      )
    );
    expect(pairs.length).toBeGreaterThan(0);
  });

  it("requires nothing that isn't on the shortlist", () => {
    // Otherwise a reader hits a sky-dotted cap with no way to clear it, which
    // reads as a broken game rather than as a dependency.
    for (const id of SHORTLIST) {
      for (const req of byId.get(id)!.dependencies?.requires ?? []) {
        expect(
          SHORTLIST as readonly string[],
          `${id} requires ${req}, which the reader can't buy`
        ).toContain(req);
      }
    }
  });

  it("can move the headline breach number, not just the score", () => {
    // The breach percentage tracks the single worst chain. If nothing on the
    // shortlist stopped that chain, the number would sit at 100% whatever the
    // reader did, and the game would read as broken.
    const stoppers = new Set(chains.flatMap((c) => c.stoppers ?? []));
    expect(SHORTLIST.some((id) => stoppers.has(id))).toBe(true);
    const worst = evaluatePosture(data, []).ranked[0].chain;
    expect(
      SHORTLIST.filter((id) => worst.stoppers?.includes(id)).length,
      `nothing on the shortlist stops ${worst.id}`
    ).toBeGreaterThan(0);
  });
});

describe("evaluatePosture", () => {
  it("scores an empty posture as the floor with every chain live", () => {
    const r = evaluatePosture(data, []);
    expect(r.spentMillions).toBe(0);
    expect(r.budgetExceeded.size).toBe(0);
    expect(r.ranked.length).toBe(chains.length);
    expect(r.breach).toBeGreaterThan(0.5);
    expect(r.sl).toBeLessThan(2);
  });

  it("never lets a defense make things worse", () => {
    // The app's monotonicity guarantee, restated for the subset the game offers:
    // adding a block can only lower breach and raise (or hold) the score.
    let prev = evaluatePosture(data, []);
    const picked: string[] = [];
    for (const id of SHORTLIST) {
      picked.push(id);
      const next = evaluatePosture(data, picked);
      expect(next.breach, `breach rose after adding ${id}`).toBeLessThanOrEqual(
        prev.breach + 1e-9
      );
      expect(next.sl, `SL fell after adding ${id}`).toBeGreaterThanOrEqual(prev.sl - 1e-9);
      prev = next;
    }
  });

  it("caps the block the reader picked last, never an earlier commitment", () => {
    // The lesson the game is built around: funding follows click order, so
    // adding one more block can only ever cap that block.
    // Spend down the individually-affordable blocks, priciest first, until one
    // doesn't fit. That last one is the only block that may be capped.
    const affordable = SHORTLIST.filter(
      (id) => costOf(byId.get(id)!) <= BUDGET_MILLIONS
    ).sort((a, b) => costOf(byId.get(b)!) - costOf(byId.get(a)!));
    const picks: string[] = [];
    let running = 0;
    for (const id of affordable) {
      picks.push(id);
      running += costOf(byId.get(id)!);
      if (running > BUDGET_MILLIONS) break;
    }
    expect(running, "the shortlist never overruns the budget").toBeGreaterThan(
      BUDGET_MILLIONS
    );
    const last = picks[picks.length - 1];

    const r = evaluatePosture(data, picks);
    expect([...r.budgetExceeded]).toEqual([last]);
    expect(r.effectiveStates[last]).toBe("implementing");
    for (const id of picks.slice(0, -1)) {
      expect(r.effectiveStates[id], `${id} was funded first and must keep it`).toBe(
        "deployed"
      );
    }

    // Move that block to the front and the cap moves off it — the cap follows
    // click order, not cost.
    const reordered = evaluatePosture(data, [last, ...picks.slice(0, -1)]);
    expect(reordered.budgetExceeded.has(last)).toBe(false);
    expect(reordered.budgetExceeded.size).toBe(1);
  });

  it("lets the whole budget go on one structural block", () => {
    // The air gap is most of the year in a single click, and it has to land as
    // genuinely deployed — that's the trade-off the reader is being shown.
    const r = evaluatePosture(data, ["NET-01"]);
    expect(costOf(byId.get("NET-01")!)).toBeGreaterThan(BUDGET_MILLIONS / 2);
    expect(r.budgetExceeded.size).toBe(0);
    expect(r.effectiveStates["NET-01"]).toBe("deployed");
  });

  it("caps a block whose prerequisite wasn't bought, and uncaps it when it is", () => {
    const dependent = SHORTLIST.find((id) =>
      (byId.get(id)!.dependencies?.requires ?? []).some((r) =>
        (SHORTLIST as readonly string[]).includes(r)
      )
    )!;
    const prereq = byId
      .get(dependent)!
      .dependencies!.requires!.find((r) => (SHORTLIST as readonly string[]).includes(r))!;

    const alone = evaluatePosture(data, [dependent]);
    expect(alone.dependencyUnmet.has(dependent)).toBe(true);
    expect(alone.dependencyUnmetRequires.get(dependent)).toContain(prereq);
    expect(alone.effectiveStates[dependent]).toBe("implementing");

    const together = evaluatePosture(data, [prereq, dependent]);
    expect(together.dependencyUnmet.has(dependent)).toBe(false);
    expect(together.effectiveStates[dependent]).toBe("deployed");
  });

  it("scores unpicked blocks as not_started, not at their real-world baseline", () => {
    // 27 blocks ship partially deployed. The game is "build from nothing", so a
    // reader must not be handed a score they didn't earn.
    const r = evaluatePosture(data, []);
    const baselineActive = blocks.filter(
      (b) => (b.current_state?.baseline_state ?? "not_started") !== "not_started"
    );
    expect(baselineActive.length).toBeGreaterThan(10);
    for (const b of baselineActive) {
      expect(r.effectiveStates[b.id], `${b.id} should start from nothing`).toBe(
        "not_started"
      );
    }
  });

  it("ranks chains most-likely-first and reports the worst as the headline", () => {
    const r = evaluatePosture(data, ["PER-01", "PER-04"]);
    const ps = r.ranked.map((x) => x.p);
    expect([...ps].sort((a, b) => b - a)).toEqual(ps);
    expect(r.breach).toBe(ps[0]);
  });

  it("agrees with the engine called directly — no re-implemented arithmetic", () => {
    // The game's whole claim is that its numbers are the app's numbers. Recompute
    // one posture the long way, exactly as store/derived.ts does, and compare.
    const chosen = ["PER-01", "PER-04", "PHY-03", "SC-05"];
    const requested: Record<string, string> = {};
    for (const b of blocks) requested[b.id] = "not_started";
    for (const id of chosen) requested[id] = "deployed";

    const { effectiveStates: budgeted } = applyBudgetConstraint(
      blocks,
      requested as never,
      BUDGET_MILLIONS,
      { order: chosen, riskTolerance: SLIDERS.risk_tolerance }
    );
    const { effectiveStates } = applyDependencyConstraint(blocks, budgeted);
    const categories = computeCategoryScores(
      blocks,
      effectiveStates,
      YEAR,
      SLIDERS,
      relevantBlockIds(chains, blocks)
    );
    const breaches = computeBreachProbabilities(
      chains,
      blocks,
      effectiveStates,
      ADVERSARY_OC,
      YEAR,
      SLIDERS
    );

    const r = evaluatePosture(data, chosen);
    expect(r.sl).toBe(overallSlScore(categories));
    expect(r.categories).toEqual(categories);
    expect(r.breach).toBe(Math.max(...Object.values(breaches)));
  });

  it("cannot be won: no shortlist posture reaches SL5 or a blocked top chain", () => {
    // The copy tells the reader this outright, so it had better be true.
    const everything = evaluatePosture(data, [...SHORTLIST]);
    expect(everything.sl).toBeLessThan(5);
    expect(everything.breach).toBeGreaterThan(VIABLE_THRESHOLD);
  });
});
