import { useSimulationStore } from "../../store/simulation";
import { getAiCapability } from "../../engine/ai-curve";

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const TRACK_HEIGHT = 80;
const PADDING_X = 40;

export function TimelineTrack() {
  const year = useSimulationStore((s) => s.year);
  const setYear = useSimulationStore((s) => s.setYear);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);

  const width = 600;
  const usableWidth = width - PADDING_X * 2;
  const yearSpacing = usableWidth / (YEARS.length - 1);

  function yearToX(y: number): number {
    return PADDING_X + ((y - YEARS[0]) / (YEARS[YEARS.length - 1] - YEARS[0])) * usableWidth;
  }

  // AI capability curve points
  const curvePoints = YEARS.map((y) => {
    const cap = getAiCapability(y, aiTimeline);
    const x = yearToX(y);
    const plotY = TRACK_HEIGHT - 15 - cap * (TRACK_HEIGHT - 30);
    return `${x},${plotY}`;
  }).join(" ");

  // Area fill under curve
  const areaPoints = [
    `${yearToX(YEARS[0])},${TRACK_HEIGHT - 15}`,
    ...YEARS.map((y) => {
      const cap = getAiCapability(y, aiTimeline);
      return `${yearToX(y)},${TRACK_HEIGHT - 15 - cap * (TRACK_HEIGHT - 30)}`;
    }),
    `${yearToX(YEARS[YEARS.length - 1])},${TRACK_HEIGHT - 15}`,
  ].join(" ");

  const currentX = yearToX(year);
  const currentCap = getAiCapability(year, aiTimeline);

  return (
    <div className="w-full">
      <svg width="100%" viewBox={`0 0 ${width} ${TRACK_HEIGHT}`} className="select-none">
        {/* Area fill under AI curve */}
        <polygon points={areaPoints} fill="#7c3aed" opacity={0.1} />

        {/* AI capability curve */}
        <polyline
          points={curvePoints}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={2}
          opacity={0.7}
        />

        {/* Year axis */}
        <line
          x1={PADDING_X}
          y1={TRACK_HEIGHT - 15}
          x2={width - PADDING_X}
          y2={TRACK_HEIGHT - 15}
          stroke="#374151"
          strokeWidth={1}
        />

        {/* Year ticks and labels */}
        {YEARS.map((y) => {
          const x = yearToX(y);
          const isActive = y === year;
          return (
            <g
              key={y}
              className="cursor-pointer"
              onClick={() => setYear(y)}
            >
              <line
                x1={x}
                y1={TRACK_HEIGHT - 18}
                x2={x}
                y2={TRACK_HEIGHT - 12}
                stroke={isActive ? "#a78bfa" : "#4b5563"}
                strokeWidth={isActive ? 2 : 1}
              />
              <text
                x={x}
                y={TRACK_HEIGHT - 3}
                textAnchor="middle"
                fontSize={10}
                fill={isActive ? "#e5e7eb" : "#6b7280"}
                fontWeight={isActive ? 600 : 400}
              >
                {y}
              </text>
            </g>
          );
        })}

        {/* Current year indicator */}
        <line
          x1={currentX}
          y1={5}
          x2={currentX}
          y2={TRACK_HEIGHT - 18}
          stroke="#a78bfa"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.6}
        />

        {/* Dot on AI curve at current year */}
        <circle
          cx={currentX}
          cy={TRACK_HEIGHT - 15 - currentCap * (TRACK_HEIGHT - 30)}
          r={4}
          fill="#7c3aed"
          stroke="#1f2937"
          strokeWidth={2}
        />

        {/* AI capability label */}
        <text
          x={width - PADDING_X + 5}
          y={12}
          fontSize={9}
          fill="#7c3aed"
          opacity={0.8}
        >
          AI Cap
        </text>
        <text
          x={currentX + 8}
          y={TRACK_HEIGHT - 15 - currentCap * (TRACK_HEIGHT - 30) - 6}
          fontSize={9}
          fill="#a78bfa"
        >
          {Math.round(currentCap * 100)}%
        </text>
      </svg>
    </div>
  );
}
