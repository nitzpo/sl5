import { describe, it, expect } from "vitest";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { computeScriptBlockStates } from "../../src/timelapse/compute-script-state";
import type { Block } from "../../src/engine/types";
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

  it("stay within their own budget override at optimistic upfront costs", () => {
    // A story that claims a posture its own budget silently caps is lying to
    // the viewer — the budget engine downgrades over-budget blocks.
    for (const script of SCRIPTS) {
      const budget = script.sliderOverrides?.budget_millions;
      if (budget === undefined || !script.deployments?.length) continue;
      const total = script.deployments.reduce(
        (sum, dep) =>
          sum + (blockById.get(dep.blockId)?.dimensions.cost.upfront_millions.min ?? 0),
        0
      );
      expect(total, `${script.id} deploys $${total}M > $${budget}M budget`).toBeLessThanOrEqual(
        budget
      );
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
