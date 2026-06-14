import { useMemo } from "react";
import { useSimulationResults } from "../../store/derived";
import { useSimulationStore } from "../../store/simulation";
import { formatSl, formatProbability, formatPercent, formatCost } from "../../utils/format";
import { CATEGORY_LABELS } from "../../utils/geometry";
import type { Category } from "../../engine/types";

export function ScoreCard() {
  const {
    categoryScores,
    overallSl,
    bestChain,
    breachByOc,
    extractionProgress,
    activeLayers,
  } = useSimulationResults();
  const riskTolerance = useSimulationStore((s) => s.sliders.risk_tolerance);
  const budget = useSimulationStore((s) => s.sliders.budget_millions);
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const year = useSimulationStore((s) => s.year);
  const requiredSl = 5.0 - riskTolerance * 2.0;

  const bestChainName = bestChain
    ? attackChains.find((c) => c.id === bestChain.id)?.name ?? bestChain.id
    : null;
  const breachProb = bestChain?.probability ?? 0;
  const breachColor =
    breachProb > 0.5
      ? "text-red-400"
      : breachProb > 0.2
        ? "text-amber-400"
        : "text-emerald-400";

  const totalCost = useMemo(() =>
    blocks
      .filter((b) => (blockStates[b.id] ?? "not_started") !== "not_started")
      .reduce((sum, b) => sum + b.dimensions.cost.upfront_millions.min, 0),
    [blocks, blockStates]
  );
  const overBudget = totalCost > budget;

  return (
    <div className="space-y-3">
      {/* Breach probability — the headline number */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div
          className="text-xs text-gray-500"
          title="Most likely attack chain; includes defense-in-depth discount"
        >
          Breach Probability
        </div>
        <div className={`text-3xl font-bold ${breachColor}`}>
          {formatProbability(breachProb)}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Best chain vs OC{adversaryOc}, {year}
          {bestChainName && (
            <span className="text-gray-400"> — {bestChainName}</span>
          )}
        </div>
      </div>

      {/* Overall SL */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500">Security Posture</span>
          <span className="text-xl font-bold text-gray-100">
            SL {formatSl(overallSl)}
          </span>
        </div>
        <div className="mt-2 relative">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(overallSl / 5) * 100}%`,
                backgroundColor:
                  overallSl >= requiredSl
                    ? "#059669"
                    : overallSl >= requiredSl - 0.5
                      ? "#d97706"
                      : "#dc2626",
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
              <span
                className={`font-mono ${
                  (breachByOc[oc] ?? 0) > 0.5
                    ? "text-red-400"
                    : (breachByOc[oc] ?? 0) > 0.2
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
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
          <span className={`text-xs font-medium ${overBudget ? "text-red-400" : "text-emerald-400"}`}>
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
                      backgroundColor:
                        score >= 4
                          ? "#059669"
                          : score >= 3
                            ? "#d97706"
                            : "#dc2626",
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
