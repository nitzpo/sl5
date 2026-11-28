import { useMemo } from "react";
import { useSimulationStore } from "./simulation";
import { applyBudgetConstraint, catalogueInForce, scorePosture } from "../engine";
import type { Block, BlockState, Sliders, ThreatModel } from "../engine/types";
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
  const futureCapabilities = useSimulationStore((s) => s.futureCapabilities);

  return useMemo(() => {
    const { exceededIds, spentMillions } = applyBudgetConstraint(
      catalogueInForce(blocks, futureCapabilities),
      blockStates,
      budgetMillions,
      { order: advanceOrder, riskTolerance }
    );
    return { spentMillions, budgetExceededIds: exceededIds, budgetMillions };
  }, [blocks, blockStates, advanceOrder, budgetMillions, riskTolerance, futureCapabilities]);
}

/** Everything `deriveSimulationResults` reads — the store's simulation inputs. */
export interface SimulationSnapshot {
  blocks: Block[];
  threatModel: ThreatModel;
  blockStates: Record<string, BlockState>;
  advanceOrder: string[];
  year: number;
  sliders: Sliders;
  adversaryOc: number;
  modelServedExternally: boolean;
  futureCapabilities: boolean;
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
    threatModel,
    blockStates,
    advanceOrder,
    year,
    sliders,
    adversaryOc,
    modelServedExternally,
    futureCapabilities,
  } = snapshot;

  // Over-budget blocks fall back to their baseline and unmet prerequisites cap
  // at implementing, for every number below; funding follows advancement order
  // so a new block can only cap itself.
  const score = scorePosture({
    blocks,
    model: threatModel,
    blockStates,
    advanceOrder,
    year,
    sliders,
    adversaryOc,
    modelServedExternally,
    futureCapabilities,
  });
  const { effectiveStates } = score;

  // Compatibility for the Score card: campaign success against OC3–5, from the
  // same tiers the SL is computed on.
  const breachByOc: Record<number, number> = {};
  for (const oc of [3, 4, 5]) breachByOc[oc] = score.tiers[oc - 1].p;

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
    // The new API (threat-relative SL, tiers, approaches, meters, relevance).
    ...score,
    // Compatibility fields the pre-vector views read (Phase 2B moves them to
    // the fields above): the cumulative distillation meter and OC3–5 campaign.
    extractionProgress: score.capabilityLeakage.cumulative,
    breachByOc,
    defenseLayerStatus,
    activeLayers,
    blocksByLayer,
    overBudget: score.budgetExceededIds.size > 0,
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
  const threatModel = useSimulationStore((s) => s.threatModel);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const advanceOrder = useSimulationStore((s) => s.advanceOrder);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const modelServedExternally = useSimulationStore((s) => s.modelServedExternally);
  const futureCapabilities = useSimulationStore((s) => s.futureCapabilities);

  return useMemo(
    () =>
      deriveSimulationResults({
        blocks,
        threatModel,
        blockStates,
        advanceOrder,
        year,
        sliders,
        adversaryOc,
        modelServedExternally,
        futureCapabilities,
      }),
    [blocks, threatModel, blockStates, advanceOrder, year, sliders, adversaryOc, modelServedExternally, futureCapabilities]
  );
}
