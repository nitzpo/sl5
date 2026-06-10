import { useState } from "react";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { usePlaybackLoop } from "../../timelapse/use-playback-loop";
import { ScriptSelector } from "./ScriptSelector";
import type { PlaybackSpeed } from "../../timelapse/types";

const SPEED_CYCLE: PlaybackSpeed[] = [0.5, 1, 2, 4];

export function PlaybackBar() {
  const state = usePlaybackStore((s) => s.state);
  const speed = usePlaybackStore((s) => s.speed);
  const playbackT = usePlaybackStore((s) => s.playbackT);
  const activeScript = usePlaybackStore((s) => s.activeScript);
  const currentAnnotation = usePlaybackStore((s) => s.currentAnnotation);
  const play = usePlaybackStore((s) => s.play);
  const pause = usePlaybackStore((s) => s.pause);
  const stop = usePlaybackStore((s) => s.stop);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);
  const stepForward = usePlaybackStore((s) => s.stepForward);
  const stepBack = usePlaybackStore((s) => s.stepBack);
  const setPlaybackT = usePlaybackStore((s) => s.setPlaybackT);

  const [showSelector, setShowSelector] = useState(false);

  usePlaybackLoop();

  if (state === "idle") {
    return (
      <div className="relative flex items-center gap-2 px-2 py-1">
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
        >
          ▶ Time-Lapse
        </button>
        {showSelector && <ScriptSelector onClose={() => setShowSelector(false)} />}
      </div>
    );
  }

  const startYear = activeScript?.startYear ?? 2024;
  const endYear = activeScript?.endYear ?? 2030;
  const totalRange = endYear - startYear;
  const progress = totalRange > 0 ? playbackT / totalRange : 0;
  const currentYear = startYear + playbackT;

  return (
    <div className="px-3 py-1.5 space-y-1">
      <div className="flex items-center gap-2">
        {/* Script name — clickable to switch */}
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="text-[11px] text-violet-400 hover:text-violet-300 truncate max-w-[120px]"
            title="Switch scenario"
          >
            {activeScript?.name} ▾
          </button>
          {showSelector && <ScriptSelector onClose={() => setShowSelector(false)} />}
        </div>

        {/* Transport */}
        <button
          onClick={stepBack}
          className="text-xs text-gray-400 hover:text-gray-200 px-1"
          title="Step back 0.5yr"
        >
          ◀◀
        </button>
        <button
          onClick={state === "playing" ? pause : play}
          className="text-sm text-gray-200 hover:text-white px-1"
          title={state === "playing" ? "Pause" : "Play"}
        >
          {state === "playing" ? "⏸" : "▶"}
        </button>
        <button
          onClick={stepForward}
          className="text-xs text-gray-400 hover:text-gray-200 px-1"
          title="Step forward 0.5yr"
        >
          ▶▶
        </button>

        {/* Speed */}
        <button
          onClick={() => {
            const idx = SPEED_CYCLE.indexOf(speed);
            setSpeed(SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length]);
          }}
          className="text-[11px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 min-w-[28px] text-center"
        >
          {speed}x
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 bg-gray-800 rounded-full cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setPlaybackT(pct * totalRange);
          }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-violet-600 rounded-full transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-violet-400 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 5px)` }}
          />
        </div>

        {/* Year display */}
        <span className="text-xs font-mono text-gray-300 w-12 text-right">
          {currentYear.toFixed(1)}
        </span>

        {/* Stop */}
        <button
          onClick={stop}
          className="text-xs text-gray-500 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-gray-800"
          title="Stop and restore"
        >
          ✕
        </button>
      </div>

      {/* Annotation toast */}
      {currentAnnotation && (
        <div className="text-[11px] text-violet-300 bg-violet-950/50 border border-violet-800/30 rounded px-2 py-1 animate-fade-in">
          {currentAnnotation}
        </div>
      )}
    </div>
  );
}
