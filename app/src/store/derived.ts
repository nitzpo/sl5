import { useSimulationStore } from "./simulation";
import {
  computeCategoryScores,
  overallSlScore,
  computeBreachProbabilities,
  distillationProgress,
} from "../engine";
import type { Category } from "../engine/types";

/**
 * Hook that computes all derived simulation results from current store state.
 * React components subscribe to this for live-updating scores.
 */
export function useSimulationResults() {
  const {
    blocks,
    blockStates,
    year,
    sliders,
    adversaryOc,
    attackChains,
    modelServedExternally,
  } = useSimulationStore();

  const categoryScores = computeCategoryScores(
    blocks,
    blockStates,
    year,
    sliders.ai_timeline
  );

  const overall = overallSlScore(categoryScores);

  const breachProbabilities = computeBreachProbabilities(
    attackChains,
    blocks,
    blockStates,
    adversaryOc,
    year,
    sliders.ai_timeline
  );

  const bestChain = Object.entries(breachProbabilities).reduce<{
    id: string;
    probability: number;
  } | null>((best, [id, prob]) => {
    if (!best || prob > best.probability) return { id, probability: prob };
    return best;
  }, null);

  // Distillation: check if AI-07 is deployed (inference outbound defense)
  const ai07State = blockStates["AI-07"] ?? "not_started";
  const defensesDeployed =
    ai07State === "deployed" || ai07State === "mature";

  const extractionProgress = modelServedExternally
    ? distillationProgress(year, 2026, defensesDeployed, sliders.ai_timeline)
    : 0;

  // Breach probabilities for multiple OC levels (for score card)
  const breachByOc: Record<number, number> = {};
  for (const oc of [3, 4, 5]) {
    const probs = computeBreachProbabilities(
      attackChains,
      blocks,
      blockStates,
      oc,
      year,
      sliders.ai_timeline
    );
    breachByOc[oc] = Math.max(...Object.values(probs), 0);
  }

  // Defense layer status
  const layerIds = [
    "physical_perimeter",
    "network_boundary",
    "host_security",
    "accelerator_security",
    "access_control",
    "monitoring_detection",
    "personnel_trust",
    "supply_chain_integrity",
  ];
  const defenseLayerStatus: Record<string, { active: boolean; strength: number }> = {};
  for (const layerId of layerIds) {
    const contributing = blocks.filter((b) =>
      b.defense_in_depth.layer_contributions.some(
        (lc) => lc === layerId || layerId.includes(lc) || lc.includes(layerId.split("_")[0])
      )
    );
    const strength =
      contributing.length > 0
        ? contributing.reduce((sum, b) => {
            const state = blockStates[b.id] ?? "not_started";
            const stateVal =
              state === "deployed" || state === "mature"
                ? 1
                : state === "implementing"
                  ? 0.4
                  : 0;
            return sum + stateVal;
          }, 0) / contributing.length
        : 0;
    defenseLayerStatus[layerId] = { active: strength > 0.3, strength };
  }

  const activeLayers = Object.values(defenseLayerStatus).filter(
    (l) => l.active
  ).length;

  return {
    categoryScores,
    overallSl: overall,
    breachProbabilities,
    bestChain,
    extractionProgress,
    breachByOc,
    defenseLayerStatus,
    activeLayers,
  };
}

/**
 * Get the weakest category (for CISO recommendations).
 */
export function useWeakestCategory(): { category: Category; score: number } | null {
  const { categoryScores } = useSimulationResults();
  let weakest: { category: Category; score: number } | null = null;
  for (const [cat, score] of Object.entries(categoryScores)) {
    if (!weakest || score < weakest.score) {
      weakest = { category: cat as Category, score };
    }
  }
  return weakest;
}
