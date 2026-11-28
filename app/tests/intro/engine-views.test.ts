// The introduction's demos ask the engine questions through engine-views.ts.
// These run those helpers on the shipped data and pin the claims the slides
// make in prose: SL5 needs future capabilities and a favourable world; weak
// counters don't add up to a strong one; the threat front moves with the AI
// pace; doing nothing is a decline.

import { describe, it, expect } from "vitest";
import { SL_BAR_PRESETS } from "../../src/engine/threat-sl";
import {
  bandChips,
  countersOf,
  liftedTier,
  liftInWords,
  scoreScene,
  shortVectorName,
  SLIDERS_FAVOURABLE,
  stackOnVector,
  stopsInWords,
  threatFrontYear,
  unpreparedBand,
  type Strictness,
  type World,
} from "../../src/intro/engine-views";
import { loadThreatDataFromDisk } from "./load-data";

const data = loadThreatDataFromDisk();

describe("words", () => {
  it("names the tiers a level stops", () => {
    expect(stopsInWords(0)).toBe("nobody yet");
    expect(stopsInWords(1)).toBe("OC1");
    expect(stopsInWords(2)).toBe("OC1 and OC2");
    expect(stopsInWords(4)).toBe("OC1 to OC4");
  });

  it("drops RAND's parenthetical gloss from a vector name, never to nothing", () => {
    expect(shortVectorName("Expanding illegitimate access (e.g., escalating privileges)")).toBe(
      "Expanding illegitimate access"
    );
    expect(shortVectorName("(only a gloss)")).toBe("(only a gloss)");
  });

  it("reports band moves as chips, from the defender's side", () => {
    expect(bandChips(["contested", "usually succeeds"], ["usually fails", "usually succeeds"])).toEqual([
      "−1 band",
      null,
    ]);
    expect(bandChips(["usually fails"], ["usually succeeds"])).toEqual(["+2 band"]);
  });
});

describe("AI lifts the attacker", () => {
  it("lifts code and credential vectors a full tier by 2030, and military force not at all", () => {
    expect(liftedTier(3, 1, 2030)).toBe(4);
    expect(liftInWords(3, liftedTier(3, 1, 2030))).toBe("works like OC4");
    expect(liftedTier(3, 0, 2030)).toBe(3);
    expect(liftInWords(3, 3)).toBe("unchanged");
    expect(liftedTier(3, 1, 2024)).toBe(3);
  });

  it("puts the threat front at 2030 on the expected pace, earlier when faster, later when slower", () => {
    const expected = threatFrontYear(0.5)!;
    expect(expected).toBe(2030);
    expect(threatFrontYear(1)!).toBeLessThan(expected);
    expect(threatFrontYear(0)!).toBeGreaterThan(expected);
  });
});

describe("the security level demo", () => {
  const worlds: World[] = ["as-today", "favourable"];
  const bars = Object.keys(SL_BAR_PRESETS) as Strictness[];

  it("starts today's typical lab at SL1 in 2026, as the instrument does", () => {
    expect(scoreScene(data, { posture: "typical-lab" }).sl.level).toBe(1);
  });

  it("never reaches SL5 with today's catalogue, in any world or at any bar", () => {
    for (const world of worlds)
      for (const strictness of bars)
        expect(scoreScene(data, { posture: "every-defense", world, strictness }).sl.level).toBeLessThan(5);
  });

  it("reaches SL5 with future capabilities in a favourable world", () => {
    expect(scoreScene(data, { posture: "every-defense", world: "favourable", future: true }).sl.level).toBe(5);
    // ...and not with future capabilities alone.
    expect(scoreScene(data, { posture: "every-defense", world: "as-today", future: true }).sl.level).toBeLessThan(5);
  });

  it("a stricter bar never raises the level", () => {
    for (const world of worlds) {
      const lv = (strictness: Strictness) => scoreScene(data, { posture: "every-defense", world, strictness }).sl.level;
      expect(lv("strict")).toBeLessThanOrEqual(lv("standard"));
      expect(lv("standard")).toBeLessThanOrEqual(lv("lenient"));
    }
  });

  it("doing nothing is a decline: today's typical lab loses a level by 2030", () => {
    const at = (year: number) => scoreScene(data, { posture: "typical-lab", year }).sl.level;
    expect(at(2030)).toBeLessThan(at(2026));
  });

  it("the own model is held by every defense in 2026 and contested by 2030", () => {
    const own = (year: number) => scoreScene(data, { posture: "every-defense", year }).aiInsider.band;
    expect(own(2026)).toBe("usually fails");
    expect(own(2030)).not.toBe("usually fails");
  });
});

describe("the stacking demo", () => {
  const VECTOR = "V-HUM-1";
  const counters = countersOf(data, VECTOR);
  const partials = counters.filter((c) => c.strength === "partial" && !c.block.future).map((c) => c.block.id);
  const strong = counters.filter((c) => c.strength === "strong").map((c) => c.block.id);
  // As the slide draws it: an OC4 agency in 2026, full cooperation.
  const stack = (ids: string[]) => stackOnVector(data, VECTOR, 4, ids, 2026, SLIDERS_FAVOURABLE);

  it("has several partial counters today and a strong one only among future capabilities", () => {
    expect(partials.length).toBeGreaterThanOrEqual(4);
    expect(strong.length).toBeGreaterThan(0);
    for (const id of strong) expect(data.blocks.find((b) => b.id === id)!.future).toBe(true);
  });

  it("each extra partial helps less, and past the ladder adds nothing", () => {
    let prev = stack([]).withCounters.p;
    let prevCut = Infinity;
    const on: string[] = [];
    for (const id of partials) {
      on.push(id);
      const p = stack(on).withCounters.p;
      const cut = prev - p;
      expect(cut).toBeGreaterThanOrEqual(-1e-12);
      expect(cut).toBeLessThanOrEqual(prevCut + 1e-12);
      prev = p;
      prevCut = cut;
    }
    // Five partials: the last ones take no rung at all.
    const applied = stack(partials).withCounters.applied;
    expect(applied.filter((a) => a.rung === null).length).toBeGreaterThan(0);
  });

  it("all of today's partials do less than the one strong counter, and leave it usually succeeding", () => {
    const allPartials = stack(partials);
    const strongAlone = stack(strong);
    expect(strongAlone.withCounters.p).toBeLessThan(allPartials.withCounters.p);
    expect(allPartials.band).toBe("usually succeeds");
    expect(strongAlone.band).not.toBe("usually succeeds");
  });
});

describe("attack vectors against an unprepared lab", () => {
  it("never get harder as the attacker's tier rises", () => {
    const rank = { "usually fails": 0, contested: 1, "usually succeeds": 2 };
    for (const v of data.model.vectors.filter((x) => x.source === "rand")) {
      for (let t = 1; t < 5; t++) expect(rank[unpreparedBand(v, t + 1)]).toBeGreaterThanOrEqual(rank[unpreparedBand(v, t)]);
    }
  });
});
