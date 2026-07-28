import { useState } from "react";
import { OC_TIERS } from "../content";

function formatBudget(millions: number): string {
  if (millions >= 1000) return `$${(millions / 1000).toFixed(0)}B`;
  if (millions >= 1) return `$${millions}M`;
  return `$${Math.round(millions * 1000)}K`;
}

function formatTime(months: number): string {
  // OC1 is a quarter of a month and OC2 exactly one, so both short branches
  // need the singular — "1 weeks" / "1 months" otherwise.
  if (months < 1) {
    const weeks = Math.round(months * 4);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = months / 12;
  return `${years} year${years === 1 ? "" : "s"}`;
}

export function OcLadderDemo() {
  const [level, setLevel] = useState(4);
  const tier = OC_TIERS.find((t) => t.level === level)!;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {OC_TIERS.map((t) => (
          <button
            key={t.level}
            onClick={() => setLevel(t.level)}
            aria-pressed={t.level === level}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              t.level === level
                ? "border-violet-500 bg-violet-950/60 text-violet-200"
                : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-200"
            }`}
          >
            OC{t.level}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-100">
          OC{tier.level} — {tier.name}
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-gray-400">{tier.description}</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Budget" value={formatBudget(tier.budgetMillions)} />
          <Stat
            label="People"
            value={tier.teamSize === 1 ? "1" : tier.teamSize.toLocaleString()}
          />
          <Stat label="Patience" value={formatTime(tier.timeHorizonMonths)} />
        </div>

        <dl className="mt-3 space-y-2">
          <div>
            <dt className="text-[10px] tracking-wide text-gray-500 uppercase">Who</dt>
            <dd className="text-xs text-gray-300">{tier.typicalActors.join(" · ")}</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-wide text-gray-500 uppercase">
              What they can do
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {tier.keyCapabilities.map((c) => (
                <span
                  key={c}
                  className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300"
                >
                  {c}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-gray-900 px-2 py-1.5">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="font-mono text-sm text-gray-100 tabular-nums">{value}</div>
    </div>
  );
}
