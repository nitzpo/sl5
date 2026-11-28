import { useDeferredValue, useMemo } from "react";
import { useSimulationStore } from "./simulation";
import { applyBudgetConstraint, scorePosture } from "../engine";
import type { PostureInput, PostureScore } from "../engine/posture";
import type { Block, BlockState, Sliders, ThreatModel } from "../engine/types";
import { recommendInvestments, type InvestmentAnalysis } from "../utils/ciso-recommendations";

/**
 * Just the money: planned spend and which blocks the budget can't pay for.
 * Separate from `useScore` so the playback transport, which renders every
 * frame, doesn't pay for a full scoring pass.
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

/** Everything `scorePosture` reads from the store. */
export interface SimulationSnapshot {
  blocks: Block[];
  threatModel: ThreatModel;
  blockStates: Record<string, BlockState>;
  advanceOrder: string[];
  year: number;
  sliders: Sliders;
  adversaryOc: number;
  modelServedExternally: boolean;
}

export function postureInput(s: SimulationSnapshot): PostureInput {
  return {
    blocks: s.blocks,
    model: s.threatModel,
    blockStates: s.blockStates,
    advanceOrder: s.advanceOrder,
    year: s.year,
    sliders: s.sliders,
    adversaryOc: s.adversaryOc,
    modelServedExternally: s.modelServedExternally,
  };
}

/**
 * The score for one store snapshot. Every number on screen — the rail, the
 * catalogue's path and badges, the approach lanes, the race strip at the
 * store's year — reads this one `scorePosture` result, so no two panels can
 * disagree about the same posture (`tests/engine/posture.test.ts`).
 */
export function deriveScore(snapshot: SimulationSnapshot): PostureScore {
  return scorePosture(postureInput(snapshot));
}

/** The store's simulation inputs, memoised as one object. UI-only store
 * changes (drawer, selection) don't produce a new one. */
export function usePostureInput(): PostureInput {
  const blocks = useSimulationStore((s) => s.blocks);
  const threatModel = useSimulationStore((s) => s.threatModel);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const advanceOrder = useSimulationStore((s) => s.advanceOrder);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const modelServedExternally = useSimulationStore((s) => s.modelServedExternally);
  return useMemo(
    () =>
      postureInput({
        blocks,
        threatModel,
        blockStates,
        advanceOrder,
        year,
        sliders,
        adversaryOc,
        modelServedExternally,
      }),
    [blocks, threatModel, blockStates, advanceOrder, year, sliders, adversaryOc, modelServedExternally]
  );
}

/**
 * `scorePosture`, memoised on the identity of its inputs. The rail, the
 * catalogue, the path caption, the drawer and the click feedback all ask for
 * the same posture's score; one entry is enough to make that one run.
 */
let lastScore: { key: unknown[]; score: PostureScore } | null = null;
export function cachedScore(input: PostureInput): PostureScore {
  const key = [
    input.blocks,
    input.model,
    input.blockStates,
    input.advanceOrder,
    input.year,
    input.sliders,
    input.adversaryOc,
    input.modelServedExternally,
  ];
  if (lastScore && lastScore.key.every((k, i) => k === key[i])) return lastScore.score;
  const score = scorePosture(input);
  lastScore = { key, score };
  return score;
}

/** The live score. `scorePosture` is ~2 ms, so it runs on every click. */
export function useScore(): PostureScore {
  const input = usePostureInput();
  return useMemo(() => cachedScore(input), [input]);
}

/**
 * The engine-ranked next moves. Each candidate is a full `scorePosture` run
 * (~60 of them, ~80 ms together), so this reads a deferred copy of the inputs:
 * the click repaints the catalogue and the verdict first, and the ranking
 * follows a beat later. Skipped during playback, where the posture changes
 * every frame.
 */
export function useRecommendations(limit = 3): { analysis: InvestmentAnalysis | null; stale: boolean } {
  const input = usePostureInput();
  const playbackActive = useSimulationStore((s) => s.playbackActive);
  // Coverage mode ranks by completeness gained per $M, paths mode by the
  // campaign cut; switching re-ranks, so the mode is deferred with the inputs.
  const mode = useSimulationStore((s) => s.scoringMode);
  const deferred = useDeferredValue(input);
  const deferredMode = useDeferredValue(mode);
  const analysis = useMemo(
    () =>
      playbackActive || deferred.blocks.length === 0
        ? null
        : recommendInvestments(deferred, { limit, objective: deferredMode }),
    [deferred, deferredMode, limit, playbackActive]
  );
  return { analysis, stale: deferred !== input || deferredMode !== mode };
}
