import type { Block, BlockState } from "./types";
import { baselineStateFor, isAtOrBelowBaseline } from "./baseline";

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

const STATE_ORDER: BlockState[] = [
  "not_started",
  "investing",
  "implementing",
  "deployed",
  "mature",
];

/**
 * Budget constraint: active blocks consume the upfront budget in advancement
 * order; a block past the budget line is not funded at all, so it stays where
 * the lab already was — its real-world baseline (`baselineStateFor`), which for
 * most of the catalogue is `not_started`.
 *
 * It used to be capped at `implementing` instead, which is 0.4 effectiveness
 * plus half a layer of depth credit for money nobody spent: with a $0 budget,
 * clicking every block still cut breach from ~65% to ~44%. A program the org
 * cannot pay for is not 40% built; it is not built.
 *
 * Blocks sitting at or below their real-world baseline are SUNK COST and never
 * enter the funding queue: a lab does not re-buy the controls it already runs,
 * and charging for them would open every session overdrawn. Advancing one past
 * its baseline makes it a purchase like any other.
 */
export function applyBudgetConstraint(
  blocks: Block[],
  blockStates: Record<string, BlockState>,
  budgetMillions: number,
  opts: BudgetOptions = {}
): { effectiveStates: Record<string, BlockState>; exceededIds: Set<string>; spentMillions: number } {
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const isActive = (id: string) => {
    const state = blockStates[id] ?? "not_started";
    if (state === "not_started") return false;
    const block = blockById.get(id);
    return !block || !isAtOrBelowBaseline(block, state);
  };

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
    const block = blockById.get(id);
    if (!block) continue;
    // The UNDATED baseline, deliberately — the same one the sunk-cost rule
    // above reads (`isAtOrBelowBaseline`). The floor has to be exactly the most
    // a block can be for free: a dated floor (`baselineStateFor(block, year)`)
    // would drop an unfunded block to `not_started` before its `baseline_since`
    // while the same block at `implementing` still counts as free, so deploying
    // it would make the posture worse. Keeping the two rules on one baseline is
    // also what keeps effective states independent of the year.
    const floor = baselineStateFor(block);
    const state = blockStates[id] ?? "not_started";
    // The floor is a ceiling on what an unfunded block can claim, never a
    // boost. (An exceeded block is active, so it already sits above its
    // baseline and this always applies.)
    if (STATE_ORDER.indexOf(floor) < STATE_ORDER.indexOf(state)) {
      effectiveStates[id] = floor;
    }
  }
  return { effectiveStates, exceededIds, spentMillions: total };
}
