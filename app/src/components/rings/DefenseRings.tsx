import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockState } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import {
  LAYER_ORDER,
  RING_SVG_SIZE,
  RING_CENTER,
  RING_BLOCK_SIZE,
  blockPositionOnRing,
} from "../../utils/ring-geometry";
import { computeDecisionWindows } from "../../utils/decision-windows";
import type { WindowUrgency } from "../../utils/decision-windows";
import { RingLayer } from "./RingLayer";
import { BlockTooltip } from "../blocks/BlockTooltip";
import { ChainOverlay } from "../blocks/ChainOverlay";
import { DependencyOverlay } from "../blocks/DependencyOverlay";
import { PanZoomCanvas } from "../canvas/PanZoomCanvas";
import type { PanZoomState } from "../../utils/use-viewbox-pan-zoom";

interface DefenseRingsProps {
  panZoom: PanZoomState;
  onSelectBlock: (block: Block) => void;
  selectedBlock?: Block | null;
  onClearSelection?: () => void;
}

export function DefenseRings({
  panZoom,
  onSelectBlock,
  selectedBlock = null,
  onClearSelection,
}: DefenseRingsProps) {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);
  const setSelectedChain = useSimulationStore((s) => s.setSelectedChain);
  const selectedChainId = useSimulationStore((s) => s.selectedChainId);
  const attackChains = useSimulationStore((s) => s.attackChains);

  const { defenseLayerStatus, blocksByLayer, budgetExceededIds, dependencyUnmetIds } =
    useSimulationResults();

  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const decisionWindows = useMemo(() => {
    const map = new Map<string, WindowUrgency>();
    for (const w of computeDecisionWindows(blocks, blockStates, year)) {
      if (w.urgency !== "upcoming") map.set(w.block.id, w.urgency);
    }
    return map;
  }, [blocks, blockStates, year]);

  const chainMembers = useMemo(() => {
    const chain = attackChains.find((c) => c.id === selectedChainId);
    return new Set(chain?.stoppers ?? []);
  }, [attackChains, selectedChainId]);

  // Position lookup mirroring RingLayer's placement, so the shared dependency /
  // chain overlays can draw arcs between blocks on their rings.
  const posMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    LAYER_ORDER.forEach((layerId, ringIdx) => {
      const layerBlocks = blocksByLayer[layerId] ?? [];
      layerBlocks.forEach((block, idx) => {
        map.set(block.id, blockPositionOnRing(ringIdx, idx, layerBlocks.length));
      });
    });
    return map;
  }, [blocksByLayer]);

  const pos = (block: Block) => posMap.get(block.id) ?? RING_CENTER;

  const clearSelection = () => {
    setSelectedChain(null);
    onClearSelection?.();
  };

  return (
    <>
      <PanZoomCanvas
        state={panZoom}
        viewBox={{ minX: 0, minY: 0, width: RING_SVG_SIZE, height: RING_SVG_SIZE }}
        onBackgroundClick={clearSelection}
      >
        {/* Transparent backdrop. Clearing is handled by PanZoomCanvas's guarded
            click (ignores the trailing click after a pan), so no handler here. */}
        <rect
          x={0}
          y={0}
          width={RING_SVG_SIZE}
          height={RING_SVG_SIZE}
          fill="transparent"
        />
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
          fontSize={10}
          fill="#a78bfa"
          fontWeight={600}
        >
          Model
        </text>
        <text
          x={RING_CENTER.x}
          y={RING_CENTER.y + 8}
          textAnchor="middle"
          fontSize={9}
          fill="#a78bfa"
          opacity={0.7}
        >
          Weights
        </text>

        {/* Dependency arcs (hover-focused, or the whole web when toggled on) */}
        <DependencyOverlay
          blocks={blocks}
          focusBlock={hoveredBlock ?? selectedBlock}
          hexSize={RING_BLOCK_SIZE}
          pos={pos}
        />

        {/* Attack chain overlay */}
        <ChainOverlay blocks={blocks} hexSize={RING_BLOCK_SIZE} pos={pos} />

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
              budgetExceededIds={budgetExceededIds}
              dependencyUnmetIds={dependencyUnmetIds}
              decisionWindows={decisionWindows}
              chainMembers={chainMembers}
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
