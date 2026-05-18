import { useSimulationResults } from "../../store/derived";
import { formatSl, formatProbability, formatPercent } from "../../utils/format";
import { CATEGORY_LABELS } from "../../utils/geometry";
import { DEFENSE_COLORS } from "../../utils/colors";
import type { Category } from "../../engine/types";

export function ScoreCard() {
  const {
    categoryScores,
    overallSl,
    breachByOc,
    extractionProgress,
    activeLayers,
  } = useSimulationResults();

  return (
    <div className="space-y-3">
      {/* Overall SL */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500">Security Posture</span>
          <span className="text-2xl font-bold text-gray-100">
            SL {formatSl(overallSl)}
          </span>
        </div>
        <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(overallSl / 5) * 100}%`,
              backgroundColor:
                overallSl >= 4
                  ? "#059669"
                  : overallSl >= 3
                    ? "#d97706"
                    : "#dc2626",
            }}
          />
        </div>
      </div>

      {/* Breach probabilities */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2">Breach Probability (best chain)</div>
        <div className="space-y-1">
          {[3, 4, 5].map((oc) => (
            <div key={oc} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">vs OC{oc}</span>
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
