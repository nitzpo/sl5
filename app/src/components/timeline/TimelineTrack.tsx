import { useMemo, useState } from "react";
import { useSimulationStore } from "../../store/simulation";
import { getAiCapability } from "../../engine/ai-curve";
import { computeCategoryScores, overallSlScore } from "../../engine/scoring";
import { computeBreachProbabilities } from "../../engine/breach";

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const TRACK_HEIGHT = 110;
const PADDING_X = 40;
const PLOT_TOP = 8;
const PLOT_BOTTOM = TRACK_HEIGHT - 22;
const PLOT_RANGE = PLOT_BOTTOM - PLOT_TOP;

interface Deadline {
  id: string;
  name: string;
  mustStartBy: number;
}

interface Bucket {
  center: number;
  items: Deadline[];
}

function valueToY(v: number): number {
  return PLOT_BOTTOM - v * PLOT_RANGE;
}

export function TimelineTrack() {
  const year = useSimulationStore((s) => s.year);
  const setYear = useSimulationStore((s) => s.setYear);
  const setPerspective = useSimulationStore((s) => s.setPerspective);
  const sliders = useSimulationStore((s) => s.sliders);
  const aiTimeline = sliders.ai_timeline;
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const attackChains = useSimulationStore((s) => s.attackChains);

  const [showDecomposed, setShowDecomposed] = useState(false);
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);

  const width = 600;
  const usableWidth = width - PADDING_X * 2;

  function yearToX(y: number): number {
    return PADDING_X + ((y - YEARS[0]) / (YEARS[YEARS.length - 1] - YEARS[0])) * usableWidth;
  }

  const riskData = useMemo(() => {
    return YEARS.map((y) => {
      const catScores = computeCategoryScores(blocks, blockStates, y, sliders);
      const sl = overallSlScore(catScores);
      const defense = sl / 5;

      const breachProbs = computeBreachProbabilities(
        attackChains, blocks, blockStates, adversaryOc, y, sliders
      );
      const threat = Math.max(...Object.values(breachProbs), 0);

      return {
        year: y,
        threat,
        defense,
        aiCap: getAiCapability(y, aiTimeline),
        chainProbs: breachProbs,
      };
    });
  }, [blocks, blockStates, sliders, adversaryOc, attackChains, aiTimeline]);

  const aiCurvePoints = riskData
    .map((d) => `${yearToX(d.year)},${valueToY(d.aiCap)}`)
    .join(" ");

  const aiAreaPoints = [
    `${yearToX(YEARS[0])},${PLOT_BOTTOM}`,
    ...riskData.map((d) => `${yearToX(d.year)},${valueToY(d.aiCap)}`),
    `${yearToX(YEARS[YEARS.length - 1])},${PLOT_BOTTOM}`,
  ].join(" ");

  const threatPoints = riskData
    .map((d) => `${yearToX(d.year)},${valueToY(d.threat)}`)
    .join(" ");

  const defensePoints = riskData
    .map((d) => `${yearToX(d.year)},${valueToY(d.defense)}`)
    .join(" ");

  const riskGapPoints = [
    ...riskData.map((d) => `${yearToX(d.year)},${valueToY(Math.max(d.threat, d.defense))}`),
    ...riskData.slice().reverse().map((d) => `${yearToX(d.year)},${valueToY(d.defense)}`),
  ].join(" ");

  // Per-chain lines — assign distinct colors and spread y-labels to avoid overlap
  const CHAIN_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#a78bfa", "#60a5fa", "#34d399", "#f472b6"];
  const chainLines = useMemo(() => {
    if (!showDecomposed) return [];
    return attackChains.map((chain, i) => {
      const points = riskData
        .map((d) => `${yearToX(d.year)},${valueToY(d.chainProbs[chain.id] ?? 0)}`)
        .join(" ");
      const lastProb = riskData[riskData.length - 1]?.chainProbs[chain.id] ?? 0;
      return { chainId: chain.id, chainName: chain.name, points, lastProb, color: CHAIN_COLORS[i % CHAIN_COLORS.length] };
    });
  }, [showDecomposed, riskData, attackChains]);

  const currentX = yearToX(year);
  const currentData = riskData.find((d) => d.year === year) ?? riskData[0];

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

  const legendItems = [
    { id: "threat", color: "#ef4444", dashed: true, label: "Threat", tip: "Highest breach probability across all attack chains at each year. Rises as AI makes attacks easier." },
    { id: "defense", color: "#22c55e", dashed: false, label: "Defense", tip: "Your overall security level (SL/5). Improves as you deploy and mature defenses." },
    { id: "ai", color: "#7c3aed", dashed: false, label: "AI Cap", tip: "AI capability growth (0→100%). Drives threat up and erodes probabilistic defenses over time." },
  ];

  return (
    <div
      className="w-full relative"
      onMouseLeave={() => { setHoveredBucket(null); setHoveredChain(null); setHoveredLegend(null); }}
    >
      {/* Legend (HTML for proper tooltips) */}
      <div className="flex items-center gap-3 mb-0.5 ml-10">
        {legendItems.map((item) => (
          <span
            key={item.id}
            className="relative flex items-center gap-1 text-[10px] text-gray-400 cursor-default group"
            onMouseEnter={() => setHoveredLegend(item.id)}
            onMouseLeave={() => setHoveredLegend(null)}
          >
            <span
              className="inline-block w-3 h-0 border-t-[2px]"
              style={{
                borderColor: item.color,
                borderStyle: item.dashed ? "dashed" : "solid",
                opacity: item.id === "ai" ? 0.5 : 0.85,
              }}
            />
            {item.label}
            {hoveredLegend === item.id && (
              <span className="absolute left-0 top-full mt-1 z-[110] bg-gray-800 border border-gray-700 rounded shadow-lg px-2 py-1 text-[10px] text-gray-300 whitespace-normal w-48 leading-tight">
                {item.tip}
              </span>
            )}
          </span>
        ))}
        <button
          onClick={() => setShowDecomposed(!showDecomposed)}
          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${showDecomposed ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}
        >
          {showDecomposed ? "Chains ✓" : "+ Chains"}
        </button>
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${TRACK_HEIGHT}`} className="select-none">
        {/* AI capability area (background) */}
        <polygon points={aiAreaPoints} fill="#7c3aed" opacity={0.06} />
        <polyline
          points={aiCurvePoints}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={1.5}
          opacity={0.3}
        />

        {/* Risk gap shading */}
        <polygon points={riskGapPoints} fill="#ef4444" opacity={0.08} />

        {/* Defense line (green) */}
        <polyline
          points={defensePoints}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          opacity={0.8}
        />

        {/* Threat line (red, dashed) */}
        <polyline
          points={threatPoints}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="5 3"
          opacity={0.85}
        />

        {/* Per-chain lines (decomposed) — distinct colors, hover highlights */}
        {showDecomposed && chainLines.map(({ chainId, points, color }) => (
          <polyline
            key={chainId}
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={hoveredChain === chainId ? 2 : 1}
            opacity={hoveredChain === chainId ? 1 : hoveredChain ? 0.15 : 0.5}
            onMouseEnter={() => setHoveredChain(chainId)}
            onMouseLeave={() => setHoveredChain(null)}
            className="cursor-pointer"
            style={{ pointerEvents: "stroke" }}
          />
        ))}

        {/* X axis */}
        <line
          x1={PADDING_X}
          y1={PLOT_BOTTOM}
          x2={width - PADDING_X}
          y2={PLOT_BOTTOM}
          stroke="#374151"
          strokeWidth={1}
        />

        {/* Year ticks */}
        {YEARS.map((y) => {
          const x = yearToX(y);
          const isActive = y === year;
          return (
            <g key={y} className="cursor-pointer" onClick={() => setYear(y)}>
              <line
                x1={x}
                y1={PLOT_BOTTOM - 3}
                x2={x}
                y2={PLOT_BOTTOM + 3}
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

        {/* Current year vertical marker */}
        <line
          x1={currentX}
          y1={PLOT_TOP}
          x2={currentX}
          y2={PLOT_BOTTOM - 3}
          stroke="#a78bfa"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.5}
        />

        {/* Current year dots */}
        <circle cx={currentX} cy={valueToY(currentData.threat)} r={3} fill="#ef4444" stroke="#1f2937" strokeWidth={1.5} />
        <circle cx={currentX} cy={valueToY(currentData.defense)} r={3} fill="#22c55e" stroke="#1f2937" strokeWidth={1.5} />
        <circle cx={currentX} cy={valueToY(currentData.aiCap)} r={2.5} fill="#7c3aed" stroke="#1f2937" strokeWidth={1.5} opacity={0.5} />

        {/* Current year value labels */}
        <text x={currentX + 7} y={valueToY(currentData.threat) - 4} fontSize={8} fill="#fca5a5">
          {Math.round(currentData.threat * 100)}%
        </text>
        <text x={currentX + 7} y={valueToY(currentData.defense) + 10} fontSize={8} fill="#86efac">
          SL {(currentData.defense * 5).toFixed(1)}
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
              <rect x={x - 14} y={PLOT_BOTTOM - 18} width={28} height={16} fill="transparent" />
              <polygon
                points={`${x},${PLOT_BOTTOM - 6} ${x - 4},${PLOT_BOTTOM - 13} ${x + 4},${PLOT_BOTTOM - 13}`}
                fill={color}
                opacity={isHovered ? 1 : 0.8}
              />
              {bucket.items.length > 1 && (
                <text x={x + 7} y={PLOT_BOTTOM - 7} fontSize={8} fill={color} fontWeight={600}>
                  {bucket.items.length}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Chain legend (HTML, below SVG when decomposed) */}
      {showDecomposed && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 ml-10 mt-0.5">
          {chainLines.map(({ chainId, chainName, lastProb, color }) => (
            <span
              key={chainId}
              className={`text-[9px] flex items-center gap-1 cursor-default transition-opacity ${hoveredChain && hoveredChain !== chainId ? "opacity-30" : ""}`}
              onMouseEnter={() => setHoveredChain(chainId)}
              onMouseLeave={() => setHoveredChain(null)}
            >
              <span className="inline-block w-2 h-0 border-t-[2px]" style={{ borderColor: color }} />
              <span className="text-gray-400">{chainName}</span>
              <span className="text-gray-600">{Math.round(lastProb * 100)}%</span>
            </span>
          ))}
        </div>
      )}

      {/* Hovered chain tooltip */}
      {hoveredChain && !showDecomposed && (
        <div
          className="absolute z-[100] bg-gray-800 border border-gray-700 rounded shadow-lg px-2 py-1 text-[10px] text-gray-200 pointer-events-none"
          style={{ right: 8, top: 4 }}
        >
          {attackChains.find((c) => c.id === hoveredChain)?.name ?? hoveredChain}
        </div>
      )}

      {/* Bucket hover popup */}
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
