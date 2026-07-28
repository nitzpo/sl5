import { useState } from "react";
import type { BlockState } from "../../engine/types";
import { STATE_LABELS, STATE_ICONS } from "../../utils/colors";
import { getStateEffectiveness } from "../../engine/scoring";
import { DEMO_BLOCKS } from "../content";
import { DemoHex } from "./DemoHex";

// STATE_CYCLE in store/simulation.ts — the order right-click walks, wrapping
// from mature back to not_started.
const CYCLE: BlockState[] = [
  "not_started",
  "investing",
  "implementing",
  "deployed",
  "mature",
];

const SHORT: Record<BlockState, string> = {
  not_started: "None",
  investing: "Invest",
  implementing: "Build",
  deployed: "Deploy",
  mature: "Mature",
};

/** Slide 9: a hex the reader actually cycles. */
export function LifecycleDemo() {
  const [i, setI] = useState(0);
  const state = CYCLE[i];
  const block = DEMO_BLOCKS["NET-01"];
  const effectiveness = getStateEffectiveness(state);
  const wrapped = i === CYCLE.length - 1;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="flex flex-col items-center">
        <DemoHex
          block={block}
          state={state}
          size={40}
          onClick={() => setI((n) => (n + 1) % CYCLE.length)}
        />
        <span className="mt-0.5 text-center text-[10px] leading-tight text-gray-600">
          <span className="text-gray-400">right-click</span> to{" "}
          {wrapped ? "start over" : "advance"}
        </span>
      </div>

      <div className="w-full flex-1">
        {/* The segmented control from components/blocks/BlockDetail.tsx: jump
            straight to any state, forwards or backwards. */}
        <div className="flex overflow-hidden rounded-md border border-gray-700">
          {CYCLE.map((s, n) => (
            <button
              key={s}
              onClick={() => setI(n)}
              aria-pressed={n === i}
              aria-label={STATE_LABELS[s]}
              className={`flex-1 border-r border-gray-700 px-1 py-1.5 text-[10px] transition-colors last:border-r-0 ${
                n === i
                  ? "bg-gray-700 text-gray-100"
                  : "bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              {SHORT[s]}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg leading-none text-gray-300">{STATE_ICONS[state]}</span>
          <span className="text-sm font-medium text-gray-100">{STATE_LABELS[state]}</span>
          <span className="ml-auto font-mono text-sm text-emerald-400 tabular-nums">
            {Math.round(effectiveness * 100)}%
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
          Effectiveness at this state, before any AI erosion or budget cap. The fill height
          tracks the state; the border thickens as it hardens; <em>Mature</em> earns the outer
          glow ring.
        </p>
      </div>
    </div>
  );
}
