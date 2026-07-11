import { useMemo } from "react";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { getAiCapability } from "../../engine/ai-curve";
import { formatProbability } from "../../utils/format";
import type { AttackChain, BlockState } from "../../engine/types";
import { STATE_ICONS, breachLevel, LEVEL_TEXT } from "../../utils/colors";

export function AttackerView() {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const year = useSimulationStore((s) => s.year);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);
  const selectedChainId = useSimulationStore((s) => s.selectedChainId);
  const setSelectedChain = useSimulationStore((s) => s.setSelectedChain);
  const { breachProbabilities } = useSimulationResults();

  const aiCap = getAiCapability(year, aiTimeline);

  // Sort chains by probability (best attack paths first)
  const rankedChains = useMemo(() => {
    return attackChains
      .map((chain) => ({
        chain,
        probability: breachProbabilities[chain.id] ?? 0,
      }))
      .sort((a, b) => b.probability - a.probability);
  }, [attackChains, breachProbabilities]);

  // Blocked chains (all blocks deployed)
  const blockedChains = rankedChains.filter((c) => c.probability < 0.02);
  const viableChains = rankedChains.filter((c) => c.probability >= 0.02);

  // Effective OC computation
  const avgAiShift = useMemo(() => {
    const shifts = blocks.map((b) => b.adversary_exploitation.ai_oc_shift);
    return shifts.reduce((a, b) => a + b, 0) / shifts.length;
  }, [blocks]);
  const effectiveOc = adversaryOc + avgAiShift * aiCap;

  return (
    <div className="space-y-4">
      {/* Adversary profile */}
      <div className="bg-gray-900 rounded p-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Adversary</span>
          <span className="text-sm font-bold text-red-400">OC{adversaryOc}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500">AI capability ({year})</span>
          <span className="text-violet-400">{Math.round(aiCap * 100)}%</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500">Effective OC (avg)</span>
          <span className="text-red-300">{effectiveOc.toFixed(1)}</span>
        </div>
      </div>

      {/* Viable attack chains */}
      <div>
        <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
          Viable Attack Chains
        </h3>
        {viableChains.length === 0 ? (
          <div className="text-xs text-gray-500 italic">
            All chains blocked at this posture.
          </div>
        ) : (
          <div className="space-y-2">
            {viableChains.map(({ chain, probability }, i) => (
              <ChainCard
                key={chain.id}
                chain={chain}
                probability={probability}
                blockStates={blockStates}
                rank={i + 1}
                selected={selectedChainId === chain.id}
                onSelect={() =>
                  setSelectedChain(selectedChainId === chain.id ? null : chain.id)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Blocked chains */}
      {blockedChains.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-2">
            Blocked Chains
          </h3>
          <div className="space-y-1">
            {blockedChains.map(({ chain }) => {
              const deployedStopper = chain.stoppers.find((id) => {
                const s = blockStates[id] ?? "not_started";
                return s === "deployed" || s === "mature" || s === "implementing";
              });
              const reason = deployedStopper
                ? `stopped by ${deployedStopper}`
                : `too complex for OC${adversaryOc}`;
              return (
                <button
                  key={chain.id}
                  onClick={() =>
                    setSelectedChain(selectedChainId === chain.id ? null : chain.id)
                  }
                  className={`flex items-center gap-2 text-xs w-full text-left rounded px-1.5 py-0.5 transition-colors ${
                    selectedChainId === chain.id
                      ? "bg-gray-800 text-gray-300"
                      : "text-gray-500 hover:bg-gray-900"
                  }`}
                >
                  <span className="text-emerald-600">■</span>
                  <span>{chain.name}</span>
                  <span className="text-gray-700 ml-auto">{reason}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ChainCard({
  chain,
  probability,
  blockStates,
  rank,
  selected,
  onSelect,
}: {
  chain: AttackChain;
  probability: number;
  blockStates: Record<string, BlockState | string>;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`bg-gray-900 rounded p-2.5 w-full text-left transition-colors ${
        selected ? "ring-1 ring-red-500/60" : "hover:bg-gray-800/60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs text-red-500 font-bold mr-1.5">#{rank}</span>
          <span className="text-xs font-medium text-gray-200">
            {chain.name}
          </span>
        </div>
        <span className={`text-xs font-mono font-bold ${LEVEL_TEXT[breachLevel(probability)]}`}>
          {formatProbability(probability)}
        </span>
      </div>

      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
        {chain.narrative.brief}
      </p>

      {/* Stopper blocks with their states */}
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {chain.stoppers.map((blockId) => {
          const state = (blockStates[blockId] ?? "not_started") as BlockState;
          const icon = STATE_ICONS[state] ?? "?";
          const isAbsent = state === "not_started" || state === "investing";
          return (
            <span
              key={blockId}
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                isAbsent
                  ? "bg-red-950 text-red-300 border border-red-900/50"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              {icon} {blockId}
            </span>
          );
        })}
      </div>
    </button>
  );
}
