import { useEffect, useState } from "react";
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

  // Auto-expand whenever a time-lapse is running so its controls are visible.
  useEffect(() => {
    if (playbackState !== "idle") setCollapsed(false);
  }, [playbackState]);

  return (
    <div className="relative z-20 border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm">
      {/* Toggle bar — always visible, carries a discoverable story CTA when collapsed */}
      <div className="w-full flex items-center justify-between px-4 py-1.5">
        <span className="text-xs text-gray-500">Timeline & World Parameters</span>
        <div className="flex items-center gap-3">
          {collapsed && playbackState === "idle" && (
            <button
              onClick={() => {
                setCollapsed(false);
                startScript(activeScript ?? DEFAULT_SCRIPT);
              }}
              className="text-[11px] font-medium text-violet-300 hover:text-violet-200"
            >
              ▶ Play story
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {collapsed ? "▲ Show" : "▼ Hide"}
          </button>
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
