import type { Block, BlockState } from "../engine/types";
import type { TimeLapseScript } from "./types";
import { blockStateAtYear } from "../engine/maturation";

export function computeScriptBlockStates(
  script: TimeLapseScript,
  currentYear: number,
  blocks: Block[]
): Record<string, BlockState> {
  const states: Record<string, BlockState> = {};

  for (const b of blocks) {
    states[b.id] = "not_started";
  }

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
          states[dep.blockId] = blockStateAtYear(
            dep.startYear,
            currentYear,
            block.dimensions.time_to_deploy_months.max
          );
        }
      }
    }
  }

  return states;
}
