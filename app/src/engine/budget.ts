import type { Block, BlockState } from "./types";

/**
 * Planning cost of a block, in upfront $M. Risk tolerance sets which end of
 * the authored cost range you plan against: conservative (0) budgets for the
 * worst case, aggressive (1) bets on the optimistic estimate.
 */
export function blockCostBasis(block: Block, riskTolerance: number = 0.5): number {
  const cost = block.dimensions?.cost?.upfront_millions;
  if (!cost) return 0;
  const min = cost.min ?? 0;
  const max = cost.max ?? min;
  const rt = Math.max(0, Math.min(1, riskTolerance));
  return min + (1 - rt) * (max - min);
}

export interface BudgetOptions {
  /** Funding priority: block ids in the order the user advanced them.
   * Blocks advanced earlier are funded first, so turning on one more block
   * can only cap THAT block — it never evicts an earlier commitment. */
  order?: string[];
  riskTolerance?: number;
}

/**
 * Budget constraint: active blocks consume the upfront budget in advancement
 * order; blocks past the budget line are funded only to "implementing" level —
 * a deployed/mature state the org cannot actually pay for is capped.
 */
export function applyBudgetConstraint(
  blocks: Block[],
  blockStates: Record<string, BlockState>,
  budgetMillions: number,
  opts: BudgetOptions = {}
): { effectiveStates: Record<string, BlockState>; exceededIds: Set<string>; spentMillions: number } {
  const isActive = (id: string) => (blockStates[id] ?? "not_started") !== "not_started";
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  // Funding queue: explicit advancement order first, then any remaining
  // active blocks in data order (pre-seeded states, old saves).
  const queue: Block[] = [];
  const queued = new Set<string>();
  for (const id of opts.order ?? []) {
    const block = blockById.get(id);
    if (block && isActive(id) && !queued.has(id)) {
      queue.push(block);
      queued.add(id);
    }
  }
  for (const block of blocks) {
    if (isActive(block.id) && !queued.has(block.id)) {
      queue.push(block);
      queued.add(block.id);
    }
  }

  let total = 0;
  const exceededIds = new Set<string>();
  for (const block of queue) {
    total += blockCostBasis(block, opts.riskTolerance);
    // Epsilon guard: cost bases accumulate float error, and an exact-fit
    // budget must not read as exceeded.
    if (total - budgetMillions > 1e-9) exceededIds.add(block.id);
  }

  if (exceededIds.size === 0) {
    return { effectiveStates: blockStates, exceededIds, spentMillions: total };
  }

  const effectiveStates: Record<string, BlockState> = { ...blockStates };
  for (const id of exceededIds) {
    const state = blockStates[id];
    if (state === "deployed" || state === "mature") {
      effectiveStates[id] = "implementing";
    }
  }
  return { effectiveStates, exceededIds, spentMillions: total };
}
