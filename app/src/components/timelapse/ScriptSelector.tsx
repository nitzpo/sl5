import { useRef, useEffect } from "react";
import { SCRIPTS } from "../../timelapse/scripts";
import { usePlaybackStore } from "../../timelapse/playback-store";

interface ScriptSelectorProps {
  onClose: () => void;
}

export function ScriptSelector({ onClose }: ScriptSelectorProps) {
  const startScript = usePlaybackStore((s) => s.startScript);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 z-50"
    >
      <div className="text-xs text-gray-400 px-2 py-1 mb-1">Choose a scenario</div>
      {SCRIPTS.map((script) => (
        <button
          key={script.id}
          onClick={() => {
            startScript(script);
            onClose();
          }}
          className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 transition-colors group"
        >
          <div className="text-sm text-gray-200 group-hover:text-white">
            {script.name}
          </div>
          <div className="text-[11px] text-gray-500 group-hover:text-gray-400">
            {script.description}
          </div>
        </button>
      ))}
    </div>
  );
}
