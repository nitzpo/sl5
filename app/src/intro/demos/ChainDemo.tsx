import { useState } from "react";
import { LONG_GAME, DEMO_BLOCKS } from "../content";

// A miniature of components/analysis/ChainStrip.tsx: each step shows the block
// gap it exploits, and every step after the first blocked one dims — the "your
// defense stopped it here" read.

const GAP_BLOCKS = ["PER-04", "PER-03", "PER-05"] as const;
type GapBlock = (typeof GAP_BLOCKS)[number];

export function ChainDemo() {
  const [deployed, setDeployed] = useState<Record<GapBlock, boolean>>({
    "PER-04": false,
    "PER-03": false,
    "PER-05": false,
  });

  const steps = LONG_GAME.steps;
  // Index of the first step a deployed defense blocks; everything after it never happens.
  const blockedAt = steps.findIndex(
    (s) => s.blockGapUsed && deployed[s.blockGapUsed as GapBlock]
  );
  const stopped = blockedAt >= 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm text-gray-500">Deploy a defense:</span>
        {GAP_BLOCKS.map((id) => (
          <button
            key={id}
            onClick={() => setDeployed((d) => ({ ...d, [id]: !d[id] }))}
            aria-pressed={deployed[id]}
            className={`rounded border px-2 py-0.5 text-sm transition-colors ${
              deployed[id]
                ? "border-emerald-700 bg-emerald-950/60 text-emerald-300"
                : "border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-200"
            }`}
          >
            {deployed[id] ? "■" : "✗"} {id} {DEMO_BLOCKS[id].shortLabel}
          </button>
        ))}
      </div>

      {/* Wraps rather than scrolls: the whole chain has to be visible at once
          for the "every later step dims" read to land. */}
      <div className="flex flex-wrap items-stretch gap-2">
        {steps.map((step, i) => {
          const dimmed = stopped && i > blockedAt;
          const isBlocked = stopped && i === blockedAt;
          return (
            <div
              key={step.phase}
              className={`min-w-[8.5rem] flex-1 basis-0 rounded-lg border p-2 transition-opacity ${
                isBlocked
                  ? "border-emerald-800/60 bg-emerald-950/20"
                  : "border-gray-800 bg-gray-900"
              } ${dimmed ? "opacity-30" : ""}`}
            >
              <div className="text-sm font-semibold text-gray-200">{step.phase}</div>
              <p className="mt-1 text-sm leading-snug text-gray-500">{step.description}</p>
              {step.blockGapUsed ? (
                <span
                  className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-sm ${
                    deployed[step.blockGapUsed as GapBlock]
                      ? "bg-emerald-900/60 text-emerald-300"
                      : "border border-red-900/50 bg-red-950 text-red-300"
                  }`}
                >
                  {deployed[step.blockGapUsed as GapBlock] ? "■ blocked" : "✗ gap"} ·{" "}
                  {step.blockGapUsed}
                </span>
              ) : (
                <span className="mt-1.5 inline-block rounded bg-gray-800 px-1.5 py-0.5 text-sm text-gray-400">
                  no defense applies
                </span>
              )}
            </div>
          );
        })}

        <div
          className={`flex min-w-[7rem] flex-1 basis-0 items-center justify-center rounded-lg border p-2 text-center text-sm font-medium ${
            stopped
              ? "border-emerald-800 bg-emerald-950/30 text-emerald-300"
              : "border-red-900/60 bg-red-950/40 text-red-300"
          }`}
        >
          {stopped ? "■ Chain blocked" : "☠ Weights exfiltrated"}
        </div>
      </div>

      {stopped && (
        <p className="mt-3 text-sm leading-relaxed text-emerald-300/80">
          {steps[blockedAt].howItStops}
        </p>
      )}
    </div>
  );
}
