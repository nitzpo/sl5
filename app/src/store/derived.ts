import { useSimulationStore } from "./simulation";
import {
  computeCategoryScores,
  overallSlScore,
  computeBreachProbabilities,
  distillationProgress,
  distillationDefenseReduction,
  applyBudgetConstraint,
  applyDependencyConstraint,
  relevantBlockIds,
} from "../engine";
import type { Block } from "../engine/types";
import { LAYER_ORDER, resolveLayer } from "../utils/ring-geometry";
import type { LayerId } from "../utils/ring-geometry";

/**
 * Hook that computes all derived simulation results from current store state.
 * React components subscribe to this for live-updating scores.
 */
export function useSimulationResults() {
  const {
    blocks,
    blockStates,
    advanceOrder,
    year,
    sliders,
    adversaryOc,
    attackChains,
    modelServedExternally,
  } = useSimulationStore();

  // Over-budget blocks are capped at "implementing" for all scoring purposes;
  // funding follows advancement order so a new block can only cap itself.
  const {
    effectiveStates: budgetedStates,
    exceededIds: budgetExceededIds,
    spentMillions,
  } = applyBudgetConstraint(blocks, blockStates, sliders.budget_millions, {
    order: advanceOrder,
    riskTolerance: sliders.risk_tolerance,
  });

  // A block whose hard prerequisites aren't operational is capped too.
  const {
    effectiveStates,
    unmetIds: dependencyUnmetIds,
    unmetRequires: dependencyUnmetRequires,
  } = applyDependencyConstraint(blocks, budgetedStates);

  // Score each category over the blocks that matter to the threat model, so SL
  // tracks real coverage instead of being diluted by never-deployed catalog depth.
  const relevantIds = relevantBlockIds(attackChains, blocks);
  const categoryScores = computeCategoryScores(
    blocks,
    effectiveStates,
    year,
    sliders,
    relevantIds
  );

  const overall = overallSlScore(categoryScores);

  const breachProbabilities = computeBreachProbabilities(
    attackChains,
    blocks,
    effectiveStates,
    adversaryOc,
    year,
    sliders,
    modelServedExternally
  );

  const bestChain = Object.entries(breachProbabilities).reduce<{
    id: string;
    probability: number;
  } | null>((best, [id, prob]) => {
    if (!best || prob > best.probability) return { id, probability: prob };
    return best;
  }, null);

  // Distillation defenses: AI-07 (outbound channel defense) and NET-04
  // (bandwidth/rate limitation) each reduce the extraction rate.
  const isOperational = (id: string) => {
    const s = effectiveStates[id] ?? "not_started";
    return s === "deployed" || s === "mature";
  };
  const defenseReduction = distillationDefenseReduction({
    outboundDefense: isOperational("AI-07"),
    rateLimiting: isOperational("NET-04"),
  });

  const extractionProgress = modelServedExternally
    ? distillationProgress(year, 2026, defenseReduction, sliders.ai_timeline)
    : 0;

  // Breach probabilities for multiple OC levels (for score card)
  const breachByOc: Record<number, number> = {};
  for (const oc of [3, 4, 5]) {
    const probs = computeBreachProbabilities(
      attackChains,
      blocks,
      effectiveStates,
      oc,
      year,
      sliders,
      modelServedExternally
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
      (b.defense_in_depth?.layer_contributions ?? []).some(
        (lc) => resolveLayer(lc) === layerId
      )
    );
    const strength =
      contributing.length > 0
        ? contributing.reduce((sum, b) => {
            const state = effectiveStates[b.id] ?? "not_started";
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

  const blocksByLayer: Record<LayerId, Block[]> = {} as Record<LayerId, Block[]>;
  for (const lid of LAYER_ORDER) {
    blocksByLayer[lid] = [];
  }
  const assigned = new Set<string>();
  for (const b of blocks) {
    for (const raw of b.defense_in_depth?.layer_contributions ?? []) {
      const resolved = resolveLayer(raw);
      if (resolved && !assigned.has(b.id)) {
        blocksByLayer[resolved].push(b);
        assigned.add(b.id);
        break;
      }
    }
  }
  for (const b of blocks) {
    if (!assigned.has(b.id)) {
      blocksByLayer["monitoring_detection"].push(b);
    }
  }

  return {
    categoryScores,
    overallSl: overall,
    breachProbabilities,
    bestChain,
    extractionProgress,
    breachByOc,
    defenseLayerStatus,
    activeLayers,
    blocksByLayer,
    budgetExceededIds,
    dependencyUnmetIds,
    dependencyUnmetRequires,
    spentMillions,
    overBudget: budgetExceededIds.size > 0,
  };
}
