// Variant breach model for the threat-relative SL design. Every change is behind a
// flag so each probe can show what it contributes. With all flags at their
// "current" values this reproduces the HEAD engine's max-over-chains exactly
// (asserted by p0_repro.ts).
import {
  blocks, chains, byId, worldState, blockEffectiveness, supportingBlocks, SUPPORTING_WEIGHT,
  defenseInDepthDiscount, getAiCapability, sigmoidProbability,
} from "../sl-design/lib.ts";
import type { AttackChain, Block, BlockState, Sliders } from "../sl-design/lib.ts";

export interface Opts {
  /** Attacker-side AI lift per block (own ai_oc_shift) for bypass; gate keeps the chain mean. */
  perBlockLift: boolean;
  /** Hard-stop thresholds re-anchored to RAND Table 5.2 + a wider, steeper OC-dependent band. */
  hsReanchor: boolean;
  /** Add the illustrative OC5-gated chains. */
  oc5Chains: boolean;
  /** How chains combine into a campaign: worst chain, or ordered retries with OC persistence. */
  campaign: "max" | "persist";
  /** Residual floor: per chain (HEAD) or once per campaign. */
  residual: "perChain" | "campaign";
  /** Count requires_external_serving chains (distillation) toward breach/SL. */
  includeDistillation: boolean;
  /** Probability a failed attempt is detected and burns the campaign (0 until D&R blocks exist). */
  detection: number;
  /** Campaign-level AI operational uplift (OC units at aiCap = 1): floor on the gate lift and
   * applied to persistence. 0 = HEAD behaviour (gate lift = mean shift of exploited blocks). */
  opLift?: number;
  /** Combine within a route by max (variants of one route do not add risk), across routes by
   * persistence. Without it every chain is its own route. */
  byRoute?: boolean;
}

/** Route = RAND Table 5.2 attack category of the chain's initial access (illustrative tags). */
export const ROUTE: Record<string, string> = {
  "quiet-tap": "physical", "gap-bridge": "physical",
  "poisoned-chip": "supply", "fab-implant": "supply",
  "alignment-researcher": "insider", "long-game": "insider", "sleeper": "insider",
  "zero-day-cascade": "remote", "remote-ghost": "remote",
  "patient-distillation": "api",
};
export const routeOf = (id: string) => (PARAM.route ?? ROUTE)[id.replace(/-v2$/, "")] ?? id;
export const CURRENT: Opts = { perBlockLift: false, hsReanchor: false, oc5Chains: false, campaign: "max", residual: "perChain", includeDistillation: true, detection: 0 };
export const PROPOSED: Opts = { perBlockLift: true, hsReanchor: true, oc5Chains: true, campaign: "persist", residual: "campaign", includeDistillation: false, detection: 0, opLift: 1.0, byRoute: true };

const RESIDUAL = 0.03;
const GATE_K = 4.0, GATE_OFF = 0.45;
const BYPASS_K = 1.5;
const HS_CEIL = 0.98;
const HS_SCALE_CUR = 0.12, HS_FLOOR_CUR = 0.86;
export const PARAM = { hsScale: 0.45, hsK: 2.5, rhoScale: 12, route: null as null | Record<string,string>, rhoOverride: null as null | number[], lookup: null as null | Record<string, number[]> };
// Table 5.2 score (1..5) -> per-operation bypass of that defense
const SCORE_P = [0.02, 0.30, 0.50, 0.70, 0.90];
export function lookupBypass(scores: number[], eoc: number): number {
  const x = Math.max(1, Math.min(5, eoc)); const lo = Math.floor(x), hi = Math.ceil(x);
  const p = (k: number) => SCORE_P[scores[k - 1] - 1];
  return lo === hi ? p(lo) : p(lo) + (x - lo) * (p(hi) - p(lo));
}
const PROB_SCALE = 0.6, PROB_CEIL = 0.95, PROB_FLOOR = 0.35;
const HYBRID = 0.5;

/** Hard-stop "routinely defeated at" OC, read off RAND Table 5.2 as the tier where the
 * matching vector's score reaches 3 (40–60% success against a system that has the defense). */
export const HS_THRESHOLDS: Record<string, number> = {
  "NET-01": 4.5, // digital access to air-gapped networks: 1,1,2,2,4
  "NET-02": 4.0, "NET-03": 4.5, "NET-04": 4.5, "NET-05": 4.5, "NET-06": 4.5, "NET-07": 4.5,
  "PHY-01": 4.0, // evasion of physical access control: 1,1,1,3,5
  "PHY-02": 5.0, // side channels / TEMPEST: 1,1,1,2,3
  "PHY-05": 3.0, // malicious placement of portable devices: 2,2,4,4,4
  "HW-01": 5.0, "HW-02": 5.0, "HW-06": 5.0, "HW-10": 5.0, // backdoors / secret material: 1,1,1,2,2–3
  "HW-03": 4.5, "HW-05": 4.5, "HW-07": 4.5, "HW-09": 4.5,
  "HW-04": 5.0, // penetration of physical hardware security: 1,1,1,2,3
  "AI-04": 4.0, "AI-06": 4.0, "PER-08": 4.0, "SC-07": 5.0,
};

/** Illustrative OC5-gated chains (NOT shipped data): each is a RAND vector whose score
 * jumps between OC4 and OC5, aimed at the controls an SL4 posture already has. */
function mk(id: string, exploited: string[], extraStoppers: string[]): AttackChain {
  return {
    id, name: id, adversary_profile: { min_oc: 5, typical_oc: 5 }, blocks_exploited: exploited,
    narrative: { brief: id, detailed: id }, stoppers: [...exploited, ...extraStoppers],
    probability_model: { base_probability: 0 },
  } as unknown as AttackChain;
}
export const OC5_CHAINS: AttackChain[] = [
  mk("fab-implant", ["HW-04", "SC-07", "PHY-07"], ["SC-02", "HW-01"]),        // ML supply chain / hardware: 4,5,5 & 1,1,1,2,3
  mk("sleeper", ["PER-04", "PER-09", "PER-02"], ["PER-06", "PER-03", "AI-01"]), // candidate placement: 1,1,1,3,5
  mk("gap-bridge", ["NET-01", "PHY-02", "PHY-01"], ["NET-05", "PHY-05", "HW-05"]), // air gap 1,1,2,2,4; TEMPEST 1,1,1,2,3
];

export function chainSet(o: Opts): AttackChain[] {
  const base = o.includeDistillation ? chains : chains.filter((c) => !c.requires_external_serving);
  return o.oc5Chains ? [...base, ...OC5_CHAINS] : base;
}

// Campaign persistence from the authored OC time horizons: rho = 1 - exp(-H / 12 months).
const H = new Map<number, number>((worldState.oc_definitions as any[]).map((d) => [d.level, d.time_horizon_months]));
export function persistence(oc: number): number {
  const lo = Math.max(1, Math.min(5, Math.floor(oc))), hi = Math.max(1, Math.min(5, Math.ceil(oc)));
  const hLo = H.get(lo)!, hHi = H.get(hi)!;
  const t = hi === lo ? 0 : (oc - lo) / (hi - lo);
  const h = Math.exp(Math.log(hLo) + t * (Math.log(hHi) - Math.log(hLo))); // log-linear
  if (PARAM.rhoOverride) return PARAM.rhoOverride[Math.max(0,Math.min(4,Math.round(oc)-1))]; return 1 - Math.exp(-h / PARAM.rhoScale);
}

function resist(b: Block, eoc: number, o: Opts): number {
  const thrProb = b.adversary_exploitation.oc_threshold_to_exploit;
  const prob = Math.max(PROB_FLOOR, Math.min(PROB_CEIL, 1 - PROB_SCALE * sigmoidProbability(eoc - thrProb, BYPASS_K)));
  let hard: number;
  if (o.hsReanchor) {
    const thr = HS_THRESHOLDS[b.id] ?? thrProb;
    hard = HS_CEIL - PARAM.hsScale * sigmoidProbability(eoc - thr, PARAM.hsK);
  } else {
    hard = Math.max(HS_FLOOR_CUR, Math.min(HS_CEIL, HS_CEIL - HS_SCALE_CUR * sigmoidProbability(eoc - thrProb, BYPASS_K)));
  }
  if (PARAM.lookup && PARAM.lookup[b.id]) hard = 1 - lookupBypass(PARAM.lookup[b.id], eoc);
  return b.defense_type === "hard_stop" ? hard : b.defense_type === "hybrid" ? HYBRID * hard + (1 - HYBRID) * prob : prob;
}

function getPast(b: Block, st: Record<string, BlockState>, eoc: number, year: number, s: Sliders, o: Opts): number {
  const eff = blockEffectiveness(b, st[b.id] ?? "not_started", year, s, { aiErosion: false, blockStates: st });
  if (eff <= 0) return 1;
  return 1 - eff * resist(b, eoc, o);
}

export interface ChainEval { id: string; gate: number; raw: number; floored: number }

export function evalChain(c: AttackChain, st: Record<string, BlockState>, oc: number, year: number, s: Sliders, o: Opts): ChainEval {
  const aiCap = getAiCapability(year, s.ai_timeline);
  const ex = c.blocks_exploited.map((i) => byId.get(i)!).filter(Boolean);
  const meanShift = ex.length ? ex.reduce((a, b) => a + b.adversary_exploitation.ai_oc_shift, 0) / ex.length : 0;
  const chainOc = oc + Math.max(meanShift, o.opLift ?? 0) * aiCap;
  const gate = sigmoidProbability(chainOc - (c.adversary_profile.min_oc - GATE_OFF), GATE_K);
  const eocOf = (b: Block) => (o.perBlockLift ? oc + b.adversary_exploitation.ai_oc_shift * aiCap : chainOc);
  const named = [...new Set([...c.blocks_exploited, ...(c.stoppers ?? [])])].map((i) => byId.get(i)!).filter(Boolean);
  let pass = 1;
  for (const b of named) pass *= getPast(b, st, eocOf(b), year, s, o);
  for (const b of supportingBlocks(c, blocks)) pass *= 1 - SUPPORTING_WEIGHT * (1 - getPast(b, st, eocOf(b), year, s, o));
  pass *= defenseInDepthDiscount(named, st);
  const raw = gate * pass;
  return { id: c.id, gate, raw, floored: Math.max(raw, gate * RESIDUAL) };
}

export interface CampaignEval { p: number; chains: ChainEval[]; worst: string }

export function campaign(st: Record<string, BlockState>, oc: number, year: number, s: Sliders, o: Opts, served = true): CampaignEval {
  const set = chainSet(o).filter((c) => served || !c.requires_external_serving);
  const evs = set.map((c) => evalChain(c, st, oc, year, s, o));
  let ps = evs.map((e) => (o.residual === "perChain" ? e.floored : e.raw));
  if (o.byRoute) {
    const best = new Map<string, number>();
    evs.forEach((e, i) => { const r = routeOf(e.id); best.set(r, Math.max(best.get(r) ?? 0, ps[i])); });
    ps = [...best.values()];
  }
  ps.sort((a, b) => b - a);
  let p: number;
  if (o.campaign === "max") p = ps[0] ?? 0;
  else {
    // Ordered attempts, best path first. A failed attempt ends the campaign unless the
    // adversary persists (rho) and the failure went unnoticed (1 - detection).
    const cont = persistence(oc + (o.opLift ?? 0) * getAiCapability(year, s.ai_timeline)) * (1 - o.detection);
    let alive = 1;
    p = 0;
    for (const q of ps) { p += alive * q; alive *= (1 - q) * cont; }
  }
  if (o.residual === "campaign") p = Math.max(p, RESIDUAL * Math.max(0, ...evs.map((e) => e.gate)));
  const worst = evs.reduce((a, b) => ((o.residual === "perChain" ? b.floored : b.raw) > (o.residual === "perChain" ? a.floored : a.raw) ? b : a), evs[0]);
  return { p: Math.min(1, p), chains: evs, worst: worst?.id ?? "" };
}

export const TAU = 0.2;

/** Threat-relative SL: highest n with P(breach | OC-k) <= tau for every k <= n (0 = below SL1). */
export function thrSl(st: Record<string, BlockState>, year: number, s: Sliders, o: Opts, tau = TAU, served = true) {
  const P = [1, 2, 3, 4, 5].map((n) => campaign(st, n, year, s, o, served).p);
  let sl = 0;
  for (let n = 1; n <= 5; n++) { if (P[n - 1] <= tau) sl = n; else break; }
  // Borderline: the level just held with P in (0.15, tau], or the next level failed with P in (tau, 0.25].
  const held = sl > 0 ? P[sl - 1] : 0;
  const next = sl < 5 ? P[sl] : 0;
  const borderline = (sl > 0 && held > 0.15) || (sl < 5 && next <= 0.25);
  return { sl, P, borderline };
}

/** Per-path breaking tier: highest OC the chain alone holds against (p <= tau). */
export function breakingTier(c: AttackChain, st: Record<string, BlockState>, year: number, s: Sliders, o: Opts, tau = TAU): number {
  let t = 0;
  for (let n = 1; n <= 5; n++) {
    const e = evalChain(c, st, n, year, s, o);
    const p = o.residual === "perChain" ? e.floored : e.raw;
    if (p <= tau) t = n; else break;
  }
  return t;
}

/** Continuous capability-at-threshold (used only for a progress bar, never shown as a number). */
export function ocStar(st: Record<string, BlockState>, year: number, s: Sliders, o: Opts, tau = TAU): number {
  const P = (x: number) => campaign(st, x, year, s, o).p;
  if (P(1) > tau) return 0;
  if (P(6) <= tau) return 6;
  let lo = 1, hi = 6;
  for (let i = 0; i < 25; i++) { const m = (lo + hi) / 2; if (P(m) <= tau) lo = m; else hi = m; }
  return lo;
}

export const getAiCap = getAiCapability;
