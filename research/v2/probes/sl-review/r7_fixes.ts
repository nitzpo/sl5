// Reviewer follow-up probe: "every tier tries every strategy; best variant per strategy; union across
// strategies; residual 3% x max gate once; distillation out; HEAD hard-stop band; tau 20%."
// Variants: + OC5-only variants inside existing strategies; + a stubbed Table 5.2 hard-stop lookup;
// detection-stopped sequential campaign with q.
import { CURRENT, PARAM, evalChain, chainSet, routeOf, type Opts } from "./modelq.ts";
import { scenarios, PRO_SLIDERS } from "../sl-design/scenarios.ts";
import { blocks, coverageSl, getAiCapability } from "../sl-design/lib.ts";
import { applyDependencyConstraint } from "../sl-design/snap/app/src/engine/dependencies.ts";
import type { AttackChain } from "../sl-design/lib.ts";

// HEAD engine semantics except: distillation out, residual once per campaign (no per-chain floor).
const ENG: Opts = { ...CURRENT, includeDistillation: false, residual: "campaign", oc5Chains: false, opLift: 0 };
// Strategies (closed list) = RAND Table 5.2 categories, coarse: remote (running unauthorized code /
// bypassing primary security), physical (unauthorized physical access), supply (supply chain), insider (HUMINT).
const STRAT: Record<string, string> = {
  "quiet-tap": "physical", "poisoned-chip": "supply", "alignment-researcher": "insider", "long-game": "insider",
  "zero-day-cascade": "remote", "remote-ghost": "remote",
  "fab-implant": "supply", "placed-agent": "insider", "multi-zero-day": "remote",
};
function mk(id: string, ex: string[], extra: string[]): AttackChain {
  return { id, name: id, adversary_profile: { min_oc: 5, typical_oc: 5 }, blocks_exploited: ex, stoppers: [...ex, ...extra],
    narrative: { brief: id, detailed: id }, probability_model: { base_probability: 0 } } as unknown as AttackChain;
}
// Illustrative OC5-only variants inside existing strategies.
const OC5V = [
  mk("fab-implant", ["HW-04", "SC-07", "PHY-07"], ["SC-02", "HW-01"]),           // fab-level implant (supply)
  mk("placed-agent", ["PER-04", "PER-09", "PER-02"], ["PER-06", "PER-03", "AI-01"]), // candidate placement 1,1,1,3,5 (insider)
  mk("multi-zero-day", ["NET-01", "HW-09", "HW-10"], ["HW-06"]),                  // 50+ zero-days at once (remote)
];
// Stubbed Table 5.2 lookup, only where the RAND vector is about overcoming that very defense (Box 5.1).
const LOOKUP: Record<string, number[]> = {
  "NET-01": [1, 1, 2, 2, 4], "NET-05": [1, 1, 2, 2, 4], // digital access to air-gapped networks
  "PHY-01": [1, 1, 1, 3, 5],                            // evasion of physical access control systems
  "HW-04": [1, 1, 1, 2, 3], "HW-05": [1, 1, 1, 2, 3],   // penetration of physical hardware security
  "PHY-02": [1, 1, 1, 2, 3],                            // side-channel / TEMPEST
};
// Sharper OC5-only variants: the OC5 capability makes the other controls irrelevant, so they name fewer stoppers.
const SHARP = [
  mk("fab-implant", ["HW-04", "SC-07"], []),       // implant at the fab: inspection (SC-02/PHY-07) never sees it
  mk("placed-agent", ["PER-04", "PER-03"], []),    // agent placed years ahead: passes vetting, monitored as normal
  mk("multi-zero-day", ["NET-01", "HW-09"], []),   // simultaneous zero-days: gap crossing + boot chain
];
// Broader (more contestable) Table 5.2 mapping for the remaining hard stops.
const BROAD: Record<string, number[]> = {
  "NET-02": [1, 1, 2, 3, 4], "PER-08": [1, 1, 2, 3, 4],                       // alternative (less secure) access schemes
  "NET-03": [1, 1, 2, 4, 5], "NET-06": [1, 1, 2, 4, 5], "NET-07": [1, 1, 2, 4, 5], // eavesdropping and wiretaps
  "NET-04": [1, 1, 2, 2, 4],                                                    // air-gap-like boundary
  "HW-02": [1, 1, 2, 3, 4], "HW-06": [1, 1, 2, 3, 4], "HW-09": [1, 1, 2, 3, 4], "HW-10": [1, 1, 2, 3, 4], // code vulns in access control
  "HW-03": [1, 1, 2, 3, 3], "HW-07": [1, 1, 2, 3, 3],                         // encryption/authentication vulns
  "HW-01": [1, 1, 2, 2, 3],                                                     // secret material undermining a protocol
  "PHY-05": [2, 2, 4, 4, 4], "PHY-06": [1, 1, 3, 3, 4],                         // portable devices; direct physical access
};
interface Cfg { name: string; variants: boolean; lookup: boolean; q: number; sharp?: boolean; broad?: boolean }
function strategies(st: any, oc: number, y: number, s: any, c: Cfg, extraChains: AttackChain[] = [], extraTag: Record<string, string> = {}) {
  PARAM.lookup = c.broad ? { ...BROAD, ...LOOKUP } : c.lookup ? LOOKUP : null;
  const set = [...chainSet(ENG), ...(c.variants ? (c.sharp ? SHARP : OC5V) : []), ...extraChains];
  const evs = set.map((ch) => evalChain(ch, st, oc, y, s, ENG));
  const best = new Map<string, number>();
  for (const e of evs) { const r = extraTag[e.id] ?? STRAT[e.id] ?? e.id; best.set(r, Math.max(best.get(r) ?? 0, e.raw)); }
  PARAM.lookup = null;
  return { ps: best, floor: 0.03 * Math.max(...evs.map((e) => e.gate)), evs };
}
function combine(ps: number[], floor: number, q: number) {
  const v = [...ps].sort((a, b) => b - a);
  let p = 0, alive = 1;
  for (const x of v) { p += alive * x; alive *= (1 - x) * (1 - q); } // q = 0 gives the union exactly
  return Math.min(1, Math.max(p, floor));
}
function campaignP(st: any, oc: number, y: number, s: any, c: Cfg, extra: number[] = []) {
  const r = strategies(st, oc, y, s, c);
  return combine([...r.ps.values(), ...extra], r.floor, c.q);
}
function sl(st: any, y: number, s: any, c: Cfg, tau = 0.2) {
  const P = [1, 2, 3, 4, 5].map((k) => campaignP(st, k, y, s, c));
  let n = 0; for (let k = 1; k <= 5; k++) { if (P[k - 1] <= tau) n = k; else break; }
  return { sl: n, P };
}
const word = (p: number) => (p <= 0.2 ? "usually fails" : p <= 0.55 ? "contested" : "usually succeeds");
const pct = (p: number) => (p * 100).toFixed(0) + "%";
const CFGS: Cfg[] = [
  { name: "UNION (HEAD band)", variants: false, lookup: false, q: 0 },
  { name: "+OC5 variants", variants: true, lookup: false, q: 0 },
  { name: "+T5.2 lookup", variants: false, lookup: true, q: 0 },
  { name: "+both", variants: true, lookup: true, q: 0 },
];
const scs = scenarios();
const S = ["not_started", "investing", "implementing", "deployed", "mature"] as const;
let seed = 2026; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const posts: any[] = [];
for (let t = 0; t < 600; t++) { const k = 0.45 + 0.5 * rng(); const st: any = {}; for (const b of blocks) st[b.id] = rng() < k ? (rng() < 0.5 ? "deployed" : "mature") : S[Math.floor(rng() * 3)]; posts.push(applyDependencyConstraint(blocks, st).effectiveStates); }
const cfgs: Cfg[] = [
  { name: "UNION", variants: false, lookup: false, q: 0 },
  { name: "+sharp OC5 var", variants: true, sharp: true, lookup: false, q: 0 },
  { name: "+lookup6", variants: false, lookup: true, q: 0 },
  { name: "+lookup6+sharp", variants: true, sharp: true, lookup: true, q: 0 },
  { name: "+broad lookup", variants: false, lookup: true, broad: true, q: 0 },
  { name: "+broad+sharp", variants: true, sharp: true, lookup: true, broad: true, q: 0 },
];
for (const c of cfgs) {
  const h = [0, 0, 0, 0, 0, 0]; const ratio: number[] = [];
  for (const st of posts) { const r = sl(st, 2030, PRO_SLIDERS, c); h[r.sl]++; if (r.sl >= 4) ratio.push(r.P[4] / r.P[3]); }
  ratio.sort((a, b) => a - b);
  const rows = scs.map((x) => { const r = sl(x.states, x.year, x.sliders, c); return `${x.name.split(/[ (]/)[0]} SL${r.sl}[${pct(r.P[3])},${pct(r.P[4])}]`; });
  console.log(`${c.name.padEnd(16)} hist ${h.join("/")} P(SL5|>=4) ${(100 * h[5] / Math.max(1, h[4] + h[5])).toFixed(0)}% ratio med ${ratio.length ? ratio[Math.floor(ratio.length / 2)].toFixed(2) : "-"} | ${rows.join(" ")}`);
}
{ const sc = scs.find((x) => x.name === "proactive 2030")!; const r = strategies(sc.states, 4, 2030, sc.sliders, cfgs[1]);
  console.log("sharp-variant gate for OC4 in 2030: " + r.evs.filter((e) => ["fab-implant", "placed-agent", "multi-zero-day"].includes(e.id)).map((e) => `${e.id} ${e.gate.toFixed(2)}`).join(", ")); }
// Q3a redone: duplicates keep the original id (EXTRA_GROUP_CHAINS is keyed on chain id)
for (const name of ["proactive 2030", "cheap27 ($559M) 2030"]) { const sc = scs.find((x) => x.name === name)!;
  for (const oc of [4, 5]) { const b = strategies(sc.states, oc, sc.year, sc.sliders, cfgs[0]); const a = strategies(sc.states, oc, sc.year, sc.sliders, cfgs[0], chainSet(ENG).map((ch) => ({ ...ch })));
    console.log(`dup-same-id ${name} OC${oc}: ${pct(combine([...b.ps.values()], b.floor, 0))} -> ${pct(combine([...a.ps.values()], a.floor, 0))}`); } }
