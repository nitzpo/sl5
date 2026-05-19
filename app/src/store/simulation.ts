import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Block,
  BlockState,
  Perspective,
  Sliders,
  AttackChain,
} from "../engine/types";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  loadFromUrlHash,
  clearUrlHash,
  stateToShareUrl,
  clearLocalStorage,
  type PersistedState,
} from "./persistence";

interface SimulationStore {
  // Data (loaded once)
  blocks: Block[];
  attackChains: AttackChain[];
  dataLoaded: boolean;

  // User-controlled state
  blockStates: Record<string, BlockState>;
  year: number;
  perspective: Perspective;
  adversaryOc: number;
  sliders: Sliders;
  modelServedExternally: boolean;
  expertMode: boolean;
  selectedChainId: string | null;
  viewingShared: boolean;

  // Actions
  loadData: (blocks: Block[], chains: AttackChain[]) => void;
  setBlockState: (blockId: string, state: BlockState) => void;
  cycleBlockState: (blockId: string) => void;
  setYear: (year: number) => void;
  setPerspective: (perspective: Perspective) => void;
  setAdversaryOc: (oc: number) => void;
  setSlider: (key: keyof Sliders, value: number) => void;
  setModelServed: (served: boolean) => void;
  setExpertMode: (expert: boolean) => void;
  setSelectedChain: (chainId: string | null) => void;
  copyShareUrl: () => void;
  saveShared: () => void;
  restoreMine: () => void;
  resetToBaseline: () => void;
}

const STATE_CYCLE: BlockState[] = [
  "not_started",
  "investing",
  "implementing",
  "deployed",
  "mature",
];

const DEFAULT_SLIDERS: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.2,
  vendor_cooperation: 0.3,
  budget_millions: 200,
  org_transformation: 0.3,
  risk_tolerance: 0.5,
};

export const useSimulationStore = create<SimulationStore>()(subscribeWithSelector((set, get) => ({
  blocks: [],
  attackChains: [],
  dataLoaded: false,
  blockStates: {},
  year: 2026,
  perspective: "ciso",
  adversaryOc: 4,
  sliders: DEFAULT_SLIDERS,
  modelServedExternally: true,
  expertMode: false,
  selectedChainId: null,
  viewingShared: false,

  loadData: (blocks, chains) => {
    if (get().dataLoaded) return;

    const baselineStates: Record<string, BlockState> = {};
    for (const b of blocks) {
      const bs = b.current_state.baseline_state;
      baselineStates[b.id] = STATE_CYCLE.includes(bs as BlockState)
        ? (bs as BlockState)
        : "not_started";
    }

    // Restore: URL hash takes priority (shared link), then localStorage
    const fromUrl = loadFromUrlHash();
    if (fromUrl) {
      clearUrlHash();
      set({
        blocks,
        attackChains: chains,
        blockStates: fromUrl.blockStates,
        year: fromUrl.year,
        perspective: fromUrl.perspective,
        adversaryOc: fromUrl.adversaryOc,
        sliders: fromUrl.sliders,
        modelServedExternally: fromUrl.modelServedExternally,
        expertMode: fromUrl.expertMode,
        viewingShared: true,
        dataLoaded: true,
      });
      return;
    }

    const fromStorage = loadFromLocalStorage();
    if (fromStorage) {
      set({
        blocks,
        attackChains: chains,
        blockStates: fromStorage.blockStates,
        year: fromStorage.year,
        perspective: fromStorage.perspective,
        adversaryOc: fromStorage.adversaryOc,
        sliders: fromStorage.sliders,
        modelServedExternally: fromStorage.modelServedExternally,
        expertMode: fromStorage.expertMode,
        dataLoaded: true,
      });
    } else {
      set({ blocks, attackChains: chains, blockStates: baselineStates, dataLoaded: true });
    }
  },

  setBlockState: (blockId, state) => {
    set((s) => ({ blockStates: { ...s.blockStates, [blockId]: state } }));
  },

  cycleBlockState: (blockId) => {
    const current = get().blockStates[blockId] ?? "not_started";
    const idx = STATE_CYCLE.indexOf(current);
    const next = STATE_CYCLE[(idx + 1) % STATE_CYCLE.length];
    set((s) => ({ blockStates: { ...s.blockStates, [blockId]: next } }));
  },

  setYear: (year) => set({ year }),
  setPerspective: (perspective) => set({ perspective }),
  setAdversaryOc: (oc) => set({ adversaryOc: oc }),

  setSlider: (key, value) => {
    set((s) => ({ sliders: { ...s.sliders, [key]: value } }));
  },

  setModelServed: (served) => set({ modelServedExternally: served }),
  setExpertMode: (expert) => set({ expertMode: expert }),
  setSelectedChain: (chainId) => set({ selectedChainId: chainId }),

  copyShareUrl: () => {
    const s = get();
    const persisted: PersistedState = {
      blockStates: s.blockStates,
      year: s.year,
      perspective: s.perspective,
      adversaryOc: s.adversaryOc,
      sliders: s.sliders,
      modelServedExternally: s.modelServedExternally,
      expertMode: s.expertMode,
    };
    const url = stateToShareUrl(persisted);
    navigator.clipboard.writeText(url);
  },

  saveShared: () => {
    // Save current (shared) state to localStorage and dismiss banner
    const s = get();
    saveToLocalStorage({
      blockStates: s.blockStates,
      year: s.year,
      perspective: s.perspective,
      adversaryOc: s.adversaryOc,
      sliders: s.sliders,
      modelServedExternally: s.modelServedExternally,
      expertMode: s.expertMode,
    });
    set({ viewingShared: false });
  },

  restoreMine: () => {
    // Restore from localStorage (user's own saved state)
    const saved = loadFromLocalStorage();
    if (saved) {
      set({
        blockStates: saved.blockStates,
        year: saved.year,
        perspective: saved.perspective,
        adversaryOc: saved.adversaryOc,
        sliders: saved.sliders,
        modelServedExternally: saved.modelServedExternally,
        expertMode: saved.expertMode,
        viewingShared: false,
      });
    } else {
      get().resetToBaseline();
    }
  },

  resetToBaseline: () => {
    const { blocks } = get();
    const baselineStates: Record<string, BlockState> = {};
    for (const b of blocks) {
      const bs = b.current_state.baseline_state;
      baselineStates[b.id] = STATE_CYCLE.includes(bs as BlockState)
        ? (bs as BlockState)
        : "not_started";
    }
    clearLocalStorage();
    set({
      blockStates: baselineStates,
      year: 2026,
      sliders: DEFAULT_SLIDERS,
      adversaryOc: 4,
      modelServedExternally: true,
    });
  },
})));

// Auto-save to localStorage on state changes (skip when viewing shared)
useSimulationStore.subscribe(
  (s) => ({
    blockStates: s.blockStates,
    year: s.year,
    perspective: s.perspective,
    adversaryOc: s.adversaryOc,
    sliders: s.sliders,
    modelServedExternally: s.modelServedExternally,
    expertMode: s.expertMode,
  }),
  (persisted) => {
    const { dataLoaded, viewingShared } = useSimulationStore.getState();
    if (dataLoaded && !viewingShared) {
      saveToLocalStorage(persisted);
    }
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);
