import fs from "node:fs";
import path from "node:path";
import type { Block, Sliders, ThreatModel } from "../tree/app/src/engine/types";
export const DATA = path.join(import.meta.dirname, "../tree/app/public/data"); // snapshot of the app at the reviewed commit
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8"));
export function loadBlocks(): Block[] { const out: Block[] = []; for (const f of fs.readdirSync(DATA).sort()) if (f.startsWith("blocks-")) out.push(...read(f)); return out; }
export function loadModel(): ThreatModel { return { vectors: read("vectors.json"), approaches: read("approaches.json"), scenarios: read("scenarios.json") }; }
export const APP_SLIDERS: Sliders = { ai_timeline: 0.5, gov_cooperation: 0.2, vendor_cooperation: 0.3, budget_millions: 200, org_transformation: 0.3, risk_tolerance: 0.5, sl_bar: 0.2, ai_propensity: 0.5 };
