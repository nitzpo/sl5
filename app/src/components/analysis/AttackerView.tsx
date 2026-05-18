import { useMemo } from "react";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { getAiCapability } from "../../engine/ai-curve";
import { formatProbability } from "../../utils/format";
import type { AttackChain, BlockState } from "../../engine/types";

const STATE_ICONS: Record<string, string> = {
  not_started: "✗",
  investing: "◔",
  implementing: "◐",
  deployed: "■",
  mature: "★",
};

export function AttackerView() {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const year = useSimulationStore((s) => s.year);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);
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
            {blockedChains.map(({ chain }) => (
              <div
                key={chain.id}
                className="flex items-center gap-2 text-xs text-gray-500"
              >
                <span className="text-emerald-600">■</span>
                <span>{chain.name}</span>
                <span className="text-gray-700 ml-auto">
                  stopped by {chain.stoppers[0]}
                </span>
              </div>
            ))}
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
}: {
  chain: AttackChain;
  probability: number;
  blockStates: Record<string, BlockState | string>;
  rank: number;
}) {
  return (
    <div className="bg-gray-900 rounded p-2.5">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs text-red-500 font-bold mr-1.5">#{rank}</span>
          <span className="text-xs font-medium text-gray-200">
            {chain.name}
          </span>
        </div>
        <span
          className={`text-xs font-mono font-bold ${
            probability > 0.4
              ? "text-red-400"
              : probability > 0.15
                ? "text-amber-400"
                : "text-yellow-500"
          }`}
        >
          {formatProbability(probability)}
        </span>
      </div>

      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
        {chain.narrative.brief}
      </p>

      {/* Blocks exploited with their states */}
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {chain.blocks_exploited.map((blockId) => {
          const state = (blockStates[blockId] ?? "not_started") as string;
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
    </div>
  );
}
