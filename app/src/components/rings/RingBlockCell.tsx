import { useId, useRef, useState } from "react";
import type { Block, BlockState, Sliders } from "../../engine/types";
import { hexPoints } from "../../utils/geometry";
import { DEFENSE_COLORS, STATE_FILL_FRACTION } from "../../utils/colors";
import { URGENCY_COLORS } from "../../utils/decision-windows";
import type { WindowUrgency } from "../../utils/decision-windows";
import { aiDegradation } from "../../engine/scoring";
import { useSimulationStore } from "../../store/simulation";
import { useViewStore } from "../../store/view";

interface RingBlockCellProps {
  block: Block;
  cx: number;
  cy: number;
  size: number;
  state: BlockState;
  year: number;
  sliders: Sliders;
  budgetExceeded?: boolean;
  decisionWindow?: WindowUrgency;
  chainMember?: boolean;
  onSelect: (block: Block) => void;
  onHover: (block: Block, rect: DOMRect) => void;
  onHoverEnd: () => void;
}

const BG_FILL = "#1a1d24";

export function RingBlockCell({
  block,
  cx,
  cy,
  size,
  state,
  year,
  sliders,
  budgetExceeded,
  decisionWindow,
  chainMember,
  onSelect,
  onHover,
  onHoverEnd,
}: RingBlockCellProps) {
  const hexRef = useRef<SVGPolygonElement>(null);
  const [hovered, setHovered] = useState(false);
  const badges = useViewStore((s) => s.badges);
  const cycleBlockState = useSimulationStore((s) => s.cycleBlockState);
  const uniqueId = useId();

  const color = DEFENSE_COLORS[block.defense_type];
  const fillFraction = STATE_FILL_FRACTION[state];
  const degradation = aiDegradation(block, year, sliders.ai_timeline);

  const points = hexPoints(cx, cy, size);
  const clipId = `ring-clip-${block.id}-${uniqueId}`;
  const erosionClipId = `ring-erosion-${block.id}-${uniqueId}`;

  const fillTop = cy + size - fillFraction * size * 2;
  const showErosion = degradation > 0.02 && fillFraction > 0 && block.defense_type !== "hard_stop";
  const erosionHeight = degradation * size * 2 * fillFraction;

  const borderWidth = state === "not_started" ? 0.8 : state === "mature" ? 2 : 1.5;

  const deployed = state === "deployed" || state === "mature";
  const uncertainty = block.open_questions.some((q) => q.uncertainty_level === "fundamental")
    ? "fundamental"
    : block.open_questions.some((q) => q.uncertainty_level === "high")
      ? "high"
      : null;

  function handleMouseEnter() {
    setHovered(true);
    if (hexRef.current) {
      onHover(block, hexRef.current.getBoundingClientRect());
    }
  }

  function handleMouseLeave() {
    setHovered(false);
    onHoverEnd();
  }

  return (
    <g
      className="cursor-pointer select-none"
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

      {/* Selected-chain highlight halo */}
      {chainMember && (
        <polygon
          points={hexPoints(cx, cy, size + 3)}
          fill="none"
          stroke={deployed ? "#10b981" : "#ef4444"}
          strokeWidth={1.5}
          opacity={0.85}
        />
      )}

      <polygon ref={hexRef} points={points} fill={BG_FILL} />

      {fillFraction > 0 && (
        <polygon
          points={points}
          fill={color}
          opacity={0.6}
          clipPath={`url(#${clipId})`}
        />
      )}

      {showErosion && (
        <polygon
          points={points}
          fill="#dc2626"
          opacity={0.35}
          clipPath={`url(#${erosionClipId})`}
        />
      )}

      <polygon
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={borderWidth}
        opacity={state === "not_started" ? 0.5 : 1}
      />

      {state === "mature" && (
        <polygon
          points={hexPoints(cx, cy, size + 2)}
          fill="none"
          stroke={color}
          strokeWidth={0.8}
          opacity={0.5}
        />
      )}

      {/* Budget exceeded — dashed amber halo */}
      {budgetExceeded && badges.overBudget && (
        <polygon
          points={hexPoints(cx, cy, size + 2)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.7}
        />
      )}

      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={7}
        fontWeight={600}
        fill="#e5e7eb"
        className="pointer-events-none"
      >
        {block.id}
      </text>

      {/* Decision window badge (top-left) */}
      {decisionWindow && badges.startNow && (
        <g>
          <circle cx={cx - size + 3} cy={cy - size + 3} r={4} fill={URGENCY_COLORS[decisionWindow]}>
            {decisionWindow !== "upcoming" && (
              <animate attributeName="opacity" values="1;0.35;1" dur="2s" repeatCount="indefinite" />
            )}
          </circle>
          <text
            x={cx - size + 3}
            y={cy - size + 3.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={5.5}
            fontWeight={700}
            fill="#fff"
            className="pointer-events-none"
          >
            !
          </text>
        </g>
      )}

      {/* Uncertainty badge (bottom-left) */}
      {uncertainty && badges.contested && (
        <g>
          <circle
            cx={cx - size + 3}
            cy={cy + size - 3}
            r={3.5}
            fill={uncertainty === "fundamental" ? "#7c3aed" : "#b45309"}
            opacity={0.9}
          />
          <text
            x={cx - size + 3}
            y={cy + size - 2.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={5}
            fontWeight={700}
            fill="#fff"
            className="pointer-events-none"
          >
            ?
          </text>
        </g>
      )}

      {/* Erosion badge (top-right) */}
      {showErosion && degradation > 0.1 && (
        <circle cx={cx + size - 3} cy={cy - size + 3} r={4} fill="#991b1b" opacity={0.9} />
      )}

      {/* Hover affordance: advance state (bottom-right) */}
      {hovered && (
        <g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            cycleBlockState(block.id);
          }}
        >
          <circle cx={cx + size - 3} cy={cy + size - 3} r={5} fill="#374151" stroke="#9ca3af" strokeWidth={0.6} />
          <text
            x={cx + size - 3}
            y={cy + size - 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
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
