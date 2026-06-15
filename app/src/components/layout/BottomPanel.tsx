import { useState } from "react";
import { GlobalSliders } from "../sliders/GlobalSliders";
import { TimelineTrack } from "../timeline/TimelineTrack";
import { PlaybackBar } from "../timelapse/PlaybackBar";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { SCRIPTS } from "../../timelapse/scripts";

const DEFAULT_SCRIPT = SCRIPTS.find((s) => s.id === "reactive-ciso") ?? SCRIPTS[0];

export function BottomPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const playbackState = usePlaybackStore((s) => s.state);
  const startScript = usePlaybackStore((s) => s.startScript);
  const activeScript = usePlaybackStore((s) => s.activeScript);
  const playbackT = usePlaybackStore((s) => s.playbackT);
  const currentYear = (activeScript?.startYear ?? 2024) + playbackT;

  return (
    <div className="relative z-20 border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm">
      {/* Toggle bar — always visible, carries a discoverable story CTA when collapsed */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-1.5 cursor-pointer hover:bg-gray-900/60 transition-colors"
        title={collapsed ? "Show timeline & parameters" : "Hide timeline & parameters"}
      >
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Timeline & World Parameters</span>
          {collapsed && playbackState !== "idle" && (
            <span className="text-[10px] text-violet-300 font-mono bg-violet-950/40 px-1.5 py-0.5 rounded border border-violet-900/30">
              {playbackState === "playing" ? "▶" : "⏸"} {currentYear.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {collapsed && playbackState === "idle" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed(false);
                startScript(activeScript ?? DEFAULT_SCRIPT);
              }}
              className="text-[11px] font-medium text-violet-300 hover:text-violet-200"
            >
              ▶ Play story
            </button>
          )}
          <span className="text-xs text-gray-600">
            {collapsed ? "▲ Show" : "▼ Hide"}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-3">
          <PlaybackBar />
          <TimelineTrack />
          <GlobalSliders />
        </div>
      )}
    </div>
  );
}
