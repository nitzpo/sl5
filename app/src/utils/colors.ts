import type { BlockState, DefenseType } from "../engine/types";

export const DEFENSE_COLORS: Record<DefenseType, string> = {
  hard_stop: "#2563eb",      // blue-600
  probabilistic: "#d97706",  // amber-600
  hybrid: "#0d9488",         // teal-600
};

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
