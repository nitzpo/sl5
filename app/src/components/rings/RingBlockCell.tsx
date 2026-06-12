import { useId, useRef } from "react";
import type { Block, BlockState, Sliders } from "../../engine/types";
import { hexPoints } from "../../utils/geometry";
import { DEFENSE_COLORS } from "../../utils/colors";
import { aiDegradation } from "../../engine/scoring";
import { useSimulationStore } from "../../store/simulation";

interface RingBlockCellProps {
  block: Block;
  cx: number;
  cy: number;
  size: number;
  state: BlockState;
  year: number;
  sliders: Sliders;
  onSelect: (block: Block) => void;
  onHover: (block: Block, rect: DOMRect) => void;
  onHoverEnd: () => void;
}

const STATE_FILL: Record<BlockState, number> = {
  not_started: 0,
  investing: 0.2,
  implementing: 0.6,
  deployed: 1.0,
  mature: 1.0,
};

const BG_FILL = "#1a1d24";

export function RingBlockCell({
  block,
  cx,
  cy,
  size,
  state,
  year,
  sliders,
  onSelect,
  onHover,
  onHoverEnd,
}: RingBlockCellProps) {
  const hexRef = useRef<SVGPolygonElement>(null);
  const cycleBlockState = useSimulationStore((s) => s.cycleBlockState);
  const uniqueId = useId();

  const color = DEFENSE_COLORS[block.defense_type];
  const fillFraction = STATE_FILL[state];
  const degradation = aiDegradation(block, year, sliders.ai_timeline);

  const points = hexPoints(cx, cy, size);
  const clipId = `ring-clip-${block.id}-${uniqueId}`;
  const erosionClipId = `ring-erosion-${block.id}-${uniqueId}`;

  const fillTop = cy + size - fillFraction * size * 2;
  const showErosion = degradation > 0.02 && fillFraction > 0 && block.defense_type !== "hard_stop";
  const erosionHeight = degradation * size * 2 * fillFraction;

  const borderWidth = state === "not_started" ? 0.8 : state === "mature" ? 2 : 1.5;

  function handleMouseEnter() {
    if (hexRef.current) {
      onHover(block, hexRef.current.getBoundingClientRect());
    }
  }

  return (
    <g
      className="cursor-pointer select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
      onClick={() => onSelect(block)}
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
    </g>
  );
}
