import { useState } from "react";
import { useSimulationStore } from "../../store/simulation";

export function Header() {
  const year = useSimulationStore((s) => s.year);
  const setYear = useSimulationStore((s) => s.setYear);
  const expertMode = useSimulationStore((s) => s.expertMode);
  const setExpertMode = useSimulationStore((s) => s.setExpertMode);
  const resetToBaseline = useSimulationStore((s) => s.resetToBaseline);
  const copyShareUrl = useSimulationStore((s) => s.copyShareUrl);
  const [copied, setCopied] = useState(false);

  return (
    <header className="flex items-center gap-4 px-4 py-2 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <h1 className="text-sm font-bold text-gray-200 whitespace-nowrap">
        SL5 Explorable
      </h1>

      {/* Year slider */}
      <div className="flex items-center gap-2 ml-4">
        <span className="text-xs text-gray-500">Year</span>
        <input
          type="range"
          min={2024}
          max={2030}
          step={1}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28 accent-violet-500"
        />
        <span className="text-xs font-mono text-gray-300 w-8">{year}</span>
      </div>

      {/* Expert/Summary toggle */}
      <button
        onClick={() => setExpertMode(!expertMode)}
        className="ml-auto text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
      >
        {expertMode ? "Summary" : "Expert"}
      </button>

      {/* Share */}
      <button
        onClick={() => {
          copyShareUrl();
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
      >
        {copied ? "Copied!" : "Share"}
      </button>

      {/* Reset */}
      <button
        onClick={resetToBaseline}
        className="text-xs text-gray-600 hover:text-gray-400 px-2 py-1 rounded hover:bg-gray-800"
      >
        Reset
      </button>
    </header>
  );
}
