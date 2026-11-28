// The budget mini-game's rules and arithmetic, with no React in it.
//
// The reader starts where a typical frontier lab is today (the instrument's
// researched starting posture), gets one year and a fixed budget, and picks
// defenses. What they see is which attacker tiers they now usually stop, in
// words, and the security level with its bar toward the next one.
//
// Every number is `scorePosture`, the pipeline the instrument runs: budget
// (funded in pick order, unfunded blocks stay at the lab's baseline), then
// prerequisites (a block whose `requires` isn't running is capped at
// implementing), then the vector model at every tier. The price is the same
// `blockCostBasis` the instrument's budget line charges.

import { blockCostBasis } from "../engine/budget";
import { baselineStates, baselineStateFor } from "../engine/baseline";
import { scorePosture, type PostureScore } from "../engine/posture";
import { SL_BAR_PRESETS } from "../engine/threat-sl";
import type { Block, BlockState, Sliders } from "../engine/types";
import type { ThreatData } from "./data";
import { APPROACH_LABEL, STAGE_LABEL, shortVectorName, stopsInWords } from "./engine-views";

/** One year's money. Enough for most of the shortlist, not all of it, so the
 * order of picks and the choice between one big structural buy and several
 * cheap ones both matter. */
export const BUDGET_MILLIONS = 150;
export const YEAR = 2026;
/** Kept off the public API in this exercise: serving the model adds an
 * approach of its own, which the reader meets in the instrument. */
export const SERVED = false;

/**
 * The ten defenses on offer. Chosen, against the shipped data, so that
 * choices matter (all asserted by `tests/intro/posture-game.test.ts`):
 *
 *  - Starting from today's typical lab (SL1: OC1 usually fails, OC2 contested),
 *    the right picks within the budget reach SL2 and push OC3 to contested;
 *    most picks don't. The headline moves in words, not near "usually
 *    succeeds" for everything.
 *  - The list costs well over the budget, and every block fits on its own.
 *  - Two prerequisite pairs are on the list (DEC-01 needs DET-01 running;
 *    PER-06 and PER-02 need PER-01), so a pick in the wrong order is capped,
 *    and the fix is on the board.
 *  - The air gap is the tempting big buy: a third of the year's money for one
 *    hard stop that helps, but less than spending the same money across
 *    approaches.
 *  - Five of them start partly in place at a typical lab, so the reader sees
 *    the state fill as well as the shape.
 */
export const SHORTLIST = [
  "DET-01", // Security operations and incident response — probabilistic
  "DEC-01", // Deception and attribution — needs DET-01 running
  "IAM-01", // Phishing-resistant identity — hybrid
  "END-01", // Patch and endpoint management — hybrid
  "NET-01", // Air gap — hard stop, the big buy
  "PER-01", // Sensitivity levels framework — the prerequisite
  "PER-06", // Dual authorization — needs PER-01
  "PER-02", // Two-person integrity — needs PER-01
  "CUS-01", // Weight custody
  "PHY-03", // Mantraps
] as const;

/** The world held still underneath the reader: neutral cooperation, the
 * standard bar, the default AI pace. The game is about the budget. */
export const SLIDERS: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.5,
  vendor_cooperation: 0.5,
  budget_millions: BUDGET_MILLIONS,
  org_transformation: 0.5,
  risk_tolerance: 0.5,
  sl_bar: SL_BAR_PRESETS.standard,
  ai_propensity: 0.5,
};

/** What the game charges for a block: the instrument's planning cost at the
 * same risk tolerance. */
export function costOf(block: Block): number {
  return blockCostBasis(block, SLIDERS.risk_tolerance);
}

/** True when a typical lab already runs part of this (sunk cost: only
 * advancing it past that costs money). */
export function startsPartlyInPlace(block: Block): boolean {
  return baselineStateFor(block) !== "not_started";
}

export interface GameResult {
  score: PostureScore;
  /** What each block counts as after the budget and prerequisite caps. */
  effectiveStates: Record<string, BlockState>;
  spentMillions: number;
  budgetExceeded: Set<string>;
  dependencyUnmet: Set<string>;
  dependencyUnmetRequires: Map<string, string[]>;
  /** "OC1 and OC2" — the headline. */
  stops: string;
  /** The next tier up, its band and its easiest approach and path, in words.
   * Null at SL5. */
  stillGetsThrough: { tier: number; band: string; approach: string; path: string[] } | null;
}

/**
 * Score one posture. `chosen` is the reader's pick order, which is also the
 * funding order, as in the instrument: the first pick is paid for first, so a
 * later pick can only ever cap itself.
 */
export function evaluatePosture(data: ThreatData, chosen: string[], year = YEAR): GameResult {
  const states = baselineStates(data.blocks);
  for (const id of chosen) states[id] = "deployed";

  const score = scorePosture({
    blocks: data.blocks,
    model: data.model,
    blockStates: states,
    advanceOrder: chosen,
    year,
    sliders: SLIDERS,
    adversaryOc: 4,
    modelServedExternally: SERVED,
  });

  const names = new Map(data.model.vectors.map((v) => [v.id, v.name]));
  const limit = score.sl.limitedBy;
  const stillGetsThrough = limit
    ? {
        tier: limit.tier,
        band: score.tiers[limit.tier - 1].band,
        approach: APPROACH_LABEL[limit.approach ?? ""] ?? limit.approach ?? "",
        path: limit.path.map(
          (s) => `${STAGE_LABEL[s.stage]}: ${shortVectorName(names.get(s.vectorId) ?? s.vectorId)}`
        ),
      }
    : null;

  return {
    score,
    effectiveStates: score.effectiveStates,
    spentMillions: score.spentMillions,
    budgetExceeded: score.budgetExceededIds,
    dependencyUnmet: score.dependencyUnmetIds,
    dependencyUnmetRequires: score.dependencyUnmetRequires,
    stops: stopsInWords(score.sl.level),
    stillGetsThrough,
  };
}
