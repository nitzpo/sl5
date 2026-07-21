import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockState } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { LAYER_ORDER, RING_SVG_SIZE, RING_CENTER } from "../../utils/ring-geometry";
import { computeDecisionWindows } from "../../utils/decision-windows";
import type { WindowUrgency } from "../../utils/decision-windows";
import { RingLayer } from "./RingLayer";
import { BlockTooltip } from "../blocks/BlockTooltip";

interface DefenseRingsProps {
  onSelectBlock: (block: Block) => void;
  onClearSelection?: () => void;
}

export function DefenseRings({ onSelectBlock, onClearSelection }: DefenseRingsProps) {
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

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${RING_SVG_SIZE} ${RING_SVG_SIZE}`}
        className="select-none block mx-auto"
        style={{
          width: "100%",
          maxWidth: `${RING_SVG_SIZE}px`,
          // fit the full composition in the visible canvas without scrolling
          maxHeight: "calc(100vh - 220px)",
        }}
        onClick={() => {
          setSelectedChain(null);
          onClearSelection?.();
        }}
      >
        {/* Background click-catcher: clears selection when clicking empty space within the viewBox */}
        <rect
          x={0}
          y={0}
          width={RING_SVG_SIZE}
          height={RING_SVG_SIZE}
          fill="transparent"
          onClick={() => {
            setSelectedChain(null);
            onClearSelection?.();
          }}
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
