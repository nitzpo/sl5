import fs from "node:fs";
import path from "node:path";
import { scorePosture } from "../tree/app/src/engine/posture";
import { baselineStates } from "../tree/app/src/engine/baseline";
import { migratePersistedState } from "../tree/app/src/store/persistence";
import { loadBlocks, loadModel, APP_SLIDERS } from "./data";
const blocks = loadBlocks(); const model = loadModel();
export async function main() {
  // v1 baseline: parse v1 block baselines
  const s = fs.readFileSync(path.join(import.meta.dirname, "v1blocks.txt"), "utf8") /* concatenated v1 blocks-*.json from ec5d9bd */;
  const docs: any[] = []; let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) { const c = s[i]; if (inStr) { if (esc) esc = false; else if (c == "\\") esc = true; else if (c == '"') inStr = false; continue; }
    if (c == '"') inStr = true; else if (c == "{" || c == "[") { if (depth == 0) start = i; depth++; } else if (c == "}" || c == "]") { depth--; if (depth == 0) docs.push(JSON.parse(s.slice(start, i + 1))); } }
  const v1blocks = docs.flatMap((d) => (Array.isArray(d) ? d : d.blocks));
  const v1base = baselineStates(v1blocks as any);
  const v1sliders = { ai_timeline: 0.5, gov_cooperation: 0.2, vendor_cooperation: 0.3, budget_millions: 200, org_transformation: 0.3, risk_tolerance: 0.5 };
  const old = { blockStates: v1base, advanceOrder: Object.keys(v1base).filter((k) => v1base[k] !== "not_started"), year: 2026, perspective: "ciso", adversaryOc: 4, sliders: v1sliders as any, modelServedExternally: true };
  const m = migratePersistedState(old as any);
  const v2base = baselineStates(blocks);
  const diff = Object.keys(v2base).filter((k) => (m.blockStates[k] ?? "not_started") !== v2base[k]);
  console.log("blocks differing from v2 baseline after migrating v1 baseline link:", diff.map((k) => `${k}:${m.blockStates[k] ?? "absent"}→v2 ${v2base[k]}`));
  const sc = (states: any, order: string[]) => scorePosture({ blocks, model, blockStates: states, advanceOrder: order, year: 2026, sliders: { ...APP_SLIDERS }, adversaryOc: 4, modelServedExternally: true });
  const a = sc(v2base, Object.keys(v2base).filter((k) => v2base[k] !== "not_started"));
  const b = sc(m.blockStates, m.advanceOrder!);
  console.log("v2 baseline SL", a.sl.level, a.sl.value.toFixed(3), a.tiers.map((t) => t.band), "q", a.detection.q.toFixed(3));
  console.log("v1 link   SL", b.sl.level, b.sl.value.toFixed(3), b.tiers.map((t) => t.band), "q", b.detection.q.toFixed(3));
  for (const y of [2024, 2027, 2030]) {
    const a2 = scorePosture({ blocks, model, blockStates: v2base, year: y, sliders: APP_SLIDERS, adversaryOc: 4, modelServedExternally: true });
    const b2 = scorePosture({ blocks, model, blockStates: m.blockStates, year: y, sliders: APP_SLIDERS, adversaryOc: 4, modelServedExternally: true });
    console.log(y, "v2", a2.sl.value.toFixed(3), "v1link", b2.sl.value.toFixed(3), a2.tiers.map(t=>t.p.toFixed(3)).join(","), "|", b2.tiers.map(t=>t.p.toFixed(3)).join(","));
  }
}
