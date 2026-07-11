import type { Block, BlockState } from "../engine/types";

export type WindowUrgency = "overdue" | "urgent" | "upcoming";

/**
 * Deploy-time maxima at or above this are a data convention for
 * "research-gated, no reliable estimate" (e.g. SC-03's 999), not a real
 * duration. Such blocks have no computable deadline.
 */
export const NO_DEADLINE_MONTHS = 600;

/** Worst-case deploy months usable for scheduling; falls back to the
 * optimistic estimate when the maximum is the open-ended sentinel. */
export function schedulableDeployMonths(block: Block): number {
  const { min, max } = block.dimensions.time_to_deploy_months;
  return max >= NO_DEADLINE_MONTHS ? min : max;
}

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
    // Open-ended deploy times have no meaningful deadline to warn about.
    if (block.dimensions.time_to_deploy_months.max >= NO_DEADLINE_MONTHS) continue;
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
