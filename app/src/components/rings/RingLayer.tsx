import type { Block, BlockState, Sliders } from "../../engine/types";
import {
  RING_CENTER,
  RING_RADII,
  RING_BLOCK_SIZE,
  LAYER_LABELS,
  LAYER_COLORS,
  blockPositionOnRing,
} from "../../utils/ring-geometry";
import type { WindowUrgency } from "../../utils/decision-windows";
import { RingBlockCell } from "./RingBlockCell";

interface RingLayerProps {
  layerId: string;
  ringIdx: number;
  blocks: Block[];
  blockStates: Record<string, BlockState>;
  strength: number;
  year: number;
  sliders: Sliders;
  budgetExceededIds: Set<string>;
  decisionWindows: Map<string, WindowUrgency>;
  chainMembers: Set<string>;
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
  budgetExceededIds,
  decisionWindows,
  chainMembers,
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

  const labelX = RING_CENTER.x;
  const labelY = RING_CENTER.y - radius - 6;

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
            budgetExceeded={budgetExceededIds.has(block.id)}
            decisionWindow={decisionWindows.get(block.id)}
            chainMember={chainMembers.has(block.id)}
            onSelect={onSelectBlock}
            onHover={onHoverBlock}
            onHoverEnd={onHoverEnd}
          />
        );
      })}

      {/* Label at top (rendered last = on top of blocks) */}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fontSize={8}
        fill={color}
        opacity={0.85}
        fontWeight={600}
        className="pointer-events-none"
      >
        {label}
      </text>
      <text
        x={labelX}
        y={labelY + 9}
        textAnchor="middle"
        fontSize={7}
        fill={color}
        opacity={0.5}
        className="pointer-events-none"
      >
        {Math.round(strength * 100)}%
      </text>
    </g>
  );
}
