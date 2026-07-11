import { useMemo, useRef, useState } from "react";
import type { Block, BlockState, Sliders } from "../../engine/types";
import { hexPoints, BLOCK_SHORT_LABELS } from "../../utils/geometry";
import {
  DEFENSE_COLORS,
  STATE_FILL_FRACTION,
  URGENCY_BADGE,
  CONTESTED_BADGE,
  SEMANTIC,
  DEPENDENCY_COLOR,
} from "../../utils/colors";
import type { WindowUrgency } from "../../utils/decision-windows";
import { useViewStore } from "../../store/view";
import { aiDegradation } from "../../engine/scoring";
import { getAiCapability } from "../../engine/ai-curve";
import { useSimulationStore } from "../../store/simulation";

interface BlockCellProps {
  block: Block;
  cx: number;
  cy: number;
  size: number;
  state: BlockState;
  year: number;
  sliders: Sliders;
  budgetExceeded: boolean;
  dependencyUnmet?: boolean;
  decisionWindow?: WindowUrgency;
  onSelect: (block: Block) => void;
  onHover: (block: Block, rect: DOMRect) => void;
  onHoverEnd: () => void;
}

const BG_FILL = "#1a1d24";

// Blocks only relevant when model is served externally (API/inference)
const SERVING_ONLY_BLOCKS = new Set(["AI-07", "AI-08", "AI-04", "NET-04"]);

export function BlockCell({
  block,
  cx,
  cy,
  size,
  state,
  year,
  sliders,
  budgetExceeded,
  dependencyUnmet = false,
  decisionWindow,
  onSelect,
  onHover,
  onHoverEnd,
}: BlockCellProps) {
  const hexRef = useRef<SVGPolygonElement>(null);
  const [hovered, setHovered] = useState(false);
  const badges = useViewStore((s) => s.badges);
  const cycleBlockState = useSimulationStore((s) => s.cycleBlockState);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const modelServed = useSimulationStore((s) => s.modelServedExternally);

  const color = DEFENSE_COLORS[block.defense_type];
  const fillFraction = STATE_FILL_FRACTION[state];
  const degradation = aiDegradation(block, year, sliders.ai_timeline);

  const aiCap = getAiCapability(year, sliders.ai_timeline);
  const effectiveOc = adversaryOc + block.adversary_exploitation.ai_oc_shift * aiCap;
  const beyondAdversary = block.adversary_exploitation.oc_threshold_to_exploit > effectiveOc;
  const irrelevantWhenAirgapped = !modelServed && SERVING_ONLY_BLOCKS.has(block.id);

  const points = hexPoints(cx, cy, size);
  const clipId = `clip-${block.id}`;
  const erosionClipId = `erosion-${block.id}`;

  const fillTop = cy + size - fillFraction * size * 2;

  const borderWidth = useMemo(() => {
    switch (state) {
      case "not_started": return 1;
      case "investing": return 1.5;
      case "implementing": return 1.5;
      case "deployed": return 2;
      case "mature": return 2.5;
    }
  }, [state]);

  const borderDash = "none";
  const shortLabel = BLOCK_SHORT_LABELS[block.id] ?? block.id;

  const showErosion = degradation > 0.02 && fillFraction > 0 && block.defense_type !== "hard_stop";
  const erosionHeight = degradation * size * 2 * fillFraction;

  // Expert-disagreement badge for high/fundamental open questions
  const uncertainty = block.open_questions.some((q) => q.uncertainty_level === "fundamental")
    ? "fundamental"
    : block.open_questions.some((q) => q.uncertainty_level === "high")
      ? "high"
      : null;

  function handleMouseEnter() {
    setHovered(true);
    if (hexRef.current) {
      const rect = hexRef.current.getBoundingClientRect();
      onHover(block, rect);
    }
  }

  function handleMouseLeave() {
    setHovered(false);
    onHoverEnd();
  }

  return (
    <g
      className="cursor-pointer select-none"
      opacity={beyondAdversary && state === "not_started" ? 0.35 : irrelevantWhenAirgapped ? 0.3 : 1}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        cycleBlockState(block.id);
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={cx - size} y={fillTop} width={size * 2} height={size * 2} />
        </clipPath>
        {showErosion && (
          <clipPath id={erosionClipId}>
            <rect x={cx - size} y={fillTop} width={size * 2} height={erosionHeight} />
          </clipPath>
        )}
      </defs>

      {/* Dark background */}
      <polygon ref={hexRef} points={points} fill={BG_FILL} />

      {/* Colored fill from bottom */}
      {fillFraction > 0 && (
        <polygon
          points={points}
          fill={color}
          opacity={0.6}
          clipPath={`url(#${clipId})`}
        />
      )}

      {/* Red erosion from top of fill */}
      {showErosion && (
        <polygon
          points={points}
          fill="#dc2626"
          opacity={0.35}
          clipPath={`url(#${erosionClipId})`}
        />
      )}

      {/* Border */}
      <polygon
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={borderWidth}
        strokeDasharray={borderDash}
        opacity={state === "not_started" ? 0.5 : 1}
      />

      {/* Mature glow ring */}
      {state === "mature" && (
        <polygon
          points={hexPoints(cx, cy, size + 3)}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.5}
        />
      )}

      {/* Budget exceeded indicator */}
      {budgetExceeded && badges.overBudget && (
        <polygon
          points={hexPoints(cx, cy, size + 3)}
          fill="none"
          stroke={SEMANTIC.overBudget}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.8}
        />
      )}

      {/* Missing hard prerequisite — capped until its `requires` are operational */}
      {dependencyUnmet && badges.requires && (
        <polygon
          points={hexPoints(cx, cy, size + 3)}
          fill="none"
          stroke={DEPENDENCY_COLOR}
          strokeWidth={1.5}
          strokeDasharray="2 3"
          opacity={0.85}
        />
      )}

      {/* Block ID inside hex */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight={600}
        fill="#e5e7eb"
        className="pointer-events-none"
      >
        {block.id}
      </text>

      {/* Short label below hex */}
      <text
        x={cx}
        y={cy + size + 11}
        textAnchor="middle"
        fontSize={9}
        fill="#9ca3af"
        className="pointer-events-none"
      >
        {shortLabel}
      </text>

      {/* Decision window badge — deadline pressure; urgency carried by weight
          (solid = overdue, outlined = urgent), hue stays threat-red */}
      {decisionWindow && badges.startNow && (
        <g>
          <circle
            cx={cx - size + 4}
            cy={cy - size + 4}
            r={6}
            fill={URGENCY_BADGE[decisionWindow].fill}
            stroke={URGENCY_BADGE[decisionWindow].stroke}
            strokeWidth={1.25}
          >
            {decisionWindow === "overdue" && (
              <animate
                attributeName="opacity"
                values="1;0.35;1"
                dur="2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <text
            x={cx - size + 4}
            y={cy - size + 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fontWeight={700}
            fill={URGENCY_BADGE[decisionWindow].text}
            className="pointer-events-none"
          >
            !
          </text>
        </g>
      )}

      {/* Uncertainty badge — feasibility contested by experts (quiet marker) */}
      {uncertainty && badges.contested && (
        <g>
          <circle
            cx={cx - size + 4}
            cy={cy + size - 4}
            r={5.5}
            fill={CONTESTED_BADGE.fill}
            stroke={CONTESTED_BADGE.stroke}
            strokeWidth={uncertainty === "fundamental" ? 1.5 : 0.75}
          />
          <text
            x={cx - size + 4}
            y={cy + size - 3}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fontWeight={700}
            fill={CONTESTED_BADGE.text}
            className="pointer-events-none"
          >
            ?
          </text>
        </g>
      )}

      {/* Hover affordance: advance state (right-click shortcut still works) */}
      {hovered && (
        <g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            cycleBlockState(block.id);
          }}
        >
          <circle
            cx={cx + size - 4}
            cy={cy + size - 4}
            r={6.5}
            fill="#374151"
            stroke="#9ca3af"
            strokeWidth={0.75}
          />
          <text
            x={cx + size - 4}
            y={cy + size - 3}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fontWeight={700}
            fill="#e5e7eb"
            className="pointer-events-none"
          >
            +
          </text>
        </g>
      )}
    </g>
  );
}
