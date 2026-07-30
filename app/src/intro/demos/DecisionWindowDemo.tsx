import { useState } from "react";
import type { Block } from "../../engine/types";
import {
  computeDecisionWindows,
  type WindowUrgency,
} from "../../utils/decision-windows";
import { DEMO_BLOCKS } from "../content";
import { DemoHex } from "./DemoHex";

// Longest lead time first, so the badge weights read left-to-right as the
// window closes: 48 months to stand up, 24, then 12.
const SHOWN = ["HW-07", "NET-01", "PER-05"] as const;

/**
 * Slide 12: what the red `!` badge means, and why two of them look different.
 *
 * The urgency comes from the real `computeDecisionWindows()` rather than a
 * hand-written table — the app and the introduction then can't disagree about
 * which year closes which window. Like `demoDegradation`, a small stand-in
 * stands for a full Block: the function only reads the id, the state and
 * `time_to_deploy_months`.
 */
function urgencyAt(year: number): Map<string, WindowUrgency> {
  const blocks = SHOWN.map(
    (id) =>
      ({
        id,
        dimensions: { time_to_deploy_months: DEMO_BLOCKS[id].deployMonths },
      }) as unknown as Block
  );
  const states = Object.fromEntries(SHOWN.map((id) => [id, "not_started"]));
  return new Map(
    computeDecisionWindows(blocks, states, year).map((w) => [w.block.id, w.urgency])
  );
}

const READING: Record<WindowUrgency | "none", { label: string; note: string; tone: string }> = {
  overdue: {
    label: "Window closed",
    note: "Solid red, pulsing. Even starting today, it can't be operational by 2030.",
    tone: "text-red-400",
  },
  urgent: {
    label: "Window closing",
    note: "Outlined red, steady. Still reachable, but the decision is due inside a year.",
    tone: "text-red-300",
  },
  upcoming: {
    label: "On the horizon",
    note: "No badge on the map — it shows up in the CISO panel's decision-window list instead.",
    tone: "text-gray-400",
  },
  none: {
    label: "Not pressing yet",
    note: "More than two years of slack; nothing warns about it at this year.",
    tone: "text-gray-500",
  },
};

export function DecisionWindowDemo() {
  // 2027, not the app's default 2026: it's the one year where these three
  // blocks sit in three different tiers, so all three readings are on screen
  // before the reader touches anything. Scrub left or right and they converge.
  const [year, setYear] = useState(2027);
  const windows = urgencyAt(year);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="dw-year" className="text-sm text-gray-500">
          Year
        </label>
        <input
          id="dw-year"
          type="range"
          min={2024}
          max={2030}
          step={1}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-40 accent-violet-500"
        />
        <span className="font-mono text-sm text-gray-300">{year}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SHOWN.map((id) => {
          const block = DEMO_BLOCKS[id];
          const urgency = windows.get(id);
          // The map only badges closed and closing windows — BlockGrid,
          // ClusterView and DefenseRings all drop "upcoming".
          const badged = urgency && urgency !== "upcoming" ? urgency : undefined;
          const reading = READING[urgency ?? "none"];
          const mustStartBy = 2030 - block.deployMonths.max / 12;

          return (
            <div key={id} className="flex flex-col items-center text-center">
              <DemoHex block={block} state="not_started" urgency={badged} />
              <div className={`mt-1 text-sm font-medium ${reading.tone}`}>
                {reading.label}
              </div>
              <div className="mt-0.5 font-mono text-sm text-gray-500">
                {block.deployMonths.max}mo to deploy · start by {mustStartBy}
              </div>
              <p className="mt-1.5 text-sm leading-snug text-gray-500">{reading.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
