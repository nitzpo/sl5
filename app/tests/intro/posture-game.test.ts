// The budget mini-game runs the real engine over the real shipped data. These
// tests load that data off disk and drive `evaluatePosture` directly, to pin
// the two things that make it a game rather than a readout:
//
//  1. Choices matter: from today's typical lab, the right picks within the
//     budget reach the next level and push OC3 to contested; most picks don't.
//  2. Its numbers are the instrument's: `scorePosture`, nothing re-implemented.

import { describe, it, expect } from "vitest";
import type { BlockState } from "../../src/engine/types";
import { baselineStateFor, baselineStates } from "../../src/engine/baseline";
import { scorePosture } from "../../src/engine/posture";
import {
  BUDGET_MILLIONS,
  SERVED,
  SHORTLIST,
  SLIDERS,
  YEAR,
  costOf,
  evaluatePosture,
  startsPartlyInPlace,
} from "../../src/intro/posture-game";
import { loadThreatDataFromDisk } from "./load-data";

const data = loadThreatDataFromDisk();
const byId = new Map(data.blocks.map((b) => [b.id, b]));
const list = [...SHORTLIST] as string[];
const cost = (id: string) => costOf(byId.get(id)!);

/** Every subset of the shortlist the budget can pay for, scored. */
const affordable = (() => {
  const out: { ids: string[]; level: number; value: number; oc3: string }[] = [];
  for (let m = 0; m < 1 << list.length; m++) {
    const ids = list.filter((_, i) => m & (1 << i));
    if (ids.reduce((s, id) => s + cost(id), 0) > BUDGET_MILLIONS) continue;
    const r = evaluatePosture(data, ids);
    out.push({ ids, level: r.score.sl.level, value: r.score.sl.value, oc3: r.score.tiers[2].band });
  }
  return out;
})();

describe("the shortlist", () => {
  it("is ten real, present-day blocks", () => {
    expect(new Set(list).size).toBe(10);
    for (const id of list) {
      expect(byId.get(id), `${id} is not in the shipped data`).toBeTruthy();
      expect(byId.get(id)!.future, `${id} is a future capability`).toBeFalsy();
    }
  });

  it("spans all three defense types", () => {
    expect(new Set(list.map((id) => byId.get(id)!.defense_type))).toEqual(
      new Set(["hard_stop", "probabilistic", "hybrid"])
    );
  });

  it("costs well over the budget, and every block fits on its own", () => {
    const total = list.reduce((s, id) => s + cost(id), 0);
    expect(total).toBeGreaterThan(BUDGET_MILLIONS * 1.5);
    for (const id of list) expect(cost(id), `${id} can't fit even alone`).toBeLessThanOrEqual(BUDGET_MILLIONS);
    expect(Math.min(...list.map(cost))).toBeLessThan(BUDGET_MILLIONS / 4);
  });

  it("requires nothing that isn't on the list, and has at least two prerequisite pairs", () => {
    let pairs = 0;
    for (const id of list) {
      for (const req of byId.get(id)!.dependencies?.requires ?? []) {
        expect(list, `${id} requires ${req}, which the reader can't buy`).toContain(req);
        pairs++;
      }
    }
    expect(pairs).toBeGreaterThanOrEqual(2);
  });

  it("includes defenses a typical lab already partly runs, and some it doesn't", () => {
    const partly = list.filter((id) => startsPartlyInPlace(byId.get(id)!));
    expect(partly.length).toBeGreaterThan(0);
    expect(partly.length).toBeLessThan(list.length);
  });
});

describe("choices matter", () => {
  const start = evaluatePosture(data, []);

  it("starts where a typical lab is: at least OC1 held, and not every tier lost", () => {
    expect(start.score.sl.level).toBeGreaterThanOrEqual(1);
    expect(start.stops).not.toBe("nobody yet");
    expect(start.score.tiers.some((t) => t.band === "contested")).toBe(true);
  });

  it("the right picks within the budget reach the next level, and push OC3 to contested", () => {
    const best = Math.max(...affordable.map((a) => a.level));
    expect(best).toBeGreaterThan(start.score.sl.level);
    expect(affordable.some((a) => a.oc3 !== "usually succeeds")).toBe(true);
  });

  it("most affordable picks don't, so it is a real decision", () => {
    const better = affordable.filter((a) => a.level > start.score.sl.level).length;
    expect(better).toBeGreaterThan(0);
    expect(better / affordable.length).toBeLessThan(0.5);
  });

  it("the headline is never stuck: some single pick moves the bar toward the next level", () => {
    const moves = list.filter((id) => evaluatePosture(data, [id]).score.sl.value > start.score.sl.value + 0.01);
    expect(moves.length).toBeGreaterThan(2);
  });

  it("the air gap is the tempting big buy, but not the best use of the year", () => {
    const withAirGap = affordable.filter((a) => a.ids.includes("NET-01"));
    expect(cost("NET-01")).toBeGreaterThan(BUDGET_MILLIONS / 2);
    expect(Math.max(...withAirGap.map((a) => a.value))).toBeLessThan(Math.max(...affordable.map((a) => a.value)));
  });

  it("names what still gets through, as a tier, an approach and a path", () => {
    const next = start.stillGetsThrough!;
    expect(next.tier).toBe(start.score.sl.level + 1);
    expect(next.approach.length).toBeGreaterThan(0);
    expect(next.path.length).toBeGreaterThan(0);
    for (const step of next.path) expect(step).toMatch(/^(Get in|Reach the weights|Get them out): /);
  });
});

describe("the rules are the instrument's", () => {
  it("never lets a defense make things worse", () => {
    let prev = evaluatePosture(data, []);
    const picked: string[] = [];
    for (const id of [...list].sort((a, b) => cost(a) - cost(b))) {
      if (picked.reduce((s, x) => s + cost(x), 0) + cost(id) > BUDGET_MILLIONS) continue;
      picked.push(id);
      const next = evaluatePosture(data, picked);
      expect(next.score.sl.value, `SL fell after adding ${id}`).toBeGreaterThanOrEqual(prev.score.sl.value - 1e-9);
      prev = next;
    }
  });

  it("funds in pick order: only the pick that overruns is capped, and it stays at the lab's baseline", () => {
    const picks: string[] = [];
    let running = 0;
    for (const id of [...list].sort((a, b) => cost(b) - cost(a))) {
      picks.push(id);
      running += cost(id);
      if (running > BUDGET_MILLIONS) break;
    }
    const last = picks[picks.length - 1];
    const r = evaluatePosture(data, picks);
    expect([...r.budgetExceeded]).toEqual([last]);
    expect(r.effectiveStates[last]).toBe(baselineStateFor(byId.get(last)!));
    // Move it to the front and the cap moves off it.
    expect(evaluatePosture(data, [last, ...picks.slice(0, -1)]).budgetExceeded.has(last)).toBe(false);
  });

  it("caps a pick whose prerequisite isn't running, and lifts the cap when it is", () => {
    const dependent = list.find((id) => (byId.get(id)!.dependencies?.requires ?? []).length > 0)!;
    const prereq = byId.get(dependent)!.dependencies.requires[0];
    const alone = evaluatePosture(data, [dependent]);
    expect(alone.dependencyUnmet.has(dependent)).toBe(true);
    expect(alone.dependencyUnmetRequires.get(dependent)).toContain(prereq);
    const both = evaluatePosture(data, [prereq, dependent]);
    expect(both.dependencyUnmet.has(dependent)).toBe(false);
    expect(both.effectiveStates[dependent]).toBe("deployed");
  });

  it("agrees with scorePosture called directly", () => {
    const chosen = ["DET-01", "DEC-01", "IAM-01", "NET-01"];
    const states: Record<string, BlockState> = baselineStates(data.blocks);
    for (const id of chosen) states[id] = "deployed";
    const direct = scorePosture({
      blocks: data.blocks,
      model: data.model,
      blockStates: states,
      advanceOrder: chosen,
      year: YEAR,
      sliders: SLIDERS,
      adversaryOc: 4,
      modelServedExternally: SERVED,
    });
    const r = evaluatePosture(data, chosen);
    expect(r.score.sl).toEqual(direct.sl);
    expect(r.score.tiers).toEqual(direct.tiers);
    expect(r.spentMillions).toBe(direct.spentMillions);
  });

  it("cannot be won outright: nothing on the list reaches SL5", () => {
    expect(Math.max(...affordable.map((a) => a.level))).toBeLessThan(5);
  });
});
