import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { PersistedState } from "../store/persistence";
import type { BlockState } from "../engine/types";
import type { TimeLapseScript, PlaybackSpeed, PlaybackState } from "./types";
import { useSimulationStore } from "../store/simulation";
import { computeScriptBlockStates } from "./compute-script-state";
import { adjacentStop } from "./events";
import { TIMELINE_START, TIMELINE_END, quantizeYear } from "../utils/timeline";

interface PlaybackStore {
  state: PlaybackState;
  speed: PlaybackSpeed;
  activeScript: TimeLapseScript | null;
  playbackT: number;
  savedUserState: PersistedState | null;
  currentAnnotation: string | null;

  startScript: (script: TimeLapseScript) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  stepForward: () => void;
  stepBack: () => void;
  setPlaybackT: (t: number) => void;
  setAnnotation: (msg: string | null) => void;
}

/** The latest annotation whose atYear has been reached at time t, or null.
 * Picks the max atYear ≤ currentYear so it holds even if annotations are
 * not stored in chronological order. */
function annotationAtT(t: number, script: TimeLapseScript): string | null {
  const startYear = script.startYear ?? TIMELINE_START;
  const currentYear = startYear + t;
  let active: string | null = null;
  let maxYear = -Infinity;
  for (const a of script.annotations ?? []) {
    if (currentYear >= a.atYear && a.atYear > maxYear) {
      active = a.message;
      maxYear = a.atYear;
    }
  }
  return active;
}

function applyStateAtT(t: number, script: TimeLapseScript) {
  const startYear = script.startYear ?? TIMELINE_START;
  const endYear = script.endYear ?? TIMELINE_END;
  const currentYear = startYear + t;
  // Monthly, not floored to the whole year: the scores this drives used to sit
  // frozen for a year and then leap, while the transport glided. See
  // `utils/timeline.ts` for why months are the right grain.
  const simYear = quantizeYear(Math.min(currentYear, endYear));
  const sim = useSimulationStore.getState();

  if (script.type === "scripted") {
    const newStates = computeScriptBlockStates(script, currentYear, sim.blocks);
    useSimulationStore.setState({ year: simYear, blockStates: newStates });
  } else {
    useSimulationStore.setState({ year: simYear });
  }
}


export const usePlaybackStore = create<PlaybackStore>()(
  subscribeWithSelector((set, get) => ({
    state: "idle",
    speed: 2,
    activeScript: null,
    playbackT: 0,
    savedUserState: null,
    currentAnnotation: null,

    startScript: (script) => {
      const currentState = get().state;
      const sim = useSimulationStore.getState();
      const snapshot = (): PersistedState => ({
        blockStates: sim.blockStates,
        advanceOrder: sim.advanceOrder,
        year: sim.year,
        perspective: sim.perspective,
        adversaryOc: sim.adversaryOc,
        sliders: sim.sliders,
        modelServedExternally: sim.modelServedExternally,
      });
      const saved: PersistedState =
        currentState === "idle" ? snapshot() : get().savedUserState ?? snapshot();

      const startYear = script.startYear ?? TIMELINE_START;

      if (script.type === "scripted") {
        // Overrides layer on the saved USER baseline, never on the live sliders:
        // switching stories while one is active would otherwise leak the prior
        // script's overrides (e.g. an unset vendor_cooperation) into the next.
        const newSliders = script.sliderOverrides
          ? { ...saved.sliders, ...script.sliderOverrides }
          : saved.sliders;

        const newBlockStates: Record<string, BlockState> = {};
        for (const b of sim.blocks) {
          newBlockStates[b.id] = "not_started";
        }
        if (script.initialBlockStates) {
          Object.assign(newBlockStates, script.initialBlockStates);
        }

        // Budget funding follows the story's own deployment order. Blocks a
        // script explicitly starts as not_started take their slot from their
        // deployment, not from the initial-state list.
        const scriptOrder: string[] = [
          ...Object.keys(script.initialBlockStates ?? {}).filter(
            (id) => script.initialBlockStates?.[id] !== "not_started"
          ),
          ...(script.deployments ?? []).map((d) => d.blockId),
        ].filter((id, i, arr) => arr.indexOf(id) === i);

        useSimulationStore.setState({
          year: startYear,
          blockStates: newBlockStates,
          advanceOrder: scriptOrder,
          sliders: newSliders,
          // A chain pinned before playback would contradict the story's own
          // verdict banner — the strip follows the live best chain instead.
          selectedChainId: null,
        });
      } else {
        useSimulationStore.setState({ year: startYear, selectedChainId: null });
      }

      useSimulationStore.getState().setPlaybackActive(true);
      set({
        state: "playing",
        activeScript: script,
        playbackT: 0,
        savedUserState: saved,
        currentAnnotation: null,
      });
    },

    play: () => set({ state: "playing" }),
    pause: () => set({ state: "paused" }),

    stop: () => {
      const { savedUserState } = get();
      if (savedUserState) {
        useSimulationStore.setState({
          blockStates: savedUserState.blockStates,
          advanceOrder:
            savedUserState.advanceOrder ??
            Object.keys(savedUserState.blockStates).filter(
              (id) => savedUserState.blockStates[id] !== "not_started"
            ),
          year: savedUserState.year,
          perspective: savedUserState.perspective,
          adversaryOc: savedUserState.adversaryOc,
          sliders: savedUserState.sliders,
          modelServedExternally: savedUserState.modelServedExternally,
        });
      }
      useSimulationStore.getState().setPlaybackActive(false);
      set({
        state: "idle",
        activeScript: null,
        playbackT: 0,
        savedUserState: null,
        currentAnnotation: null,
      });
    },

    setSpeed: (speed) => set({ speed }),

    // The transport steps between moments where the story does something — a
    // beat, or a programme breaking ground — not in flat half-years that may
    // land on six months of nothing.
    stepForward: () => {
      const { playbackT, activeScript } = get();
      if (!activeScript) return;
      const startYear = activeScript.startYear ?? TIMELINE_START;
      const endYear = activeScript.endYear ?? TIMELINE_END;
      const max = endYear - startYear;
      const next = adjacentStop(activeScript, startYear + playbackT, 1);
      get().setPlaybackT(
        next !== null ? Math.min(next - startYear, max) : Math.min(playbackT + 0.5, max)
      );
    },

    stepBack: () => {
      const { playbackT, activeScript } = get();
      if (!activeScript) return;
      const startYear = activeScript.startYear ?? TIMELINE_START;
      const prev = adjacentStop(activeScript, startYear + playbackT, -1);
      get().setPlaybackT(
        prev !== null ? Math.max(prev - startYear, 0) : Math.max(playbackT - 0.5, 0)
      );
    },

    setPlaybackT: (t) => {
      set({ playbackT: t });
      const { activeScript, state: pbState } = get();
      if (activeScript && pbState !== "playing") {
        applyStateAtT(t, activeScript);
        // Scrubbing while paused: keep the caption in sync with the position.
        set({ currentAnnotation: annotationAtT(t, activeScript) });
      }
    },
    setAnnotation: (msg) => set({ currentAnnotation: msg }),
  }))
);
