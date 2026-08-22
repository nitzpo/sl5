import { useSimulationResults } from "../../store/derived";
import { useSimulationStore } from "../../store/simulation";
import { formatSl, formatProbability, formatPercent, formatCost, formatYear } from "../../utils/format";
import { CATEGORY_LABELS } from "../../utils/geometry";
import { LAYER_LABELS } from "../../utils/ring-geometry";
import { breachLevel, slLevel, LEVEL_TEXT, LEVEL_HEX, SEMANTIC } from "../../utils/colors";
import { useDeltaFlash } from "../../utils/use-delta-flash";
import type { Category } from "../../engine/types";

const OC_ACTOR: Record<number, string> = {
  1: "A hobbyist attacker",
  2: "A professional attacker",
  3: "A criminal syndicate",
  4: "A nation-state attacker",
  5: "A top-priority state operation",
};

/** Small signed-change chip flashed beside a headline metric. */
function DeltaChip({ delta, format, downIsGood }: { delta: number | null; format: (d: number) => string; downIsGood: boolean }) {
  if (delta === null) return null;
  const improving = downIsGood ? delta < 0 : delta > 0;
  return (
    <span
      className={`ml-2 align-middle text-xs font-semibold px-1.5 py-0.5 rounded animate-fade-in ${
        improving ? "bg-emerald-950/70 text-emerald-400" : "bg-red-950/70 text-red-400"
      }`}
    >
      {delta > 0 ? "+" : "−"}{format(Math.abs(delta))}
    </span>
  );
}

export function ScoreCard() {
  const {
    categoryScores,
    overallSl,
    bestChain,
    breachByOc,
    extractionProgress,
    activeLayers,
    spentMillions,
    defenseLayerStatus,
  } = useSimulationResults();
  const riskTolerance = useSimulationStore((s) => s.sliders.risk_tolerance);
  const budget = useSimulationStore((s) => s.sliders.budget_millions);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const year = useSimulationStore((s) => s.year);
  const selectedChainId = useSimulationStore((s) => s.selectedChainId);
  const setSelectedChain = useSimulationStore((s) => s.setSelectedChain);
  const requiredSl = 5.0 - riskTolerance * 2.0;

  // Weakest defense layer — the narrative "where they get in" that used to live
  // in the (now-removed) canvas verdict banner.
  const weakestLayer = (Object.entries(defenseLayerStatus) as [string, { strength: number }][]).reduce<
    { id: string; strength: number } | null
  >((min, [id, s]) => (!min || s.strength < min.strength ? { id, strength: s.strength } : min), null);

  const bestChainName = bestChain
    ? attackChains.find((c) => c.id === bestChain.id)?.name ?? bestChain.id
    : null;
  const breachProb = bestChain?.probability ?? 0;
  const breachColor = LEVEL_TEXT[breachLevel(breachProb)];

  const breachFlash = useDeltaFlash(breachProb, 0.0005);
  const slFlash = useDeltaFlash(overallSl, 0.005);

  const totalCost = spentMillions;
  const overBudget = totalCost > budget;

  return (
    <div className="space-y-3">
      {/* Breach probability — the headline number. Clickable to highlight the
          most-viable chain on the canvas (this absorbed the old verdict banner). */}
      <button
        type="button"
        onClick={() =>
          bestChain &&
          setSelectedChain(selectedChainId === bestChain.id ? null : bestChain.id)
        }
        disabled={!bestChain}
        className="block w-full text-left bg-gray-900 rounded-lg p-3 transition-colors enabled:hover:bg-gray-800 disabled:cursor-default"
        title={bestChain ? "Click to show this attack chain on the canvas" : undefined}
      >
        <div className="text-xs text-gray-500">
          Breach Probability
        </div>
        <div className={`text-3xl font-bold ${breachColor}`}>
          {formatProbability(breachProb)}
          <DeltaChip
            delta={breachFlash.delta}
            format={(d) => (d < 0.01 ? "<1pt" : `${(d * 100).toFixed(d < 0.05 ? 1 : 0)}pt`)}
            downIsGood
          />
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          {OC_ACTOR[adversaryOc] ?? "An attacker"} (OC{adversaryOc}), {formatYear(year)}
          {bestChainName && (
            <span className="text-gray-400"> — {bestChainName}</span>
          )}
        </div>
        {weakestLayer && (
          <div className="text-[10px] text-gray-500 mt-0.5">
            Weakest layer:{" "}
            <span className="text-gray-400">
              {LAYER_LABELS[weakestLayer.id] ?? weakestLayer.id}
            </span>
          </div>
        )}
      </button>

      {/* Overall SL */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500" title="Posture score — independent of the attacker; the adversary rows below carry the OC story">
            Security Posture
          </span>
          <span className="text-xl font-bold text-gray-100">
            SL {formatSl(overallSl)}
            <DeltaChip delta={slFlash.delta} format={(d) => d.toFixed(1)} downIsGood={false} />
          </span>
        </div>
        <div className="mt-2 relative">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(overallSl / 5) * 100}%`,
                backgroundColor:
                  LEVEL_HEX[
                    overallSl >= requiredSl ? "good" : overallSl >= requiredSl - 0.5 ? "warn" : "bad"
                  ],
              }}
            />
          </div>
          {/* Required SL marker */}
          <div
            className="absolute top-0 h-2 w-0.5 bg-gray-400"
            style={{ left: `${(requiredSl / 5) * 100}%` }}
            title={`Required: SL ${formatSl(requiredSl)}`}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-600">
            Target: SL {formatSl(requiredSl)}
          </span>
          <span className={`text-[10px] font-medium ${
            overallSl >= requiredSl ? "text-emerald-500" : "text-red-400"
          }`}>
            {overallSl >= requiredSl ? "PASSING" : "BELOW TARGET"}
          </span>
        </div>
      </div>

      {/* Breach probabilities by adversary class */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2">By Adversary Class</div>
        <div className="space-y-1">
          {[3, 4, 5].map((oc) => (
            <div
              key={oc}
              className={`flex items-center justify-between text-xs ${
                oc === adversaryOc ? "bg-gray-800 rounded px-1 -mx-1" : ""
              }`}
            >
              <span className={oc === adversaryOc ? "text-gray-200" : "text-gray-400"}>vs OC{oc}</span>
              <span className={`font-mono ${LEVEL_TEXT[breachLevel(breachByOc[oc] ?? 0)]}`}>
                {formatProbability(breachByOc[oc] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Defense depth + Extraction */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500">Defense Depth</div>
          <div className="text-lg font-bold text-gray-100">
            {activeLayers}/8
          </div>
          <div className="text-xs text-gray-500">layers</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500">Extraction</div>
          <div
            className={`text-lg font-bold ${
              extractionProgress > 0.6
                ? "text-red-400"
                : extractionProgress > 0.3
                  ? "text-amber-400"
                  : "text-gray-100"
            }`}
          >
            {formatPercent(extractionProgress)}
          </div>
          <div className="text-xs text-gray-500">distilled</div>
        </div>
      </div>

      {/* Budget */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500">Budget</span>
          <span
            className="text-xs font-medium"
            style={{ color: overBudget ? SEMANTIC.overBudget : SEMANTIC.defenseText }}
          >
            {overBudget ? "OVER" : "OK"}
          </span>
        </div>
        <div className="text-sm font-mono text-gray-200 mt-1">
          {formatCost(totalCost)} / {formatCost(budget)}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2">By Category</div>
        <div className="space-y-1.5">
          {(Object.entries(categoryScores) as [Category, number][]).map(
            ([cat, score]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-20 shrink-0">
                  {CATEGORY_LABELS[cat]}
                </span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(score / 5) * 100}%`,
                      backgroundColor: LEVEL_HEX[slLevel(score)],
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-300 w-7 text-right">
                  {formatSl(score)}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
