import type { BandWord, Icd203Word } from "../engine/threat-sl";
import { SL_BAR_PRESETS } from "../engine/threat-sl";
import { NO_DEADLINE_MONTHS } from "../utils/decision-windows";

/**
 * Numbers are deliberately vague in this UI: band words with the ICD 203 word
 * on hover, an SL level with a progress bar (the decimal only in a tooltip),
 * and money and lead times as ranges. These are the only places a number
 * becomes text, so "no percentages" is a property of this file.
 */

export const BAND_WORDS: readonly BandWord[] = ["usually fails", "contested", "usually succeeds"];

export function bandIndex(band: BandWord): 0 | 1 | 2 {
  return band === "usually fails" ? 0 : band === "contested" ? 1 : 2;
}

/** Hover text for a band word. */
export function bandTitle(band: BandWord, detail: Icd203Word, what = "Campaign success"): string {
  return `${what}: ${band} — ICD 203: “${detail}”`;
}

export function money(millions: number): string {
  if (millions >= 1000) {
    const b = millions / 1000;
    return `$${b >= 10 ? Math.round(b) : b.toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (millions > 0 && millions < 1) return "<$1M";
  return `$${Math.round(millions)}M`;
}

export function moneyRange(min: number, max: number): string {
  if (Math.round(min) === Math.round(max)) return money(min);
  if (max >= 1000 && min >= 1000) return `${money(min)}–${money(max).slice(1)}`;
  if (max < 1000) return `$${Math.round(min)}–${Math.round(max)}M`;
  return `${money(min)}–${money(max)}`;
}

/** Research-gated blocks carry a 999-month sentinel (`NO_DEADLINE_MONTHS`). */
export function leadTime(min: number, max: number): string {
  if (max >= NO_DEADLINE_MONTHS) return `${min} mo +, research-gated`;
  if (min === max) return `${min} mo`;
  return `${min}–${max} mo`;
}

/** "SL2" etc. The decimal is for tooltips only. */
export function slTitle(value: number, marginal: boolean): string {
  return `Security level ${value.toFixed(2)}${marginal ? " (marginal: the top tier held sits close to the bar)" : ""}`;
}

/** How a completed_by standalone share reads: "about half". */
export function shareWord(share: number): string {
  if (share < 0.2) return "very little";
  if (share < 0.4) return "about a third";
  if (share < 0.6) return "about half";
  if (share < 0.8) return "most of it";
  return "nearly all of it";
}

/** The year's AI capability, in words. */
export function aiWord(cap: number): string {
  if (cap < 0.1) return "Minimal";
  if (cap < 0.3) return "Emerging";
  if (cap < 0.5) return "Modest";
  if (cap < 0.75) return "Strong";
  if (cap < 0.95) return "Very strong";
  return "Frontier";
}

/** Programme completeness (1–5) in words. */
export function completenessWord(score: number): string {
  if (score < 1.5) return "Bare";
  if (score < 2.2) return "Early";
  if (score < 3) return "Developing";
  if (score < 3.8) return "Broad";
  return "Near complete";
}

/** Stage coverage: the share of the attacker's best option a stage's
 * defenses remove, in words. */
export type CoverageWord = "Open" | "Thin" | "Partly held" | "Held";
export function coverageWord(cut: number): CoverageWord {
  if (cut < 0.15) return "Open";
  if (cut < 0.4) return "Thin";
  if (cut < 0.7) return "Partly held";
  return "Held";
}

/** Detection q (chance a failed attempt is caught) in words. */
export function detectionWord(q: number): string {
  if (q < 0.05) return "Blind";
  if (q < 0.2) return "Rarely catches";
  if (q < 0.35) return "Sometimes catches";
  return "Often catches";
}

export type BarPreset = keyof typeof SL_BAR_PRESETS;
export const BAR_PRESET_WORDS: Readonly<Record<BarPreset, { label: string; ratio: string }>> = {
  strict: { label: "Strict", ratio: "about one in ten" },
  standard: { label: "Standard", ratio: "about one in five" },
  lenient: { label: "Lenient", ratio: "about one in three" },
};

/** The preset nearest a bar value (custom bars from old links snap to one). */
export function presetFor(bar: number): BarPreset {
  let best: BarPreset = "standard";
  let gap = Infinity;
  for (const [k, v] of Object.entries(SL_BAR_PRESETS) as [BarPreset, number][]) {
    if (Math.abs(v - bar) < gap) {
      gap = Math.abs(v - bar);
      best = k;
    }
  }
  return best;
}

/** A 0–1 slider in words, from its two ends. */
export function sliderWord(value: number, low: string, high: string): string {
  if (value < 0.15) return low;
  if (value < 0.45) return `Leaning ${low.toLowerCase()}`;
  if (value <= 0.55) return "Middling";
  if (value <= 0.85) return `Leaning ${high.toLowerCase()}`;
  return high;
}

/** AI propensity (chance a misaligned model tries at all) in words. */
export function propensityWord(p: number): string {
  if (p < 0.1) return "Almost never tries";
  if (p < 0.35) return "Seldom tries";
  if (p <= 0.65) return "Might well try";
  if (p < 0.9) return "Likely tries";
  return "Will try";
}
