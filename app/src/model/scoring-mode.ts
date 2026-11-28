import type { PostureScore } from "../engine/posture";
import type { Category } from "../engine/types";
import { CATEGORY_ORDER, isOperational } from "./names";

/**
 * How the headline security level is scored. The reader picks it in
 * Parameters and on the rail; it is saved, and carried by share links.
 *
 *  - `paths` (default): the threat-relative level. SL-n means OC-n's
 *    campaigns usually fail along their easiest attack paths (RAND's vectors).
 *  - `coverage`: v1's method. How much of the catalogue is built, per
 *    category, folded as 0.3 × the weakest category + 0.7 × the mean. It is
 *    `programCompleteness`, the number paths mode shows as a secondary line.
 *
 * Both read the same `scorePosture` result; nothing here re-scores a posture.
 * Where the two disagree is the point: broad coverage with an insider
 * approach wide open scores high on coverage and low on paths.
 */
export type ScoringMode = "paths" | "coverage";

export const SCORING_MODES: readonly ScoringMode[] = ["paths", "coverage"];
export const DEFAULT_SCORING_MODE: ScoringMode = "paths";

export function isScoringMode(x: unknown): x is ScoringMode {
  return x === "paths" || x === "coverage";
}

export function otherMode(mode: ScoringMode): ScoringMode {
  return mode === "paths" ? "coverage" : "paths";
}

export const SCORING_MODE_WORDS: Readonly<Record<ScoringMode, { label: string; hint: string; short: string; by: string }>> = {
  paths: {
    label: "Attack-path analysis",
    hint: "which attackers you usually stop (RAND vectors)",
    short: "Attack paths",
    by: "attack paths",
  },
  coverage: {
    label: "Control coverage",
    hint: "how much of the catalogue you've built (the v1 method)",
    short: "Coverage",
    by: "control coverage",
  },
};

export interface CategoryCoverage {
  category: Category;
  /** The category's completeness score, 1–5 (`computeCategoryScores`). */
  score: number;
  /** (score − 1) / 4: the weighted share of the category's controls in place,
   * by how built each one is. A share of controls, not a probability. */
  share: number;
  /** Today's blocks in the category that are deployed or mature. */
  inPlace: number;
  total: number;
  /** The lowest category: the one the 0.3 weakest-link term reads. */
  weakest: boolean;
}

export interface CoverageLevel {
  /** `programCompleteness`, 1–5. */
  value: number;
  level: number;
  /** 0–1 toward the next level (1 at SL5). */
  progress: number;
  categories: CategoryCoverage[];
  inPlace: number;
  total: number;
}

/** A 1–5 value as a whole level plus progress toward the next. */
export function levelOf(value: number): { level: number; progress: number } {
  const v = Math.min(5, Math.max(0, value));
  // A hair of slack so 2.9999999 from float sums reads as 3, not 2 + 1.0.
  const level = Math.min(5, Math.floor(v + 1e-9));
  return { level, progress: level >= 5 ? 1 : Math.max(0, Math.min(1, v - level)) };
}

/**
 * The coverage-mode level and its per-category breakdown, from the engine's
 * own `programCompleteness` and `categoryScores`. Counts are over today's
 * catalogue (no R&D blocks), which is what completeness measures.
 */
export function coverageLevel(score: PostureScore): CoverageLevel {
  const today = score.catalogue.filter((b) => !b.future);
  const lowest = Math.min(...CATEGORY_ORDER.map((c) => score.categoryScores[c]));
  const categories = CATEGORY_ORDER.map((category): CategoryCoverage => {
    const blocks = today.filter((b) => b.category === category);
    const s = score.categoryScores[category];
    return {
      category,
      score: s,
      share: Math.max(0, Math.min(1, (s - 1) / 4)),
      inPlace: blocks.filter((b) => isOperational(score.effectiveStates[b.id])).length,
      total: blocks.length,
      weakest: s === lowest,
    };
  });
  const value = score.programCompleteness;
  return {
    value,
    ...levelOf(value),
    categories,
    inPlace: categories.reduce((n, c) => n + c.inPlace, 0),
    total: categories.reduce((n, c) => n + c.total, 0),
  };
}

/**
 * A coverage share as text: "42% coverage" (how built the category is, weighted
 * by maturity — not a head-count; "x of y in place" is shown beside it). The one place the UI prints a
 * percentage, and only in coverage mode: it is a share of controls built, not
 * a probability, so the "no percentages" rule (`model/words.ts`) does not
 * cover it. Render it inside a `data-coverage-share` element, which is what
 * the no-percentages checks exempt.
 */
export function coverageShareText(share: number): string {
  return `${Math.round(share * 100)}% coverage`;
}
