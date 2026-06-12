import { useMemo } from "react";
import { useSimulationStore } from "../../store/simulation";
import { blockGridPosition } from "../../utils/geometry";
import type { Block, BlockState } from "../../engine/types";

interface ChainOverlayProps {
  blocks: Block[];
  hexSize: number;
}

export function ChainOverlay({ blocks, hexSize }: ChainOverlayProps) {
  const selectedChainId = useSimulationStore((s) => s.selectedChainId);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const blockStates = useSimulationStore((s) => s.blockStates);

  const chain = attackChains.find((c) => c.id === selectedChainId);

  const positions = useMemo(() => {
    if (!chain) return [];
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    return chain.stoppers
      .map((id) => {
        const block = blockMap.get(id);
        if (!block) return null;
        const pos = blockGridPosition(blocks, block);
        const state = (blockStates[id] ?? "not_started") as BlockState;
        const deployed = state === "deployed" || state === "mature";
        return { id, ...pos, deployed };
      })
      .filter(Boolean) as { id: string; x: number; y: number; deployed: boolean }[];
  }, [chain, blocks, blockStates]);

  if (!chain || positions.length === 0) return null;

  const pathD = positions
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <g className="pointer-events-none">
      {/* Connecting path */}
      <path
        d={pathD}
        fill="none"
        stroke="#ef4444"
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={0.6}
      />

      {/* Rings around involved blocks */}
      {positions.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={hexSize + 4}
          fill="none"
          stroke={p.deployed ? "#10b981" : "#ef4444"}
          strokeWidth={2.5}
          opacity={0.8}
        />
      ))}
    </g>
  );
}
