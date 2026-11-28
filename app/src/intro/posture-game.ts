// The mini-game's rules and arithmetic, with no React in it.
//
// Split out from the component for one reason: every number the game shows has
// to come from the real engine, and the only way to prove that is a test that
// loads the shipped JSON and runs `evaluatePosture` directly. Nothing here is a
// re-implementation — the score is `scorePosture`, the exact pipeline
// `store/derived.ts` runs for the app's own Security Posture card (budget, then
// prerequisites, then category scores and breach), and the price is the same
// `blockCostBasis` the app's budget line charges.

import { blockCostBasis, isHeldAtResidualFloor, scenarioAsChain, scorePosture } from "../engine";
import type { AttackChain, Block, BlockState, Category, Sliders, ThreatModel } from "../engine/types";

/** A deliberately tight year. The app's own default is $200M; $150M is enough
 * to buy several controls but nowhere near the whole shortlist, so the budget
 * actually decides something. */
export const BUDGET_MILLIONS = 150;
export const YEAR = 2026;
/** OC4 — a leading nation-state, which is the app's baseline adversary. */
export const ADVERSARY_OC = 4;

/** The ten blocks you choose from. Picked to make the trade-offs land, under
 * constraints the tests enforce:
 *
 *  - All six categories and all three defense types, so no lesson is missing.
 *  - Costs ~$266M against a $150M budget, so the budget genuinely binds and
 *    "the air gap, or eight cheap controls" is a real decision.
 *  - No block requires anything off this list, so every cap the reader hits is
 *    one they can actually fix. `PER-04` and `PER-06` require `PER-01`, which is
 *    here on purpose: buy vetting with no sensitivity framework underneath it
 *    and the real dependency rule caps it.
 *  - Some single block moves the headline number (campaign success against
 *    OC4): the air gap does, by closing remote entry and bulk egress.
 *  - At least one `completed_by` companion is buyable here, so the "your air gap
 *    is 55% of an air gap" lesson comes with a move the reader can make: `PER-08`
 *    is a NET-01 companion at $10M, taking it to 70% inside the budget.
 *
 * Phase 2 swapped two blocks merged out of the catalogue: PER-05 (folded into
 * PER-03) became PER-06, and SC-05 (folded into SC-08, which requires PHY-07)
 * became SW-01. The game's copy still describes the chain-era "worst route"
 * headline; Phase 2B rewrites it for the campaign.
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
  "PER-06", // Dual authorization — cheap probabilistic, requires PER-01
  "PER-08", // No remote access — cheap hard stop
  "SC-04", // Sub-tier flow-down of security requirements — probabilistic
  "SW-01", // ML software supply-chain integrity — cheap hybrid
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
  sl_bar: 0.2,
  ai_propensity: 0.5,
};

export const BLOCK_FILES = [
  "blocks-network.json",
  "blocks-machine.json",
  "blocks-physical.json",
  "blocks-personnel.json",
  "blocks-supply-chain.json",
  "blocks-ai-specific.json",
] as const;

export const MODEL_FILES = ["vectors.json", "approaches.json", "scenarios.json"] as const;

export interface GameData {
  blocks: Block[];
  model: ThreatModel;
  /** The scenarios in the chain shape the game's ranking renders. */
  chains: AttackChain[];
}

/** Assemble the game's data from the shipped JSON. */
export function gameData(blocks: Block[], model: ThreatModel): GameData {
  return { blocks, model, chains: model.scenarios.map(scenarioAsChain) };
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
  /** Campaign success against the game's adversary tier — the app's headline
   * number: the chance at least one approach works. */
  breach: number;
  /** Every scenario, most likely first — the Attacker perspective's ordering.
   * `floor` is the campaign's residual floor, and `held` is the Attacker view's
   * own test: within half a point of it, as low as defense can push it. */
  ranked: { chain: AttackChain; p: number; floor: number; held: boolean }[];
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
 * didn't earn. For the same reason a block the budget can't reach falls back to
 * `not_started` — the game's baseline — not to the lab's real-world one: an
 * unfunded block is simply not built.
 */
export function evaluatePosture(data: GameData, chosen: string[]): PostureResult {
  const requested: Record<string, BlockState> = {};
  for (const b of data.blocks) requested[b.id] = "not_started";
  for (const id of chosen) requested[id] = "deployed";

  const score = scorePosture({
    blocks: data.blocks,
    model: data.model,
    blockStates: requested,
    advanceOrder: chosen,
    year: YEAR,
    sliders: SLIDERS,
    adversaryOc: ADVERSARY_OC,
    modelServedExternally: true,
    budgetFloorStates: FROM_NOTHING(data.blocks),
  });

  const ranked = data.chains
    .map((chain) => {
      const p = score.breachProbabilities[chain.id] ?? 0;
      const floor = score.residualFloors[chain.id] ?? 0;
      return { chain, p, floor, held: isHeldAtResidualFloor(p, floor) };
    })
    .sort((a, b) => b.p - a.p);

  const entries = Object.entries(score.categoryScores) as [Category, number][];
  const weakestCategory = entries.reduce((lo, e) => (e[1] < lo[1] ? e : lo))[0];

  return {
    sl: score.overallSl,
    categories: score.categoryScores,
    // The app's headline number: campaign success at the game's tier.
    breach: score.campaign,
    ranked,
    spentMillions: score.spentMillions,
    budgetExceeded: score.budgetExceededIds,
    dependencyUnmet: score.dependencyUnmetIds,
    dependencyUnmetRequires: score.dependencyUnmetRequires,
    effectiveStates: score.effectiveStates,
    weakestCategory,
  };
}

/** The game's baseline: nothing built. */
function FROM_NOTHING(blocks: Block[]): Record<string, BlockState> {
  const states: Record<string, BlockState> = {};
  for (const b of blocks) states[b.id] = "not_started";
  return states;
}
