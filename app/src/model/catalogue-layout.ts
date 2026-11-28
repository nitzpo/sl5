import type { AttackVector, Block, BlockState, Category, Stage } from "../engine/types";
import { STAGES } from "../engine/types";
import { DETECTION_BLOCKS } from "../engine/vector-model";
import type { ApproachResult, PostureScore } from "../engine/posture";
import { CATEGORY_ORDER, isOperational } from "./names";
import { coverageWord, detectionWord, type CoverageWord } from "./words";

/**
 * Where each block sits in the stage matrix, and the readouts the catalogue
 * draws on top of it. Everything is derived from the data and from
 * `scorePosture`, never from a hand list.
 *
 * THE COLUMN RULE. A block's column is the stage of the vectors it counters
 * strongly: the stage with the most strong counters, ties broken by the most
 * partial counters there, remaining ties going to the later stage (closer to
 * the weights). A block with no strong counter uses its partial counters the
 * same way. The two detection blocks the engine scores at campaign level
 * (`DETECTION_BLOCKS`: security operations, deception) get their own column,
 * "Detect & respond", because that is how the engine uses them.
 */

export type MatrixColumn = Stage | "detect";
export const MATRIX_COLUMNS: readonly MatrixColumn[] = ["entry", "reach", "exfil", "detect"];

export function primaryStage(block: Block, vectorsById: Map<string, AttackVector>): Stage {
  const strong: Record<Stage, number> = { entry: 0, reach: 0, exfil: 0 };
  const partial: Record<Stage, number> = { entry: 0, reach: 0, exfil: 0 };
  for (const c of block.counters ?? []) {
    const v = vectorsById.get(c.vector_id);
    if (!v) continue;
    (c.strength === "strong" ? strong : partial)[v.stage]++;
  }
  let best: Stage = "entry";
  for (const s of STAGES) {
    const a = strong[s] * 1000 + partial[s];
    const b = strong[best] * 1000 + partial[best];
    if (a >= b) best = s; // ">=": ties go to the later stage
  }
  return best;
}

export function blockColumn(block: Block, vectorsById: Map<string, AttackVector>): MatrixColumn {
  if (DETECTION_BLOCKS[block.id] !== undefined) return "detect";
  return primaryStage(block, vectorsById);
}

/** Natural order on ids: prefix, then number ("HW-2" before "HW-10"). */
export function compareIds(a: string, b: string): number {
  const [pa, na] = a.split("-");
  const [pb, nb] = b.split("-");
  return pa.localeCompare(pb) || Number(na) - Number(nb);
}

/** A fixed order inside every cell, so tiles never move when the posture
 * changes: today's blocks by id, future (R&D) blocks last. */
export function cellOrder(a: Block, b: Block): number {
  return Number(!!a.future) - Number(!!b.future) || compareIds(a.id, b.id);
}

export type MatrixCells = Record<Category, Record<MatrixColumn, Block[]>>;

export function matrixCells(blocks: Block[], vectorsById: Map<string, AttackVector>): MatrixCells {
  const cells = {} as MatrixCells;
  for (const cat of CATEGORY_ORDER) cells[cat] = { entry: [], reach: [], exfil: [], detect: [] };
  for (const b of blocks) cells[b.category]?.[blockColumn(b, vectorsById)].push(b);
  for (const cat of CATEGORY_ORDER) for (const col of MATRIX_COLUMNS) cells[cat][col].sort(cellOrder);
  return cells;
}

// ---------------------------------------------------------------------------
// Readouts drawn on the catalogue
// ---------------------------------------------------------------------------

/** The approaches that count toward the SL: the human ones at the adversary
 * tier (only while active) and the lab's own model. */
export function headlineApproaches(score: PostureScore): ApproachResult[] {
  return score.approaches.filter((a) => a.active);
}

/** The leading approach and any close behind it (within a fifth of its
 * success), at most `max`. These get the thick line. */
export function leadingApproaches(score: PostureScore, max = 2): ApproachResult[] {
  const sorted = [...headlineApproaches(score)].sort((a, b) => b.p - a.p);
  if (sorted.length === 0) return [];
  const top = sorted[0].p;
  return sorted.filter((a, i) => i === 0 || a.p >= 0.8 * top).slice(0, max);
}

export interface StageCoverage {
  stage: MatrixColumn;
  /** Share of the attacker's best option at this stage the defenses remove,
   * averaged over the approaches' easiest paths. Detect: the chance q. */
  cut: number;
  word: CoverageWord | string;
  weakest: boolean;
  /** Blocks in this column, and how many are operational. */
  total: number;
  inPlace: number;
}

/**
 * Each stage header's word. For a stage, every active approach whose easiest
 * path uses a vector there contributes 1 − p/baseP: how much of that vector
 * the defenses on it remove. The weakest stage is the one with the least.
 */
export function stageCoverage(
  score: PostureScore,
  cells: MatrixCells,
  effectiveStates: Record<string, BlockState>
): StageCoverage[] {
  const out: StageCoverage[] = [];
  const counts = (col: MatrixColumn) => {
    const ids = CATEGORY_ORDER.flatMap((c) => cells[c][col]).filter((b) => !b.future || score.catalogue.includes(b));
    return { total: ids.length, inPlace: ids.filter((b) => isOperational(effectiveStates[b.id])).length };
  };
  for (const stage of STAGES) {
    const cuts: number[] = [];
    for (const a of headlineApproaches(score)) {
      for (const step of a.path) {
        if (step.stage !== stage || step.baseP <= 0) continue;
        cuts.push(1 - step.p / step.baseP);
      }
    }
    const cut = cuts.length ? cuts.reduce((s, x) => s + x, 0) / cuts.length : 1;
    out.push({ stage, cut, word: coverageWord(cut), weakest: false, ...counts(stage) });
  }
  const weakest = out.reduce((m, s) => (s.cut < m.cut ? s : m), out[0]);
  weakest.weakest = true;
  out.push({ stage: "detect", cut: score.detection.q, word: detectionWord(score.detection.q), weakest: false, ...counts("detect") });
  return out;
}

/** How many headline approaches' easiest paths run through a vector this
 * block counters. Three or more makes it a choke point. */
export function chokeCount(score: PostureScore, blockId: string): number {
  const headline = new Set(headlineApproaches(score).map((a) => a.id));
  return (score.blockRelevance[blockId]?.binding ?? []).filter((id) => headline.has(id)).length;
}
export const CHOKE_MIN = 3;

export interface PathStepAnchor {
  stage: Stage;
  vectorId: string;
  /** p / baseP: the share of this step the defenses let past. */
  pass: number;
  /** The block the line is drawn through at this stage, if one counters the
   * vector from this stage's column. */
  anchorId: string | null;
  /** An operational strong counter holds here: draw a break mark. */
  holds: boolean;
}

/**
 * Where an approach's easiest path crosses the catalogue: for each step, the
 * block that counters its vector from that stage's own column. In order of
 * preference: an operational strong counter (it holds: a break mark), the
 * counter in force doing the most, then the strongest counter not yet built —
 * the gap the path runs through.
 */
export function pathAnchors(
  approach: ApproachResult,
  catalogue: Block[],
  effectiveStates: Record<string, BlockState>,
  columnOf: (b: Block) => MatrixColumn
): PathStepAnchor[] {
  return approach.path.map((step) => {
    const inForce = new Map(step.counters.map((c) => [c.blockId, c]));
    const candidates = catalogue
      .filter((b) => columnOf(b) === step.stage)
      .flatMap((b) => {
        const link = b.counters.find((c) => c.vector_id === step.vectorId);
        return link ? [{ block: b, strength: link.strength }] : [];
      });
    const operationalStrong = candidates
      .filter((c) => c.strength === "strong" && isOperational(effectiveStates[c.block.id]))
      .sort((a, b) => (inForce.get(b.block.id)?.effect ?? 0) - (inForce.get(a.block.id)?.effect ?? 0));
    const working = candidates
      .filter((c) => inForce.has(c.block.id))
      .sort((a, b) => inForce.get(b.block.id)!.effect - inForce.get(a.block.id)!.effect);
    const gaps = candidates.sort(
      (a, b) => Number(b.strength === "strong") - Number(a.strength === "strong") || compareIds(a.block.id, b.block.id)
    );
    const pick = operationalStrong[0] ?? working[0] ?? gaps[0] ?? null;
    return {
      stage: step.stage,
      vectorId: step.vectorId,
      pass: step.baseP > 0 ? step.p / step.baseP : 1,
      anchorId: pick?.block.id ?? null,
      holds: !!operationalStrong[0],
    };
  });
}
