import type { Block, BlockState } from "../engine/types";
import type { TimeLapseScript } from "./types";
import { blockStateAtYear } from "../engine/maturation";
import { baselineStates } from "../engine/baseline";
import { schedulableDeployMonths } from "../utils/decision-windows";

export function computeScriptBlockStates(
  script: TimeLapseScript,
  currentYear: number,
  blocks: Block[]
): Record<string, BlockState> {
  // Stories start from where labs actually are, not from a bare field — the
  // same baseline the app opens on. A script's own `initialBlockStates` still
  // overrides it, which is how "Do Nothing" stays a true zero if it wants to.
  const states: Record<string, BlockState> = baselineStates(blocks);

  if (script.initialBlockStates) {
    for (const [id, state] of Object.entries(script.initialBlockStates)) {
      states[id] = state;
    }
  }

  if (script.deployments) {
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    for (const dep of script.deployments) {
      if (currentYear >= dep.startYear) {
        const block = blockMap.get(dep.blockId);
        if (block) {
          const scheduled = blockStateAtYear(
            dep.startYear,
            currentYear,
            schedulableDeployMonths(block)
          );
          // Never regress below what the block already had. A story that starts
          // a programme on a control the lab partly runs today begins its build
          // curve at `investing`, and without this clamp the block would visibly
          // go BACKWARDS from its baseline for the first year or two — defenses
          // un-deploying as the story "invests" in them.
          states[dep.blockId] = higherOf(scheduled, states[dep.blockId]);
        }
      }
    }
  }

  return states;
}

const STATE_ORDER: BlockState[] = [
  "not_started",
  "investing",
  "implementing",
  "deployed",
  "mature",
];

function higherOf(a: BlockState, b: BlockState | undefined): BlockState {
  if (!b) return a;
  return STATE_ORDER.indexOf(a) >= STATE_ORDER.indexOf(b) ? a : b;
}
