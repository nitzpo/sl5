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
  if (p > 0.99) return ">99%";
  return `${Math.round(p * 100)}%`;
}

/** "6-18mo", or "24mo+ (research-gated)" when the max is the open-ended sentinel. */
export function formatDeployRange(min: number, max: number): string {
  if (max >= NO_DEADLINE_MONTHS) return `${min}mo+ (research-gated)`;
  return `${min}-${max}mo`;
}
