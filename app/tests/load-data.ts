// Loads the shipped data off disk for tests — the same JSON the app fetches.
import fs from "fs";
import path from "path";
import type { Block, BlockState, Sliders, ThreatModel } from "../src/engine/types";

export const DATA = path.join(__dirname, "../public/data");

const read = (file: string) => JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8"));

/** Every block file, future blocks included (the engine filters them). */
export function loadBlocks(): Block[] {
  const blocks: Block[] = [];
  for (const file of fs.readdirSync(DATA).sort()) {
    if (file.startsWith("blocks-") && file.endsWith(".json")) blocks.push(...read(file));
  }
  return blocks;
}

export function loadModel(): ThreatModel {
  return { vectors: read("vectors.json"), approaches: read("approaches.json"), scenarios: read("scenarios.json") };
}

export function loadWorldState() {
  return read("world-state.json");
}

/** The app's opening sliders (store/simulation.ts DEFAULT_SLIDERS), with an
 * unbinding budget unless one is given. */
export const APP_SLIDERS: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.2,
  vendor_cooperation: 0.3,
  budget_millions: 200,
  org_transformation: 0.3,
  risk_tolerance: 0.5,
  sl_bar: 0.2,
  ai_propensity: 0.5,
};

/** Neutral sliders, the convention the story tests use. */
export const NEUTRAL_SLIDERS: Sliders = { ...APP_SLIDERS, gov_cooperation: 0.5, vendor_cooperation: 0.5, org_transformation: 0.5, budget_millions: 2000 };

/** Favourable world: full cooperation everywhere, unbinding budget. */
export const FAVOURABLE_SLIDERS: Sliders = {
  ...APP_SLIDERS,
  gov_cooperation: 1,
  vendor_cooperation: 1,
  org_transformation: 1,
  budget_millions: 1e6,
};

/** Every block (optionally including future ones) at one state. */
export function allAt(blocks: Block[], state: BlockState, includeFuture = false): Record<string, BlockState> {
  return Object.fromEntries(blocks.filter((b) => includeFuture || !b.future).map((b) => [b.id, state]));
}
