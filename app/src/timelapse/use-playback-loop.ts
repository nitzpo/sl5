import { useEffect, useRef } from "react";
import { usePlaybackStore } from "./playback-store";
import { useSimulationStore } from "../store/simulation";
import { computeScriptBlockStates } from "./compute-script-state";

const BASE_DURATION_SEC = 12;
const UPDATE_INTERVAL_MS = 200;

export function usePlaybackLoop() {
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const lastAnnotationRef = useRef(-1);

  const playbackState = usePlaybackStore((s) => s.state);

  useEffect(() => {
    if (playbackState !== "playing") {
      lastTimeRef.current = 0;
      return;
    }

    let lastBlockStatesJson = "";

    function tick(timestamp: number) {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
        lastUpdateRef.current = timestamp;
      }
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const store = usePlaybackStore.getState();
      const script = store.activeScript;
      if (!script) return;

      const startYear = script.startYear ?? 2024;
      const endYear = script.endYear ?? 2030;
      const totalRange = endYear - startYear;

      const currentSpeed = store.speed;
      const ratePerSec = (totalRange / BASE_DURATION_SEC) * currentSpeed;
      const newT = Math.min(store.playbackT + dt * ratePerSec, totalRange);

      store.setPlaybackT(newT);

      const currentYear = startYear + newT;
      const intYear = Math.min(Math.floor(currentYear), endYear);

      // Throttle store updates to avoid excessive re-renders
      if (timestamp - lastUpdateRef.current >= UPDATE_INTERVAL_MS) {
        lastUpdateRef.current = timestamp;

        if (script.type === "scripted") {
          const blocks = useSimulationStore.getState().blocks;
          const newStates = computeScriptBlockStates(script, currentYear, blocks);
          const json = JSON.stringify(newStates);
          if (json !== lastBlockStatesJson) {
            lastBlockStatesJson = json;
            useSimulationStore.setState({ year: intYear, blockStates: newStates });
          } else if (useSimulationStore.getState().year !== intYear) {
            useSimulationStore.setState({ year: intYear });
          }
        } else {
          if (useSimulationStore.getState().year !== intYear) {
            useSimulationStore.setState({ year: intYear });
          }
        }
      }

      // Check annotations
      if (script.annotations) {
        for (let i = script.annotations.length - 1; i >= 0; i--) {
          if (currentYear >= script.annotations[i].atYear && i > lastAnnotationRef.current) {
            lastAnnotationRef.current = i;
            store.setAnnotation(script.annotations[i].message);
            setTimeout(() => {
              usePlaybackStore.getState().setAnnotation(null);
            }, 8000);
            break;
          }
        }
      }

      if (newT >= totalRange) {
        usePlaybackStore.getState().pause();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else {
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    lastTimeRef.current = 0;
    lastAnnotationRef.current = -1;
    lastBlockStatesJson = "";
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [playbackState]);
}
