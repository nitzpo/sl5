import { useMemo, useState } from "react";
import { useSimulationStore } from "../../store/simulation";
import { getAiCapability } from "../../engine/ai-curve";

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const TRACK_HEIGHT = 80;
const PADDING_X = 40;

interface Deadline {
  id: string;
  name: string;
  mustStartBy: number;
}

interface Bucket {
  center: number;
  items: Deadline[];
}

export function TimelineTrack() {
  const year = useSimulationStore((s) => s.year);
  const setYear = useSimulationStore((s) => s.setYear);
  const setPerspective = useSimulationStore((s) => s.setPerspective);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);

  const width = 600;
  const usableWidth = width - PADDING_X * 2;

  function yearToX(y: number): number {
    return PADDING_X + ((y - YEARS[0]) / (YEARS[YEARS.length - 1] - YEARS[0])) * usableWidth;
  }

  const curvePoints = YEARS.map((y) => {
    const cap = getAiCapability(y, aiTimeline);
    const x = yearToX(y);
    const plotY = TRACK_HEIGHT - 15 - cap * (TRACK_HEIGHT - 30);
    return `${x},${plotY}`;
  }).join(" ");

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

  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);

  // Decision windows: blocks closing within 2 years, grouped into half-year buckets
  const buckets = useMemo(() => {
    const items: Deadline[] = [];
    for (const b of blocks) {
      const state = blockStates[b.id] ?? "not_started";
      if (state !== "not_started") continue;
      const mustStartBy = 2030 - b.dimensions.time_to_deploy_months.max / 12;
      if (mustStartBy <= year + 2 && mustStartBy > 2024) {
        items.push({ id: b.id, name: b.name, mustStartBy });
      }
    }

    // Group by half-year
    const bucketMap = new Map<number, Deadline[]>();
    for (const item of items) {
      const center = Math.round(item.mustStartBy * 2) / 2;
      if (!bucketMap.has(center)) bucketMap.set(center, []);
      bucketMap.get(center)!.push(item);
    }

    const result: Bucket[] = [];
    for (const [center, bucketItems] of bucketMap) {
      result.push({ center, items: bucketItems.sort((a, b) => a.mustStartBy - b.mustStartBy) });
    }
    return result.sort((a, b) => a.center - b.center);
  }, [blocks, blockStates, year]);

  function bucketColor(center: number): string {
    if (center <= year) return "#ef4444";
    if (center <= year + 1) return "#f59e0b";
    return "#6b7280";
  }

  return (
    <div
      className="w-full relative"
      onMouseLeave={() => setHoveredBucket(null)}
    >
      <svg width="100%" viewBox={`0 0 ${width} ${TRACK_HEIGHT}`} className="select-none">
        <polygon points={areaPoints} fill="#7c3aed" opacity={0.1} />

        <polyline
          points={curvePoints}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={2}
          opacity={0.7}
        />

        <line
          x1={PADDING_X}
          y1={TRACK_HEIGHT - 15}
          x2={width - PADDING_X}
          y2={TRACK_HEIGHT - 15}
          stroke="#374151"
          strokeWidth={1}
        />

        {YEARS.map((y) => {
          const x = yearToX(y);
          const isActive = y === year;
          return (
            <g key={y} className="cursor-pointer" onClick={() => setYear(y)}>
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

        <circle
          cx={currentX}
          cy={TRACK_HEIGHT - 15 - currentCap * (TRACK_HEIGHT - 30)}
          r={4}
          fill="#7c3aed"
          stroke="#1f2937"
          strokeWidth={2}
        />

        <text
          x={currentX + 8}
          y={TRACK_HEIGHT - 15 - currentCap * (TRACK_HEIGHT - 30) - 6}
          fontSize={9}
          fill="#a78bfa"
        >
          {Math.round(currentCap * 100)}%
        </text>

        {/* Bucket markers */}
        {buckets.map((bucket, i) => {
          const x = yearToX(bucket.center);
          const color = bucketColor(bucket.center);
          const isHovered = hoveredBucket === i;
          return (
            <g
              key={bucket.center}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredBucket(i)}
            >
              {/* Hit area */}
              <rect
                x={x - 14}
                y={TRACK_HEIGHT - 32}
                width={28}
                height={16}
                fill="transparent"
              />
              {/* Triangle */}
              <polygon
                points={`${x},${TRACK_HEIGHT - 21} ${x - 4},${TRACK_HEIGHT - 28} ${x + 4},${TRACK_HEIGHT - 28}`}
                fill={color}
                opacity={isHovered ? 1 : 0.8}
              />
              {/* Count */}
              {bucket.items.length > 1 && (
                <text
                  x={x + 7}
                  y={TRACK_HEIGHT - 22}
                  fontSize={8}
                  fill={color}
                  fontWeight={600}
                >
                  {bucket.items.length}
                </text>
              )}
            </g>
          );
        })}

        {/* Color legend */}
        {buckets.length > 0 && (
          <g>
            <polygon points={`${width - PADDING_X - 88},${8} ${width - PADDING_X - 92},${4} ${width - PADDING_X - 84},${4}`} fill="#ef4444" />
            <text x={width - PADDING_X - 80} y={9} fontSize={7} fill="#9ca3af">past</text>
            <polygon points={`${width - PADDING_X - 56},${8} ${width - PADDING_X - 60},${4} ${width - PADDING_X - 52},${4}`} fill="#f59e0b" />
            <text x={width - PADDING_X - 48} y={9} fontSize={7} fill="#9ca3af">{"<1yr"}</text>
            <polygon points={`${width - PADDING_X - 22},${8} ${width - PADDING_X - 26},${4} ${width - PADDING_X - 18},${4}`} fill="#6b7280" />
            <text x={width - PADDING_X - 14} y={9} fontSize={7} fill="#9ca3af">{"<2yr"}</text>
          </g>
        )}
      </svg>

      {/* Hover popup */}
      {hoveredBucket !== null && buckets[hoveredBucket] && (
        <div
          className="absolute z-[100] bg-gray-800 border border-gray-700 rounded shadow-lg p-2 text-[10px] max-w-[220px]"
          style={{
            left: `${(yearToX(buckets[hoveredBucket].center) / width) * 100}%`,
            bottom: "55%",
            transform: "translateX(-50%)",
          }}
          onMouseLeave={() => setHoveredBucket(null)}
        >
          <div className="text-gray-500 mb-1">
            Start by {buckets[hoveredBucket].center.toFixed(1)}
          </div>
          {buckets[hoveredBucket].items.map((d) => (
            <button
              key={d.id}
              className="block w-full text-left px-1 py-0.5 rounded hover:bg-gray-700 text-gray-200"
              onClick={() => {
                setPerspective("ciso");
                setHoveredBucket(null);
                setTimeout(() => {
                  const el = document.getElementById(`dw-${d.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("ring", "ring-amber-500");
                    setTimeout(() => el.classList.remove("ring", "ring-amber-500"), 1500);
                  }
                }, 50);
              }}
            >
              <span className="text-gray-500">{d.id}</span> {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
