import type { Block, BlockState } from "./types";

/**
 * Where labs actually start, as opposed to a bare field.
 *
 * Every block carries a researched `current_state.baseline_state`, but three of
 * its four values are not members of `BlockState` and so cannot be advancement
 * states. This maps them onto the cycle the app can actually represent.
 *
 * `partially_deployed` becomes `implementing` rather than getting a state of its
 * own. `implementing` is already the engine's universal "real but unfinished"
 * marker — `breach.ts` gives it half defense-in-depth credit, `dependencies.ts`
 * caps unmet prerequisites to it, and `budget.ts` caps what a program cannot
 * afford to it. A sixth state would mean re-answering all three of those
 * questions for a distinction worth 0.2 of effectiveness. The cost is that
 * `implementing` (0.4) understates the 0.6 the raw data implies, which errs
 * toward modelling labs as weaker than the research says — the safe direction
 * for a tool about how hard this is.
 *
 * The two "not a lab posture" values collapse to `not_started`:
 * `proven_not_deployed` means the technology is real and fielded elsewhere
 * (government, military) but no lab runs it, and `researching` means it is an
 * open problem. Neither is something a lab has.
 */
const BASELINE_TO_STATE: Record<string, BlockState> = {
  not_started: "not_started",
  researching: "not_started",
  proven_not_deployed: "not_started",
  partially_deployed: "implementing",
};

/**
 * One baseline, applied whenever a story starts.
 *
 * The data describes roughly 2026, while the scripted stories open in 2024, so
 * a 2024 start technically inherits a posture from two years later. That is a
 * deliberate call, not an oversight: the 2024–2026 delta on these blocks is
 * small next to the modelling error already in the baseline, and a per-year
 * table would double the review surface for a distinction users will not see.
 */
export function baselineStateFor(block: Block): BlockState {
  return BASELINE_TO_STATE[block.current_state?.baseline_state] ?? "not_started";
}

/** The starting posture for a whole catalogue, keyed by block id. */
export function baselineStates(blocks: Block[]): Record<string, BlockState> {
  const states: Record<string, BlockState> = {};
  for (const b of blocks) states[b.id] = baselineStateFor(b);
  return states;
}

/**
 * Blocks a lab already has are sunk cost, so they must not consume the budget a
 * player is deciding how to spend. Anything at or below its baseline is free;
 * advancing past it is what costs.
 */
export function isAtOrBelowBaseline(block: Block, state: BlockState): boolean {
  const order: BlockState[] = [
    "not_started",
    "investing",
    "implementing",
    "deployed",
    "mature",
  ];
  return order.indexOf(state) <= order.indexOf(baselineStateFor(block));
}
