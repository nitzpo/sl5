import type { Block, BlockState } from "./types";

const SATISFIED: ReadonlySet<string> = new Set(["deployed", "mature"]);

/**
 * Enforce hard `requires` dependencies: a block claiming deployed/mature while
 * a prerequisite is not operationally in place is capped at "implementing" —
 * you can build it, but it can't fully function yet.
 *
 * Runs to fixpoint so caps cascade: if A requires B and B just got capped
 * (missing prerequisite, or over budget upstream), A is capped too.
 * `enhances`/`enabled_by` remain soft, narrative-only relationships.
 */
export function applyDependencyConstraint(
  blocks: Block[],
  blockStates: Record<string, BlockState>
): { effectiveStates: Record<string, BlockState>; unmetIds: Set<string> } {
  const blockIds = new Set(blocks.map((b) => b.id));
  const states: Record<string, BlockState> = { ...blockStates };
  const unmetIds = new Set<string>();

  let changed = true;
  let guard = blocks.length + 1;
  while (changed && guard-- > 0) {
    changed = false;
    for (const block of blocks) {
      const state = states[block.id] ?? "not_started";
      if (!SATISFIED.has(state)) continue;
      const requires = (block.dependencies?.requires ?? []).filter((id) =>
        blockIds.has(id)
      );
      const unmet = requires.some((id) => !SATISFIED.has(states[id] ?? "not_started"));
      if (unmet) {
        states[block.id] = "implementing";
        unmetIds.add(block.id);
        changed = true;
      }
    }
  }

  if (unmetIds.size === 0) return { effectiveStates: blockStates, unmetIds };
  return { effectiveStates: states, unmetIds };
}
