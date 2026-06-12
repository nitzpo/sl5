import { useState } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockState } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { LAYER_ORDER, RING_SVG_SIZE, RING_CENTER } from "../../utils/ring-geometry";
import { RingLayer } from "./RingLayer";
import { BlockTooltip } from "../blocks/BlockTooltip";

interface DefenseRingsProps {
  onSelectBlock: (block: Block) => void;
}

export function DefenseRings({ onSelectBlock }: DefenseRingsProps) {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);

  const { defenseLayerStatus, blocksByLayer } = useSimulationResults();

  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${RING_SVG_SIZE} ${RING_SVG_SIZE}`}
        className="select-none"
        style={{ width: "100%", maxWidth: `${RING_SVG_SIZE}px` }}
      >
        {/* Center asset indicator */}
        <circle
          cx={RING_CENTER.x}
          cy={RING_CENTER.y}
          r={22}
          fill="#7c3aed"
          opacity={0.15}
        />
        <text
          x={RING_CENTER.x}
          y={RING_CENTER.y - 4}
          textAnchor="middle"
          fontSize={8}
          fill="#a78bfa"
          fontWeight={600}
        >
          Model
        </text>
        <text
          x={RING_CENTER.x}
          y={RING_CENTER.y + 6}
          textAnchor="middle"
          fontSize={7}
          fill="#a78bfa"
          opacity={0.7}
        >
          Weights
        </text>

        {/* Rings with blocks */}
        {LAYER_ORDER.map((layerId, idx) => {
          const layerStatus = defenseLayerStatus[layerId] ?? { active: false, strength: 0 };
          const layerBlocks = blocksByLayer[layerId] ?? [];
          return (
            <RingLayer
              key={layerId}
              layerId={layerId}
              ringIdx={idx}
              blocks={layerBlocks}
              blockStates={blockStates}
              strength={layerStatus.strength}
              year={year}
              sliders={sliders}
              onSelectBlock={onSelectBlock}
              onHoverBlock={(block, rect) => {
                setHoveredBlock(block);
                setHoverRect(rect);
              }}
              onHoverEnd={() => {
                setHoveredBlock(null);
                setHoverRect(null);
              }}
            />
          );
        })}
      </svg>

      {hoveredBlock && createPortal(
        <BlockTooltip
          block={hoveredBlock}
          state={(blockStates[hoveredBlock.id] ?? "not_started") as BlockState}
          year={year}
          sliders={sliders}
          anchorRect={hoverRect}
        />,
        document.body
      )}
    </div>
  );
}
