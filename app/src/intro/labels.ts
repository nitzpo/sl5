// Display names for the engine's enums, shared by the slides and demos. Kept
// out of the component files so React's fast refresh keeps working on them.

import type { BlockState, DefenseType } from "../engine/types";

/** How much of a block's glyph is filled, per state: empty outline, a tip,
 * the lower third, full, full (mature adds an inner hairline). */
export const STATE_FILL: Record<BlockState, number> = {
  not_started: 0,
  investing: 0.16,
  implementing: 1 / 3,
  deployed: 1,
  mature: 1,
};

export const STATE_LABEL: Record<BlockState, string> = {
  not_started: "Not started",
  investing: "Investing",
  implementing: "Implementing",
  deployed: "Deployed",
  mature: "Mature",
};

export const TYPE_LABEL: Record<DefenseType, string> = {
  hard_stop: "Hard stop",
  probabilistic: "Probabilistic",
  hybrid: "Hybrid",
};

