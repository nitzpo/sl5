import { useMemo } from "react";
import type { ApproachResult, PostureScore } from "../../engine/posture";
import type { Block } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { useScore } from "../../store/derived";
import { useUiStore } from "../../store/ui";
import {
  CHOKE_MIN,
  blockColumn,
  chokeCount,
  headlineApproaches,
  leadingApproaches,
  matrixCells,
  pathAnchors,
  stageCoverage,
  type MatrixColumn,
  type PathStepAnchor,
} from "../../model/catalogue-layout";
import { computeDecisionWindows } from "../../utils/decision-windows";

export interface DrawnPath {
  approach: ApproachResult;
  anchors: PathStepAnchor[];
  /** Leading (thick) or one of the rest (thin). */
  lead: boolean;
}

export interface CatalogueModel {
  score: PostureScore;
  /** The blocks on show: future ones only with the toggle on. */
  blocks: Block[];
  cells: ReturnType<typeof matrixCells>;
  columnOf: (b: Block) => MatrixColumn;
  coverage: ReturnType<typeof stageCoverage>;
  paths: DrawnPath[];
  /** Block id → the paths whose line runs through it. */
  onPath: Map<string, DrawnPath[]>;
  /** Block id → choke count (only ≥ CHOKE_MIN). */
  choke: Map<string, number>;
  startNow: Set<string>;
}

export function useCatalogueModel(): CatalogueModel {
  const score = useScore();
  const allBlocks = useSimulationStore((s) => s.blocks);
  const vectors = useSimulationStore((s) => s.threatModel.vectors);
  const futureOn = useSimulationStore((s) => s.futureCapabilities);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const showAll = useUiStore((s) => s.showAllApproaches);
  const focus = useUiStore((s) => s.focusApproach);

  const layout = useMemo(() => {
    const vectorsById = new Map(vectors.map((v) => [v.id, v]));
    const columns = new Map(allBlocks.map((b) => [b.id, blockColumn(b, vectorsById)]));
    const columnOf = (b: Block) => columns.get(b.id) ?? "entry";
    const blocks = allBlocks.filter((b) => futureOn || !b.future);
    return { blocks, columnOf, cells: matrixCells(blocks, vectorsById) };
  }, [allBlocks, vectors, futureOn]);

  const derived = useMemo(() => {
    const { cells, columnOf } = layout;
    const coverage = stageCoverage(score, cells, score.effectiveStates);
    const leading = leadingApproaches(score);
    const leadIds = new Set(leading.map((a) => a.id));
    const active = headlineApproaches(score);
    let chosen: ApproachResult[];
    if (focus && active.some((a) => a.id === focus)) {
      chosen = active.filter((a) => a.id === focus || (showAll && a.id !== focus));
      leadIds.clear();
      leadIds.add(focus);
    } else if (showAll) {
      chosen = active;
    } else {
      chosen = leading;
    }
    // Thin ones first so the leading line paints on top.
    const paths: DrawnPath[] = chosen
      .map((approach) => ({
        approach,
        anchors: pathAnchors(approach, score.catalogue, score.effectiveStates, columnOf),
        lead: leadIds.has(approach.id),
      }))
      .sort((a, b) => Number(a.lead) - Number(b.lead) || a.approach.p - b.approach.p);
    const onPath = new Map<string, DrawnPath[]>();
    for (const p of paths) {
      for (const a of p.anchors) {
        if (!a.anchorId) continue;
        onPath.set(a.anchorId, [...(onPath.get(a.anchorId) ?? []), p]);
      }
    }
    const choke = new Map<string, number>();
    for (const b of score.catalogue) {
      const n = chokeCount(score, b.id);
      if (n >= CHOKE_MIN) choke.set(b.id, n);
    }
    return { coverage, paths, onPath, choke };
  }, [score, layout, focus, showAll]);

  const startNow = useMemo(() => {
    const windows = computeDecisionWindows(layout.blocks, blockStates, year);
    return new Set(windows.filter((w) => w.urgency !== "upcoming").map((w) => w.block.id));
  }, [layout.blocks, blockStates, year]);

  return { score, ...layout, ...derived, startNow };
}
