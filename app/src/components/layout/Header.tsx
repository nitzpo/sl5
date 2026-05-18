import { useSimulationStore } from "../../store/simulation";
import type { Perspective } from "../../engine/types";

const PERSPECTIVES: { key: Perspective; label: string }[] = [
  { key: "ciso", label: "CISO" },
  { key: "attacker", label: "Attacker" },
  { key: "policymaker", label: "Policy" },
  { key: "observer", label: "Observer" },
];

export function Header() {
  const year = useSimulationStore((s) => s.year);
  const setYear = useSimulationStore((s) => s.setYear);
  const perspective = useSimulationStore((s) => s.perspective);
  const setPerspective = useSimulationStore((s) => s.setPerspective);
  const expertMode = useSimulationStore((s) => s.expertMode);
  const setExpertMode = useSimulationStore((s) => s.setExpertMode);
  const resetToBaseline = useSimulationStore((s) => s.resetToBaseline);

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

      {/* Perspective tabs */}
      <div className="flex gap-1 ml-4">
        {PERSPECTIVES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPerspective(key)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              perspective === key
                ? "bg-gray-700 text-gray-100"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Expert/Summary toggle */}
      <button
        onClick={() => setExpertMode(!expertMode)}
        className="ml-auto text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
      >
        {expertMode ? "Summary" : "Expert"}
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
