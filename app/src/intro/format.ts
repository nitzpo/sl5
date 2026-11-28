// Number formatting for the introduction. Money and time are shown as round
// figures and ranges; probabilities are never shown as numbers at all.

/** $1K, $10K, $1M, $10M, $150M, $1B, $10B. */
export function money(millions: number): string {
  if (millions <= 0) return "$0";
  if (millions >= 1000) {
    const b = millions / 1000;
    return `$${Number.isInteger(b) ? b : b.toFixed(1)}B`;
  }
  if (millions >= 1) return `$${Math.round(millions)}M`;
  return `$${Math.round(millions * 1000)}K`;
}

/** "1 week", "1 month", "6 months", "1 year", "5 years". */
export function duration(months: number): string {
  if (months < 1) {
    const weeks = Math.max(1, Math.round(months * 4));
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = months / 12;
  const y = Number.isInteger(years) ? years : Number(years.toFixed(1));
  return `${y} year${y === 1 ? "" : "s"}`;
}

/** "12–24 months". */
export function monthRange(min: number, max: number): string {
  return min === max ? `${min} months` : `${min}–${max} months`;
}

export function people(n: number): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? "person" : "people"}`;
}

/** A fractional year as a month and year: 2028.25 → "Apr 2028". */
export function monthYear(year: number): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const y = Math.floor(year + 1e-9);
  const m = Math.min(11, Math.round((year - y) * 12));
  return m === 0 ? String(y) : `${months[m]} ${y}`;
}
