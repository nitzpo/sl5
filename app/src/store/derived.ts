import { useMemo } from "react";
import { useSimulationStore } from "./simulation";
import {
  computeBreachProbabilities,
  distillationProgress,
  distillationDefenseReduction,
  applyBudgetConstraint,
  scorePosture,
} from "../engine";
import type { AttackChain, Block, BlockState, Sliders } from "../engine/types";
import { LAYER_ORDER, resolveLayer } from "../utils/ring-geometry";
import type { LayerId } from "../utils/ring-geometry";

/**
 * Just the money: planned spend and which blocks the budget can't pay for.
 *
 * Separate from `useSimulationResults` so a component that only needs the budget
 * line doesn't drag in category scores and three full breach sweeps. That matters
 * during time-lapse playback, where the year advances every frame.
 */
export function useBudgetStatus(): {
  spentMillions: number;
  budgetExceededIds: Set<string>;
  budgetMillions: number;
} {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const advanceOrder = useSimulationStore((s) => s.advanceOrder);
  const budgetMillions = useSimulationStore((s) => s.sliders.budget_millions);
  const riskTolerance = useSimulationStore((s) => s.sliders.risk_tolerance);

  return useMemo(() => {
    const { exceededIds, spentMillions } = applyBudgetConstraint(
      blocks,
      blockStates,
      budgetMillions,
      { order: advanceOrder, riskTolerance }
    );
    return { spentMillions, budgetExceededIds: exceededIds, budgetMillions };
  }, [blocks, blockStates, advanceOrder, budgetMillions, riskTolerance]);
}

/** Everything `deriveSimulationResults` reads — the store's simulation inputs. */
export interface SimulationSnapshot {
  blocks: Block[];
  attackChains: AttackChain[];
  blockStates: Record<string, BlockState>;
  advanceOrder: string[];
  year: number;
  sliders: Sliders;
  adversaryOc: number;
  modelServedExternally: boolean;
}

/**
 * All derived simulation results for one store snapshot. Pure, so the
 * consistency test can call it without React; `useSimulationResults` is a
 * memoized wrapper around it.
 *
 * The scores themselves come from `scorePosture` — the same pipeline the
 * timeline, the Policy and CISO analyses and the intro's mini-game run — so no
 * panel can show a different SL or breach for the same posture.
 */
export function deriveSimulationResults(snapshot: SimulationSnapshot) {
  const {
    blocks,
    attackChains,
    blockStates,
    advanceOrder,
    year,
    sliders,
    adversaryOc,
    modelServedExternally,
  } = snapshot;

  // Over-budget blocks fall back to their baseline and unmet prerequisites cap
  // at implementing, for every number below; funding follows advancement order
  // so a new block can only cap itself.
  const score = scorePosture({
    blocks,
    chains: attackChains,
    blockStates,
    advanceOrder,
    year,
    sliders,
    adversaryOc,
    modelServedExternally,
  });
  const {
    effectiveStates,
    budgetExceededIds,
    spentMillions,
    dependencyUnmetIds,
    dependencyUnmetRequires,
    categoryScores,
    overallSl: overall,
    breachProbabilities,
    residualFloors,
    bestChain,
  } = score;

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
    effectiveStates,
    categoryScores,
    overallSl: overall,
    breachProbabilities,
    residualFloors,
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

/**
 * Hook that computes all derived simulation results from current store state.
 * React components subscribe to this for live-updating scores. Memoized on the
 * simulation inputs, so UI-only store changes (selected chain, perspective)
 * don't re-run the engine.
 */
export function useSimulationResults() {
  const blocks = useSimulationStore((s) => s.blocks);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const advanceOrder = useSimulationStore((s) => s.advanceOrder);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const modelServedExternally = useSimulationStore((s) => s.modelServedExternally);

  return useMemo(
    () =>
      deriveSimulationResults({
        blocks,
        attackChains,
        blockStates,
        advanceOrder,
        year,
        sliders,
        adversaryOc,
        modelServedExternally,
      }),
    [blocks, attackChains, blockStates, advanceOrder, year, sliders, adversaryOc, modelServedExternally]
  );
}
