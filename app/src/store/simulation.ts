import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Block,
  BlockState,
  Perspective,
  Sliders,
  AttackChain,
  OcDefinition,
} from "../engine/types";
import { baselineStates } from "../engine/baseline";
import { TIMELINE_REFERENCE } from "../utils/timeline";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  loadFromUrlHash,
  clearUrlHash,
  stateToShareUrl,
  clearLocalStorage,
  loadScenarios,
  saveScenarios,
  type PersistedState,
} from "./persistence";

interface SimulationStore {
  // Data (loaded once)
  blocks: Block[];
  attackChains: AttackChain[];
  ocDefinitions: OcDefinition[];
  dataLoaded: boolean;

  // User-controlled state
  blockStates: Record<string, BlockState>;
  /** Block ids in the order they were advanced from not_started — the budget
   * engine funds in this order so a newly-activated block can only cap itself. */
  advanceOrder: string[];
  year: number;
  perspective: Perspective;
  adversaryOc: number;
  sliders: Sliders;
  modelServedExternally: boolean;
  selectedChainId: string | null;
  viewingShared: boolean;
  playbackActive: boolean;
  scenarioName: string | null;

  // Actions
  loadData: (blocks: Block[], chains: AttackChain[], ocDefinitions?: OcDefinition[]) => void;
  setBlockState: (blockId: string, state: BlockState) => void;
  cycleBlockState: (blockId: string) => void;
  setYear: (year: number) => void;
  setPerspective: (perspective: Perspective) => void;
  setAdversaryOc: (oc: number) => void;
  setSlider: (key: keyof Sliders, value: number) => void;
  setModelServed: (served: boolean) => void;
  setPlaybackActive: (active: boolean) => void;
  setSelectedChain: (chainId: string | null) => void;
  copyShareUrl: () => void;
  saveShared: () => void;
  restoreMine: () => void;
  resetToBaseline: () => void;
  saveScenario: (name: string) => void;
  loadScenario: (index: number) => void;
  deleteScenario: (index: number) => void;
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

/** Keep the advancement order in sync with a single block-state change. */
function orderWith(order: string[], blockId: string, nextState: BlockState): string[] {
  const active = nextState !== "not_started";
  const has = order.includes(blockId);
  if (active && !has) return [...order, blockId];
  if (!active && has) return order.filter((id) => id !== blockId);
  return order;
}

/** Fallback for persisted states that predate advanceOrder. */
function deriveOrder(blockStates: Record<string, BlockState>): string[] {
  return Object.keys(blockStates).filter((id) => blockStates[id] !== "not_started");
}

/**
 * The starting posture. Previously this coerced anything outside `STATE_CYCLE`
 * to `not_started`, which threw away the researched baseline on more than half
 * the catalogue and opened every session on a bare field. See
 * `engine/baseline.ts` for why `partially_deployed` maps onto `implementing`
 * rather than becoming a state of its own.
 */
const baselineStatesFor = baselineStates;

export const useSimulationStore = create<SimulationStore>()(subscribeWithSelector((set, get) => ({
  blocks: [],
  attackChains: [],
  ocDefinitions: [],
  dataLoaded: false,
  blockStates: {},
  advanceOrder: [],
  year: TIMELINE_REFERENCE,
  perspective: "ciso",
  adversaryOc: 4,
  sliders: DEFAULT_SLIDERS,
  modelServedExternally: true,
  selectedChainId: null,
  viewingShared: false,
  playbackActive: false,
  scenarioName: null,

  loadData: (blocks, chains, ocDefinitions = []) => {
    if (get().dataLoaded) return;

    const baselineStates = baselineStatesFor(blocks);
    set({ ocDefinitions });

    // Restore: URL hash takes priority (shared link), then localStorage
    const fromUrl = loadFromUrlHash();
    if (fromUrl) {
      clearUrlHash();
      set({
        blocks,
        attackChains: chains,
        blockStates: fromUrl.state.blockStates,
        advanceOrder: fromUrl.state.advanceOrder ?? deriveOrder(fromUrl.state.blockStates),
        year: fromUrl.state.year,
        perspective: fromUrl.state.perspective,
        adversaryOc: fromUrl.state.adversaryOc,
        sliders: fromUrl.state.sliders,
        modelServedExternally: fromUrl.state.modelServedExternally,
        scenarioName: fromUrl.name ?? null,
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
        advanceOrder: fromStorage.advanceOrder ?? deriveOrder(fromStorage.blockStates),
        year: fromStorage.year,
        perspective: fromStorage.perspective,
        adversaryOc: fromStorage.adversaryOc,
        sliders: fromStorage.sliders,
        modelServedExternally: fromStorage.modelServedExternally,
        dataLoaded: true,
      });
    } else {
      set({
        blocks,
        attackChains: chains,
        blockStates: baselineStates,
        advanceOrder: deriveOrder(baselineStates),
        dataLoaded: true,
      });
    }
  },

  setBlockState: (blockId, state) => {
    set((s) => ({
      blockStates: { ...s.blockStates, [blockId]: state },
      advanceOrder: orderWith(s.advanceOrder, blockId, state),
      scenarioName: null,
    }));
  },

  cycleBlockState: (blockId) => {
    const current = get().blockStates[blockId] ?? "not_started";
    const idx = STATE_CYCLE.indexOf(current);
    const next = STATE_CYCLE[(idx + 1) % STATE_CYCLE.length];
    set((s) => ({
      blockStates: { ...s.blockStates, [blockId]: next },
      advanceOrder: orderWith(s.advanceOrder, blockId, next),
      scenarioName: null,
    }));
  },

  setYear: (year) => set({ year, scenarioName: null }),
  setPerspective: (perspective) => set({ perspective }),
  setAdversaryOc: (oc) => set({ adversaryOc: oc, scenarioName: null }),

  setSlider: (key, value) => {
    set((s) => ({ sliders: { ...s.sliders, [key]: value }, scenarioName: null }));
  },

  setModelServed: (served) => set({ modelServedExternally: served, scenarioName: null }),
  setPlaybackActive: (active) => set({ playbackActive: active }),
  setSelectedChain: (chainId) => set({ selectedChainId: chainId }),

  copyShareUrl: () => {
    const s = get();
    const persisted: PersistedState = {
      blockStates: s.blockStates,
      advanceOrder: s.advanceOrder,
      // Whole years in shared and saved payloads. The store carries a monthly
      // year so playback can move smoothly, but "2027" is what someone means
      // when they share a posture — nobody means March.
      year: Math.round(s.year),
      perspective: s.perspective,
      adversaryOc: s.adversaryOc,
      sliders: s.sliders,
      modelServedExternally: s.modelServedExternally,
    };
    const url = stateToShareUrl(persisted, s.scenarioName ?? undefined);
    navigator.clipboard.writeText(url);
  },

  saveShared: () => {
    const s = get();
    const persisted: PersistedState = {
      blockStates: s.blockStates,
      advanceOrder: s.advanceOrder,
      year: s.year,
      perspective: s.perspective,
      adversaryOc: s.adversaryOc,
      sliders: s.sliders,
      modelServedExternally: s.modelServedExternally,
    };
    saveToLocalStorage(persisted);
    if (s.scenarioName) {
      const scenarios = loadScenarios();
      scenarios.push({ name: s.scenarioName, savedAt: Date.now(), state: persisted });
      saveScenarios(scenarios);
    }
    set({ viewingShared: false });
  },

  restoreMine: () => {
    // Restore from localStorage (user's own saved state)
    const saved = loadFromLocalStorage();
    if (saved) {
      set({
        blockStates: saved.blockStates,
        advanceOrder: saved.advanceOrder ?? deriveOrder(saved.blockStates),
        year: saved.year,
        perspective: saved.perspective,
        adversaryOc: saved.adversaryOc,
        sliders: saved.sliders,
        modelServedExternally: saved.modelServedExternally,
        viewingShared: false,
      });
    } else {
      get().resetToBaseline();
    }
  },

  resetToBaseline: () => {
    const { blocks } = get();
    const baselineStates = baselineStatesFor(blocks);
    clearLocalStorage();
    set({
      blockStates: baselineStates,
      advanceOrder: deriveOrder(baselineStates),
      year: TIMELINE_REFERENCE,
      sliders: DEFAULT_SLIDERS,
      adversaryOc: 4,
      modelServedExternally: true,
      scenarioName: null,
    });
  },

  saveScenario: (name) => {
    const s = get();
    const scenarios = loadScenarios();
    const entry = {
      name,
      savedAt: Date.now(),
      state: {
        blockStates: s.blockStates,
        advanceOrder: s.advanceOrder,
        year: Math.round(s.year),
        perspective: s.perspective,
        adversaryOc: s.adversaryOc,
        sliders: s.sliders,
        modelServedExternally: s.modelServedExternally,
      },
    };
    const existing = scenarios.findIndex((sc) => sc.name === name);
    if (existing >= 0) {
      scenarios[existing] = entry;
    } else {
      scenarios.push(entry);
    }
    saveScenarios(scenarios);
    set({ scenarioName: name });
  },

  loadScenario: (index) => {
    const scenarios = loadScenarios();
    const scenario = scenarios[index];
    if (!scenario) return;
    set({
      blockStates: scenario.state.blockStates,
      advanceOrder: scenario.state.advanceOrder ?? deriveOrder(scenario.state.blockStates),
      year: scenario.state.year,
      perspective: scenario.state.perspective,
      adversaryOc: scenario.state.adversaryOc,
      sliders: scenario.state.sliders,
      modelServedExternally: scenario.state.modelServedExternally,
      scenarioName: scenario.name,
      viewingShared: false,
    });
  },

  deleteScenario: (index) => {
    const scenarios = loadScenarios();
    scenarios.splice(index, 1);
    saveScenarios(scenarios);
  },
})));

// Auto-save to localStorage on state changes (skip when viewing shared or during playback)
useSimulationStore.subscribe(
  (s) => ({
    blockStates: s.blockStates,
    advanceOrder: s.advanceOrder,
    year: s.year,
    perspective: s.perspective,
    adversaryOc: s.adversaryOc,
    sliders: s.sliders,
    modelServedExternally: s.modelServedExternally,
  }),
  (persisted) => {
    const { dataLoaded, viewingShared, playbackActive } = useSimulationStore.getState();
    if (dataLoaded && !viewingShared && !playbackActive) {
      saveToLocalStorage(persisted);
    }
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);
