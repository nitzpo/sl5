import type { Block, BlockState } from "../engine/types";

export type WindowUrgency = "overdue" | "urgent" | "upcoming";

export interface DecisionWindow {
  block: Block;
  mustStartBy: number;
  urgency: WindowUrgency;
}

/**
 * Blocks whose deployment window is closing: not started, and the latest
 * possible start year (deadline minus max deploy time) falls within the
 * horizon. Single source of truth for CisoView, TimelineTrack, and grid badges.
 */
export function computeDecisionWindows(
  blocks: Block[],
  blockStates: Record<string, BlockState | string>,
  year: number,
  opts?: { deadlineYear?: number; horizonYears?: number; minYear?: number }
): DecisionWindow[] {
  const deadline = opts?.deadlineYear ?? 2030;
  const horizon = opts?.horizonYears ?? 2;
  const minYear = opts?.minYear ?? -Infinity;

  const result: DecisionWindow[] = [];
  for (const block of blocks) {
    const state = blockStates[block.id] ?? "not_started";
    if (state !== "not_started") continue;
    const mustStartBy = deadline - block.dimensions.time_to_deploy_months.max / 12;
    if (mustStartBy > year + horizon || mustStartBy <= minYear) continue;
    const urgency: WindowUrgency =
      mustStartBy <= year ? "overdue" : mustStartBy <= year + 1 ? "urgent" : "upcoming";
    result.push({ block, mustStartBy, urgency });
  }
  return result.sort((a, b) => a.mustStartBy - b.mustStartBy);
}

export const URGENCY_COLORS: Record<WindowUrgency, string> = {
  overdue: "#ef4444",
  urgent: "#f59e0b",
  upcoming: "#6b7280",
};
