import { getAiCapability } from "../../engine/ai-curve";
import { SEMANTIC } from "../../utils/colors";

// A static, annotated redrawing of components/timeline/TimelineTrack.tsx — the
// real track is bound to the store and playback; this one exists only to label
// what the reader will be looking at. Curves are illustrative shapes, except the
// AI capability area, which uses the real engine curve.

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const W = 560;
const H = 200;
const PAD = { left: 8, right: 8, top: 16, bottom: 34 };

const x = (year: number) =>
  PAD.left + ((year - 2024) / 6) * (W - PAD.left - PAD.right);
const y = (v: number) => H - PAD.bottom - v * (H - PAD.top - PAD.bottom);

/** Illustrative threat and defense shapes — the real ones come from the engine. */
const THREAT: Record<number, number> = {
  2024: 0.44, 2025: 0.52, 2026: 0.6, 2027: 0.7, 2028: 0.76, 2029: 0.8, 2030: 0.83,
};
const DEFENSE: Record<number, number> = {
  2024: 0.2, 2025: 0.24, 2026: 0.32, 2027: 0.44, 2028: 0.6, 2029: 0.66, 2030: 0.7,
};

const path = (series: Record<number, number>) =>
  YEARS.map((yr) => `${x(yr)},${y(series[yr])}`).join(" ");

export function TimelineDiagram() {
  const aiLine = YEARS.map((yr) => `${x(yr)},${y(getAiCapability(yr, 0.5))}`).join(" ");
  const aiArea = `${x(2024)},${y(0)} ${aiLine} ${x(2030)},${y(0)}`;

  // The exposure gap is widest where threat - defense peaks; 2026-27 here.
  const gap = `${path(THREAT)} ${YEARS.slice().reverse().map((yr) => `${x(yr)},${y(DEFENSE[yr])}`).join(" ")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Annotated diagram of the app's timeline track: AI capability area, threat line, defense line, the exposure gap between them, must-start-by deadline markers and story beats."
    >
      <polygon points={aiArea} fill={SEMANTIC.ai} opacity={0.08} />
      <polyline points={aiLine} fill="none" stroke={SEMANTIC.ai} strokeWidth={1.5} opacity={0.5} />

      <polygon points={gap} fill={SEMANTIC.threat} opacity={0.08} />

      <polyline
        points={path(THREAT)}
        fill="none"
        stroke={SEMANTIC.threat}
        strokeWidth={1.75}
        strokeDasharray="5 3"
      />
      <polyline points={path(DEFENSE)} fill="none" stroke={SEMANTIC.defense} strokeWidth={2} />

      {/* deadline triangles — "must start by" */}
      {[2026, 2027.5].map((yr) => (
        <polygon
          key={yr}
          points={`${x(yr)},${H - PAD.bottom + 2} ${x(yr) - 5},${H - PAD.bottom + 11} ${x(yr) + 5},${H - PAD.bottom + 11}`}
          fill="#f59e0b"
          opacity={0.9}
        />
      ))}

      {/* story beat diamonds */}
      {[2025, 2028, 2029.5].map((yr) => (
        <rect
          key={yr}
          x={x(yr) - 3.5}
          y={PAD.top - 6}
          width={7}
          height={7}
          fill={SEMANTIC.ai}
          transform={`rotate(45 ${x(yr)} ${PAD.top - 2.5})`}
        />
      ))}

      {/* labels */}
      <Label x={x(2029.1)} y={y(THREAT[2029]) - 8} fill="#f87171" anchor="end">
        Threat — how likely a breach is
      </Label>
      <Label x={x(2029.1)} y={y(DEFENSE[2029]) + 14} fill="#34d399" anchor="end">
        Defense — your security level
      </Label>
      <Label x={x(2026.4)} y={y(0.46)} fill="#fca5a5" anchor="middle">
        exposure gap
      </Label>
      <Label x={x(2024.15)} y={y(0.14)} fill="#a78bfa" anchor="start">
        AI capability
      </Label>
      <Label x={x(2026)} y={H - PAD.bottom + 22} fill="#fbbf24" anchor="middle">
        ▲ must start by
      </Label>
      <Label x={x(2028.6)} y={PAD.top - 8} fill="#c4b5fd" anchor="middle">
        ◆ story beats
      </Label>

      <line
        x1={PAD.left}
        y1={y(0)}
        x2={W - PAD.right}
        y2={y(0)}
        stroke="#374151"
        strokeWidth={1}
      />
      {YEARS.map((yr) => (
        <text key={yr} x={x(yr)} y={H - 4} fontSize={9} fill="#6b7280" textAnchor="middle">
          {yr}
        </text>
      ))}
    </svg>
  );
}

function Label({
  x: cx,
  y: cy,
  fill,
  anchor,
  children,
}: {
  x: number;
  y: number;
  fill: string;
  anchor: "start" | "middle" | "end";
  children: string;
}) {
  return (
    <text x={cx} y={cy} fontSize={9} fill={fill} textAnchor={anchor}>
      {children}
    </text>
  );
}
