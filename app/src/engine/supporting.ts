import type { AttackChain, Block } from "./types";

/**
 * Supporting defenses — the blocks that make a chain harder without being one of
 * its narrative steps.
 *
 * A chain names only its 3–5 steps, because that is what stays readable in the
 * UI. But a real attack also has to get past the rest of the defense family
 * around those steps: the Quiet Tap names PHY-01, yet PHY-03/04/05/06 (the rest
 * of `physical_facility`) plainly make that path harder too. Before this
 * existed, 28 of 47 blocks were inert — deploying them moved no number, and a
 * chain could be shut down by maturing just three blocks, which is what made
 * near-perfect defense far too cheap.
 *
 * Membership is DERIVED from `summary_group` rather than hand-authored per
 * chain: the grouping already encodes "same defense family", so a newly added
 * block wires itself in automatically and there is no parallel mapping to keep
 * in sync. Callers apply a reduced weight — supporting blocks harden a chain,
 * they don't become steps you read in the story.
 *
 * This module is deliberately dependency-free so both `breach.ts` (which counts
 * supporting blocks in the probability product) and `scoring.ts` (which counts
 * them as threat-relevant for SL) can import it without a cycle.
 */

/** Groups with no chain-named block of their own, attached to the chain they
 * plainly bear on. `supply_chain_integrity` is the whole subject of the Poisoned
 * Chip, so those blocks should not be inert. (`ai_defense_testing` is left
 * unattached — it hardens defenses generally rather than any one path.) */
const EXTRA_GROUP_CHAINS: Record<string, string[]> = {
  supply_chain_integrity: ["poisoned-chip"],
};

export function supportingBlocks(chain: AttackChain, allBlocks: Block[]): Block[] {
  const named = new Set<string>([...chain.blocks_exploited, ...(chain.stoppers ?? [])]);
  const groups = new Set<string>();
  for (const block of allBlocks) {
    if (named.has(block.id) && block.summary_group) groups.add(block.summary_group);
  }
  for (const [group, chainIds] of Object.entries(EXTRA_GROUP_CHAINS)) {
    if (chainIds.includes(chain.id)) groups.add(group);
  }
  return allBlocks.filter(
    (b) => !named.has(b.id) && b.summary_group !== undefined && groups.has(b.summary_group)
  );
}
