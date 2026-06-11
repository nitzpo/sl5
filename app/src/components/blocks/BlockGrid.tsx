import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockState } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { BlockCell } from "./BlockCell";
import { BlockTooltip } from "./BlockTooltip";
import { ChainOverlay } from "./ChainOverlay";
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  hexPosition,
  gridDimensions,
  HEX_WIDTH,
} from "../../utils/geometry";

interface BlockGridProps {
  onSelectBlock: (block: Block) => void;
}

export function BlockGrid({ onSelectBlock }: BlockGridProps) {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);

  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const budgetExceededIds = useMemo(() => {
    const active = blocks
      .filter((b) => (blockStates[b.id] ?? "not_started") !== "not_started")
      .map((b) => ({ id: b.id, cost: b.dimensions.cost.upfront_millions.min }))
      .sort((a, b) => a.cost - b.cost);
    let total = 0;
    const exceeded = new Set<string>();
    for (const item of active) {
      total += item.cost;
      if (total > sliders.budget_millions) exceeded.add(item.id);
    }
    return exceeded;
  }, [blocks, blockStates, sliders.budget_millions]);

  const blocksByCategory = useMemo(() => {
    const map: Record<string, Block[]> = {};
    for (const b of blocks) {
      if (!map[b.category]) map[b.category] = [];
      map[b.category].push(b);
    }
    return map;
  }, [blocks]);

  const maxBlocksInRow = useMemo(
    () => Math.max(...Object.values(blocksByCategory).map((arr) => arr.length), 0),
    [blocksByCategory]
  );

  const { width, height } = gridDimensions(maxBlocksInRow);
  const hexSize = HEX_WIDTH / 2 - 2;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="select-none"
        style={{ width: "100%", maxWidth: `${Math.round(width * 1.4)}px` }}
      >
        {CATEGORY_ORDER.map((category) => {
          const catBlocks = blocksByCategory[category] ?? [];
          const rowY = hexPosition(category, 0).y;

          return (
            <g key={category}>
              {/* Category label */}
              <text
                x={4}
                y={rowY + 2}
                fontSize={10}
                fill="#6b7280"
                fontWeight={500}
                dominantBaseline="middle"
              >
                {CATEGORY_LABELS[category]}
              </text>

              {/* Block cells */}
              {catBlocks.map((block, idx) => {
                const { x, y } = hexPosition(category, idx);
                const state = (blockStates[block.id] ?? "not_started") as BlockState;
                return (
                  <BlockCell
                    key={block.id}
                    block={block}
                    cx={x}
                    cy={y}
                    size={hexSize}
                    state={state}
                    year={year}
                    sliders={sliders}
                    budgetExceeded={budgetExceededIds.has(block.id)}
                    onSelect={onSelectBlock}
                    onHover={(b, rect) => {
                      setHoveredBlock(b);
                      setHoverRect(rect);
                    }}
                    onHoverEnd={() => {
                      setHoveredBlock(null);
                      setHoverRect(null);
                    }}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Attack chain overlay */}
        <ChainOverlay blocks={blocks} hexSize={hexSize} />
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
