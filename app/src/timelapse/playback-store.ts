import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { PersistedState } from "../store/persistence";
import type { BlockState } from "../engine/types";
import type { TimeLapseScript, PlaybackSpeed, PlaybackState } from "./types";
import { useSimulationStore } from "../store/simulation";
import { computeScriptBlockStates } from "./compute-script-state";

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

function applyStateAtT(t: number, script: TimeLapseScript) {
  const startYear = script.startYear ?? 2024;
  const endYear = script.endYear ?? 2030;
  const currentYear = startYear + t;
  const intYear = Math.min(Math.floor(currentYear), endYear);
  const sim = useSimulationStore.getState();

  if (script.type === "scripted") {
    const newStates = computeScriptBlockStates(script, currentYear, sim.blocks);
    useSimulationStore.setState({ year: intYear, blockStates: newStates });
  } else {
    useSimulationStore.setState({ year: intYear });
  }
}

export const usePlaybackStore = create<PlaybackStore>()(
  subscribeWithSelector((set, get) => ({
    state: "idle",
    speed: 1,
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

      const startYear = script.startYear ?? 2024;

      if (script.type === "scripted") {
        const newSliders = script.sliderOverrides
          ? { ...sim.sliders, ...script.sliderOverrides }
          : sim.sliders;

        const newBlockStates: Record<string, BlockState> = {};
        for (const b of sim.blocks) {
          newBlockStates[b.id] = "not_started";
        }
        if (script.initialBlockStates) {
          Object.assign(newBlockStates, script.initialBlockStates);
        }

        // Budget funding follows the story's own deployment order.
        const scriptOrder: string[] = [
          ...Object.keys(script.initialBlockStates ?? {}),
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

    stepForward: () => {
      const { playbackT, activeScript } = get();
      if (!activeScript) return;
      const endYear = activeScript.endYear ?? 2030;
      const startYear = activeScript.startYear ?? 2024;
      const max = endYear - startYear;
      get().setPlaybackT(Math.min(playbackT + 0.5, max));
    },

    stepBack: () => {
      const { playbackT } = get();
      get().setPlaybackT(Math.max(playbackT - 0.5, 0));
    },

    setPlaybackT: (t) => {
      set({ playbackT: t });
      const { activeScript, state: pbState } = get();
      if (activeScript && pbState !== "playing") {
        applyStateAtT(t, activeScript);
      }
    },
    setAnnotation: (msg) => set({ currentAnnotation: msg }),
  }))
);
