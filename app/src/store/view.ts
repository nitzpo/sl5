import { create } from "zustand";

/** Toggleable badge / overlay layers. All on by default; not persisted. */
export type BadgeKey =
  | "startNow"     // decision-window "!" badge
  | "contested"    // uncertainty "?" badge
  | "overBudget"   // budget-exceeded dashed ring
  | "requires"     // dependency arcs: requires / enabled_by
  | "enhances"     // dependency arcs: enhances
  | "allRelations"; // draw every dependency edge dimmed at rest (not hover-only)

interface ViewStore {
  badges: Record<BadgeKey, boolean>;
  toggleBadge: (key: BadgeKey) => void;
}

export const useViewStore = create<ViewStore>((set) => ({
  badges: {
    startNow: true,
    contested: true,
    overBudget: true,
    requires: true,
    enhances: true,
    // Off by default: relations show on hover; turn this on to see the whole
    // dependency web at once (dimmed), still highlighting the hovered block.
    allRelations: false,
  },
  toggleBadge: (key) =>
    set((s) => ({ badges: { ...s.badges, [key]: !s.badges[key] } })),
}));
