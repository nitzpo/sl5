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
 * The starting posture, as of `year`.
 *
 * Most of these controls are long-standing practice — mantraps and enterprise
 * VPNs did not appear recently — so the baseline is treated as static and the
 * `year` changes nothing. But eight blocks became partially deployed on public,
 * datable evidence: egress bandwidth controls and two-party weight
 * authorization in 2025, the LLM supervisor and production classifiers in 2026,
 * and so on. Those carry `baseline_since`, and before that year they were
 * genuinely `not_started`.
 *
 * This is what keeps a 2024 story from opening on a 2026 posture. It is
 * deliberately partial: only blocks whose arrival can be pinned to a public
 * disclosure are dated, because inventing a year for the rest would be
 * precision the evidence does not support.
 */
export function baselineStateFor(block: Block, year?: number): BlockState {
  const cs = block.current_state;
  const mapped = BASELINE_TO_STATE[cs?.baseline_state] ?? "not_started";
  if (mapped === "not_started" || year === undefined) return mapped;
  const since = cs?.baseline_since;
  if (typeof since === "number" && year < since) return "not_started";
  return mapped;
}

/** The starting posture for a whole catalogue, keyed by block id. */
export function baselineStates(
  blocks: Block[],
  year?: number
): Record<string, BlockState> {
  const states: Record<string, BlockState> = {};
  for (const b of blocks) states[b.id] = baselineStateFor(b, year);
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
