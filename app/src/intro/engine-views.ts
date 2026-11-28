// What the introduction's demos ask of the engine, with no React in it.
//
// Every number a demo draws comes from the app's own engine: `scorePosture`
// for postures, levels and attack paths, and the vector model's own functions
// for the one demo that looks inside a single attack vector. Nothing here
// re-implements arithmetic; these helpers only choose the inputs (which
// posture, which world, which year) and turn the outputs into the words the
// intro shows. `tests/intro/engine-views.test.ts` runs them on the shipped data.

import { getAiCapability } from "../engine/ai-curve";
import { baselineStates } from "../engine/baseline";
import { scorePosture, type PostureScore } from "../engine/posture";
import { SL_BAR_PRESETS, bandWord, type BandWord } from "../engine/threat-sl";
import {
  baseFeasibility,
  buildCounterIndex,
  effectiveTier,
  evaluateVector,
  type EvalContext,
  type VectorEval,
} from "../engine/vector-model";
import type { AttackVector, Block, BlockState, Sliders, Stage } from "../engine/types";
import type { ThreatData } from "./data";

// --------------------------------------------------------------------------
// Worlds and postures
// --------------------------------------------------------------------------

/** The instrument's opening world (store/simulation.ts), with the budget lifted
 * so a posture is scored as built rather than as afforded. Demos about the
 * budget set their own. */
export const SLIDERS_AS_TODAY: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.2,
  vendor_cooperation: 0.3,
  budget_millions: 1e6,
  org_transformation: 0.3,
  risk_tolerance: 0.5,
  sl_bar: SL_BAR_PRESETS.standard,
  ai_propensity: 0.5,
};

/** Everything outside the lab goes the defender's way: full government,
 * vendor and organisational cooperation. Paired with the model not served. */
export const SLIDERS_FAVOURABLE: Sliders = {
  ...SLIDERS_AS_TODAY,
  gov_cooperation: 1,
  vendor_cooperation: 1,
  org_transformation: 1,
};

export type World = "as-today" | "favourable";
/** The instrument serves the model by default; the favourable world doesn't. */
export const SERVED: Record<World, boolean> = { "as-today": true, favourable: false };
export const WORLD_SLIDERS: Record<World, Sliders> = {
  "as-today": SLIDERS_AS_TODAY,
  favourable: SLIDERS_FAVOURABLE,
};

export type PostureKind = "typical-lab" | "every-defense";
export type Strictness = keyof typeof SL_BAR_PRESETS;

/** "Today's typical lab" is the instrument's researched starting posture
 * (each block's `baseline_state`); "every defense" is the whole catalogue at
 * mature, with the research-required defenses left out when `research` is off
 * (they cannot be built at that grade today). */
export function postureStates(blocks: Block[], kind: PostureKind, research = true): Record<string, BlockState> {
  if (kind === "typical-lab") return baselineStates(blocks);
  const states: Record<string, BlockState> = {};
  for (const b of blocks) states[b.id] = !b.research_required || research ? "mature" : "not_started";
  return states;
}

export interface Scene {
  posture: PostureKind;
  world?: World;
  strictness?: Strictness;
  /** With every defense: count the research-required ones (default true). */
  research?: boolean;
  year?: number;
  adversaryOc?: number;
  /** Blocks brought to mature on top of the posture. */
  extra?: string[];
  /** Override the world's AI pace (0 slower … 1 faster). */
  aiTimeline?: number;
  /** Override whether the model is served outside the lab. */
  served?: boolean;
}

/** Score a scene with `scorePosture`, the app's one pipeline. */
export function scoreScene(data: ThreatData, scene: Scene): PostureScore {
  const world = scene.world ?? "as-today";
  const states = postureStates(data.blocks, scene.posture, scene.research ?? true);
  for (const id of scene.extra ?? []) states[id] = "mature";
  const sliders: Sliders = {
    ...WORLD_SLIDERS[world],
    sl_bar: SL_BAR_PRESETS[scene.strictness ?? "standard"],
    ...(scene.aiTimeline !== undefined ? { ai_timeline: scene.aiTimeline } : {}),
  };
  return scorePosture({
    blocks: data.blocks,
    model: data.model,
    blockStates: states,
    year: scene.year ?? 2026,
    sliders,
    adversaryOc: scene.adversaryOc ?? 4,
    modelServedExternally: scene.served ?? SERVED[world],
  });
}

// --------------------------------------------------------------------------
// Words
// --------------------------------------------------------------------------

/** The tiers a level stops, in words: "nobody yet", "OC1", "OC1 and OC2",
 * "OC1 to OC3". Held tiers are always a prefix (campaign success never falls
 * as the attacker's tier rises), so the level says it all. */
export function stopsInWords(level: number): string {
  if (level <= 0) return "nobody yet";
  if (level === 1) return "OC1";
  if (level === 2) return "OC1 and OC2";
  return `OC1 to OC${level}`;
}

export const STAGE_LABEL: Record<Stage, string> = {
  entry: "Get in",
  reach: "Reach the weights",
  exfil: "Get them out",
};

export const APPROACH_LABEL: Record<string, string> = {
  remote: "Remote intrusion",
  insider: "Human insider",
  physical: "Physical access",
  supply_chain: "Supply chain",
  served: "The served model",
  ai_insider: "Your own model",
  capability_copy: "Distillation through the API",
  integrity: "Sabotage by your own model",
};

/** A vector's name without RAND's parenthetical gloss, for tight layouts. The
 * full name goes in a tooltip. */
export function shortVectorName(name: string): string {
  const short = name.replace(/\s*\([^)]*\)/g, "").trim();
  return short.length > 0 ? short : name;
}

// --------------------------------------------------------------------------
// AI lifts the attacker
// --------------------------------------------------------------------------

/** The tier an OC-`oc` attacker works at, in `year`, on a vector with this
 * `ai_shift` — the engine's own `effectiveTier`, on a stand-in vector. */
export function liftedTier(oc: number, aiShift: number, year: number, aiTimeline = 0.5): number {
  const standIn = { source: "rand", ai_shift: aiShift } as AttackVector;
  return effectiveTier(standIn, oc, getAiCapability(year, aiTimeline));
}

/** How far a lift goes, in words, for an attacker who started at `oc`. */
export function liftInWords(oc: number, lifted: number): string {
  const d = lifted - oc;
  if (oc >= 5) return "already at the top tier";
  if (d >= 0.95) return `works like OC${oc + 1}`;
  if (d >= 0.5) return `most of the way to OC${oc + 1}`;
  if (d >= 0.15) return "somewhat stronger";
  if (d > 0.001) return "barely changed";
  return "unchanged";
}

/**
 * The threat front: the first year AI lets an attacker work like the next
 * tier up on the steps it helps most (code, credentials and the ML stack,
 * `ai_shift` 1.0). Sampled monthly from the engine's AI curve. Null when it
 * falls after `until`.
 */
export function threatFrontYear(aiTimeline = 0.5, from = 2024, until = 2040): number | null {
  for (let m = 0; m <= (until - from) * 12; m++) {
    const year = from + m / 12;
    if (liftedTier(3, 1, year, aiTimeline) >= 4 - 1e-9) return Math.round(year * 12) / 12;
  }
  return null;
}

// --------------------------------------------------------------------------
// Inside one attack vector: stacking
// --------------------------------------------------------------------------

export interface StackResult {
  vector: AttackVector;
  /** Against a lab with none of these counters. */
  base: VectorEval;
  /** With the chosen counters at mature. */
  withCounters: VectorEval;
  baseBand: BandWord;
  band: BandWord;
}

/**
 * One vector, at one tier, with a chosen set of blocks at mature and nothing
 * else: the engine's `buildCounterIndex` and `evaluateVector`, which apply the
 * stacking ladder (one strong rung, then diminishing partial rungs) and the
 * erosion against this tier.
 */
export function stackOnVector(
  data: ThreatData,
  vectorId: string,
  tier: number,
  counterIds: string[],
  year = 2026,
  sliders: Sliders = SLIDERS_AS_TODAY
): StackResult {
  const vectorsById = new Map(data.model.vectors.map((v) => [v.id, v]));
  const vector = vectorsById.get(vectorId);
  if (!vector) throw new Error(`unknown vector ${vectorId}`);
  const states: Record<string, BlockState> = {};
  for (const id of counterIds) states[id] = "mature";
  const aiCap = getAiCapability(year, sliders.ai_timeline);
  const ctx = (blocks: Block[]): EvalContext => ({
    model: data.model,
    vectorsById,
    counters: buildCounterIndex(blocks, states, year, sliders),
    aiCap,
    sliders,
    opts: {},
  });
  const chosen = data.blocks.filter((b) => counterIds.includes(b.id));
  const base = evaluateVector(ctx([]), vector, tier);
  const withCounters = evaluateVector(ctx(chosen), vector, tier);
  return {
    vector,
    base,
    withCounters,
    baseBand: bandWord(base.p, sliders.sl_bar),
    band: bandWord(withCounters.p, sliders.sl_bar),
  };
}

/** The blocks that counter a vector, strong first, then by id. */
export function countersOf(data: ThreatData, vectorId: string) {
  return data.blocks
    .flatMap((b) =>
      (b.counters ?? [])
        .filter((c) => c.vector_id === vectorId)
        .map((c) => ({ block: b, strength: c.strength, why: c.why }))
    )
    .sort(
      (a, b) =>
        (a.strength === "strong" ? 0 : 1) - (b.strength === "strong" ? 0 : 1) ||
        a.block.id.localeCompare(b.block.id)
    );
}

// --------------------------------------------------------------------------
// Attack vectors against an unprepared lab
// --------------------------------------------------------------------------

/** What RAND's feasibility says an OC-`tier` attacker can usually do with this
 * vector against a lab with no defenses (no AI lift): the engine's
 * `baseFeasibility`, read through the same band words as everything else. */
export function unpreparedBand(vector: AttackVector, tier: number): BandWord {
  return bandWord(baseFeasibility(vector, tier), SL_BAR_PRESETS.standard);
}

// --------------------------------------------------------------------------
// Band changes, for the "−1 band" chips
// --------------------------------------------------------------------------

const BAND_RANK: Record<BandWord, number> = { "usually fails": 0, contested: 1, "usually succeeds": 2 };

/** Per row, how many bands the attacker moved: "−1 band" when a defense pushed
 * them down a band, "+1 band" when they gained one; null when unchanged. */
export function bandChips(before: BandWord[], after: BandWord[]): (string | null)[] {
  return after.map((b, i) => {
    const d = BAND_RANK[b] - BAND_RANK[before[i] ?? b];
    if (d === 0) return null;
    return `${d < 0 ? "−" : "+"}${Math.abs(d)} band`;
  });
}
