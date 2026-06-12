import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockState } from "../../engine/types";
import { applyBudgetConstraint } from "../../engine";
import { computeDecisionWindows } from "../../utils/decision-windows";
import type { WindowUrgency } from "../../utils/decision-windows";
import { useSimulationStore } from "../../store/simulation";
import { BlockCell } from "./BlockCell";
import { BlockTooltip } from "./BlockTooltip";
import { ChainOverlay } from "./ChainOverlay";
import { DependencyOverlay } from "./DependencyOverlay";
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  hexPosition,
  gridDimensions,
  HEX_WIDTH,
} from "../../utils/geometry";

interface BlockGridProps {
  onSelectBlock: (block: Block) => void;
  selectedBlock?: Block | null;
}

export function BlockGrid({ onSelectBlock, selectedBlock = null }: BlockGridProps) {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);

  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const budgetExceededIds = useMemo(
    () => applyBudgetConstraint(blocks, blockStates, sliders.budget_millions).exceededIds,
    [blocks, blockStates, sliders.budget_millions]
  );

  const decisionWindows = useMemo(() => {
    const map = new Map<string, WindowUrgency>();
    for (const w of computeDecisionWindows(blocks, blockStates, year)) {
      // grid badges only for closing/closed windows; "upcoming" stays in CISO list
      if (w.urgency !== "upcoming") map.set(w.block.id, w.urgency);
    }
    return map;
  }, [blocks, blockStates, year]);

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
                    decisionWindow={decisionWindows.get(block.id)}
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

        {/* Dependency arcs for hovered/selected block */}
        <DependencyOverlay
          blocks={blocks}
          focusBlock={hoveredBlock ?? selectedBlock}
          hexSize={hexSize}
        />

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
