import { NO_DEADLINE_MONTHS } from "./decision-windows";

export function formatSl(score: number): string {
  return score.toFixed(1);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatCost(millions: number): string {
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${Math.round(millions)}M`;
}

export function formatProbability(p: number): string {
  if (p < 0.01) return "<1%";
  // Near saturation, integer rounding freezes the display at "99%" and hides
  // real movement — show one decimal so cause→effect stays visible.
  if (p >= 0.999) return ">99.9%";
  if (p >= 0.95) return `${(p * 100).toFixed(1)}%`;
  return `${Math.round(p * 100)}%`;
}

/** "6-18mo", or "24mo+ (research-gated)" when the max is the open-ended sentinel. */
export function formatDeployRange(min: number, max: number): string {
  if (max >= NO_DEADLINE_MONTHS) return `${min}mo+ (research-gated)`;
  return `${min}-${max}mo`;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "2027" on a year boundary, "Jul 2027" mid-year.
 *
 * Time in this model is a bare number of years, but everything underneath it is
 * counted in months, so a fractional year reads as a month rather than as
 * "2027.5". Rounds to the nearest month, which rolls 2027.99 up to "2028" — a
 * marker sitting on the 2028 tick should never be labelled December.
 */
export function formatYear(year: number): string {
  const months = Math.round(year * 12);
  const whole = Math.floor(months / 12);
  const month = months - whole * 12;
  return month === 0 ? `${whole}` : `${MONTH_NAMES[month]} ${whole}`;
}
