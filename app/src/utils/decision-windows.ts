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
 * Worst-case months to reach *operational*, including any `requires` chain that
 * has to be operational first.
 *
 * Twelve blocks in the catalogue declare a prerequisite slower than themselves —
 * `HW-09` is 18 months but needs `HW-01`'s 48, `PHY-05` is 9 but needs
 * `PHY-01`'s 48 — so their own `time_to_deploy_months` understates when they
 * must start. The engine already caps such a block at `implementing` until its
 * prerequisite lands (see `dependencies.ts`); this makes the *displayed*
 * deadline agree with that, which matters because the deployment-race argument
 * depends on readers trusting these dates.
 *
 * Work is assumed to OVERLAP rather than queue: you can pour concrete and
 * procure the racks that go inside it at the same time, so the effective time
 * is the longest single path, not the sum. Summing instead would mark 22 of 46
 * blocks overdue in 2026 and put `AI-02`'s deadline in 2017, which is both
 * implausible and useless — a badge on half the catalogue says nothing. The
 * remaining understatement is deliberate: this is the optimistic reading of a
 * dependency, and the model errs toward telling you there is still time.
 *
 * Cycles are impossible (asserted in the data) but the visited set keeps this
 * total anyway.
 */
export function effectiveDeployMonths(block: Block, allBlocks: Block[]): number {
  const byId = new Map(allBlocks.map((b) => [b.id, b]));
  const walk = (b: Block, seen: Set<string>): number => {
    if (seen.has(b.id)) return 0;
    seen.add(b.id);
    let longest = schedulableDeployMonths(b);
    for (const id of b.dependencies?.requires ?? []) {
      const prereq = byId.get(id);
      if (prereq) longest = Math.max(longest, walk(prereq, seen));
    }
    return longest;
  };
  return walk(block, new Set());
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
    // Counts the `requires` chain, not just the block's own build time — a
    // block gated behind a 48-month prerequisite has to start much earlier
    // than its own duration suggests.
    const mustStartBy = deadline - effectiveDeployMonths(block, blocks) / 12;
    if (mustStartBy > year + horizon || mustStartBy <= minYear) continue;
    const urgency: WindowUrgency =
      mustStartBy <= year ? "overdue" : mustStartBy <= year + 1 ? "urgent" : "upcoming";
    result.push({ block, mustStartBy, urgency });
  }
  return result.sort((a, b) => a.mustStartBy - b.mustStartBy);
}

// Badge styling for urgency lives in utils/colors.ts (URGENCY_BADGE):
// hue stays threat-red; urgency is carried by weight (solid vs outline).
