import type { Block, BlockState, Sliders } from "../../engine/types";
import {
  RING_CENTER,
  RING_RADII,
  RING_BLOCK_SIZE,
  LAYER_LABELS,
  LAYER_COLORS,
  blockPositionOnRing,
  ringLabelPosition,
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
  dependencyUnmetIds: Set<string>;
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
  dependencyUnmetIds,
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

  // Labels march out along the NE spoke (kept clear of blocks) with a small
  // leader tick to their ring, so all eight stay readable.
  const anchor = ringLabelPosition(ringIdx);
  const labelX = anchor.x + 9;
  const labelY = anchor.y - 7;

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
            dependencyUnmet={dependencyUnmetIds?.has(block.id) ?? false}
            decisionWindow={decisionWindows.get(block.id)}
            chainMember={chainMembers.has(block.id)}
            onSelect={onSelectBlock}
            onHover={onHoverBlock}
            onHoverEnd={onHoverEnd}
          />
        );
      })}

      {/* Leader tick from the ring to its label */}
      <line
        x1={anchor.x}
        y1={anchor.y}
        x2={labelX - 2}
        y2={labelY + 3}
        stroke={color}
        strokeWidth={0.75}
        opacity={0.45}
        className="pointer-events-none"
      />
      {/* Label along the spoke (rendered last = on top of rings) */}
      <text
        x={labelX}
        y={labelY}
        textAnchor="start"
        fontSize={10}
        fill={color}
        opacity={0.9}
        fontWeight={600}
        className="pointer-events-none"
      >
        {label}
        <tspan fontSize={9} opacity={0.6}>
          {"  "}{Math.round(strength * 100)}%
        </tspan>
      </text>
    </g>
  );
}
