import { useState } from "react";
import { getAiCapability } from "../../engine/ai-curve";
import { SEMANTIC } from "../../utils/colors";
import { OC_TIERS } from "../content";

// The same curve the app runs on (engine/ai-curve.ts), scrubbed by year.
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

// By level, not by index: the caption names these two tiers specifically, and a
// reorder in content.ts shouldn't silently relabel them.
const oc4 = OC_TIERS.find((t) => t.level === 4)!;
const oc5 = OC_TIERS.find((t) => t.level === 5)!;
const W = 520;
const H = 150;
const PAD = { left: 34, right: 12, top: 12, bottom: 24 };

function x(year: number) {
  const t = (year - YEARS[0]) / (YEARS[YEARS.length - 1] - YEARS[0]);
  return PAD.left + t * (W - PAD.left - PAD.right);
}

function y(capability: number) {
  return H - PAD.bottom - capability * (H - PAD.top - PAD.bottom);
}

export function AiCurveDemo() {
  const [year, setYear] = useState(2026);
  const cap = getAiCapability(year, 0.5);

  const line = YEARS.map((yr) => `${x(yr)},${y(getAiCapability(yr, 0.5))}`).join(" ");
  const area = `${x(YEARS[0])},${y(0)} ${line} ${x(YEARS[YEARS.length - 1])},${y(0)}`;

  // What that capability level does to an attacker's reach. The app models this
  // as effective OC = base OC + ai_oc_shift x capability; the sentence below is
  // the qualitative read of it.
  const effect =
    cap < 0.2
      ? "Roughly today's baseline: a determined state actor still needs its own experts for every step."
      : cap < 0.5
        ? "Routine intrusion work starts to automate. Monitoring and review still mostly hold."
        : cap < 0.8
          ? "Capabilities that were OC5-only come within reach of OC3–OC4 actors. Probabilistic controls are visibly weaker."
          : "An OC3 actor operates with what used to take a top-tier state programme. Anything that depends on humans noticing is thin.";

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`AI capability curve; ${year} is at ${Math.round(cap * 100)} percent`}
      >
        {/* axis */}
        <line
          x1={PAD.left}
          y1={y(0)}
          x2={W - PAD.right}
          y2={y(0)}
          stroke="#374151"
          strokeWidth={1}
        />
        <text x={4} y={y(1) + 4} fontSize={9} fill="#6b7280">
          100%
        </text>
        <text x={10} y={y(0) + 4} fontSize={9} fill="#6b7280">
          0%
        </text>

        <polygon points={area} fill={SEMANTIC.ai} opacity={0.12} />
        <polyline points={line} fill="none" stroke={SEMANTIC.ai} strokeWidth={2} />

        {YEARS.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 8} fontSize={9} fill="#6b7280" textAnchor="middle">
            {yr}
          </text>
        ))}

        {/* current-year marker */}
        <line
          x1={x(year)}
          y1={PAD.top}
          x2={x(year)}
          y2={y(0)}
          stroke="#9ca3af"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={x(year)} cy={y(cap)} r={4} fill={SEMANTIC.ai} />
        <text
          x={x(year) + (year >= 2029 ? -8 : 8)}
          y={y(cap) - 8}
          fontSize={11}
          fontWeight={600}
          fill="#c4b5fd"
          textAnchor={year >= 2029 ? "end" : "start"}
        >
          {Math.round(cap * 100)}%
        </text>
      </svg>

      <div className="mt-2 flex items-center gap-3">
        <label htmlFor="ai-curve-year" className="text-xs text-gray-500">
          Year
        </label>
        <input
          id="ai-curve-year"
          type="range"
          min={2024}
          max={2030}
          step={1}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-40 accent-violet-500"
        />
        <span className="w-10 font-mono text-xs text-gray-300">{year}</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-400">{effect}</p>
      <p className="mt-2 text-[11px] text-gray-600">
        For scale: OC{oc4.level} is {oc4.name.toLowerCase()}; OC{oc5.level} is{" "}
        {oc5.name.toLowerCase()}.
      </p>
    </div>
  );
}
