import { useMemo } from "react";
import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { blockEffectiveness } from "../../engine/scoring";
import { CATEGORY_LABELS } from "../../utils/geometry";
import { formatCost, formatSl } from "../../utils/format";
import type { Block, Category } from "../../engine/types";

interface Recommendation {
  block: Block;
  impact: number;
  reason: string;
}

export function CisoView() {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);
  const budget = sliders.budget_millions;
  const { categoryScores, overallSl } = useSimulationResults();

  // Find weakest category
  const weakestCat = useMemo(() => {
    let weakest: { cat: Category; score: number } | null = null;
    for (const [cat, score] of Object.entries(categoryScores)) {
      if (!weakest || score < weakest.score) {
        weakest = { cat: cat as Category, score };
      }
    }
    return weakest;
  }, [categoryScores]);

  // Generate recommendations: blocks not deployed that would most improve the weakest category
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    for (const block of blocks) {
      const state = blockStates[block.id] ?? "not_started";
      if (state === "deployed" || state === "mature") continue;

      const currentEff = blockEffectiveness(block, state, year, sliders);
      const deployedEff = blockEffectiveness(block, "deployed", year, sliders);
      const delta = deployedEff - currentEff;

      if (delta < 0.1) continue;

      // Estimate SL impact (simplified: delta / blocks_in_category * 4.0 scale)
      const catBlocks = blocks.filter((b) => b.category === block.category);
      const slImpact = (delta / catBlocks.length) * 4.0;

      let reason = "";
      if (block.category === weakestCat?.cat) {
        reason = `${CATEGORY_LABELS[block.category]} is weakest at ${formatSl(weakestCat.score)}`;
      } else if (block.dimensions.organizational_readiness.value >= 50) {
        reason = "High org readiness — quick win";
      } else if (block.defense_type === "hard_stop") {
        reason = "Hard stop — no AI erosion";
      } else {
        reason = `Improves ${CATEGORY_LABELS[block.category]}`;
      }

      recs.push({ block, impact: slImpact, reason });
    }

    return recs.sort((a, b) => b.impact - a.impact).slice(0, 6);
  }, [blocks, blockStates, year, sliders, weakestCat]);

  // Decision windows: blocks that must start within 2 years to be ready by 2030
  const closingWindows = useMemo(() => {
    return blocks
      .filter((b) => {
        const state = blockStates[b.id] ?? "not_started";
        if (state !== "not_started") return false;
        const deployMonths = b.dimensions.time_to_deploy_months.max;
        const latestStart = 2030 - deployMonths / 12;
        return latestStart <= year + 2;
      })
      .map((b) => ({
        block: b,
        mustStartBy: Math.round((2030 - b.dimensions.time_to_deploy_months.max / 12) * 10) / 10,
      }))
      .sort((a, b) => a.mustStartBy - b.mustStartBy);
  }, [blocks, blockStates, year]);

  // Budget estimate for top recommendations
  const totalCostEstimate = recommendations
    .slice(0, 3)
    .reduce((sum, r) => sum + r.block.dimensions.cost.upfront_millions.min, 0);

  return (
    <div className="space-y-4">
      {/* Priority recommendations */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Priority Investments
        </h3>
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div
              key={rec.block.id}
              className="bg-gray-900 rounded p-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-400">
                    #{i + 1}
                  </span>
                  <span className="text-xs font-medium text-gray-200">
                    {rec.block.id}
                  </span>
                  <span className="text-xs text-gray-400">
                    {rec.block.name}
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  +{formatSl(rec.impact)}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {rec.reason} |{" "}
                {formatCost(rec.block.dimensions.cost.upfront_millions.min)}-
                {formatCost(rec.block.dimensions.cost.upfront_millions.max)} |{" "}
                {rec.block.dimensions.time_to_deploy_months.min}-
                {rec.block.dimensions.time_to_deploy_months.max}mo
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="bg-gray-900 rounded p-2.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Annual Budget</span>
          <span className="text-gray-300">{formatCost(budget)}/yr</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500">Top 3 cost (upfront)</span>
          <span className="text-gray-400">~{formatCost(totalCostEstimate)}</span>
        </div>
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
                    by {mustStartBy.toFixed(0)}
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
