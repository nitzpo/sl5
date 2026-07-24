import { useMemo, useState } from "react";
import { useSimulationStore } from "../../store/simulation";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { getAiCapability } from "../../engine/ai-curve";
import { computeCategoryScores, overallSlScore, relevantBlockIds } from "../../engine/scoring";
import { computeBreachProbabilities } from "../../engine/breach";
import { applyBudgetConstraint } from "../../engine/budget";
import { applyDependencyConstraint } from "../../engine/dependencies";
import { computeDecisionWindows } from "../../utils/decision-windows";
import { SEMANTIC, URGENCY_BADGE, chainSeries } from "../../utils/colors";
import { formatSl } from "../../utils/format";

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

// One normalized 0–1 axis (never dual-axis): threat and AI capability are
// probabilities; the defense line is SL/5, direct-labeled as "SL x.x".
const W = 1400;
const H = 196;
const PAD_L = 52;
const PAD_R = 70;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 168;
// Must-start deadline markers sit ON the axis (just below it); year labels sit
// just under those, small and close to the ticks — no separate deadline lane.
const DEADLINE_Y = PLOT_BOTTOM + 2;
const YEAR_LABEL_Y = PLOT_BOTTOM + 22;
const PLOT_RANGE = PLOT_BOTTOM - PLOT_TOP;

const GRID = "#1f2937";
const AXIS = "#374151";
const MUTED = "#6b7280";

function yearToX(y: number): number {
  return PAD_L + ((y - YEARS[0]) / (YEARS[YEARS.length - 1] - YEARS[0])) * (W - PAD_L - PAD_R);
}

function valueToY(v: number): number {
  return PLOT_BOTTOM - v * PLOT_RANGE;
}

interface Deadline {
  id: string;
  name: string;
  mustStartBy: number;
}

interface Bucket {
  center: number;
  items: Deadline[];
  urgency: "overdue" | "urgent" | "upcoming";
}

export function TimelineTrack() {
  const year = useSimulationStore((s) => s.year);
  const setYear = useSimulationStore((s) => s.setYear);
  const setPerspective = useSimulationStore((s) => s.setPerspective);
  const sliders = useSimulationStore((s) => s.sliders);
  const aiTimeline = sliders.ai_timeline;
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const advanceOrder = useSimulationStore((s) => s.advanceOrder);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const modelServedExternally = useSimulationStore((s) => s.modelServedExternally);

  const activeScript = usePlaybackStore((s) => s.activeScript);
  const playbackT = usePlaybackStore((s) => s.playbackT);
  const setPlaybackT = usePlaybackStore((s) => s.setPlaybackT);

  const [showDecomposed, setShowDecomposed] = useState(false);
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);
  const [hoveredBeat, setHoveredBeat] = useState<number | null>(null);

  const riskData = useMemo(() => {
    const { effectiveStates: budgeted } = applyBudgetConstraint(
      blocks, blockStates, sliders.budget_millions,
      { order: advanceOrder, riskTolerance: sliders.risk_tolerance }
    );
    const { effectiveStates } = applyDependencyConstraint(blocks, budgeted);
    const relevantIds = relevantBlockIds(attackChains);
    return YEARS.map((y) => {
      const catScores = computeCategoryScores(blocks, effectiveStates, y, sliders, relevantIds);
      const sl = overallSlScore(catScores);
      const defense = sl / 5;

      const breachProbs = computeBreachProbabilities(
        attackChains, blocks, effectiveStates, adversaryOc, y, sliders, modelServedExternally
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
  }, [blocks, blockStates, advanceOrder, sliders, adversaryOc, attackChains, aiTimeline, modelServedExternally]);

  const toPoints = (get: (d: (typeof riskData)[number]) => number) =>
    riskData.map((d) => `${yearToX(d.year)},${valueToY(get(d))}`).join(" ");

  const aiCurvePoints = toPoints((d) => d.aiCap);
  const aiAreaPoints = [
    `${yearToX(YEARS[0])},${PLOT_BOTTOM}`,
    aiCurvePoints,
    `${yearToX(YEARS[YEARS.length - 1])},${PLOT_BOTTOM}`,
  ].join(" ");
  const threatPoints = toPoints((d) => d.threat);
  const defensePoints = toPoints((d) => d.defense);

  const riskGapPoints = [
    ...riskData.map((d) => `${yearToX(d.year)},${valueToY(Math.max(d.threat, d.defense))}`),
    ...riskData.slice().reverse().map((d) => `${yearToX(d.year)},${valueToY(d.defense)}`),
  ].join(" ");

  // Label the exposure gap once, at its widest year (only when it's substantial)
  const gapLabel = useMemo(() => {
    let bestIdx = -1;
    let bestGap = 0.18; // only label gaps worth talking about
    riskData.forEach((d, i) => {
      const gap = Math.max(d.threat, d.defense) - d.defense;
      if (gap > bestGap) {
        bestGap = gap;
        bestIdx = i;
      }
    });
    if (bestIdx < 0) return null;
    const d = riskData[bestIdx];
    return {
      x: yearToX(d.year),
      y: (valueToY(Math.max(d.threat, d.defense)) + valueToY(d.defense)) / 2,
    };
  }, [riskData]);

  const chainLines = useMemo(() => {
    if (!showDecomposed) return [];
    return attackChains.map((chain, i) => {
      const points = riskData
        .map((d) => `${yearToX(d.year)},${valueToY(d.chainProbs[chain.id] ?? 0)}`)
        .join(" ");
      const atYearProb =
        riskData.find((d) => d.year === year)?.chainProbs[chain.id] ??
        riskData[riskData.length - 1]?.chainProbs[chain.id] ??
        0;
      const series = chainSeries(chain.id, i);
      return { chainId: chain.id, chainName: chain.name, points, atYearProb, ...series };
    });
  }, [showDecomposed, riskData, attackChains, year]);

  const currentX = yearToX(year);
  const currentData = riskData.find((d) => d.year === year) ?? riskData[0];
  // Near the right edge, value labels flip to the left of the dot
  const labelsFlip = currentX > W - PAD_R - 70;
  const labelX = labelsFlip ? currentX - 9 : currentX + 9;
  const labelAnchor = labelsFlip ? "end" : "start";
  // Keep the two labels from colliding when the lines cross
  const threatY = valueToY(currentData.threat);
  const defenseYraw = valueToY(currentData.defense) + 12;
  const defenseY = Math.abs(defenseYraw - (threatY - 5)) < 14 ? defenseYraw + 14 : defenseYraw;

  const buckets = useMemo(() => {
    const items: Deadline[] = computeDecisionWindows(blocks, blockStates, year, {
      minYear: 2024,
    }).map((w) => ({ id: w.block.id, name: w.block.name, mustStartBy: w.mustStartBy }));

    const bucketMap = new Map<number, Deadline[]>();
    for (const item of items) {
      const center = Math.round(item.mustStartBy * 2) / 2;
      if (!bucketMap.has(center)) bucketMap.set(center, []);
      bucketMap.get(center)!.push(item);
    }

    const result: Bucket[] = [];
    for (const [center, bucketItems] of bucketMap) {
      result.push({
        center,
        items: bucketItems.sort((a, b) => a.mustStartBy - b.mustStartBy),
        urgency: center <= year ? "overdue" : center <= year + 1 ? "urgent" : "upcoming",
      });
    }
    return result.sort((a, b) => a.center - b.center);
  }, [blocks, blockStates, year]);

  // Story beats: each annotation plotted at its year while a script is playing.
  const startYear = activeScript?.startYear ?? 2024;
  const beats = useMemo(() => {
    if (!activeScript?.annotations) return [];
    const currentYear = startYear + playbackT;
    return activeScript.annotations
      .filter((a) => a.atYear >= YEARS[0] && a.atYear <= YEARS[YEARS.length - 1])
      .map((a) => ({
        atYear: a.atYear,
        message: a.message,
        x: yearToX(a.atYear),
        reached: currentYear >= a.atYear,
      }));
  }, [activeScript, startYear, playbackT]);

  const legendItems = [
    { id: "threat", color: SEMANTIC.threat, dashed: true, label: "Threat", tip: "Highest breach probability across all attack chains at each year. Rises as AI makes attacks easier. Hidden while chains are decomposed (it is their upper envelope)." },
    { id: "defense", color: SEMANTIC.defense, dashed: false, label: "Defense", tip: "Your overall security level (SL/5, shown on the same 0-100% scale). Improves as you deploy and mature defenses." },
    { id: "ai", color: SEMANTIC.ai, dashed: false, label: "AI Cap", tip: "AI capability growth (0→100%). Drives threat up and erodes probabilistic defenses over time." },
  ];

  return (
    <div
      className="w-full relative"
      onMouseLeave={() => { setHoveredBucket(null); setHoveredChain(null); setHoveredLegend(null); setHoveredBeat(null); }}
    >
      {/* Legend (HTML for proper tooltips) */}
      <div className="flex items-center gap-3 mb-0.5" style={{ marginLeft: `${(PAD_L / W) * 100}%` }}>
        {legendItems.map((item) => (
          <span
            key={item.id}
            className={`relative flex items-center gap-1 text-[11px] text-gray-400 cursor-default group ${
              item.id === "threat" && showDecomposed ? "opacity-40" : ""
            }`}
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
              <span className="absolute left-0 top-full mt-1 z-[110] bg-gray-800 border border-gray-700 rounded shadow-lg px-2 py-1 text-[11px] text-gray-300 whitespace-normal w-52 leading-tight">
                {item.tip}
              </span>
            )}
          </span>
        ))}
        <button
          onClick={() => setShowDecomposed(!showDecomposed)}
          className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${showDecomposed ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}
        >
          {showDecomposed ? "Chains ✓" : "+ Chains"}
        </button>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="select-none">
        {/* Gridlines + probability axis (one normalized scale for everything) */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={valueToY(v)}
              x2={W - PAD_R}
              y2={valueToY(v)}
              stroke={v === 0 ? AXIS : GRID}
              strokeWidth={1}
            />
            <text
              x={PAD_L - 8}
              y={valueToY(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill={MUTED}
            >
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}

        {/* AI capability area (background) */}
        <polygon points={aiAreaPoints} fill={SEMANTIC.ai} opacity={0.06} />
        <polyline points={aiCurvePoints} fill="none" stroke={SEMANTIC.ai} strokeWidth={1.75} opacity={0.35} />

        {/* Exposure gap between threat and defense */}
        <polygon points={riskGapPoints} fill={SEMANTIC.threat} opacity={0.07} />
        {gapLabel && !showDecomposed && (
          <text
            x={gapLabel.x}
            y={gapLabel.y}
            textAnchor="middle"
            fontSize={11}
            fill="#f87171"
            opacity={0.6}
            className="pointer-events-none uppercase"
            letterSpacing={1.5}
          >
            exposure gap
          </text>
        )}

        {/* Defense line */}
        <polyline points={defensePoints} fill="none" stroke={SEMANTIC.defense} strokeWidth={2.5} opacity={0.85} />

        {/* Threat line — hidden while decomposed (it is the chains' upper envelope) */}
        {!showDecomposed && (
          <polyline
            points={threatPoints}
            fill="none"
            stroke={SEMANTIC.threat}
            strokeWidth={2.5}
            strokeDasharray="6 4"
            opacity={0.85}
          />
        )}

        {/* Per-chain lines (decomposed) — fixed per-chain hue + dash, hover highlights */}
        {showDecomposed && chainLines.map(({ chainId, points, color, dash }) => (
          <polyline
            key={chainId}
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={hoveredChain === chainId ? 2.5 : 1.5}
            strokeDasharray={dash}
            opacity={hoveredChain === chainId ? 1 : hoveredChain ? 0.15 : 0.75}
            onMouseEnter={() => setHoveredChain(chainId)}
            onMouseLeave={() => setHoveredChain(null)}
            className="cursor-pointer"
            style={{ pointerEvents: "stroke" }}
          />
        ))}

        {/* Year ticks — small labels tucked just under the axis ticks */}
        {YEARS.map((y) => {
          const x = yearToX(y);
          const isActive = y === year;
          return (
            <g key={y} className="cursor-pointer" onClick={() => setYear(y)}>
              {/* generous invisible hit target */}
              <rect x={x - 40} y={PLOT_BOTTOM} width={80} height={H - PLOT_BOTTOM} fill="transparent" />
              <line
                x1={x}
                y1={PLOT_BOTTOM - 4}
                x2={x}
                y2={PLOT_BOTTOM + 4}
                stroke={isActive ? "#a78bfa" : "#4b5563"}
                strokeWidth={isActive ? 2 : 1}
              />
              <text
                x={x}
                y={YEAR_LABEL_Y}
                textAnchor="middle"
                fontSize={10}
                fill={isActive ? "#e5e7eb" : MUTED}
                fontWeight={isActive ? 600 : 400}
              >
                {y}
              </text>
            </g>
          );
        })}

        {/* Must-start deadline markers — sit ON the axis (small triangles just
            below it, pointing up at the axis), no separate lane or side label */}
        {buckets.map((bucket, i) => {
          const x = yearToX(Math.max(2024, Math.min(2030, bucket.center)));
          const style = URGENCY_BADGE[bucket.urgency];
          const isHovered = hoveredBucket === i;
          const yBase = DEADLINE_Y + 9;
          return (
            <g key={bucket.center} className="cursor-pointer" onMouseEnter={() => setHoveredBucket(i)}>
              <rect x={x - 10} y={DEADLINE_Y - 2} width={20} height={16} fill="transparent" />
              {/* triangle apex touches the axis, base sits below */}
              <polygon
                points={`${x},${DEADLINE_Y} ${x - 4.5},${yBase} ${x + 4.5},${yBase}`}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={1}
                opacity={isHovered ? 1 : 0.9}
              />
              {bucket.items.length > 1 && (
                <text x={x + 7} y={yBase} fontSize={10} fill={style.stroke} fontWeight={600}>
                  {bucket.items.length}
                </text>
              )}
            </g>
          );
        })}

        {/* Story beats — one marker per annotation while a script plays */}
        {beats.map((beat, i) => {
          const isHovered = hoveredBeat === i;
          const yTop = PLOT_TOP + 2;
          const fill = beat.reached ? "#a78bfa" : "#4b5563";
          return (
            <g
              key={`${beat.atYear}-${i}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredBeat(i)}
              onMouseLeave={() => setHoveredBeat(null)}
              onClick={() => setPlaybackT(beat.atYear - startYear)}
            >
              <rect x={beat.x - 8} y={PLOT_TOP - 2} width={16} height={16} fill="transparent" />
              <polygon
                points={`${beat.x},${yTop} ${beat.x + 4},${yTop + 4} ${beat.x},${yTop + 8} ${beat.x - 4},${yTop + 4}`}
                fill={fill}
                stroke="#111827"
                strokeWidth={1}
                opacity={isHovered ? 1 : 0.9}
              />
            </g>
          );
        })}

        {/* Current year vertical marker */}
        <line
          x1={currentX}
          y1={PLOT_TOP}
          x2={currentX}
          y2={PLOT_BOTTOM}
          stroke="#a78bfa"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.5}
        />

        {/* Current year dots */}
        {!showDecomposed && (
          <circle cx={currentX} cy={threatY} r={4} fill={SEMANTIC.threat} stroke="#111827" strokeWidth={1.5} />
        )}
        <circle cx={currentX} cy={valueToY(currentData.defense)} r={4} fill={SEMANTIC.defense} stroke="#111827" strokeWidth={1.5} />
        <circle cx={currentX} cy={valueToY(currentData.aiCap)} r={3} fill={SEMANTIC.ai} stroke="#111827" strokeWidth={1.5} opacity={0.6} />

        {/* Current year value labels — flip near the right edge, never collide */}
        {!showDecomposed && (
          <text
            x={labelX}
            y={Math.max(threatY - 6, PLOT_TOP + 10)}
            textAnchor={labelAnchor}
            fontSize={13}
            fontWeight={600}
            fill="#fca5a5"
          >
            {Math.round(currentData.threat * 100)}%
          </text>
        )}
        <text x={labelX} y={defenseY} textAnchor={labelAnchor} fontSize={13} fontWeight={600} fill="#86efac">
          SL {formatSl(currentData.defense * 5)}
        </text>
      </svg>

      {/* Chain legend (HTML, below SVG when decomposed) */}
      {showDecomposed && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5" style={{ marginLeft: `${(PAD_L / W) * 100}%` }}>
          {chainLines.map(({ chainId, chainName, atYearProb, color }) => (
            <span
              key={chainId}
              className={`text-[11px] flex items-center gap-1 cursor-default transition-opacity ${hoveredChain && hoveredChain !== chainId ? "opacity-30" : ""}`}
              onMouseEnter={() => setHoveredChain(chainId)}
              onMouseLeave={() => setHoveredChain(null)}
            >
              <span className="inline-block w-2.5 h-0 border-t-[2px]" style={{ borderColor: color }} />
              <span className="text-gray-400">{chainName}</span>
              <span className="text-gray-600">{Math.round(atYearProb * 100)}%</span>
            </span>
          ))}
        </div>
      )}

      {/* Bucket hover popup */}
      {hoveredBucket !== null && buckets[hoveredBucket] && (
        <div
          className="absolute z-[100] bg-gray-800 border border-gray-700 rounded shadow-lg p-2 text-[11px] max-w-[240px]"
          style={{
            left: `${(yearToX(Math.max(2024, Math.min(2030, buckets[hoveredBucket].center))) / W) * 100}%`,
            bottom: "18%",
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

      {/* Story-beat hover popup */}
      {hoveredBeat !== null && beats[hoveredBeat] && (
        <div
          className="absolute z-[100] bg-gray-800 border border-violet-800/40 rounded shadow-lg px-2 py-1 text-[11px] text-violet-200 max-w-[220px] leading-snug pointer-events-none"
          style={{
            left: `${(beats[hoveredBeat].x / W) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <span className="text-gray-500">{beats[hoveredBeat].atYear}</span>{" "}
          {beats[hoveredBeat].message}
        </div>
      )}
    </div>
  );
}
