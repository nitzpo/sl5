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
import { LAYER_ORDER, LAYER_LABELS, LAYER_COLORS, resolveLayer } from "../../utils/ring-geometry";
import {
  buildClusterLayout,
  CLUSTER_CENTER,
  CENTER_NODE_RADIUS,
  CLUSTER_BLOCK_SIZE,
} from "../../utils/cluster-geometry";

export type ClusterGrouping = "category" | "layer";

interface ClusterViewProps {
  panZoom: PanZoomState;
  grouping: ClusterGrouping;
  onSelectBlock: (block: Block) => void;
  selectedBlock?: Block | null;
  onClearSelection?: () => void;
}

export function ClusterView({
  panZoom,
  grouping,
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

  // Build the layout for the active grouping. Category: block.category.
  // Layer: first resolvable defense-in-depth layer (fallback monitoring), which
  // matches how the Rings view assigns blocks to layers.
  const layout = useMemo(() => {
    if (grouping === "layer") {
      const groupOf = (b: Block) => {
        for (const lc of b.defense_in_depth?.layer_contributions ?? []) {
          const resolved = resolveLayer(lc);
          if (resolved) return resolved;
        }
        return "monitoring_detection";
      };
      return buildClusterLayout(blocks, LAYER_ORDER, groupOf);
    }
    return buildClusterLayout(blocks, CATEGORY_ORDER, (b) => b.category);
  }, [blocks, grouping]);

  const groupName = (g: string) =>
    grouping === "layer" ? LAYER_LABELS[g] ?? g : CATEGORY_LABELS[g as keyof typeof CATEGORY_LABELS] ?? g;
  const groupColor = (g: string) =>
    grouping === "layer" ? LAYER_COLORS[g] ?? "#6b7280" : "#8b5cf6";

  const hexSize = CLUSTER_BLOCK_SIZE;
  const pos = layout.pos;

  const clearSelection = () => {
    setSelectedChain(null);
    onClearSelection?.();
  };

  return (
    <>
      <PanZoomCanvas
        state={panZoom}
        viewBox={layout.bounds}
        onBackgroundClick={clearSelection}
      >
        {/* Background click-catcher spanning the world bounds */}
        <rect
          x={layout.bounds.minX}
          y={layout.bounds.minY}
          width={layout.bounds.width}
          height={layout.bounds.height}
          fill="transparent"
          onClick={clearSelection}
        />

        {/* Spokes from the central asset out to each cluster (subtle) */}
        {layout.groups.map((g) => {
          const center = layout.groupCenter(g);
          return (
            <line
              key={`spoke-${g}`}
              x1={CLUSTER_CENTER.x}
              y1={CLUSTER_CENTER.y}
              x2={center.x}
              y2={center.y}
              stroke="#374151"
              strokeOpacity={0.35}
              strokeWidth={1}
              className="pointer-events-none"
            />
          );
        })}

        {/* Cluster ring hulls + labels (under the blocks). The label sits in the
            middle of the ring where there's room, and moves above the ring for
            small clusters where a centered label would fall on a hexagon. */}
        {layout.groups.map((g) => {
          const center = layout.groupCenter(g);
          const r = layout.groupRadius(g);
          const color = groupColor(g);
          const label = layout.groupLabel(g);
          return (
            <g key={`hull-${g}`} className="pointer-events-none">
              <circle
                cx={center.x}
                cy={center.y}
                r={r}
                fill={color}
                opacity={0.05}
                stroke={color}
                strokeOpacity={0.25}
                strokeWidth={1}
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline={label.placement === "center" ? "middle" : "auto"}
                fontSize={13}
                fontWeight={600}
                fill={grouping === "layer" ? color : "#cbd5e1"}
                opacity={grouping === "layer" ? 0.95 : 0.9}
              >
                {groupName(g)}
              </text>
            </g>
          );
        })}

        {/* Central asset — the model weights everything defends */}
        <g className="pointer-events-none">
          <circle
            cx={CLUSTER_CENTER.x}
            cy={CLUSTER_CENTER.y}
            r={CENTER_NODE_RADIUS}
            fill="#7c3aed"
            opacity={0.15}
          />
          <circle
            cx={CLUSTER_CENTER.x}
            cy={CLUSTER_CENTER.y}
            r={CENTER_NODE_RADIUS}
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

        {/* Block cells */}
        {blocks.map((block) => {
          const { x, y } = pos(block);
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
