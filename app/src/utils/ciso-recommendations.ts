import { blockCostBasis } from "../engine/budget";
import { isAtOrBelowBaseline } from "../engine/baseline";
import {
  orderAfterActivating,
  scorePosture,
  type PostureInput,
  type PostureScore,
} from "../engine/posture";
import type { AttackChain, Block, BlockState } from "../engine/types";

/**
 * The CISO view's "Priority investments", computed by running the real engine
 * on each candidate move rather than by a heuristic.
 *
 * The heuristic this replaces scored a block as Δeffectiveness ÷ blocks in its
 * category × 4. It disagreed with the engine almost everywhere: NET-06 showed
 * +0.49 SL against a real +0.05, AI-05 showed +0.35 and moved nothing, seven of
 * the top ten were silently capped by a prerequisite nobody had bought, and the
 * "top 3 cost" summed the optimistic minimums the budget model never uses.
 *
 * Now each candidate is the current posture with one block advanced to
 * `deployed` — together with any hard prerequisites it is missing, as a bundle,
 * because deploying it alone would be capped at `implementing` — scored through
 * `scorePosture`, the same pipeline as the Score card. The ranking is by the
 * drop in the SUM of per-chain breach probabilities per $M: the headline number
 * is a max over chains, so most single moves leave it flat while still closing
 * real ground on the other paths, and a max-based ranking would read nearly
 * every investment as worthless. Cost is the budget model's own: the
 * `blockCostBasis` at the risk-tolerance slider, for the blocks the program
 * isn't already paying for.
 */

export interface InvestmentCandidate {
  /** The block being recommended. */
  block: Block;
  /** Hard prerequisites deployed alongside it, deepest first. Empty unless it
   * is a bundle. */
  prerequisites: Block[];
  /** Every block the move advances, in funding order (prerequisites first). */
  blockIds: string[];
  /** Upfront $M the move adds to the plan, at the budget's cost basis. Zero for
   * a block the program is already funding and only has to finish. */
  costMillions: number;
  /** The same, per advanced block — so moves taken together count each block once. */
  costs: { id: string; millions: number }[];
  /** Change in overall SL. */
  slDelta: number;
  /** Change in the headline (max-over-chains) breach probability. ≤ 0. */
  breachDelta: number;
  /** Drop in the sum of per-chain breach probabilities. ≥ 0. The ranking key's
   * numerator. */
  pathReduction: number;
  /** `pathReduction` per $M (cost floored at $1M so a fully-funded finish
   * doesn't divide by zero). The ranking key. */
  reductionPerMillion: number;
  /** Chains this move narrows by at least 0.1pt, biggest drop first. */
  narrowed: { chain: AttackChain; drop: number }[];
  /** Truthful one-liner, e.g. "Narrows The Long Game and 2 more paths". */
  reason: string;
}

export interface InvestmentAnalysis {
  baseline: PostureScore;
  /** Ranked best first; only moves that fit the budget and move something. */
  candidates: InvestmentCandidate[];
  /** Candidate moves that don't fit the remaining budget. */
  unaffordableCount: number;
  /** Budget left after what the plan already commits (may be negative). */
  remainingMillions: number;
}

const OPERATIONAL: ReadonlySet<BlockState> = new Set(["deployed", "mature"]);
/** A chain counts as "narrowed" in the reason text from this drop up. */
const NARROWED_THRESHOLD = 0.001;
/** Moves below both of these move no number the reader can see. */
const MIN_PATH_REDUCTION = 1e-4;
const MIN_SL_DELTA = 1e-3;

function isActive(block: Block, state: BlockState): boolean {
  return state !== "not_started" && !isAtOrBelowBaseline(block, state);
}

/** Hard prerequisites the block is missing, transitively, deepest first —
 * only those the reader could actually advance (not already deployed/mature). */
function missingPrerequisites(
  block: Block,
  byId: Map<string, Block>,
  raw: Record<string, BlockState>,
  effective: Record<string, BlockState>
): Block[] {
  const out: Block[] = [];
  const seen = new Set<string>([block.id]);
  const visit = (b: Block) => {
    for (const reqId of b.dependencies?.requires ?? []) {
      if (seen.has(reqId)) continue;
      seen.add(reqId);
      const req = byId.get(reqId);
      if (!req) continue;
      if (OPERATIONAL.has(effective[reqId] ?? "not_started")) continue;
      visit(req); // its own prerequisites go first
      if (!OPERATIONAL.has(raw[reqId] ?? "not_started")) out.push(req);
    }
  };
  visit(block);
  return out;
}

function reasonFor(
  narrowed: { chain: AttackChain; drop: number }[],
  worstChainId: string | undefined,
  slDelta: number
): string {
  if (narrowed.length === 0) {
    return slDelta > 0 ? "Raises SL — no modelled attack path narrows" : "Moves no number";
  }
  const [first] = narrowed;
  const worst = first.chain.id === worstChainId ? " (the worst path)" : "";
  const more = narrowed.length - 1;
  return `Narrows ${first.chain.name}${worst}${
    more > 0 ? ` and ${more} more path${more === 1 ? "" : "s"}` : ""
  }`;
}

export function recommendInvestments(
  input: PostureInput,
  opts: { limit?: number } = {}
): InvestmentAnalysis {
  const baseline = scorePosture(input);
  const byId = new Map(input.blocks.map((b) => [b.id, b]));
  const rt = input.sliders.risk_tolerance;
  const remainingMillions = input.sliders.budget_millions - baseline.spentMillions;
  const chainSum = (s: PostureScore) =>
    Object.values(s.breachProbabilities).reduce((a, p) => a + p, 0);
  const baseSum = chainSum(baseline);

  // What the program is already paying for: active and inside the budget line.
  const funded = (id: string) => {
    const block = byId.get(id);
    const state = input.blockStates[id] ?? "not_started";
    return !!block && isActive(block, state) && !baseline.budgetExceededIds.has(id);
  };

  const candidates: InvestmentCandidate[] = [];
  let unaffordableCount = 0;

  for (const block of input.blocks) {
    const raw = input.blockStates[block.id] ?? "not_started";
    if (OPERATIONAL.has(raw)) continue;

    const prerequisites = missingPrerequisites(
      block,
      byId,
      input.blockStates,
      baseline.effectiveStates
    );
    const blockIds = [...prerequisites.map((b) => b.id), block.id];

    const states: Record<string, BlockState> = { ...input.blockStates };
    for (const id of blockIds) states[id] = "deployed";
    const candidateOrder = orderAfterActivating(input, blockIds);
    const result = scorePosture({ ...input, blockStates: states, advanceOrder: candidateOrder });

    const pathReduction = baseSum - chainSum(result);
    const slDelta = result.overallSl - baseline.overallSl;
    const movesSomething = pathReduction > MIN_PATH_REDUCTION || slDelta > MIN_SL_DELTA;

    // A move the budget can't pay for is scored as nothing (the pipeline drops
    // unfunded blocks to their baseline), so it isn't a recommendation — but
    // the reader should know how many there are.
    if (blockIds.some((id) => result.budgetExceededIds.has(id))) {
      unaffordableCount++;
      continue;
    }
    if (!movesSomething) continue;

    const costs = blockIds.map((id) => ({
      id,
      millions: funded(id) ? 0 : blockCostBasis(byId.get(id)!, rt),
    }));
    const costMillions = costs.reduce((sum, c) => sum + c.millions, 0);

    const narrowed = input.chains
      .map((chain) => ({
        chain,
        drop:
          (baseline.breachProbabilities[chain.id] ?? 0) -
          (result.breachProbabilities[chain.id] ?? 0),
      }))
      .filter((n) => n.drop >= NARROWED_THRESHOLD)
      .sort((a, b) => b.drop - a.drop);

    candidates.push({
      block,
      prerequisites,
      blockIds,
      costMillions,
      costs,
      slDelta,
      breachDelta: result.breach - baseline.breach,
      pathReduction,
      reductionPerMillion: pathReduction / Math.max(costMillions, 1),
      narrowed,
      reason: reasonFor(narrowed, baseline.bestChain?.id, slDelta),
    });
  }

  candidates.sort(
    (a, b) =>
      b.reductionPerMillion - a.reductionPerMillion ||
      b.pathReduction - a.pathReduction ||
      b.slDelta - a.slDelta
  );

  return {
    baseline,
    candidates: opts.limit !== undefined ? candidates.slice(0, opts.limit) : candidates,
    unaffordableCount,
    remainingMillions,
  };
}

/** Upfront $M for a set of moves taken together, each block counted once — a
 * prerequisite shared by two bundles is only bought once. */
export function combinedCostMillions(candidates: InvestmentCandidate[]): number {
  const byBlock = new Map<string, number>();
  for (const c of candidates) for (const { id, millions } of c.costs) byBlock.set(id, millions);
  let total = 0;
  for (const millions of byBlock.values()) total += millions;
  return total;
}
