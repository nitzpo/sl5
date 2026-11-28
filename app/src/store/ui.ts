import { create } from "zustand";

/** Which screen the main area shows. */
export type MainTab = "catalogue" | "approaches" | "race";
/** The catalogue's two layouts. */
export type CatalogueView = "matrix" | "clusters";

export interface BlockChange {
  blockId: string;
  /** Increments on every change, so the same block clicked twice re-animates. */
  seq: number;
  /** "−1 band" style chip when the click moved a tier's band word. */
  chip: string | null;
}

interface UiStore {
  tab: MainTab;
  catalogueView: CatalogueView;
  /** The block whose detail drawer is open. */
  detailId: string | null;
  paramsOpen: boolean;
  /** Draw every approach's path, not only the leading ones. */
  showAllApproaches: boolean;
  /** Blocks to ring in the catalogue (a hovered or clicked "next defense"). */
  highlightIds: string[];
  /** Pin one approach's path (a story beat or a click in the rail). */
  focusApproach: string | null;
  lastChange: BlockChange | null;

  setTab: (tab: MainTab) => void;
  setCatalogueView: (view: CatalogueView) => void;
  openDetail: (id: string | null) => void;
  setParamsOpen: (open: boolean) => void;
  toggleAllApproaches: () => void;
  setHighlight: (ids: string[]) => void;
  setFocusApproach: (id: string | null) => void;
  noteChange: (blockId: string, chip: string | null) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  tab: "catalogue",
  catalogueView: "matrix",
  detailId: null,
  paramsOpen: false,
  showAllApproaches: false,
  highlightIds: [],
  focusApproach: null,
  lastChange: null,

  setTab: (tab) => set({ tab }),
  setCatalogueView: (catalogueView) => set({ catalogueView, tab: "catalogue" }),
  openDetail: (detailId) => set(detailId ? { detailId, paramsOpen: false } : { detailId }),
  setParamsOpen: (paramsOpen) => set(paramsOpen ? { paramsOpen, detailId: null } : { paramsOpen }),
  toggleAllApproaches: () => set((s) => ({ showAllApproaches: !s.showAllApproaches })),
  setHighlight: (highlightIds) => set({ highlightIds }),
  setFocusApproach: (focusApproach) => set({ focusApproach }),
  noteChange: (blockId, chip) =>
    set((s) => ({ lastChange: { blockId, chip, seq: (s.lastChange?.seq ?? 0) + 1 } })),
}));
