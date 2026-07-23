import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockState } from "../../engine/types";
import { computeDecisionWindows } from "../../utils/decision-windows";
import type { WindowUrgency } from "../../utils/decision-windows";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { BlockCell } from "../blocks/BlockCell";
import { BlockTooltip } from "../blocks/BlockTooltip";
import { ChainOverlay } from "../blocks/ChainOverlay";
import { DependencyOverlay } from "../blocks/DependencyOverlay";
import { PanZoomCanvas } from "../canvas/PanZoomCanvas";
import type { PanZoomState } from "../../utils/use-viewbox-pan-zoom";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "../../utils/geometry";
import {
  clusterCenter,
  clusterRadius,
  clusterBlockPosition,
  clusterWorldBounds,
  CLUSTER_CENTER,
  CLUSTER_BLOCK_SIZE,
} from "../../utils/cluster-geometry";

interface ClusterViewProps {
  panZoom: PanZoomState;
  onSelectBlock: (block: Block) => void;
  selectedBlock?: Block | null;
  onClearSelection?: () => void;
}

export function ClusterView({
  panZoom,
  onSelectBlock,
  selectedBlock = null,
  onClearSelection,
}: ClusterViewProps) {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);
  const setSelectedChain = useSimulationStore((s) => s.setSelectedChain);

  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const { budgetExceededIds, dependencyUnmetIds } = useSimulationResults();

  const decisionWindows = useMemo(() => {
    const map = new Map<string, WindowUrgency>();
    for (const w of computeDecisionWindows(blocks, blockStates, year)) {
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

  const bounds = useMemo(() => clusterWorldBounds(blocks), [blocks]);
  const hexSize = CLUSTER_BLOCK_SIZE;
  const pos = (block: Block) => clusterBlockPosition(blocks, block);

  const clearSelection = () => {
    setSelectedChain(null);
    onClearSelection?.();
  };

  return (
    <>
      <PanZoomCanvas
        state={panZoom}
        viewBox={bounds}
        onBackgroundClick={clearSelection}
      >
        {/* Background click-catcher spanning the world bounds */}
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="transparent"
          onClick={clearSelection}
        />

        {/* Cluster hulls + labels (drawn first, under everything) */}
        {CATEGORY_ORDER.map((category) => {
          const catBlocks = blocksByCategory[category] ?? [];
          if (catBlocks.length === 0) return null;
          const center = clusterCenter(category);
          const r = clusterRadius(catBlocks.length);
          return (
            <g key={`hull-${category}`} className="pointer-events-none">
              <circle
                cx={center.x}
                cy={center.y}
                r={r}
                fill="#8b5cf6"
                opacity={0.04}
                stroke="#4b5563"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              <text
                x={center.x}
                y={center.y - r - 8}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="#9ca3af"
              >
                {CATEGORY_LABELS[category]}
              </text>
            </g>
          );
        })}

        {/* Spokes from the central asset out to each cluster (subtle) */}
        {CATEGORY_ORDER.map((category) => {
          const catBlocks = blocksByCategory[category] ?? [];
          if (catBlocks.length === 0) return null;
          const center = clusterCenter(category);
          return (
            <line
              key={`spoke-${category}`}
              x1={CLUSTER_CENTER.x}
              y1={CLUSTER_CENTER.y}
              x2={center.x}
              y2={center.y}
              stroke="#374151"
              strokeOpacity={0.4}
              strokeWidth={1}
              className="pointer-events-none"
            />
          );
        })}

        {/* Central asset — the model weights everything defends */}
        <g className="pointer-events-none">
          <circle
            cx={CLUSTER_CENTER.x}
            cy={CLUSTER_CENTER.y}
            r={34}
            fill="#7c3aed"
            opacity={0.15}
          />
          <circle
            cx={CLUSTER_CENTER.x}
            cy={CLUSTER_CENTER.y}
            r={34}
            fill="none"
            stroke="#a78bfa"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          <text
            x={CLUSTER_CENTER.x}
            y={CLUSTER_CENTER.y - 4}
            textAnchor="middle"
            fontSize={12}
            fill="#a78bfa"
            fontWeight={600}
          >
            Model
          </text>
          <text
            x={CLUSTER_CENTER.x}
            y={CLUSTER_CENTER.y + 10}
            textAnchor="middle"
            fontSize={10}
            fill="#a78bfa"
            opacity={0.7}
          >
            Weights
          </text>
        </g>

        {/* Dependency arcs (hover-focused, or the whole web when toggled on) */}
        <DependencyOverlay
          blocks={blocks}
          focusBlock={hoveredBlock ?? selectedBlock}
          hexSize={hexSize}
          pos={pos}
        />

        {/* Attack chain overlay */}
        <ChainOverlay blocks={blocks} hexSize={hexSize} pos={pos} />

        {/* Block cells, per cluster */}
        {CATEGORY_ORDER.map((category) => {
          const catBlocks = blocksByCategory[category] ?? [];
          return (
            <g key={category}>
              {catBlocks.map((block) => {
                const { x, y } = clusterBlockPosition(blocks, block);
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
                    dependencyUnmet={dependencyUnmetIds.has(block.id)}
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
      </PanZoomCanvas>

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
    </>
  );
}
