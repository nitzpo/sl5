import { useState } from "react";
import { GlobalSliders } from "../sliders/GlobalSliders";
import { TimelineTrack } from "../timeline/TimelineTrack";

export function BottomPanel() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative z-20 border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm">
      {/* Toggle bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-gray-900 transition-colors"
      >
        <span className="text-xs text-gray-500">
          Timeline & World Parameters
        </span>
        <span className="text-xs text-gray-600">
          {collapsed ? "▲ Show" : "▼ Hide"}
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-3">
          <TimelineTrack />
          <GlobalSliders />
        </div>
      )}
    </div>
  );
}
