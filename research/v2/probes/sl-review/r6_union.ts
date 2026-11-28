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
interface Cfg { name: string; variants: boolean; lookup: boolean; q: number }
function strategies(st: any, oc: number, y: number, s: any, c: Cfg, extraChains: AttackChain[] = [], extraTag: Record<string, string> = {}) {
  PARAM.lookup = c.lookup ? LOOKUP : null;
  const set = [...chainSet(ENG), ...(c.variants ? OC5V : []), ...extraChains];
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
console.log("== Q1 scenarios (OC4 / OC5 = one campaign this year; words = the operation ...)");
for (const sc of scs) {
  const cov = coverageSl(sc.states, sc.year, sc.sliders);
  const cells = CFGS.map((c) => { const r = sl(sc.states, sc.year, sc.sliders, c); return `${c.name}: SL${r.sl} OC4 ${pct(r.P[3])} (${word(r.P[3])}) OC5 ${pct(r.P[4])} (${word(r.P[4])})`; });
  console.log(`${sc.name.padEnd(22)} cov ${cov.toFixed(2)} | ` + cells.join(" | "));
}
console.log("\nPer-strategy p at OC4/OC5 (UNION) for headline rows:");
for (const name of ["proactive 2030", "cheap27 ($559M) 2030", "all mature 2030"]) {
  const sc = scs.find((x) => x.name === name)!;
  for (const oc of [4, 5]) { const r = strategies(sc.states, oc, sc.year, sc.sliders, CFGS[0]); console.log(`  ${name} OC${oc}: ` + [...r.ps.entries()].map(([k, v]) => `${k} ${(v * 100).toFixed(1)}`).join(", ")); }
}
// OC5-variant gates for an OC4 attacker in 2030 (AI lift through chain-mean shift)
{ const sc = scs.find((x) => x.name === "proactive 2030")!; const r = strategies(sc.states, 4, 2030, sc.sliders, CFGS[1]);
  console.log("  OC5-variant gate for OC4 in 2030: " + r.evs.filter((e) => ["fab-implant", "placed-agent", "multi-zero-day"].includes(e.id)).map((e) => `${e.id} ${e.gate.toFixed(2)}`).join(", ")); }

// Q2: strong random postures (p11 sampler)
const S = ["not_started", "investing", "implementing", "deployed", "mature"] as const;
let seed = 2026; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const posts: any[] = [];
for (let t = 0; t < 600; t++) { const k = 0.45 + 0.5 * rng(); const st: any = {}; for (const b of blocks) st[b.id] = rng() < k ? (rng() < 0.5 ? "deployed" : "mature") : S[Math.floor(rng() * 3)]; posts.push(applyDependencyConstraint(blocks, st).effectiveStates); }
console.log("\n== Q2 600 strong postures, 2030");
for (const c of CFGS) {
  const h = [0, 0, 0, 0, 0, 0]; const ratio: number[] = [];
  for (const st of posts) { const r = sl(st, 2030, PRO_SLIDERS, c); h[r.sl]++; if (r.sl >= 4) ratio.push(r.P[4] / r.P[3]); }
  ratio.sort((a, b) => a - b);
  console.log(`  ${c.name.padEnd(18)} SL hist ${h.join("/")}  P(SL5|SL>=4) ${(100 * h[5] / Math.max(1, h[4] + h[5])).toFixed(0)}%  OC5/OC4 median ${ratio[Math.floor(ratio.length / 2)].toFixed(2)} (P10 ${ratio[Math.floor(ratio.length * 0.1)].toFixed(2)}, P90 ${ratio[Math.floor(ratio.length * 0.9)].toFixed(2)})`);
}

// Q3: catalogue size. (a) duplicate variant inside a strategy; (b) a new strategy at similar strength.
console.log("\n== Q3 catalogue growth (UNION and +both)");
for (const c of [CFGS[0], CFGS[3]]) for (const name of ["proactive 2030", "cheap27 ($559M) 2030", "all mature 2030"]) {
  const sc = scs.find((x) => x.name === name)!;
  const row: string[] = [];
  for (const oc of [4, 5]) {
    const base = strategies(sc.states, oc, sc.year, sc.sliders, c);
    const P0 = combine([...base.ps.values()], base.floor, 0);
    // (a) duplicate every chain as a variant in its own strategy
    const dups = chainSet(ENG).map((ch) => ({ ...ch, id: ch.id + "-dup" }));
    const tags = Object.fromEntries(dups.map((d) => [d.id, STRAT[d.id.replace(/-dup$/, "")]]));
    const a = strategies(sc.states, oc, sc.year, sc.sliders, c, dups, tags);
    const Pa = combine([...a.ps.values()], a.floor, 0);
    const v = [...base.ps.values()].sort((x, y) => y - x);
    const med = v[Math.floor(v.length / 2)], mx = v[0];
    const Pmed = combine([...v, med], base.floor, 0), Pmax = combine([...v, mx], base.floor, 0), P3 = combine([...v, med, med, med], base.floor, 0);
    row.push(`OC${oc} ${pct(P0)} | dup ${pct(Pa)} | +1 median ${pct(Pmed)} | +1 =worst ${pct(Pmax)} | +3 median ${pct(P3)}`);
  }
  console.log(`  ${c.name.padEnd(14)} ${name.padEnd(22)} ${row.join("   ||   ")}`);
}

// Q4: detection-stopped sequential campaign
console.log("\n== Q4 detection q (sequential, best strategy first)");
for (const base of [CFGS[0], CFGS[3]]) for (const name of ["proactive 2030", "cheap27 ($559M) 2030", "proactive+PER-02/04", "reactive 2030", "baseline"]) {
  const sc = scs.find((x) => x.name === name)!;
  console.log(`  ${base.name.padEnd(14)} ${name.padEnd(22)} ` + [0, 0.2, 0.5].map((q) => { const r = sl(sc.states, sc.year, sc.sliders, { ...base, q }); return `q=${q}: SL${r.sl} OC3 ${pct(r.P[2])} OC4 ${pct(r.P[3])} OC5 ${pct(r.P[4])}`; }).join("  |  "));
}
{ // how many strong postures change SL with q
  for (const q of [0.2, 0.5]) { let up = 0; for (const st of posts.slice(0, 300)) { if (sl(st, 2030, PRO_SLIDERS, { ...CFGS[0], q }).sl > sl(st, 2030, PRO_SLIDERS, CFGS[0]).sl) up++; } console.log(`  UNION q=${q}: ${up}/300 strong postures gain >=1 SL`); }
}

// Q5: monotonicity spot check
console.log("\n== Q5 monotonicity");
for (const c of [CFGS[0], CFGS[3], { ...CFGS[3], q: 0.5, name: "+both q=0.5" }]) {
  let vPost = 0, vOc = 0, vYear = 0, n = 0;
  for (let t = 0; t < 300; t++) {
    const st = posts[t % posts.length];
    const b = blocks[Math.floor(rng() * blocks.length)]; const i = S.indexOf(st[b.id]); if (i >= 4) continue;
    const st2 = applyDependencyConstraint(blocks, { ...st, [b.id]: S[i + 1] }).effectiveStates;
    const y = 2024 + Math.floor(rng() * 7);
    const a = sl(st, y, PRO_SLIDERS, c), d = sl(st2, y, PRO_SLIDERS, c), e = sl(st, Math.min(2030, y + 1), PRO_SLIDERS, c);
    n++;
    if (d.sl < a.sl || d.P.some((p, k) => p > a.P[k] + 1e-12)) vPost++;
    if (a.P.some((p, k) => k > 0 && p < a.P[k - 1] - 1e-12)) vOc++;
    if (e.P.some((p, k) => p < a.P[k] - 1e-12)) vYear++;
  }
  console.log(`  ${c.name.padEnd(14)} ${n} postures: advance-a-block violations ${vPost}, P non-decreasing in OC violations ${vOc}, year violations ${vYear}`);
}
