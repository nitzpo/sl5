import { scorePosture, orderAfterActivating, type PostureInput } from "../tree/app/src/engine/posture";
import { baselineStates } from "../tree/app/src/engine/baseline";
import type { BlockState, Sliders } from "../tree/app/src/engine/types";
import { loadBlocks, loadModel, APP_SLIDERS } from "./data";

const blocks = loadBlocks();
const model = loadModel();
const STATES: BlockState[] = ["not_started", "investing", "implementing", "deployed", "mature"];
function rngF(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

function nums(r: ReturnType<typeof scorePosture>) {
  const o: Record<string, number> = {};
  r.tiers.forEach((t) => (o["OC" + t.tier] = t.p));
  o.ai = r.aiInsider.p; o.integ = r.integrity.p; o.cap = r.capabilityLeakage.p;
  for (const a of r.approaches) o["ap:" + a.id] = a.p;
  for (const [k, v] of Object.entries(r.scenarios)) o["sc:" + k] = v;
  return o;
}
export async function main() {
  const rng = rngF(Number(process.argv[3] ?? 1));
  let viol = 0, trials = 0, slViol = 0, nan = 0;
  for (let t = 0; t < 4000; t++) {
    const states = baselineStates(blocks);
    const p = rng();
    for (const b of blocks) if (rng() < p) states[b.id] = STATES[Math.floor(rng() * 5)];
    const order = blocks.map((b) => b.id).filter((id) => states[id] !== "not_started").map((id) => ({ id, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.id);
    const sliders: Sliders = { ...APP_SLIDERS, ai_timeline: rng(), gov_cooperation: rng(), vendor_cooperation: rng(), org_transformation: rng(), risk_tolerance: rng(),
      budget_millions: rng() < 0.3 ? 1e6 : rng() * 2000, sl_bar: [0.1, 0.2, 0.33][Math.floor(rng() * 3)], ai_propensity: rng() < 0.2 ? (rng() < 0.5 ? 0 : 1) : rng() };
    const input: PostureInput = { blocks, model, blockStates: states, advanceOrder: order, year: 2024 + rng() * 8, sliders, adversaryOc: 1 + Math.floor(rng() * 5), modelServedExternally: rng() < 0.5, futureCapabilities: rng() < 0.5 };
    const target = blocks[Math.floor(rng() * blocks.length)];
    const from = STATES.indexOf(states[target.id]);
    if (from === 4) continue;
    trials++;
    const before = scorePosture(input);
    const after = scorePosture({ ...input, blockStates: { ...states, [target.id]: STATES[from + 1] }, advanceOrder: orderAfterActivating({ blocks, blockStates: states, advanceOrder: order }, [target.id]) });
    const b = nums(before), a = nums(after);
    for (const k of Object.keys(b)) {
      if (!Number.isFinite(a[k]) || !Number.isFinite(b[k])) nan++;
      if (a[k] > b[k] + 1e-9) { viol++; if (viol < 10) console.log("VIOL", k, target.id, STATES[from], "->", STATES[from + 1], b[k], a[k], JSON.stringify({ fut: input.futureCapabilities, served: input.modelServedExternally, bud: sliders.budget_millions })); }
    }
    if (after.sl.value < before.sl.value - 1e-9 || after.sl.level < before.sl.level) { slViol++; if (slViol < 5) console.log("SLVIOL", target.id, before.sl, after.sl); }
    // year monotone
    const later = scorePosture({ ...input, year: input.year + 0.7 });
    const l = nums(later);
    for (const k of Object.keys(b)) if (!k.startsWith("cap") && l[k] < b[k] - 1e-9) { viol++; if (viol < 20) console.log("YEARVIOL", k, b[k], l[k]); }
    if (later.sl.value > before.sl.value + 1e-9) { slViol++; if (slViol < 10) console.log("SL YEAR VIOL", before.sl.value, later.sl.value); }
    for (let n = 1; n < 5; n++) if (before.tiers[n].p < before.tiers[n - 1].p - 1e-12) { viol++; console.log("OCVIOL"); }
  }
  console.log({ trials, viol, slViol, nan });
}
