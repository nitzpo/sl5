import { useState } from "react";
import { getAiCapability } from "../../engine/ai-curve";
import { AI_SHIFT_GROUPS, OC_TIERS } from "../content";
import { liftedTier, liftInWords } from "../engine-views";
import { Segmented } from "../slides/parts";
import { useWidth } from "./use-width";

// Slide 2: the AI capability curve the engine runs on, and what it does to an
// attacker on each kind of attack vector — the engine's own `effectiveTier`.

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const H = 112;
const PAD = { left: 4, right: 4, top: 10, bottom: 22 };

function CapabilityCurve({ year }: { year: number }) {
  const [ref, width] = useWidth<HTMLDivElement>(320);
  const w = Math.max(240, width);
  const x = (yr: number) => PAD.left + ((yr - 2024) / 6) * (w - PAD.left - PAD.right);
  const y = (c: number) => H - PAD.bottom - c * (H - PAD.top - PAD.bottom);
  const samples: number[] = [];
  for (let t = 2024; t <= 2030.0001; t += 0.125) samples.push(t);
  const line = samples.map((t) => `${x(t)},${y(getAiCapability(t))}`).join(" ");
  const upto = samples.filter((t) => t <= year + 1e-9);
  const area = [
    `${x(2024)},${y(0)}`,
    ...upto.map((t) => `${x(t)},${y(getAiCapability(t))}`),
    `${x(year)},${y(0)}`,
  ].join(" ");
  const cap = getAiCapability(year);
  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={H} aria-hidden className="block max-w-full">
        <defs>
          <pattern id="ai-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" style={{ stroke: "var(--ink-2)", strokeWidth: 1 }} />
          </pattern>
        </defs>
        <line x1={x(2024)} x2={x(2030)} y1={y(0)} y2={y(0)} style={{ stroke: "var(--ink)" }} />
        <line x1={x(2024)} x2={x(2030)} y1={y(1)} y2={y(1)} style={{ stroke: "var(--rule)", strokeDasharray: "2 3" }} />
        <polygon points={area} style={{ fill: "url(#ai-hatch)" }} />
        <polyline points={line} style={{ fill: "none", stroke: "var(--ink)", strokeWidth: 2 }} />
        <line x1={x(year)} x2={x(year)} y1={y(0)} y2={y(cap)} style={{ stroke: "var(--ink)", strokeWidth: 1 }} />
        <rect x={x(year) - 4} y={y(cap) - 4} width={8} height={8} style={{ fill: "var(--ink)" }} />
        {YEARS.map((yr) => (
          <text
            key={yr}
            x={x(yr)}
            y={H - 6}
            textAnchor={yr === 2024 ? "start" : yr === 2030 ? "end" : "middle"}
            className="mono"
            style={{ fontSize: 12, fill: yr === year ? "var(--ink)" : "var(--ink-2)", fontWeight: yr === year ? 600 : 400 }}
          >
            {yr}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Ruler({ oc, lifted }: { oc: number; lifted: number }) {
  const pos = (t: number) => `${((t - 1) / 4) * 100}%`;
  return (
    <div className="relative mx-[7px] h-[30px]">
      <span className="absolute top-1/2 right-0 left-0 h-px bg-rule-2" />
      {[1, 2, 3, 4, 5].map((t) => (
        <span key={t} className="absolute top-[9px] h-[12px] w-px bg-ink-3" style={{ left: pos(t) }} />
      ))}
      {lifted > oc + 0.001 && (
        <span
          className="absolute top-[12px] h-[6px] bg-signal"
          style={{ left: pos(oc), width: `${((lifted - oc) / 4) * 100}%` }}
        />
      )}
      <span className="absolute top-[8px] h-[14px] w-[14px] -translate-x-1/2 border-2 border-ink bg-paper" style={{ left: pos(oc) }} />
      {lifted > oc + 0.001 && (
        <span className="absolute top-[8px] h-[14px] w-[14px] -translate-x-1/2 bg-signal" style={{ left: pos(lifted) }} />
      )}
    </div>
  );
}

export function AiLiftFigure() {
  const [year, setYear] = useState(2026);
  const [oc, setOc] = useState(3);
  const cap = getAiCapability(year);
  const rows = AI_SHIFT_GROUPS.map((g) => {
    const lifted = liftedTier(oc, g.shift, year);
    return { ...g, lifted, words: liftInWords(oc, lifted) };
  });
  const capWords =
    cap < 0.05 ? "about where it was in 2024" : cap < 0.5 ? "rising" : cap < 0.95 ? "most of the way up" : "at the top of the instrument's curve";

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:gap-10">
        <div className="min-w-0">
          <label htmlFor="ai-year" className="cap block">
            Year · <span className="text-ink">{year}</span>
          </label>
          <input
            id="ai-year"
            aria-label="Year"
            type="range"
            min={2024}
            max={2030}
            step={1}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="intro-range mt-2"
          />
          <div className="mt-3">
            <CapabilityCurve year={year} />
          </div>
          <p className="mt-2 text-[14px] text-ink-2">
            <span className="hatch-ink mr-2 inline-block h-[10px] w-[18px] border border-ink align-middle" aria-hidden />
            AI capability in {year}: {capWords}.
          </p>
        </div>

        <div className="min-w-0">
          <Segmented
            label="Attacker"
            options={OC_TIERS.filter((t) => t.level <= 4).map((t) => ({ value: t.level, label: `OC${t.level}` }))}
            value={oc}
            onChange={setOc}
          />
          <div
            role="img"
            className="mt-4"
            aria-label={`In ${year}, with AI help, an OC${oc} attacker: ${rows.map((r) => `${r.label}, ${r.words}`).join("; ")}.`}
          >
            <div className="mb-1 grid grid-cols-[1fr] sm:grid-cols-[11rem_1fr_9.5rem] sm:gap-x-4">
              <span className="hidden sm:block" />
              <div className="mx-[7px] flex justify-between">
                {[1, 2, 3, 4, 5].map((t) => (
                  <span key={t} className="mono w-0 text-center text-[12px] text-ink-2">
                    <span className="inline-block -translate-x-1/2">OC{t}</span>
                  </span>
                ))}
              </div>
            </div>
            {rows.map((r) => (
              <div
                key={r.label}
                className="grid items-center border-t border-rule py-1.5 sm:grid-cols-[11rem_1fr_9.5rem] sm:gap-x-4"
              >
                <p className="text-[14px] leading-snug text-ink">{r.label}</p>
                <Ruler oc={oc} lifted={r.lifted} />
                <p className={`text-[14px] font-semibold sm:text-right ${r.lifted > oc + 0.001 ? "text-signal-ink" : "text-ink-2"}`}>
                  {r.words}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
