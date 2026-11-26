import type { AttackChain, Block, BlockState, Category, Sliders } from "./types";
import { applyBudgetConstraint } from "./budget";
import { isAtOrBelowBaseline } from "./baseline";
import { applyDependencyConstraint } from "./dependencies";
import {
  computeCategoryScores,
  overallSlScore,
  relevantBlockIds,
  type RelevanceWeights,
} from "./scoring";
import { chainResidualFloor, computeBreachProbabilities } from "./breach";

/**
 * The one pipeline every derived number goes through.
 *
 * Before this existed the Score card, the timeline and the Policy view each
 * re-assembled the engine calls themselves, and each got a different piece
 * wrong: the timeline scored over 19 named blocks instead of the 45
 * threat-relevant ones, the Policy view passed the AI-timeline number where the
 * sliders object belonged (so every gov/vendor/org penalty silently became 1)
 * and scored raw clicks instead of what the budget and prerequisites allow. The
 * same posture read SL 2.02, 2.12 and 2.46 depending on which panel you looked
 * at. Everything that shows a score, a breach number or a recommendation now
 * calls `scorePosture`, so they cannot disagree.
 *
 * Pure and React-free: the store hook, the timeline sampler, the Policy and
 * CISO analyses and the introduction's mini-game all call it directly, and
 * `tests/engine/posture.test.ts` asserts they agree.
 */

export interface PostureInput {
  blocks: Block[];
  chains: AttackChain[];
  /** What the reader clicked — before any budget or prerequisite cap. */
  blockStates: Record<string, BlockState>;
  /** Funding priority (see `applyBudgetConstraint`). */
  advanceOrder?: string[];
  year: number;
  /** All six sliders; `budget_millions` and `risk_tolerance` drive the budget. */
  sliders: Sliders;
  adversaryOc: number;
  modelServedExternally: boolean;
  /** Where an unfunded block falls back to. Omitted = its real-world baseline;
   * the mini-game, which builds from nothing, passes all-`not_started`. */
  budgetFloorStates?: Record<string, BlockState>;
}

export interface PostureScore {
  /** What each block counts as after the budget and prerequisite caps — the
   * states every number below was computed over. */
  effectiveStates: Record<string, BlockState>;
  budgetExceededIds: Set<string>;
  spentMillions: number;
  dependencyUnmetIds: Set<string>;
  dependencyUnmetRequires: Map<string, string[]>;
  categoryScores: Record<Category, number>;
  overallSl: number;
  /** Per chain, at `adversaryOc`. */
  breachProbabilities: Record<string, number>;
  /** Per chain: the lowest any posture can drive it (see `chainResidualFloor`). */
  residualFloors: Record<string, number>;
  /** The most viable chain; null only when there are no chains. */
  bestChain: { id: string; probability: number } | null;
  /** The headline number: the max over chains (0 with no chains). */
  breach: number;
}

/**
 * The security level a posture needs to stop this adversary. RAND's ladder
 * pairs them by construction — SL-n is the level meant to stop an OC-n actor —
 * so the target is the adversary tier, clamped to the 1–5 scale.
 *
 * It used to be `5 − 2·risk_tolerance`, which reused the planning-cost slider
 * as a target and had nothing to do with who is attacking.
 */
export function targetSl(adversaryOc: number): number {
  return Math.min(5, Math.max(1, adversaryOc));
}

/** How close to its residual floor a chain has to be to count as "held there".
 * Half a point: below the display's own resolution, so a chain the reader
 * sees at the floor percentage is filed as held. */
export const RESIDUAL_FLOOR_MARGIN = 0.005;

/** True when defense has pushed this chain as low as defense can push it. */
export function isHeldAtResidualFloor(probability: number, floor: number): boolean {
  return probability <= floor + RESIDUAL_FLOOR_MARGIN;
}

// Relevance depends only on the catalogue and the chains, which are loaded once,
// so cache it by identity rather than rebuilding a 45-entry map on every score.
const relevanceCache = new WeakMap<AttackChain[], WeakMap<Block[], RelevanceWeights>>();

/** `relevantBlockIds(chains, blocks)` — always WITH the catalogue, so supporting
 * defenses are in it — memoized on the two arrays' identity. */
export function threatRelevance(chains: AttackChain[], blocks: Block[]): RelevanceWeights {
  let byBlocks = relevanceCache.get(chains);
  if (!byBlocks) {
    byBlocks = new WeakMap();
    relevanceCache.set(chains, byBlocks);
  }
  let weights = byBlocks.get(blocks);
  if (!weights) {
    weights = relevantBlockIds(chains, blocks);
    byBlocks.set(blocks, weights);
  }
  return weights;
}

/**
 * The funding order after the program starts paying for `ids`, in that
 * sequence. Any of them not already costing money (inactive, or at/below its
 * baseline) joins the END of the queue — the same rule the store applies when a
 * reader advances a block — so a what-if can only ever unfund its own blocks,
 * never an earlier commitment.
 */
export function orderAfterActivating(
  input: Pick<PostureInput, "blocks" | "blockStates" | "advanceOrder">,
  ids: string[]
): string[] {
  const byId = new Map(input.blocks.map((b) => [b.id, b]));
  const costing = (id: string) => {
    const block = byId.get(id);
    const state = input.blockStates[id] ?? "not_started";
    return !!block && state !== "not_started" && !isAtOrBelowBaseline(block, state);
  };
  const joining = ids.filter((id) => !costing(id));
  return [...(input.advanceOrder ?? []).filter((id) => !joining.includes(id)), ...joining];
}

/** The budget then the prerequisite cap, in that order — the states a posture
 * actually delivers. Split out for callers that need only the states. */
export function effectivePosture(
  input: Pick<PostureInput, "blocks" | "blockStates" | "advanceOrder" | "sliders" | "budgetFloorStates">
) {
  const {
    effectiveStates: budgeted,
    exceededIds: budgetExceededIds,
    spentMillions,
  } = applyBudgetConstraint(input.blocks, input.blockStates, input.sliders.budget_millions, {
    order: input.advanceOrder,
    riskTolerance: input.sliders.risk_tolerance,
    floorStates: input.budgetFloorStates,
  });
  const {
    effectiveStates,
    unmetIds: dependencyUnmetIds,
    unmetRequires: dependencyUnmetRequires,
  } = applyDependencyConstraint(input.blocks, budgeted);
  return {
    effectiveStates,
    budgetExceededIds,
    spentMillions,
    dependencyUnmetIds,
    dependencyUnmetRequires,
  };
}

/** Score a posture: effective states, category scores, SL, and per-chain breach. */
export function scorePosture(input: PostureInput): PostureScore {
  const posture = effectivePosture(input);
  const { effectiveStates } = posture;

  const categoryScores = computeCategoryScores(
    input.blocks,
    effectiveStates,
    input.year,
    input.sliders,
    threatRelevance(input.chains, input.blocks)
  );

  const breachProbabilities = computeBreachProbabilities(
    input.chains,
    input.blocks,
    effectiveStates,
    input.adversaryOc,
    input.year,
    input.sliders,
    input.modelServedExternally
  );

  const residualFloors: Record<string, number> = {};
  for (const chain of input.chains) {
    residualFloors[chain.id] = chainResidualFloor(
      chain,
      input.blocks,
      input.adversaryOc,
      input.year,
      input.sliders,
      input.modelServedExternally
    );
  }

  let bestChain: PostureScore["bestChain"] = null;
  for (const [id, probability] of Object.entries(breachProbabilities)) {
    if (!bestChain || probability > bestChain.probability) bestChain = { id, probability };
  }

  return {
    ...posture,
    categoryScores,
    overallSl: overallSlScore(categoryScores),
    breachProbabilities,
    residualFloors,
    bestChain,
    breach: bestChain?.probability ?? 0,
  };
}
