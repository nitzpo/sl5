import { useState } from "react";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { usePlaybackLoop } from "../../timelapse/use-playback-loop";
import { useSimulationStore } from "../../store/simulation";
import { useBudgetStatus, useSimulationResults } from "../../store/derived";
import { formatCost, formatProbability, formatSl, formatYear } from "../../utils/format";
import { TIMELINE_START, TIMELINE_END, quantizeYear } from "../../utils/timeline";
import { breachLevel, LEVEL_TEXT, SEMANTIC } from "../../utils/colors";
import { ScriptSelector } from "./ScriptSelector";
import type { PlaybackSpeed } from "../../timelapse/types";

const SPEED_CYCLE: PlaybackSpeed[] = [0.5, 1, 2, 4];

/** Live spend vs budget during playback, with the count of blocks the budget
 * can't actually pay for. Turns "why is this program still at 22%?" from a
 * hover-the-right-hex discovery into something visible on the transport bar. */
function SpendChip() {
  // useBudgetStatus, not useSimulationResults: this renders on every playback
  // frame and only needs the budget slice, not the SL scores and OC sweeps.
  const { spentMillions, budgetExceededIds, budgetMillions: budget } = useBudgetStatus();
  if (spentMillions <= 0) return null;
  const capped = budgetExceededIds.size;
  return (
    <span
      className="text-[10px] font-mono shrink-0 tabular-nums"
      style={{ color: capped > 0 ? SEMANTIC.overBudget : "#9ca3af" }}
      title={
        capped > 0
          ? `Planned spend exceeds the budget: ${capped} block(s) held at implementing because they can't be funded`
          : "Planned upfront spend vs budget (basis follows Risk Tolerance)"
      }
    >
      {formatCost(spentMillions)}/{formatCost(budget)}
      {capped > 0 && <span className="ml-1">▲{capped}</span>}
    </span>
  );
}

/** Shown when a story reaches its final year: the takeaway, in numbers. */
function EndSummary({ onReplay }: { onReplay: () => void }) {
  const { overallSl, bestChain, spentMillions, budgetExceededIds } = useSimulationResults();
  const attackChains = useSimulationStore((s) => s.attackChains);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const year = useSimulationStore((s) => s.year);
  const riskTolerance = useSimulationStore((s) => s.sliders.risk_tolerance);
  const budget = useSimulationStore((s) => s.sliders.budget_millions);
  const stop = usePlaybackStore((s) => s.stop);
  const chainName = bestChain
    ? attackChains.find((c) => c.id === bestChain.id)?.name ?? bestChain.id
    : null;
  const p = bestChain?.probability ?? 0;
  // Same target the Security Posture card shows (risk tolerance sets it)
  const target = 5 - riskTolerance * 2;
  // The money line. A posture whose plan outruns its budget ends with blocks
  // capped at `implementing`, and that capping is usually the whole reason the
  // residual risk is what it is — so the summary has to say it, not leave it to
  // per-block badges nobody hovers. The scripted stories all plan inside their
  // budgets now, so this branch is for configs the user builds themselves.
  const cappedCount = budgetExceededIds.size;

  return (
    <div className="flex items-center gap-3 text-xs bg-gray-900 border border-gray-700 rounded px-3 py-2">
      <span className="text-gray-400">
        <span className="text-gray-200 font-semibold">{formatYear(year)}:</span>{" "}
        <span className={overallSl >= target ? "text-emerald-400" : "text-red-300"}>
          SL {formatSl(overallSl)}
        </span>{" "}
        {overallSl >= target ? "— target met" : `— below the SL ${formatSl(target)} target`}.
        {chainName && (
          <>
            {" "}Most viable chain vs OC{adversaryOc}:{" "}
            <span className="text-gray-200">{chainName}</span> at{" "}
            <span className={LEVEL_TEXT[breachLevel(p)]}>{formatProbability(p)}</span>.
          </>
        )}{" "}
        <span className="text-gray-500">
          Planned spend{" "}
          <span style={{ color: cappedCount > 0 ? SEMANTIC.overBudget : undefined }}>
            {formatCost(spentMillions)}
          </span>{" "}
          against a {formatCost(budget)} budget
          {cappedCount > 0 && (
            <>
              {" "}— {cappedCount} block{cappedCount === 1 ? "" : "s"} capped at
              implementing, unaffordable at this budget
            </>
          )}
          .
        </span>
      </span>
      <button
        onClick={onReplay}
        className="ml-auto shrink-0 text-violet-300 hover:text-violet-200 font-medium"
      >
        ↻ Replay
      </button>
      <button onClick={stop} className="shrink-0 text-gray-500 hover:text-gray-300">
        Done
      </button>
    </div>
  );
}

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
      <div className="relative flex items-center gap-3 px-2 py-1">
        <div className="relative inline-flex">
          {/* soft pulsing glow to draw the eye */}
          <span className="absolute -inset-1 rounded-full bg-violet-500/30 blur-md animate-pulse pointer-events-none" />
          <button
            onClick={() => setShowSelector(!showSelector)}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-md transition-colors"
          >
            <span className="text-[10px]">▶</span> Play the story (~1 min)
          </button>
        </div>
        <span className="text-[11px] text-gray-500">
          Watch defenses race the threat from 2024 → 2030
        </span>
        {showSelector && <ScriptSelector onClose={() => setShowSelector(false)} />}
      </div>
    );
  }

  const startYear = activeScript?.startYear ?? TIMELINE_START;
  const endYear = activeScript?.endYear ?? TIMELINE_END;
  const totalRange = endYear - startYear;
  const progress = totalRange > 0 ? playbackT / totalRange : 0;
  const currentYear = startYear + playbackT;
  const atEnd = state === "paused" && totalRange > 0 && playbackT >= totalRange - 1e-6;

  return (
    <div className="px-3 py-1.5 space-y-1">
      <div className="flex items-center gap-2">
        {/* Script name — clickable to switch */}
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            onMouseDown={(e) => e.stopPropagation()}
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
          title="Previous event"
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
          title="Next event"
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

        {/* Progress bar with year ticks */}
        <div
          className="flex-1 h-1.5 bg-gray-800 rounded-full cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setPlaybackT(pct * totalRange);
          }}
        >
          {totalRange > 0 &&
            Array.from({ length: totalRange - 1 }, (_, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-px h-2.5 bg-gray-600/70 pointer-events-none"
                style={{ left: `${((i + 1) / totalRange) * 100}%` }}
              />
            ))}
          <div
            className="absolute inset-y-0 left-0 bg-violet-600 rounded-full transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-violet-400 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 5px)` }}
          />
        </div>

        {/* Year display — quantized the same way the simulation store is, so
            the transport and the readouts can never name different months. */}
        <span className="text-xs font-mono text-gray-300 w-16 text-right">
          {formatYear(quantizeYear(currentYear))}
        </span>

        {/* Live spend — a story's money running out is a plot point, so it has
            to be visible while it happens, not only in the end summary. */}
        <SpendChip />

        {/* Stop */}
        <button
          onClick={stop}
          className="text-xs text-gray-500 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-gray-800"
          title="Stop and restore"
        >
          ✕
        </button>
      </div>

      {/* Annotation caption — centered under the timeline, width-capped so it
          reads as the story's current line, not a box stranded on the left */}
      {currentAnnotation && !atEnd && (
        <div className="flex justify-center">
          <div className="max-w-xl text-center text-xs leading-snug text-violet-300 bg-violet-950/50 border border-violet-800/30 rounded px-3 py-1 animate-fade-in">
            {currentAnnotation}
          </div>
        </div>
      )}

      {/* End-of-story takeaway */}
      {atEnd && (
        <EndSummary
          onReplay={() => {
            setPlaybackT(0);
            play();
          }}
        />
      )}
    </div>
  );
}
