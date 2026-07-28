import { useState } from "react";
import { DEMO_BLOCKS } from "../content";
import { DemoHex } from "./DemoHex";
import { demoDegradation } from "./degradation";

const SHOWN = ["NET-01", "PER-03", "NET-05"] as const;

const TYPE_LABEL: Record<string, string> = {
  hard_stop: "Hard stop",
  probabilistic: "Probabilistic",
  hybrid: "Hybrid",
};

/** Slide 8: three defense types, and what four years of AI progress does to each. */
export function ErosionDemo() {
  const [year, setYear] = useState(2026);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-gray-500">Year</span>
        <div className="flex items-center gap-0.5 rounded bg-gray-800 p-0.5">
          {[2026, 2030].map((yr) => (
            <button
              key={yr}
              onClick={() => setYear(yr)}
              aria-pressed={year === yr}
              className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                year === yr ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SHOWN.map((id) => {
          const block = DEMO_BLOCKS[id];
          const degradation = demoDegradation(block, year);
          return (
            <div key={id} className="flex flex-col items-center text-center">
              <DemoHex block={block} state="deployed" degradation={degradation} />
              <div className="mt-1 text-[11px] font-medium text-gray-200">
                {TYPE_LABEL[block.defenseType]}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-gray-500">
                {degradation > 0.005
                  ? `−${Math.round(degradation * 100)}% eroded`
                  : "no erosion"}
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-gray-500">{block.blurb}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
