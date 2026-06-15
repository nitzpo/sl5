import type { BlockState } from "./types";

const STATE_ORDER: BlockState[] = [
  "not_started",
  "investing",
  "implementing",
  "deployed",
  "mature",
];

const DEFAULT_INVESTING_FRACTION = 0.3;
const DEFAULT_MATURE_MONTHS = 12;

/**
 * Given a block's time_to_deploy and when investment started,
 * determine its state at a given year.
 */
export function blockStateAtYear(
  startYear: number | null,
  currentYear: number,
  timeToDeployMonths: number,
  investingFraction: number = DEFAULT_INVESTING_FRACTION,
  matureMonths: number = DEFAULT_MATURE_MONTHS
): BlockState {
  if (startYear === null) return "not_started";

  const elapsedMonths = (currentYear - startYear) * 12;
  if (elapsedMonths <= 0) return "not_started";

  const investingEnd = timeToDeployMonths * investingFraction;
  const deployedAt = timeToDeployMonths;
  const matureAt = timeToDeployMonths + matureMonths;

  if (elapsedMonths < investingEnd) return "investing";
  if (elapsedMonths < deployedAt) return "implementing";
  if (elapsedMonths < matureAt) return "deployed";
  return "mature";
}

/**
 * Get the next state after the current one (for manual toggle cycling).
 */
export function nextBlockState(current: BlockState): BlockState {
  const idx = STATE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STATE_ORDER.length - 1) return STATE_ORDER[0];
  return STATE_ORDER[idx + 1];
}

/**
 * Get the numeric index of a state (for ordering/comparison).
 */
export function stateIndex(state: BlockState): number {
  return STATE_ORDER.indexOf(state);
}
