import { useMemo, type KeyboardEvent, type MouseEvent } from "react";
import type { PostureScore } from "../../engine/posture";
import { useSimulationStore } from "../../store/simulation";
import { cachedScore, postureInput } from "../../store/derived";
import { useUiStore } from "../../store/ui";
import { bandIndex } from "../../model/words";

/**
 * The chip a click leaves at the block when it changes something you can
 * read: a new SL level first, else the lowest tier whose band word moved
 * ("OC3 −1 band" means one band toward "usually fails").
 */
export function changeChip(before: PostureScore, after: PostureScore): string | null {
  if (after.sl.level !== before.sl.level) return `SL${before.sl.level} → SL${after.sl.level}`;
  for (let i = 0; i < 5; i++) {
    const d = bandIndex(after.tiers[i].band) - bandIndex(before.tiers[i].band);
    if (d !== 0) return `OC${i + 1} ${d < 0 ? "−" : "+"}${Math.abs(d)} band`;
  }
  if (after.aiInsider.band !== before.aiInsider.band) {
    const d = bandIndex(after.aiInsider.band) - bandIndex(before.aiInsider.band);
    return `Own model ${d < 0 ? "−" : "+"}${Math.abs(d)} band`;
  }
  return null;
}

/** Click advances a block, right-click steps it back, a modifier-click or
 * the detail button opens its drawer. One implementation for both views. */
export function useBlockActions() {
  const stepBlockState = useSimulationStore((s) => s.stepBlockState);
  const openDetail = useUiStore((s) => s.openDetail);
  const noteChange = useUiStore((s) => s.noteChange);
  return useMemo(
    () => ({
      step(blockId: string, direction: 1 | -1) {
        const sim = useSimulationStore.getState();
        // A story owns the posture while it plays.
        if (sim.playbackActive) return;
        const before = cachedScore(postureInput(sim));
        stepBlockState(blockId, direction);
        const after = cachedScore(postureInput(useSimulationStore.getState()));
        noteChange(blockId, changeChip(before, after));
      },
      open(blockId: string) {
        openDetail(blockId);
      },
    }),
    [stepBlockState, openDetail, noteChange]
  );
}

/** Shared pointer/keyboard handlers for a block element. */
export function blockHandlers(
  id: string,
  actions: ReturnType<typeof useBlockActions>
): {
  onClick: (e: MouseEvent) => void;
  onContextMenu: (e: MouseEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
} {
  return {
    onClick: (e) => {
      if (e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) actions.open(id);
      else actions.step(id, 1);
    },
    onContextMenu: (e) => {
      e.preventDefault();
      actions.step(id, -1);
    },
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (e.shiftKey || e.altKey) actions.open(id);
        else actions.step(id, 1);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        actions.step(id, -1);
      } else if (e.key === "i" || e.key === "d") {
        e.preventDefault();
        actions.open(id);
      }
    },
  };
}
