import { useMemo } from "react";
import { useSimulationStore } from "../../store/simulation";
import { computeDecisionWindows } from "../../utils/decision-windows";
import { combinedCostMillions, recommendInvestments } from "../../utils/ciso-recommendations";
import { formatCost, formatDeployRange, formatYear } from "../../utils/format";

const TOP_N = 6;

/** Signed points of probability, e.g. "−1.2pt"; "flat" when it doesn't move. */
function formatPoints(delta: number): string {
  const pts = Math.abs(delta) * 100;
  if (pts < 0.005) return "flat";
  return `${delta < 0 ? "−" : "+"}${pts < 0.1 ? "<0.1" : pts.toFixed(1)}pt`;
}

export function CisoView() {
  const blocks = useSimulationStore((s) => s.blocks);
  const threatModel = useSimulationStore((s) => s.threatModel);
  const futureCapabilities = useSimulationStore((s) => s.futureCapabilities);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const advanceOrder = useSimulationStore((s) => s.advanceOrder);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const modelServedExternally = useSimulationStore((s) => s.modelServedExternally);
  const budget = sliders.budget_millions;

  // Every candidate move is scored by the real engine — the same pipeline as
  // the Score card — so the deltas shown are what clicking would actually do.
  // ~40 posture evaluations at well under a millisecond each, memoized on the
  // simulation inputs.
  const analysis = useMemo(
    () =>
      recommendInvestments({
        blocks,
        model: threatModel,
        futureCapabilities,
        blockStates,
        advanceOrder,
        year,
        sliders,
        adversaryOc,
        modelServedExternally,
      }),
    [blocks, threatModel, futureCapabilities, blockStates, advanceOrder, year, sliders, adversaryOc, modelServedExternally]
  );
  const recommendations = analysis.candidates.slice(0, TOP_N);

  // Decision windows: blocks that must start within 2 years to be ready by 2030
  const closingWindows = useMemo(
    () => computeDecisionWindows(blocks, blockStates, year),
    [blocks, blockStates, year]
  );

  // The top three taken together, each block counted once (bundles can share a
  // prerequisite), at the budget model's cost basis.
  const topThreeCost = combinedCostMillions(recommendations.slice(0, 3));

  return (
    <div className="space-y-4">
      {/* Priority recommendations */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Priority Investments
        </h3>
        <p className="text-[10px] text-gray-500 mb-2 leading-snug">
          Each move scored by the engine against your current posture. Ranked by how much
          breach risk it takes off <em>all</em> attack paths per $M — the headline is the
          single worst path, so most single moves leave it flat.
        </p>
        {recommendations.length === 0 ? (
          <div className="text-xs text-gray-500 italic">
            {analysis.unaffordableCount > 0
              ? "Nothing left fits the remaining budget."
              : "No single move improves this posture."}
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, i) => {
              const isBundle = rec.prerequisites.length > 0;
              return (
                <div key={rec.blockIds.join("+")} className="bg-gray-900 rounded p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-emerald-400 shrink-0">#{i + 1}</span>
                      <span className="text-xs font-medium text-gray-200 shrink-0 whitespace-nowrap">
                        {rec.block.id}
                      </span>
                      <span className="text-xs text-gray-400 truncate" title={rec.block.name}>
                        {rec.block.name}
                      </span>
                    </div>
                    <span
                      className="text-xs font-mono text-emerald-400 shrink-0"
                      title="Change in overall SL if this move is made"
                    >
                      {rec.slDelta >= 0 ? "+" : "−"}
                      {Math.abs(rec.slDelta) < 0.005 ? "<0.01" : Math.abs(rec.slDelta).toFixed(2)} SL
                    </span>
                  </div>
                  {isBundle && (
                    <div className="text-[10px] text-sky-300 mt-0.5">
                      Bundle — needs {rec.prerequisites.map((b) => b.id).join(", ")} first
                      (hard prerequisite{rec.prerequisites.length > 1 ? "s" : ""})
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-1">{rec.reason}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                    <span title="Change in the headline breach probability (the worst path)">
                      breach {formatPoints(rec.breachDelta)}
                    </span>
                    {" · "}
                    <span title="Drop in breach probability summed over every attack path">
                      all paths {formatPoints(-rec.pathReduction)}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {rec.costMillions > 0
                      ? `${formatCost(rec.costMillions)} planned`
                      : "already funded"}
                    {isBundle && rec.costMillions > 0 && " (bundle)"} |{" "}
                    {formatDeployRange(
                      rec.block.dimensions.time_to_deploy_months.min,
                      rec.block.dimensions.time_to_deploy_months.max
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget */}
      <div className="bg-gray-900 rounded p-2.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Budget (upfront capex)</span>
          <span className="text-gray-300">{formatCost(budget)}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500">Left after current plan</span>
          <span className="text-gray-400">{formatCost(Math.max(0, analysis.remainingMillions))}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500" title="Planning cost at the Risk Tolerance basis — the same number the budget line charges">
            Top 3 together (planned)
          </span>
          <span className="text-gray-400">{formatCost(topThreeCost)}</span>
        </div>
        {analysis.unaffordableCount > 0 && (
          <div className="text-[10px] text-gray-500 mt-1.5 leading-snug">
            {analysis.unaffordableCount} other move{analysis.unaffordableCount === 1 ? "" : "s"}{" "}
            {analysis.unaffordableCount === 1 ? "doesn't" : "don't"} fit what's left — raise the
            budget to see {analysis.unaffordableCount === 1 ? "it" : "them"} ranked.
          </div>
        )}
      </div>

      {/* Closing decision windows */}
      {closingWindows.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">
            Decision Windows (2yr)
          </h3>
          <div className="space-y-1.5">
            {closingWindows.map(({ block, mustStartBy }) => (
              <div
                key={block.id}
                id={`dw-${block.id}`}
                className="bg-amber-950/30 border border-amber-900/50 rounded px-2.5 py-1.5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-300">
                    {block.id}: {block.name}
                  </span>
                  <span className="text-[10px] text-amber-400 shrink-0">
                    by {formatYear(mustStartBy)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
