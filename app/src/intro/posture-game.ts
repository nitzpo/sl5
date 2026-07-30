// The mini-game's rules and arithmetic, with no React in it.
//
// Split out from the component for one reason: every number the game shows has
// to come from the real engine, and the only way to prove that is a test that
// loads the shipped JSON and runs `evaluatePosture` directly. Nothing here is a
// re-implementation — `applyBudgetConstraint`, `applyDependencyConstraint`,
// `blockCostBasis`, `computeCategoryScores`, `overallSlScore` and
// `computeBreachProbabilities` are the same functions `store/derived.ts` calls
// for the app's own Security Posture card, in the same order.

import {
  applyBudgetConstraint,
  applyDependencyConstraint,
  blockCostBasis,
  computeBreachProbabilities,
  computeCategoryScores,
  overallSlScore,
  relevantBlockIds,
} from "../engine";
import type { AttackChain, Block, BlockState, Category, Sliders } from "../engine/types";

/** A deliberately tight year. The app's own default is $200M; $150M is enough
 * to buy several controls but nowhere near the whole shortlist, so the budget
 * actually decides something. */
export const BUDGET_MILLIONS = 150;
export const YEAR = 2026;
/** OC4 — a leading nation-state, which is the app's baseline adversary. */
export const ADVERSARY_OC = 4;
/** Below this, the app's Attacker perspective files a chain under "blocked". */
export const VIABLE_THRESHOLD = 0.02;

/** The ten blocks you choose from. Picked to make the trade-offs land, under
 * four constraints the tests enforce:
 *
 *  - All six categories and all three defense types, so no lesson is missing.
 *  - Costs $263.5M against a $150M budget, so the budget genuinely binds and
 *    "the air gap, or eight cheap controls" is a real decision.
 *  - No block requires anything off this list, so every cap the reader hits is
 *    one they can actually fix. `PER-04` requires `PER-01`, which is here on
 *    purpose: buy vetting with no sensitivity framework underneath it and the
 *    real dependency rule caps it.
 *  - Between them they stop chains: `AI-07` and `NET-01` are stoppers on the
 *    chain that drives the headline number, so the breach percentage does move.
 *  - At least one `completed_by` companion is buyable here, so the "your air gap
 *    is 55% of an air gap" lesson comes with a move the reader can make: `PER-08`
 *    is a NET-01 companion at $10M, taking it to 70% inside the budget.
 *
 * `completed_by` companions are otherwise allowed off the list, unlike `requires`.
 * The two relations differ exactly here: an unmeetable `requires` is a cap the
 * reader can't clear and reads as a broken game, whereas an unmeetable
 * `completed_by` is the lesson — the air gap the budget can buy is not the air gap
 * the standard describes, and no ten-block year makes it one. Buying `NET-01`'s
 * other two companions needs `NET-05` and `NET-04`, both of which require the $50M
 * `NET-02` enclave; that whole set is $191M against a $150M budget, so putting them
 * on the list would only sell a completion the reader cannot afford.
 *
 * Every id, cost, category and dependency is asserted against the shipped JSON
 * by `tests/intro/posture-game.test.ts`. */
export const SHORTLIST = [
  "NET-01", // Air gap — hard stop, and two thirds of the budget in one click
  "AI-07", // Inference channel outbound defense — hybrid
  "HW-05", // Tamper-evident enclosures — hard stop
  "PHY-03", // Mantraps — cheap probabilistic
  "PER-01", // Sensitivity levels framework — the prerequisite
  "PER-04", // SF-86-equivalent vetting — requires PER-01
  "PER-05", // Post-employment restrictions — cheap probabilistic
  "PER-08", // No remote access — cheap hard stop
  "SC-02", // Hardware inspection pipeline — probabilistic
  "SC-05", // Counterfeit detection — cheap probabilistic
] as const;

/** World sliders held at the app's own defaults. The game is about the budget
 * and the blocks; nothing else should move underneath the reader. */
export const SLIDERS: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.5,
  vendor_cooperation: 0.5,
  budget_millions: BUDGET_MILLIONS,
  org_transformation: 0.5,
  risk_tolerance: 0.5,
};

export const BLOCK_FILES = [
  "blocks-network.json",
  "blocks-machine.json",
  "blocks-physical.json",
  "blocks-personnel.json",
  "blocks-supply-chain.json",
  "blocks-ai-specific.json",
] as const;

export interface GameData {
  blocks: Block[];
  chains: AttackChain[];
}

/** What the game charges for a block: the same planning cost the app's budget
 * line uses, at the same default risk tolerance. */
export function costOf(block: Block): number {
  return blockCostBasis(block, SLIDERS.risk_tolerance);
}

export interface PostureResult {
  /** Overall SL score, 0–5. */
  sl: number;
  categories: Record<Category, number>;
  /** Chance at least one chain works, i.e. the app's headline number. */
  breach: number;
  /** Every chain, most likely first — the Attacker perspective's ordering. */
  ranked: { chain: AttackChain; p: number }[];
  /** Total planned spend, and what the budget couldn't pay for. */
  spentMillions: number;
  budgetExceeded: Set<string>;
  /** Blocks capped because a prerequisite isn't operational. */
  dependencyUnmet: Set<string>;
  dependencyUnmetRequires: Map<string, string[]>;
  /** What each shortlist block actually counts as after both caps, which is
   * what the score was computed over — not necessarily what was clicked. */
  effectiveStates: Record<string, BlockState>;
  /** Lowest-scoring category, which is the app's own "fix this next" signal. */
  weakestCategory: Category;
}

/**
 * Score one posture. `chosen` is the reader's click order, which is also the
 * funding order — first clicked, first paid for, exactly as in the app.
 *
 * Blocks outside `chosen` are scored as `not_started` rather than at their
 * real-world baseline: the game is "build a posture from nothing", so the
 * reader sees their own choices move the number instead of reading a score they
 * didn't earn.
 */
export function evaluatePosture(data: GameData, chosen: string[]): PostureResult {
  const requested: Record<string, BlockState> = {};
  for (const b of data.blocks) requested[b.id] = "not_started";
  for (const id of chosen) requested[id] = "deployed";

  const {
    effectiveStates: budgeted,
    exceededIds: budgetExceeded,
    spentMillions,
  } = applyBudgetConstraint(data.blocks, requested, BUDGET_MILLIONS, {
    order: chosen,
    riskTolerance: SLIDERS.risk_tolerance,
  });

  const {
    effectiveStates,
    unmetIds: dependencyUnmet,
    unmetRequires: dependencyUnmetRequires,
  } = applyDependencyConstraint(data.blocks, budgeted);

  const categories = computeCategoryScores(
    data.blocks,
    effectiveStates,
    YEAR,
    SLIDERS,
    relevantBlockIds(data.chains, data.blocks)
  );
  const breaches = computeBreachProbabilities(
    data.chains,
    data.blocks,
    effectiveStates,
    ADVERSARY_OC,
    YEAR,
    SLIDERS
  );

  const ranked = data.chains
    .map((chain) => ({ chain, p: breaches[chain.id] ?? 0 }))
    .sort((a, b) => b.p - a.p);

  const entries = Object.entries(categories) as [Category, number][];
  const weakestCategory = entries.reduce((lo, e) => (e[1] < lo[1] ? e : lo))[0];

  return {
    sl: overallSlScore(categories),
    categories,
    // The app's headline breach number is the worst live chain, which after the
    // sort is the first one.
    breach: ranked[0]?.p ?? 0,
    ranked,
    spentMillions,
    budgetExceeded,
    dependencyUnmet,
    dependencyUnmetRequires,
    effectiveStates,
    weakestCategory,
  };
}
