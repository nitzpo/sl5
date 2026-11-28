// Shared loader for the threat-relative SL design probes.
// Runs against a SNAPSHOT of git HEAD (ec5d9bd) in ./snap, not the live working
// tree, because another agent is editing app/src/engine while these probes run.
import fs from "fs";
import path from "path";
import { computeCategoryScores, overallSlScore, relevantBlockIds, blockEffectiveness } from "./snap/app/src/engine/scoring.ts";
import { computeBreachProbabilities, blockExploitProbability, defenseInDepthDiscount, sigmoidProbability } from "./snap/app/src/engine/breach.ts";
import { applyBudgetConstraint, blockCostBasis } from "./snap/app/src/engine/budget.ts";
import { applyDependencyConstraint } from "./snap/app/src/engine/dependencies.ts";
import { baselineStates } from "./snap/app/src/engine/baseline.ts";
import { supportingBlocks, SUPPORTING_WEIGHT } from "./snap/app/src/engine/supporting.ts";
import { getAiCapability } from "./snap/app/src/engine/ai-curve.ts";
import { SCRIPTS } from "./snap/app/src/timelapse/scripts.ts";
import { computeScriptBlockStates } from "./snap/app/src/timelapse/compute-script-state.ts";
import type { Block, AttackChain, BlockState, Sliders } from "./snap/app/src/engine/types.ts";

const DATA = path.join(import.meta.dirname, "snap/app/public/data");
export const blocks: Block[] = [];
for (const f of fs.readdirSync(DATA)) {
  if (f.startsWith("blocks-") && f.endsWith(".json"))
    blocks.push(...JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8")));
}
export const chains: AttackChain[] = JSON.parse(fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8"));
export const worldState = JSON.parse(fs.readFileSync(path.join(DATA, "world-state.json"), "utf-8"));
export const byId = new Map(blocks.map((b) => [b.id, b]));
export const humanChains = chains.filter((c) => !c.requires_external_serving); // distillation moves out of SL

export const APP_SLIDERS: Sliders = { ai_timeline: 0.5, gov_cooperation: 0.2, vendor_cooperation: 0.3, budget_millions: 200, org_transformation: 0.3, risk_tolerance: 0.5 };
const TEST_BASE: Sliders = { ai_timeline: 0.5, gov_cooperation: 0.5, vendor_cooperation: 0.5, budget_millions: 2000, org_transformation: 0.5, risk_tolerance: 0.5 };

export function allState(s: BlockState): Record<string, BlockState> {
  return Object.fromEntries(blocks.map((b) => [b.id, s]));
}

/** Effective states after budget + dependency caps (HEAD semantics). */
export function effective(states: Record<string, BlockState>, sliders: Sliders, order?: string[]) {
  const { effectiveStates: b1 } = applyBudgetConstraint(blocks, states, sliders.budget_millions, {
    order: order ?? Object.keys(states).filter((k) => states[k] !== "not_started"),
    riskTolerance: sliders.risk_tolerance,
  });
  return applyDependencyConstraint(blocks, b1).effectiveStates;
}

export function coverageSl(eff: Record<string, BlockState>, year: number, sliders: Sliders) {
  return overallSlScore(computeCategoryScores(blocks, eff, year, sliders, relevantBlockIds(chains, blocks)));
}

export interface Scenario { name: string; year: number; sliders: Sliders; states: Record<string, BlockState> }

export function scriptScenario(id: string, year = 2030): Scenario {
  const s = SCRIPTS.find((x) => x.id === id)!;
  const sliders = { ...TEST_BASE, ...(s.sliderOverrides ?? {}) } as Sliders;
  const raw = computeScriptBlockStates(s, year, blocks) as Record<string, BlockState>;
  const order = (s.deployments ?? []).map((d) => d.blockId);
  return { name: id, year, sliders, states: effective(raw, sliders, order) };
}
export function scriptAt(id: string, year: number): Scenario { return scriptScenario(id, year); }

export function baselineScenario(year = 2026): Scenario {
  return { name: "baseline", year, sliders: APP_SLIDERS, states: effective(baselineStates(blocks), APP_SLIDERS) };
}

export const CHEAP27 = "PER-07,PER-08,NET-07,NET-04,PER-02,PER-01,PER-05,NET-06,PHY-05,PER-04,PER-06,PHY-03,PER-09,AI-06,NET-03,SC-05,NET-01,SC-04,SC-02,PER-03,NET-02,PHY-07,HW-05,NET-05,PHY-06,SC-03,HW-03".split(",");

export const fmt = (p: number) => (p * 100).toFixed(1) + "%";
export {
  computeBreachProbabilities, blockExploitProbability, defenseInDepthDiscount, sigmoidProbability,
  supportingBlocks, SUPPORTING_WEIGHT, getAiCapability, blockEffectiveness, blockCostBasis, baselineStates, SCRIPTS, computeScriptBlockStates,
};
export type { Block, AttackChain, BlockState, Sliders };
