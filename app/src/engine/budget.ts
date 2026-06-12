import type { Block, BlockState } from "./types";

/**
 * Budget constraint: active blocks consume the upfront budget cheapest-first;
 * blocks past the budget line are funded only to "implementing" level —
 * a deployed/mature state the org cannot actually pay for is capped.
 */
export function applyBudgetConstraint(
  blocks: Block[],
  blockStates: Record<string, BlockState>,
  budgetMillions: number
): { effectiveStates: Record<string, BlockState>; exceededIds: Set<string> } {
  const active = blocks
    .filter((b) => (blockStates[b.id] ?? "not_started") !== "not_started")
    .map((b) => ({ id: b.id, cost: b.dimensions.cost.upfront_millions.min }))
    .sort((a, b) => a.cost - b.cost);

  let total = 0;
  const exceededIds = new Set<string>();
  for (const item of active) {
    total += item.cost;
    if (total > budgetMillions) exceededIds.add(item.id);
  }

  if (exceededIds.size === 0) {
    return { effectiveStates: blockStates, exceededIds };
  }

  const effectiveStates: Record<string, BlockState> = { ...blockStates };
  for (const id of exceededIds) {
    const state = blockStates[id];
    if (state === "deployed" || state === "mature") {
      effectiveStates[id] = "implementing";
    }
  }
  return { effectiveStates, exceededIds };
}
