import type { BlockState, DefenseType } from "../engine/types";

/**
 * Design tokens — the single source of color meaning for the app.
 *
 * One hue = one meaning:
 *   red      → the threat (attacker, breach, deadline pressure)
 *   green    → the defense (posture, blocked chains)
 *   violet   → AI capability (curve, playback, model weights)
 *   pink     → over budget
 *   sky      → dependency relationships
 *   blue/amber/teal → defense-type identity (hard stop / probabilistic / hybrid)
 *   slate    → chrome and epistemic markers (contested feasibility)
 *
 * The defense-type triad and the chain series palette were validated with the
 * dataviz six-checks validator against the app surface #030712 (triad passes
 * all checks; the 7-slot chain palette is floor-band CVD 10.3, which is legal
 * because chains always ship with a legend + hover highlight + dash variation).
 */

// --- Semantic tokens ---
export const SEMANTIC = {
  threat: "#ef4444",
  threatText: "#f87171",
  defense: "#22c55e",
  defenseText: "#34d399",
  ai: "#8b5cf6",
  overBudget: "#ec4899",
  neutral: "#6b7280",
  chrome: "#9ca3af",
} as const;

// --- Threshold coloring (shared by every panel that grades a number) ---
export type ThresholdLevel = "good" | "warn" | "bad";

/** Breach probability grading: green is reserved for genuinely defensible
 * postures — a 1-in-5 chance of nation-state theft is not a success state. */
export function breachLevel(p: number): ThresholdLevel {
  if (p > 0.25) return "bad";
  if (p > 0.05) return "warn";
  return "good";
}

/** SL score grading relative to a target level (default SL 4). */
export function slLevel(score: number, target: number = 4): ThresholdLevel {
  if (score >= target) return "good";
  if (score >= target - 1.5) return "warn";
  return "bad";
}

export const LEVEL_TEXT: Record<ThresholdLevel, string> = {
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
};

export const LEVEL_HEX: Record<ThresholdLevel, string> = {
  good: "#059669",
  warn: "#f59e0b",
  bad: "#dc2626",
};

// --- Chain series (timeline decomposition) ---
// 7 fixed slots, one hue family each, keyed by chain id so a chain keeps its
// color no matter what is filtered or added. Dash patterns are the secondary
// (CVD/print) channel.
export const CHAIN_SERIES: Record<string, { color: string; dash?: string }> = {
  "quiet-tap": { color: "#3987e5" },
  "poisoned-chip": { color: "#0891b2", dash: "6 3" },
  "alignment-researcher": { color: "#008300" },
  "zero-day-cascade": { color: "#c98500", dash: "2 3" },
  "long-game": { color: "#d95926" },
  "remote-ghost": { color: "#e66767", dash: "8 3 2 3" },
  "patient-distillation": { color: "#d55181" },
};
const FALLBACK_SERIES = ["#3987e5", "#0891b2", "#008300", "#c98500", "#d95926", "#e66767", "#d55181"];

export function chainSeries(chainId: string, index: number): { color: string; dash?: string } {
  return CHAIN_SERIES[chainId] ?? { color: FALLBACK_SERIES[index % FALLBACK_SERIES.length] };
}

// --- Defense-type identity (hex borders/fills; validated triad) ---
export const DEFENSE_COLORS: Record<DefenseType, string> = {
  hard_stop: "#2563eb",      // blue-600
  probabilistic: "#d97706",  // amber-600
  hybrid: "#0d9488",         // teal-600
};

// --- Block-state visual encodings ---
export const STATE_FILL_FRACTION: Record<BlockState, number> = {
  not_started: 0,
  investing: 0.25,
  implementing: 0.55,
  deployed: 1.0,
  mature: 1.0,
};

export const STATE_LABELS: Record<BlockState, string> = {
  not_started: "Not Started",
  investing: "Investing",
  implementing: "Implementing",
  deployed: "Deployed",
  mature: "Mature",
};

export const STATE_ICONS: Record<BlockState, string> = {
  not_started: "✗",
  investing: "◔",
  implementing: "◐",
  deployed: "■",
  mature: "★",
};

// --- Badge styles (weight carries urgency; hue stays semantic) ---
/** Decision-window badge: red = deadline pressure from the threat.
 * Urgency is encoded by WEIGHT (solid vs outline), not by borrowing amber. */
export const URGENCY_BADGE = {
  overdue: { fill: "#ef4444", stroke: "#ef4444", text: "#ffffff" },
  urgent: { fill: "#450a0a", stroke: "#ef4444", text: "#fca5a5" },
  upcoming: { fill: "#1f2937", stroke: "#6b7280", text: "#9ca3af" },
} as const;

/** Contested-feasibility badge: a quiet epistemic marker, not an alarm. */
export const CONTESTED_BADGE = {
  fill: "#1f2937",
  stroke: "#94a3b8",
  text: "#cbd5e1",
} as const;

// --- Dependency arrows: one hue, kind carried by line style ---
export const DEPENDENCY_COLOR = "#38bdf8"; // sky
export const REQUIRES_DASH = "none";
export const ENHANCES_DASH = "4 4";
