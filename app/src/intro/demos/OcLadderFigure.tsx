import { useState } from "react";
import { OC_TIERS, type OcTier } from "../content";
import { duration, money, people } from "../format";

// Slide 3: what each attacker tier can spend, on a log scale. Four steps of a
// ladder, then a gap and OC5, drawn in the adversary's red.

/** Decades above $100: $1K → 1 … $1B → 7. */
const decades = (millions: number) => Math.log10(millions * 1e6) - 2;
const TOP = 7.6; // a little headroom over $1B for OC5's label
const AXIS = [
  { d: 1, label: "$1K" },
  { d: 4, label: "$1M" },
  { d: 7, label: "$1B" },
];
const pct = (d: number) => `${(d / TOP) * 100}%`;

const ladder = OC_TIERS.filter((t) => t.level < 5);
const oc4 = OC_TIERS.find((t) => t.level === 4)!;
const oc5 = OC_TIERS.find((t) => t.level === 5)!;

function CliffNote({ className }: { className: string }) {
  return (
    <p className={`text-[14px] leading-[1.4] ${className}`}>
      <span className="mono block font-semibold text-signal-ink">
        OC4 → OC5: ×{Math.round(oc5.budgetMillions / oc4.budgetMillions)} budget, ×{oc5.teamSize / oc4.teamSize} people, ×
        {oc5.timeHorizonMonths / oc4.timeHorizonMonths} time
      </span>
      <span className="text-ink-2">Not a bigger attacker: a different kind.</span>
    </p>
  );
}

function TierBar({ tier, selected, onSelect }: { tier: OcTier; selected: boolean; onSelect: () => void }) {
  const top = tier.level === 5;
  const d = decades(tier.budgetMillions);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`OC${tier.level}, ${tier.name}: ${money(tier.budgetMillions)}, ${people(tier.teamSize)}, ${duration(tier.timeHorizonMonths)}`}
      className="group relative h-full min-w-0 flex-1"
    >
      <span
        className={`absolute inset-x-0 bottom-0 border-2 transition-colors ${
          top ? "hatch-signal border-signal" : selected ? "border-ink bg-ink" : "border-ink bg-tint group-hover:bg-rule"
        }`}
        style={{ height: pct(d) }}
      />
      {top && selected && (
        <span className="absolute inset-x-0 bottom-0 border-[3px] border-signal" style={{ height: pct(d) }} />
      )}
      <span className="absolute inset-x-0 text-left" style={{ bottom: `calc(${pct(d)} + 4px)` }}>
        <span
          className={`display block text-[20px] sm:text-[28px] ${top ? "text-signal-ink" : "text-ink"} ${
            selected ? "underline decoration-2 underline-offset-4" : ""
          }`}
        >
          OC{tier.level}
        </span>
      </span>
    </button>
  );
}

export function OcLadderFigure() {
  const [level, setLevel] = useState(4);
  const tier = OC_TIERS.find((t) => t.level === level)!;
  const cols = [...ladder.map((t) => t as OcTier | null), null, oc5];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
      <div role="group" aria-label="What each attacker tier can spend, on a log scale. Select a tier for details.">
        <div className="flex">
          {/* Log axis */}
          <div aria-hidden className="relative h-[230px] w-[40px] shrink-0 sm:h-[320px]">
            {AXIS.map((a) => (
              <span
                key={a.d}
                className="mono absolute left-0 translate-y-1/2 text-[12px] text-ink-3"
                style={{ bottom: pct(a.d) }}
              >
                {a.label}
              </span>
            ))}
          </div>
          <div className="relative h-[230px] flex-1 border-b-2 border-ink sm:h-[320px]">
            {AXIS.map((a) => (
              <span
                key={a.d}
                aria-hidden
                className="absolute inset-x-0 border-t border-dashed border-rule"
                style={{ bottom: pct(a.d) }}
              />
            ))}
            {/* What changes at the cliff, in the empty top-left corner (below the
                chart on a phone, where the corner is too small). */}
            <CliffNote className="absolute top-0 left-0 hidden max-w-[40%] bg-paper pr-2 sm:block" />
            <div className="absolute inset-0 flex gap-2 sm:gap-3">
              {cols.map((t, i) =>
                t === null ? (
                  <div key={`gap-${i}`} aria-hidden className="relative h-full w-[16px] shrink-0 sm:w-[40px]">
                    <span className="absolute top-[30%] bottom-0 left-1/2 border-l-2 border-dashed border-signal" />
                  </div>
                ) : (
                  <TierBar key={t.level} tier={t} selected={t.level === level} onSelect={() => setLevel(t.level)} />
                )
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 flex pl-[40px]">
          <div className="flex flex-1 gap-2 sm:gap-3">
            {cols.map((t, i) =>
              t === null ? (
                <span key={`gap-${i}`} className="w-[16px] shrink-0 sm:w-[40px]" />
              ) : (
                <div key={t.level} className="mono min-w-0 flex-1 text-[12px] leading-[1.35] text-ink-2">
                  <span className={`block font-semibold ${t.level === 5 ? "text-signal-ink" : "text-ink"}`}>
                    {money(t.budgetMillions)}
                  </span>
                  <span className="hidden sm:block">{people(t.teamSize)}</span>
                  <span className="hidden sm:block">{duration(t.timeHorizonMonths)}</span>
                </div>
              )
            )}
          </div>
        </div>
        <CliffNote className="mt-4 border-l-2 border-signal pl-3 sm:hidden" />
      </div>

      <div className="border-t border-ink pt-3" aria-live="polite">
        <p className="cap">
          OC{tier.level} · {tier.short}
        </p>
        <p className={`mt-2 text-[20px] leading-tight font-semibold ${tier.level === 5 ? "text-signal-ink" : "text-ink"}`}>
          {tier.name}
        </p>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-2">{tier.description}.</p>
        <p className="mono mt-3 text-[14px] text-ink">
          {money(tier.budgetMillions)} · {people(tier.teamSize)} · {duration(tier.timeHorizonMonths)}
        </p>
        <dl className="mt-4 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 text-[14px] leading-snug">
          <dt className="cap pt-0.5">Typically</dt>
          <dd className="text-ink">{tier.typicalActors.join(", ")}</dd>
          <dt className="cap pt-0.5">Can</dt>
          <dd>
            <ul className="space-y-0.5 text-ink">
              {tier.keyCapabilities.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </dd>
        </dl>
      </div>
    </div>
  );
}
