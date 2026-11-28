/**
 * Time is a bare number of years in this model, but it moves in months during
 * playback; this is the one place a year becomes text. Everything else that
 * turns a number into words lives in `model/words.ts`.
 */
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
