import type { Block, BlockState, Sliders } from "../../engine/types";
import {
  RING_CENTER,
  RING_RADII,
  RING_BLOCK_SIZE,
  LAYER_LABELS,
  LAYER_COLORS,
  blockPositionOnRing,
} from "../../utils/ring-geometry";
import { RingBlockCell } from "./RingBlockCell";

interface RingLayerProps {
  layerId: string;
  ringIdx: number;
  blocks: Block[];
  blockStates: Record<string, BlockState>;
  strength: number;
  year: number;
  sliders: Sliders;
  onSelectBlock: (block: Block) => void;
  onHoverBlock: (block: Block, rect: DOMRect) => void;
  onHoverEnd: () => void;
}

export function RingLayer({
  layerId,
  ringIdx,
  blocks,
  blockStates,
  strength,
  year,
  sliders,
  onSelectBlock,
  onHoverBlock,
  onHoverEnd,
}: RingLayerProps) {
  const radius = RING_RADII[ringIdx];
  const color = LAYER_COLORS[layerId] ?? "#6b7280";
  const label = LAYER_LABELS[layerId] ?? layerId;
  const active = strength > 0.3;

  const strokeWidth = active ? 2.5 : 1.2;
  const strokeOpacity = 0.15 + strength * 0.6;
  const dashArray = active ? "none" : "6 4";

  const labelAngle = -Math.PI / 2;
  const labelX = RING_CENTER.x + radius * Math.cos(labelAngle);
  const labelY = RING_CENTER.y + radius * Math.sin(labelAngle) - 6;

  return (
    <g>
      {/* Ring circle */}
      <circle
        cx={RING_CENTER.x}
        cy={RING_CENTER.y}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        opacity={strokeOpacity}
      />

      {/* Layer label at top */}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fontSize={8}
        fill={color}
        opacity={0.7}
        fontWeight={500}
      >
        {label}
      </text>

      {/* Strength indicator */}
      <text
        x={labelX}
        y={labelY + 9}
        textAnchor="middle"
        fontSize={7}
        fill={color}
        opacity={0.4}
      >
        {Math.round(strength * 100)}%
      </text>

      {/* Blocks on ring */}
      {blocks.map((block, idx) => {
        const pos = blockPositionOnRing(ringIdx, idx, blocks.length);
        const state = (blockStates[block.id] ?? "not_started") as BlockState;
        return (
          <RingBlockCell
            key={block.id}
            block={block}
            cx={pos.x}
            cy={pos.y}
            size={RING_BLOCK_SIZE}
            state={state}
            year={year}
            sliders={sliders}
            onSelect={onSelectBlock}
            onHover={onHoverBlock}
            onHoverEnd={onHoverEnd}
          />
        );
      })}
    </g>
  );
}
