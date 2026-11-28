import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Block, BlockState, Sliders, OcDefinition, ThreatModel } from "../engine/types";
import { baselineStates, isAtOrBelowBaseline } from "../engine/baseline";
import { DEFAULT_AI_PROPENSITY, DEFAULT_SL_BAR } from "../engine/threat-sl";
import { TIMELINE_REFERENCE } from "../utils/timeline";
import { DEFAULT_SCORING_MODE, type ScoringMode } from "../model/scoring-mode";
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
// A cycle (the playback store drives this one), but only ever read inside
// actions, never while either module is still evaluating.
import { usePlaybackStore } from "../timelapse/playback-store";

interface SimulationStore {
  // Data (loaded once)
  blocks: Block[];
  /** Vectors, approaches and scenarios: everything the engine scores. */
  threatModel: ThreatModel;
  ocDefinitions: OcDefinition[];
  dataLoaded: boolean;

  // User-controlled state
  blockStates: Record<string, BlockState>;
  /** Block ids in the order they were advanced from not_started — the budget
   * engine funds in this order so a newly-activated block can only cap itself. */
  advanceOrder: string[];
  year: number;
  adversaryOc: number;
  sliders: Sliders;
  modelServedExternally: boolean;
  /** World toggle: count the FUT-xx future-capability blocks (default off). */
  futureCapabilities: boolean;
  /** How the headline level is scored: attack paths (default) or v1-style
   * control coverage. Saved and shared with the posture; a story pins paths. */
  scoringMode: ScoringMode;
  viewingShared: boolean;
  playbackActive: boolean;
  scenarioName: string | null;

  // Actions
  loadData: (blocks: Block[], model: ThreatModel, ocDefinitions?: OcDefinition[]) => void;
  setBlockState: (blockId: string, state: BlockState) => void;
  /** Step a block one state forward or back, stopping at mature and not started. */
  stepBlockState: (blockId: string, direction: 1 | -1) => void;
  setYear: (year: number) => void;
  setAdversaryOc: (oc: number) => void;
  setSlider: (key: keyof Sliders, value: number) => void;
  setModelServed: (served: boolean) => void;
  setFutureCapabilities: (on: boolean) => void;
  setScoringMode: (mode: ScoringMode) => void;
  setPlaybackActive: (active: boolean) => void;
  /** Replace the posture and world with a saved or shared one. Low level: it
   * leaves a running story alone, so it is for the playback store's own
   * restore; anything a reader triggers goes through an action that ends the
   * story first (`openShared`, `restoreMine`, ...). */
  applyPersisted: (state: PersistedState, extra?: Partial<Pick<SimulationStore, "scenarioName" | "viewingShared">>) => void;
  /** Open a share link pasted into this tab. */
  openShared: (state: PersistedState, name?: string) => void;
  copyShareUrl: () => string;
  saveShared: () => void;
  restoreMine: () => void;
  resetToBaseline: () => void;
  saveScenario: (name: string) => void;
  loadScenario: (index: number) => void;
  deleteScenario: (index: number) => void;
}

export const STATE_CYCLE: BlockState[] = ["not_started", "investing", "implementing", "deployed", "mature"];

export const DEFAULT_SLIDERS: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.2,
  vendor_cooperation: 0.3,
  budget_millions: 200,
  org_transformation: 0.3,
  risk_tolerance: 0.5,
  sl_bar: DEFAULT_SL_BAR,
  ai_propensity: DEFAULT_AI_PROPENSITY,
};

const EMPTY_MODEL: ThreatModel = { vectors: [], approaches: [], scenarios: [] };

/** Keep the advancement order in sync with a single block-state change.
 *
 * A block that crosses its baseline — from a state the lab already runs for
 * free to one it has to pay for — moves to the END of the order, because that
 * is the moment it joins the funding queue. Baseline blocks are seeded into the
 * order at load, so without this, advancing one past its baseline would queue
 * it ahead of every later purchase and could unfund one of them: exactly the
 * "a new block evicts an earlier commitment" failure the order exists to rule
 * out. */
function orderWith(
  order: string[],
  block: Block | undefined,
  blockId: string,
  prevState: BlockState,
  nextState: BlockState
): string[] {
  const active = nextState !== "not_started";
  const has = order.includes(blockId);
  if (!active) return has ? order.filter((id) => id !== blockId) : order;
  const startsCosting =
    !!block && !isAtOrBelowBaseline(block, nextState) && isAtOrBelowBaseline(block, prevState);
  if (has && startsCosting) return [...order.filter((id) => id !== blockId), blockId];
  if (!has) return [...order, blockId];
  return order;
}

/** Fallback for persisted states that predate advanceOrder. */
export function deriveOrder(blockStates: Record<string, BlockState>): string[] {
  return Object.keys(blockStates).filter((id) => blockStates[id] !== "not_started");
}

type Snapshot = Pick<
  SimulationStore,
  | "blockStates"
  | "advanceOrder"
  | "year"
  | "adversaryOc"
  | "sliders"
  | "modelServedExternally"
  | "futureCapabilities"
  | "scoringMode"
>;

/** What a save, a share link or a named posture records. Whole years: the
 * store carries a monthly year so playback can move smoothly, but "2027" is
 * what someone means when they share a posture — nobody means March. */
function persistedOf(s: Snapshot): PersistedState {
  return {
    blockStates: s.blockStates,
    advanceOrder: s.advanceOrder,
    year: Math.round(s.year),
    adversaryOc: s.adversaryOc,
    sliders: s.sliders,
    modelServedExternally: s.modelServedExternally,
    futureCapabilities: s.futureCapabilities,
    scoringMode: s.scoringMode,
  };
}

/** A saved or shared posture as store state. Blocks added to the catalogue
 * since it was made are not in it, and they open at their baseline, as on a
 * fresh start: read as `not_started`, a v1 link would lose the identity,
 * patching and detection the lab already runs and score below the real-world
 * posture it was made on. The UNDATED baseline, the one a fresh posture and the
 * budget's sunk-cost rule both use. */
function snapshotFrom(state: PersistedState, blocks: Block[]): Snapshot {
  const blockStates = { ...baselineStates(blocks), ...state.blockStates };
  return {
    blockStates,
    advanceOrder: state.advanceOrder ?? deriveOrder(blockStates),
    year: state.year,
    adversaryOc: state.adversaryOc,
    sliders: state.sliders,
    modelServedExternally: state.modelServedExternally,
    futureCapabilities: state.futureCapabilities ?? false,
    scoringMode: state.scoringMode ?? DEFAULT_SCORING_MODE,
  };
}

/** End a running story before an action that saves or replaces the posture.
 * Stopping puts back what the reader had — their posture, their world, and
 * whether it was a shared link they were viewing — so "Keep this as mine",
 * "Back to mine", loading or saving a named posture, a reset and a pasted link
 * all act on that, never on a story frame. */
function endStory() {
  if (usePlaybackStore.getState().state !== "idle" || useSimulationStore.getState().playbackActive) {
    usePlaybackStore.getState().stop();
  }
}

export const useSimulationStore = create<SimulationStore>()(subscribeWithSelector((set, get) => ({
  blocks: [],
  threatModel: EMPTY_MODEL,
  ocDefinitions: [],
  dataLoaded: false,
  blockStates: {},
  advanceOrder: [],
  year: TIMELINE_REFERENCE,
  adversaryOc: 4,
  sliders: DEFAULT_SLIDERS,
  modelServedExternally: true,
  futureCapabilities: false,
  scoringMode: DEFAULT_SCORING_MODE,
  viewingShared: false,
  playbackActive: false,
  scenarioName: null,

  loadData: (blocks, model, ocDefinitions = []) => {
    if (get().dataLoaded) return;
    set({ ocDefinitions, threatModel: model, blocks });

    // Restore: URL hash takes priority (shared link), then localStorage.
    const fromUrl = loadFromUrlHash();
    if (fromUrl) {
      clearUrlHash();
      set({ ...snapshotFrom(fromUrl.state, blocks), scenarioName: fromUrl.name ?? null, viewingShared: true, dataLoaded: true });
      return;
    }
    const fromStorage = loadFromLocalStorage();
    if (fromStorage) {
      set({ ...snapshotFrom(fromStorage, blocks), dataLoaded: true });
      return;
    }
    // The starting posture: each block's researched baseline (see
    // `engine/baseline.ts`), not a bare field.
    const states = baselineStates(blocks);
    set({ blockStates: states, advanceOrder: deriveOrder(states), dataLoaded: true });
  },

  setBlockState: (blockId, state) => {
    set((s) => ({
      blockStates: { ...s.blockStates, [blockId]: state },
      advanceOrder: orderWith(
        s.advanceOrder,
        s.blocks.find((b) => b.id === blockId),
        blockId,
        s.blockStates[blockId] ?? "not_started",
        state
      ),
      scenarioName: null,
    }));
  },

  stepBlockState: (blockId, direction) => {
    const current = get().blockStates[blockId] ?? "not_started";
    const idx = STATE_CYCLE.indexOf(current);
    // Clamped at both ends: a click on a mature block does nothing rather than
    // wrapping it back to not started, which would read as an accident.
    const next = STATE_CYCLE[Math.min(STATE_CYCLE.length - 1, Math.max(0, idx + direction))];
    if (next !== current) get().setBlockState(blockId, next);
  },

  setYear: (year) => set({ year, scenarioName: null }),
  setAdversaryOc: (oc) => set({ adversaryOc: oc, scenarioName: null }),
  setSlider: (key, value) => set((s) => ({ sliders: { ...s.sliders, [key]: value }, scenarioName: null })),
  setModelServed: (served) => set({ modelServedExternally: served, scenarioName: null }),
  setFutureCapabilities: (on) => set({ futureCapabilities: on, scenarioName: null }),
  // Not a change to the posture, so a named posture keeps its name: the mode
  // is the lens it is read through.
  setScoringMode: (scoringMode) => set({ scoringMode }),
  setPlaybackActive: (active) => set({ playbackActive: active }),

  applyPersisted: (state, extra = {}) => set({ ...snapshotFrom(state, get().blocks), ...extra }),

  openShared: (state, name) => {
    endStory();
    get().applyPersisted(state, { scenarioName: name ?? null, viewingShared: true });
  },

  copyShareUrl: () => {
    const s = get();
    const url = stateToShareUrl(persistedOf(s), s.scenarioName ?? undefined);
    navigator.clipboard?.writeText(url).catch(() => {});
    return url;
  },

  saveShared: () => {
    endStory();
    const s = get();
    const persisted = persistedOf(s);
    saveToLocalStorage(persisted);
    if (s.scenarioName) {
      const scenarios = loadScenarios();
      scenarios.push({ name: s.scenarioName, savedAt: Date.now(), state: persisted });
      saveScenarios(scenarios);
    }
    set({ viewingShared: false });
  },

  restoreMine: () => {
    endStory();
    const saved = loadFromLocalStorage();
    if (saved) set({ ...snapshotFrom(saved, get().blocks), viewingShared: false });
    else get().resetToBaseline();
  },

  resetToBaseline: () => {
    endStory();
    const states = baselineStates(get().blocks);
    clearLocalStorage();
    // The scoring mode is the reader's lens, not part of the real-world
    // posture, so a reset keeps it.
    set({
      blockStates: states,
      advanceOrder: deriveOrder(states),
      year: TIMELINE_REFERENCE,
      sliders: DEFAULT_SLIDERS,
      adversaryOc: 4,
      modelServedExternally: true,
      futureCapabilities: false,
      scenarioName: null,
      viewingShared: false,
    });
    // A fresh start opens in the default mode, so a reader on another one
    // keeps it by saving: the auto-save skips a reset that changed nothing else.
    if (get().scoringMode !== DEFAULT_SCORING_MODE) saveToLocalStorage(persistedOf(get()));
  },

  saveScenario: (name) => {
    endStory();
    const scenarios = loadScenarios();
    const entry = { name, savedAt: Date.now(), state: persistedOf(get()) };
    const existing = scenarios.findIndex((sc) => sc.name === name);
    if (existing >= 0) scenarios[existing] = entry;
    else scenarios.push(entry);
    saveScenarios(scenarios);
    set({ scenarioName: name });
  },

  loadScenario: (index) => {
    const scenario = loadScenarios()[index];
    if (!scenario) return;
    endStory();
    set({ ...snapshotFrom(scenario.state, get().blocks), scenarioName: scenario.name, viewingShared: false });
  },

  deleteScenario: (index) => {
    const scenarios = loadScenarios();
    scenarios.splice(index, 1);
    saveScenarios(scenarios);
  },
})));

// Auto-save to localStorage on state changes (skip when viewing shared or during playback)
useSimulationStore.subscribe(
  (s) => persistedOf(s),
  (persisted) => {
    const { dataLoaded, viewingShared, playbackActive } = useSimulationStore.getState();
    if (dataLoaded && !viewingShared && !playbackActive) saveToLocalStorage(persisted);
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);
