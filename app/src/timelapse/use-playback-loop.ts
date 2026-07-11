import { useEffect, useRef } from "react";
import { usePlaybackStore } from "./playback-store";
import { useSimulationStore } from "../store/simulation";
import { computeScriptBlockStates } from "./compute-script-state";

const BASE_DURATION_SEC = 48;
const UPDATE_INTERVAL_MS = 16;
/** Time progression holds still this long when an annotation appears, so the
 * viewer can actually read it before the story moves on. */
const ANNOTATION_HOLD_MS = 2500;

export function usePlaybackLoop() {
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const lastAnnotationRef = useRef(-1);
  const holdUntilRef = useRef(0);
  const annotationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const holding = timestamp < holdUntilRef.current;
      const newT = holding
        ? store.playbackT
        : Math.min(store.playbackT + dt * ratePerSec, totalRange);

      store.setPlaybackT(newT);

      const currentYear = startYear + newT;
      const intYear = Math.min(Math.floor(currentYear), endYear);

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
        // Reset annotation index if we jumped backwards
        if (lastAnnotationRef.current >= 0 && lastAnnotationRef.current < script.annotations.length) {
          if (currentYear < script.annotations[lastAnnotationRef.current].atYear) {
            let newIdx = -1;
            for (let i = 0; i < script.annotations.length; i++) {
              if (currentYear >= script.annotations[i].atYear) {
                newIdx = i;
              }
            }
            lastAnnotationRef.current = newIdx;
          }
        }

        for (let i = script.annotations.length - 1; i >= 0; i--) {
          if (currentYear >= script.annotations[i].atYear && i > lastAnnotationRef.current) {
            lastAnnotationRef.current = i;
            holdUntilRef.current = timestamp + ANNOTATION_HOLD_MS;
            store.setAnnotation(script.annotations[i].message);
            if (annotationTimeoutRef.current) {
              clearTimeout(annotationTimeoutRef.current);
            }
            annotationTimeoutRef.current = setTimeout(() => {
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
    holdUntilRef.current = 0;
    lastBlockStatesJson = "";
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (annotationTimeoutRef.current) {
        clearTimeout(annotationTimeoutRef.current);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [playbackState]);
}
