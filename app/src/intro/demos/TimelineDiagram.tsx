import { getAiCapability } from "../../engine/ai-curve";
import { SEMANTIC, URGENCY_BADGE } from "../../utils/colors";
import type { WindowUrgency } from "../../utils/decision-windows";

// A static, annotated redrawing of components/timeline/TimelineTrack.tsx — the
// real track is bound to the store and playback; this one exists only to label
// what the reader will be looking at. Curves are illustrative shapes, except the
// AI capability area, which uses the real engine curve.

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const W = 560;
const H = 200;
const PAD = { left: 8, right: 8, top: 16 };
// Two panels on one year axis, as on the real track: breach (0–100%) on top,
// the security level on its own 1–5 strip underneath — never one dual axis.
const PLOT_BOTTOM = 124;
const SL_TOP = 136;
const SL_BOTTOM = 164;
const AXIS_Y = SL_BOTTOM;

const x = (year: number) =>
  PAD.left + ((year - 2024) / 6) * (W - PAD.left - PAD.right);
const y = (v: number) => PLOT_BOTTOM - v * (PLOT_BOTTOM - PAD.top);
const slY = (sl: number) => SL_BOTTOM - ((sl - 1) / 4) * (SL_BOTTOM - SL_TOP);

/** Illustrative threat and SL shapes — the real ones come from the engine. */
const THREAT: Record<number, number> = {
  2024: 0.44, 2025: 0.52, 2026: 0.6, 2027: 0.7, 2028: 0.76, 2029: 0.8, 2030: 0.83,
};
const SL: Record<number, number> = {
  2024: 1.2, 2025: 1.4, 2026: 1.7, 2027: 2.1, 2028: 2.8, 2029: 3.1, 2030: 3.4,
};

/** Two deadline clusters, as they'd read at the app's default year of 2026:
 * one already past, one due within the year. */
const DEADLINES: { year: number; urgency: WindowUrgency }[] = [
  { year: 2025.6, urgency: "overdue" },
  { year: 2026.8, urgency: "urgent" },
];

const path = (series: Record<number, number>, toY: (v: number) => number) =>
  YEARS.map((yr) => `${x(yr)},${toY(series[yr])}`).join(" ");

export function TimelineDiagram() {
  const aiLine = YEARS.map((yr) => `${x(yr)},${y(getAiCapability(yr, 0.5))}`).join(" ");
  const aiArea = `${x(2024)},${y(0)} ${aiLine} ${x(2030)},${y(0)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Annotated diagram of the app's timeline track: the AI capability area and the threat line on a 0–100% breach panel, the security level on its own 1–5 strip underneath, must-start-by deadline markers and story beats."
    >
      <polygon points={aiArea} fill={SEMANTIC.ai} opacity={0.08} />
      <polyline points={aiLine} fill="none" stroke={SEMANTIC.ai} strokeWidth={1.5} opacity={0.5} />

      <polyline
        points={path(THREAT, y)}
        fill="none"
        stroke={SEMANTIC.threat}
        strokeWidth={1.75}
        strokeDasharray="5 3"
      />
      <line x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} stroke="#1f2937" strokeWidth={1} />

      {/* The SL strip: its own 1–5 scale under the breach panel. */}
      <line x1={PAD.left} y1={slY(5)} x2={W - PAD.right} y2={slY(5)} stroke="#1f2937" strokeWidth={1} />
      <polyline points={path(SL, slY)} fill="none" stroke={SEMANTIC.defense} strokeWidth={2} />

      {/* Must-start-by triangles. Apex on the axis, base below, and the same
          URGENCY_BADGE weights the real track uses: solid for a window already
          closed, outlined for one closing. */}
      {DEADLINES.map(({ year: yr, urgency }) => (
        <polygon
          key={yr}
          points={`${x(yr)},${AXIS_Y} ${x(yr) - 4.5},${AXIS_Y + 9} ${x(yr) + 4.5},${AXIS_Y + 9}`}
          fill={URGENCY_BADGE[urgency].fill}
          stroke={URGENCY_BADGE[urgency].stroke}
          strokeWidth={1}
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
      <Label x={x(2024.15)} y={slY(4.2)} fill="#34d399" anchor="start">
        Security level — SL 1–5, its own scale
      </Label>
      <Label x={x(2024.15)} y={y(0.14)} fill="#a78bfa" anchor="start">
        AI capability
      </Label>
      <Label x={x(2026.2)} y={AXIS_Y + 21} fill="#fca5a5" anchor="middle">
        ▲ must start by
      </Label>
      <Label x={x(2028.6)} y={PAD.top - 8} fill="#c4b5fd" anchor="middle">
        ◆ story beats
      </Label>

      <line
        x1={PAD.left}
        y1={AXIS_Y}
        x2={W - PAD.right}
        y2={AXIS_Y}
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
