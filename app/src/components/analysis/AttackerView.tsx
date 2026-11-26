import { useMemo } from "react";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { getAiCapability } from "../../engine/ai-curve";
import { isHeldAtResidualFloor } from "../../engine/posture";
import { formatProbability, formatYear } from "../../utils/format";
import type { AttackChain, BlockState } from "../../engine/types";
import { STATE_ICONS, breachLevel, LEVEL_TEXT } from "../../utils/colors";

export function AttackerView() {
  const blocks = useSimulationStore((s) => s.blocks);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const year = useSimulationStore((s) => s.year);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);
  const selectedChainId = useSimulationStore((s) => s.selectedChainId);
  const setSelectedChain = useSimulationStore((s) => s.setSelectedChain);
  const ocDefinitions = useSimulationStore((s) => s.ocDefinitions);
  const modelServedExternally = useSimulationStore((s) => s.modelServedExternally);
  // Effective states, not raw clicks: a stopper the budget can't pay for, or
  // whose prerequisite is missing, is not stopping anything.
  const { breachProbabilities, residualFloors, effectiveStates: blockStates } =
    useSimulationResults();

  const ocDef = ocDefinitions.find((d) => d.level === adversaryOc);
  const nextOcDef = ocDefinitions.find((d) => d.level === adversaryOc + 1);
  // What qualitatively unlocks at the next tier — the OC ladder is not just a
  // bigger budget.
  const nextUnlocks = nextOcDef
    ? nextOcDef.key_capabilities.filter((c) => !(ocDef?.key_capabilities ?? []).includes(c))
    : [];
  const humanize = (s: string) => s.replaceAll("_", " ");

  const aiCap = getAiCapability(year, aiTimeline);

  // Sort chains by probability (best attack paths first)
  const rankedChains = useMemo(() => {
    return attackChains
      .map((chain) => ({
        chain,
        probability: breachProbabilities[chain.id] ?? 0,
        floor: residualFloors[chain.id] ?? 0,
      }))
      .sort((a, b) => b.probability - a.probability);
  }, [attackChains, breachProbabilities, residualFloors]);

  // No live chain reaches zero: the engine floors each one at gate × residual
  // risk (≈2.6% for an OC4 chain against OC4). A fixed "blocked below 2%" cut
  // was therefore unreachable for every chain the adversary can attempt, so a
  // chain is filed here once defense has pushed it to within half a point of
  // its own floor — as low as defense can push it.
  const heldChains = rankedChains.filter((c) => isHeldAtResidualFloor(c.probability, c.floor));
  const viableChains = rankedChains.filter((c) => !isHeldAtResidualFloor(c.probability, c.floor));

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
        {ocDef && (
          <div className="mt-1 text-xs text-gray-300">
            {ocDef.name}
            <div className="text-[11px] text-gray-500 mt-0.5">
              ~${ocDef.budget_millions >= 1 ? `${ocDef.budget_millions}M` : `${ocDef.budget_millions * 1000}K`}
              {" · "}team of {ocDef.team_size}
              {" · "}{ocDef.time_horizon_months >= 12
                ? `${Math.round(ocDef.time_horizon_months / 12)}yr+ ops`
                : `${ocDef.time_horizon_months}mo ops`}
            </div>
          </div>
        )}
        <div className="flex justify-between text-xs mt-1.5">
          <span className="text-gray-500">AI capability ({formatYear(year)})</span>
          <span className="text-violet-400">{Math.round(aiCap * 100)}%</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500">Effective OC (avg)</span>
          <span className="text-red-300">{effectiveOc.toFixed(1)}</span>
        </div>
        {nextOcDef && nextUnlocks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-800 text-[11px] leading-snug">
            <span className="text-gray-500">
              OC{nextOcDef.level} is a qualitative jump, not a bigger budget — it adds:{" "}
            </span>
            <span className="text-gray-300">
              {nextUnlocks.slice(0, 3).map(humanize).join(", ")}
              {nextUnlocks.length > 3 ? ", …" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Viable attack chains */}
      <div>
        <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
          Viable Attack Chains
        </h3>
        {viableChains.length === 0 ? (
          <div className="text-xs text-gray-500 italic">
            Every chain is held at its residual floor — what's left is the insider
            never caught and the zero-day nobody found.
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

      {/* Chains held at the residual floor */}
      {heldChains.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-2">
            Held at the Residual Floor
          </h3>
          <div className="space-y-1">
            {heldChains.map(({ chain, probability, floor }) => {
              const operationalStoppers = chain.stoppers.filter((id) => {
                const s = blockStates[id] ?? "not_started";
                return s === "deployed" || s === "mature";
              });
              let reason: string;
              if (probability === 0 && chain.requires_external_serving && !modelServedExternally) {
                // Inert, not defended: no extraction channel exists at all.
                reason = "no API to extract from";
              } else if (floor < 0.005) {
                // The capability gate is all but shut: beyond this adversary.
                reason = `beyond OC${adversaryOc} for now`;
              } else if (operationalStoppers.length > 0) {
                reason = `held by ${operationalStoppers.slice(0, 3).join(", ")}${
                  operationalStoppers.length > 3 ? "…" : ""
                }`;
              } else {
                reason = "at its floor";
              }
              return (
                <button
                  key={chain.id}
                  onClick={() =>
                    setSelectedChain(selectedChainId === chain.id ? null : chain.id)
                  }
                  title={
                    floor > 0
                      ? `${formatProbability(probability)} — within half a point of this chain's ${formatProbability(floor)} residual floor, the lowest any posture can push it against OC${adversaryOc}.`
                      : undefined
                  }
                  className={`flex items-center gap-2 text-xs w-full text-left rounded px-1.5 py-0.5 transition-colors ${
                    selectedChainId === chain.id
                      ? "bg-gray-800 text-gray-300"
                      : "text-gray-500 hover:bg-gray-900"
                  }`}
                >
                  <span className="text-emerald-600">■</span>
                  <span>{chain.name}</span>
                  <span className="text-gray-600 ml-auto font-mono">
                    {formatProbability(probability)}
                  </span>
                  <span className="text-gray-700">{reason}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5 leading-snug">
            No live chain reaches zero: each keeps a residual floor (the insider never
            caught, the zero-day nobody found) that no posture removes.
          </p>
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
