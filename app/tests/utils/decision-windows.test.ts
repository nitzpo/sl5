import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  effectiveDeployMonths,
  schedulableDeployMonths,
  computeDecisionWindows,
  NO_DEADLINE_MONTHS,
} from "../../src/utils/decision-windows";
import type { Block } from "../../src/engine/types";

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
const byId = new Map(blocks.map((b) => [b.id, b]));

describe("effectiveDeployMonths", () => {
  it("counts a slower prerequisite, not just the block's own build time", () => {
    // HW-09 is an 18-month job that cannot be operational until HW-01's
    // 48-month build lands. Reading its own duration would tell a player they
    // have until 2028.5 to start something that is really a 2026 decision.
    const hw09 = byId.get("HW-09")!;
    expect(schedulableDeployMonths(hw09)).toBe(18);
    expect(effectiveDeployMonths(hw09, blocks)).toBe(48);
  });

  it("leaves a block with no prerequisites alone", () => {
    const hw01 = byId.get("HW-01")!;
    expect(hw01.dependencies?.requires ?? []).toHaveLength(0);
    expect(effectiveDeployMonths(hw01, blocks)).toBe(schedulableDeployMonths(hw01));
  });

  it("takes the longest path rather than summing the chain", () => {
    // Prerequisite work OVERLAPS: concrete cures while the racks that go inside
    // it are procured. Summing would put AI-02's deadline in 2017 and mark half
    // the catalogue overdue, which is both implausible and useless as a signal.
    const ai02 = byId.get("AI-02")!;
    const own = schedulableDeployMonths(ai02);
    const chained = effectiveDeployMonths(ai02, blocks);
    expect(chained).toBeGreaterThanOrEqual(own);
    expect(chained).toBeLessThan(own + 60);
  });

  it("never returns less than the block's own duration", () => {
    for (const b of blocks) {
      expect(
        effectiveDeployMonths(b, blocks),
        `${b.id} went below its own build time`
      ).toBeGreaterThanOrEqual(schedulableDeployMonths(b));
    }
  });

  it("stops charging for a prerequisite that is already operational", () => {
    // Otherwise the gate is a permanent tax: once HW-01 is deployed, HW-09 is an
    // 18-month job again, and still charging it HW-01's 48 would tell a player
    // they had missed a deadline they have in fact already cleared.
    const hw09 = byId.get("HW-09")!;
    const nothingBuilt = Object.fromEntries(blocks.map((b) => [b.id, "not_started"]));
    expect(effectiveDeployMonths(hw09, blocks, nothingBuilt)).toBe(48);

    for (const done of ["deployed", "mature"]) {
      const states = { ...nothingBuilt, "HW-01": done };
      expect(
        effectiveDeployMonths(hw09, blocks, states),
        `HW-01 ${done} should clear the gate`
      ).toBe(18);
    }
  });

  it("keeps charging for a prerequisite that is merely started", () => {
    // `investing` and `implementing` are not operational — the dependency cap in
    // `dependencies.ts` uses the same boundary.
    const hw09 = byId.get("HW-09")!;
    const base = Object.fromEntries(blocks.map((b) => [b.id, "not_started"]));
    for (const partial of ["investing", "implementing"]) {
      expect(
        effectiveDeployMonths(hw09, blocks, { ...base, "HW-01": partial }),
        `HW-01 ${partial} should not clear the gate`
      ).toBe(48);
    }
  });

  it("treats an omitted state map as nothing built", () => {
    const hw09 = byId.get("HW-09")!;
    expect(effectiveDeployMonths(hw09, blocks)).toBe(
      effectiveDeployMonths(
        hw09,
        blocks,
        Object.fromEntries(blocks.map((b) => [b.id, "not_started"]))
      )
    );
  });

  it("terminates on every block in the catalogue", () => {
    // Guards against a cycle in `requires` hanging the UI rather than failing.
    for (const b of blocks) {
      expect(Number.isFinite(effectiveDeployMonths(b, blocks)), b.id).toBe(true);
    }
  });
});

describe("computeDecisionWindows", () => {
  const allNotStarted = Object.fromEntries(blocks.map((b) => [b.id, "not_started"]));

  it("moves a gated block's deadline earlier than its own duration implies", () => {
    const windows = computeDecisionWindows(blocks, allNotStarted, 2026, {
      horizonYears: 10,
    });
    const hw09 = windows.find((w) => w.block.id === "HW-09");
    expect(hw09, "HW-09 should have a window").toBeDefined();
    // 2030 deadline minus HW-01's 48-month chain, not HW-09's own 18.
    expect(hw09!.mustStartBy).toBeCloseTo(2026, 1);
  });

  it("gives a gated block its own deadline back once the prerequisite lands", () => {
    // The user-visible half of the same bug: with HW-01 operational, HW-09's
    // deadline is 2030 minus its own 18 months, not minus HW-01's 48.
    const states = { ...allNotStarted, "HW-01": "mature" };
    const windows = computeDecisionWindows(blocks, states, 2026, { horizonYears: 10 });
    const hw09 = windows.find((w) => w.block.id === "HW-09");
    expect(hw09, "HW-09 should still have a window").toBeDefined();
    expect(hw09!.mustStartBy).toBeCloseTo(2028.5, 1);
  });

  it("skips research-gated blocks, which have no meaningful deadline", () => {
    const windows = computeDecisionWindows(blocks, allNotStarted, 2026, {
      horizonYears: 20,
    });
    for (const w of windows) {
      expect(
        w.block.dimensions.time_to_deploy_months.max,
        `${w.block.id} is research-gated and should not carry a deadline`
      ).toBeLessThan(NO_DEADLINE_MONTHS);
    }
  });

  it("only warns about blocks that have not been started", () => {
    const started = Object.fromEntries(blocks.map((b) => [b.id, "deployed"]));
    expect(computeDecisionWindows(blocks, started, 2026)).toEqual([]);
  });
});
