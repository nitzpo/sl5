import { useEffect, useRef } from "react";
import { usePlaybackStore } from "./playback-store";
import { useSimulationStore } from "../store/simulation";
import { computeScriptBlockStates } from "./compute-script-state";
import { TIMELINE_START, TIMELINE_END, quantizeYear } from "../utils/timeline";

const BASE_DURATION_SEC = 48;
const UPDATE_INTERVAL_MS = 16;
/** Brief pause when a beat lands, so it registers before time moves on. Kept
 * short: the caption now persists for the whole beat, so this is just a beat
 * of emphasis, not the full reading window. */
const ANNOTATION_HOLD_MS = 1200;

export function usePlaybackLoop() {
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const lastAnnotationRef = useRef(-1);
  const holdUntilRef = useRef(0);

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

      const startYear = script.startYear ?? TIMELINE_START;
      const endYear = script.endYear ?? TIMELINE_END;
      const totalRange = endYear - startYear;

      const currentSpeed = store.speed;
      const ratePerSec = (totalRange / BASE_DURATION_SEC) * currentSpeed;
      const holding = timestamp < holdUntilRef.current;
      const newT = holding
        ? store.playbackT
        : Math.min(store.playbackT + dt * ratePerSec, totalRange);
      if (!holding) {
        store.setPlaybackT(newT);
      }

      const currentYear = startYear + newT;
      // Monthly rather than floored to the whole year. Block states already
      // advance continuously here (`computeScriptBlockStates` takes the raw
      // fraction), so flooring left the scores leaping a year at a time while
      // hexes lit up in between — the two halves of the story disagreeing.
      const simYear = quantizeYear(Math.min(currentYear, endYear));

      if (timestamp - lastUpdateRef.current >= UPDATE_INTERVAL_MS) {
        lastUpdateRef.current = timestamp;

        if (script.type === "scripted") {
          const blocks = useSimulationStore.getState().blocks;
          const newStates = computeScriptBlockStates(script, currentYear, blocks);
          const json = JSON.stringify(newStates);
          if (json !== lastBlockStatesJson) {
            lastBlockStatesJson = json;
            useSimulationStore.setState({ year: simYear, blockStates: newStates });
          } else if (useSimulationStore.getState().year !== simYear) {
            useSimulationStore.setState({ year: simYear });
          }
        } else {
          if (useSimulationStore.getState().year !== simYear) {
            useSimulationStore.setState({ year: simYear });
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
            // Jumped backward while playing: sync the caption to the earlier
            // beat now, since the forward loop below only fires for i > newIdx.
            // Re-trigger the read-hold on the reached beat so a backward jump
            // pauses to be read just like a forward one (clear it if we landed
            // before the first beat).
            store.setAnnotation(newIdx >= 0 ? script.annotations[newIdx].message : null);
            holdUntilRef.current = newIdx >= 0 ? timestamp + ANNOTATION_HOLD_MS : 0;
          }
        }

        for (let i = script.annotations.length - 1; i >= 0; i--) {
          if (currentYear >= script.annotations[i].atYear && i > lastAnnotationRef.current) {
            lastAnnotationRef.current = i;
            holdUntilRef.current = timestamp + ANNOTATION_HOLD_MS;
            // The caption stays up for the whole beat — the next annotation
            // replaces it, and stop/start clear it. No timed auto-dismiss.
            store.setAnnotation(script.annotations[i].message);
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
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [playbackState]);
}
