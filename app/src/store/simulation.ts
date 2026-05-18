import { create } from "zustand";
import type {
  Block,
  BlockState,
  Perspective,
  Sliders,
  AttackChain,
} from "../engine/types";

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

export const useSimulationStore = create<SimulationStore>((set, get) => ({
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

  loadData: (blocks, chains) => {
    const baselineStates: Record<string, BlockState> = {};
    for (const b of blocks) {
      const bs = b.current_state.baseline_state;
      baselineStates[b.id] = STATE_CYCLE.includes(bs as BlockState)
        ? (bs as BlockState)
        : "not_started";
    }
    set({ blocks, attackChains: chains, blockStates: baselineStates, dataLoaded: true });
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

  resetToBaseline: () => {
    const { blocks } = get();
    const baselineStates: Record<string, BlockState> = {};
    for (const b of blocks) {
      const bs = b.current_state.baseline_state;
      baselineStates[b.id] = STATE_CYCLE.includes(bs as BlockState)
        ? (bs as BlockState)
        : "not_started";
    }
    set({
      blockStates: baselineStates,
      year: 2026,
      sliders: DEFAULT_SLIDERS,
      adversaryOc: 4,
      modelServedExternally: true,
    });
  },
}));
