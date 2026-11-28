import type { AttackChain, BlockState, Scenario } from "./types";

/**
 * Catalogue history: block ids that Phase 2 merged away, and where their state
 * went. Old share links and saved postures still name them; `persistence.ts`
 * maps them on load so those links open on the equivalent posture.
 *
 * AI-03 split across both halves of the inference-channel defence it was
 * absorbed into, so its state lifts both.
 */
export const LEGACY_BLOCK_IDS: Readonly<Record<string, readonly string[]>> = {
  "AI-03": ["AI-07", "AI-08"],
  "HW-10": ["HW-06"],
  "PER-07": ["PER-02"],
  "PER-05": ["PER-03"],
  "SC-02": ["SC-08"],
  "SC-05": ["SC-08"],
  "SC-06": ["SC-08"],
  "PHY-05": ["PHY-08"],
};

const STATE_ORDER: BlockState[] = ["not_started", "investing", "implementing", "deployed", "mature"];
const higher = (a: BlockState | undefined, b: BlockState): BlockState =>
  a !== undefined && STATE_ORDER.indexOf(a) >= STATE_ORDER.indexOf(b) ? a : b;

/** Map merged-away ids onto their successors. A successor takes the most
 * advanced of its own state and its predecessors'. Idempotent. */
export function migrateBlockStates(states: Record<string, BlockState>): Record<string, BlockState> {
  const out: Record<string, BlockState> = {};
  for (const [id, state] of Object.entries(states)) {
    if (!LEGACY_BLOCK_IDS[id]) out[id] = higher(out[id], state);
  }
  for (const [id, state] of Object.entries(states)) {
    for (const to of LEGACY_BLOCK_IDS[id] ?? []) out[to] = higher(out[to], state);
  }
  return out;
}

/** Map merged-away ids in a funding order onto their successors, keeping the
 * first position each successor appears at. Idempotent. */
export function migrateBlockOrder(order: string[]): string[] {
  const out: string[] = [];
  for (const id of order) {
    for (const to of LEGACY_BLOCK_IDS[id] ?? [id]) if (!out.includes(to)) out.push(to);
  }
  return out;
}

/**
 * COMPATIBILITY (Phase 2A → 2B): a scenario in the chain shape the pre-vector
 * UI still reads. `blocks_exploited` is the gaps its steps name, `stoppers`
 * its stopper list. Nothing in the engine scores this shape; the numbers the
 * UI shows next to it come from `scorePosture().scenarios`.
 */
export function scenarioAsChain(s: Scenario): AttackChain {
  const gaps = s.steps.map((st) => st.block_gap_used).filter((x): x is string => !!x);
  return {
    id: s.id,
    name: s.name,
    adversary_profile: s.adversary_profile,
    blocks_exploited: [...new Set(gaps)],
    narrative: {
      brief: s.narrative.brief,
      detailed: s.narrative.detailed,
      steps: s.steps.map((st) => ({
        phase: st.phase,
        description: st.description,
        ...(st.block_gap_used ? { block_gap_used: st.block_gap_used } : {}),
      })),
    },
    stoppers: s.stopper_details.map((d) => d.block_id),
    stopper_details: s.stopper_details,
    requires_external_serving: s.requires_external_serving,
  };
}
