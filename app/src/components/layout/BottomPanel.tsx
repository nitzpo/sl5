import { useEffect, useState } from "react";
import { GlobalSliders } from "../sliders/GlobalSliders";
import { TimelineTrack } from "../timeline/TimelineTrack";
import { PlaybackBar } from "../timelapse/PlaybackBar";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { formatProbability, formatSl } from "../../utils/format";
import { breachLevel, LEVEL_TEXT } from "../../utils/colors";
import { SCRIPTS } from "../../timelapse/scripts";

const DEFAULT_SCRIPT = SCRIPTS.find((s) => s.id === "reactive-ciso") ?? SCRIPTS[0];

/** Which bottom section is open. `null` = both hidden (canvas gets full height). */
type BottomTab = "timeline" | "parameters" | null;

export function BottomPanel() {
  // Nothing open by default so the canvas gets the vertical space; a tab opens on
  // demand and the Timeline tab auto-opens when a story starts.
  const [tab, setTab] = useState<BottomTab>(null);
  const playbackState = usePlaybackStore((s) => s.state);
  const startScript = usePlaybackStore((s) => s.startScript);
  const activeScript = usePlaybackStore((s) => s.activeScript);
  const playbackT = usePlaybackStore((s) => s.playbackT);
  const year = useSimulationStore((s) => s.year);
  const { bestChain, overallSl } = useSimulationResults();
  const currentYear = (activeScript?.startYear ?? 2024) + playbackT;

  // Auto-open the Timeline tab exactly when playback starts (idle → active); a
  // user who closes it mid-story is respected (pause/resume won't re-open it).
  useEffect(
    () =>
      usePlaybackStore.subscribe(
        (s) => s.state,
        (state, prev) => {
          if (prev === "idle" && state !== "idle") setTab("timeline");
        }
      ),
    []
  );

  const breach = bestChain?.probability ?? 0;

  // Clicking the active tab closes it (toggle); clicking another switches to it.
  const toggle = (t: Exclude<BottomTab, null>) =>
    setTab((cur) => (cur === t ? null : t));

  return (
    <div className="relative z-20 border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm">
      {/* Tab bar — small readouts on the LEFT, the two tab controls on the RIGHT.
          The tabs are pill-styled inside a track so they clearly read as
          buttons; only one panel opens at a time, so the canvas stays visible. */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-3">
          {/* Live readouts — always visible so the key numbers are never hidden */}
          <span className="flex items-center gap-2.5 text-[11px] font-mono">
            <span className="text-gray-400">{year}</span>
            <span className={LEVEL_TEXT[breachLevel(breach)]}>
              breach {formatProbability(breach)}
            </span>
            <span className="text-gray-300">SL {formatSl(overallSl)}</span>
          </span>
          {playbackState !== "idle" && (
            <span className="text-[10px] text-violet-300 font-mono bg-violet-950/40 px-1.5 py-0.5 rounded border border-violet-900/30">
              {playbackState === "playing" ? "▶" : "⏸"} {currentYear.toFixed(1)}
            </span>
          )}
          {playbackState === "idle" && (
            <button
              onClick={() => {
                setTab("timeline");
                startScript(activeScript ?? DEFAULT_SCRIPT);
              }}
              className="text-[11px] font-medium text-violet-300 hover:text-violet-200"
            >
              ▶ Play story
            </button>
          )}
        </div>

        {/* Tab controls — a segmented pill group so it's obviously interactive */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-0.5">
          <TabButton
            label="Timeline"
            icon="⏱"
            active={tab === "timeline"}
            onClick={() => toggle("timeline")}
          />
          <TabButton
            label="Parameters"
            icon="⚙"
            active={tab === "parameters"}
            onClick={() => toggle("parameters")}
          />
          {tab !== null && (
            <button
              onClick={() => setTab(null)}
              className="text-gray-500 hover:text-gray-200 hover:bg-gray-800 w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              title="Hide panel"
              aria-label="Hide panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {tab === "timeline" && (
        <div className="px-4 pb-2 space-y-2">
          <PlaybackBar />
          <TimelineTrack />
        </div>
      )}

      {tab === "parameters" && (
        <div className="px-4 pb-3 pt-1">
          <GlobalSliders />
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition-colors ${
        active
          ? "bg-violet-600 text-white shadow-sm"
          : "text-gray-300 hover:text-white hover:bg-gray-800"
      }`}
    >
      <span className="text-[11px]">{icon}</span>
      {label}
    </button>
  );
}
