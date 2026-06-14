import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { LAYER_LABELS } from "../../utils/ring-geometry";
import { formatProbability } from "../../utils/format";

const OC_ACTOR: Record<number, string> = {
  1: "A hobbyist attacker",
  2: "A professional attacker",
  3: "A criminal syndicate",
  4: "A nation-state attacker",
  5: "A top-priority state operation",
};

/**
 * One-sentence verdict at the top of the canvas: who breaches you, how, and
 * how likely. The narrative entry point — updates live with every interaction.
 */
export function VerdictBanner() {
  const { bestChain, defenseLayerStatus } = useSimulationResults();
  const attackChains = useSimulationStore((s) => s.attackChains);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const year = useSimulationStore((s) => s.year);
  const selectedChainId = useSimulationStore((s) => s.selectedChainId);
  const setSelectedChain = useSimulationStore((s) => s.setSelectedChain);

  if (!bestChain) return null;

  const chain = attackChains.find((c) => c.id === bestChain.id);
  const p = bestChain.probability;

  const weakest = Object.entries(defenseLayerStatus).reduce<
    { id: string; strength: number } | null
  >((min, [id, s]) => (!min || s.strength < min.strength ? { id, strength: s.strength } : min), null);

  const tone =
    p > 0.5
      ? { text: "text-red-300", accent: "text-red-400", border: "border-red-900/60", bg: "bg-red-950/30" }
      : p > 0.2
        ? { text: "text-amber-200", accent: "text-amber-400", border: "border-amber-900/60", bg: "bg-amber-950/20" }
        : { text: "text-emerald-200", accent: "text-emerald-400", border: "border-emerald-900/50", bg: "bg-emerald-950/20" };

  return (
    <button
      onClick={() =>
        setSelectedChain(selectedChainId === bestChain.id ? null : bestChain.id)
      }
      className={`block w-full text-left mb-2 rounded-lg border px-3 py-2 transition-colors hover:brightness-125 ${tone.border} ${tone.bg}`}
      title="Click to show this attack chain"
    >
      <span className={`text-sm ${tone.text}`}>
        {OC_ACTOR[adversaryOc] ?? "An attacker"} (OC{adversaryOc}) breaches via{" "}
        <span className={`font-semibold ${tone.accent}`}>{chain?.name ?? bestChain.id}</span> with{" "}
        <span className={`font-bold text-lg ${tone.accent}`}>{formatProbability(p)}</span>{" "}
        probability in {year}.
        {weakest && (
          <span className="text-gray-400">
            {" "}
            Weakest layer: {LAYER_LABELS[weakest.id] ?? weakest.id}.
          </span>
        )}
      </span>
    </button>
  );
}
