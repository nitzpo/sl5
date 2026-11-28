import { blocks, baselineScenario, scriptScenario, allState, effective, CHEAP27, baselineStates } from "./lib.ts";
import type { Scenario, BlockState, Sliders } from "./lib.ts";

export const PRO_SLIDERS: Sliders = { ai_timeline: 0.5, gov_cooperation: 0.7, vendor_cooperation: 0.6, budget_millions: 1e6, org_transformation: 0.7, risk_tolerance: 0.65 };

export function scenarios(): Scenario[] {
  const pro = scriptScenario("proactive-program");
  const proPlus: Record<string, BlockState> = { ...pro.states, "PER-02": "mature", "PER-04": "mature" };
  const cheap: Record<string, BlockState> = { ...baselineStates(blocks) };
  for (const id of CHEAP27) cheap[id] = "mature";
  return [
    baselineScenario(2026),
    { ...scriptScenario("do-nothing"), name: "do-nothing 2030" },
    { ...scriptScenario("budget-constrained"), name: "budget-constr 2030" },
    { ...scriptScenario("reactive-ciso"), name: "reactive 2030" },
    { ...pro, name: "proactive 2030" },
    { name: "proactive+PER-02/04", year: 2030, sliders: pro.sliders, states: effective(proPlus, PRO_SLIDERS) },
    { name: "cheap27 ($559M) 2030", year: 2030, sliders: PRO_SLIDERS, states: effective(cheap, PRO_SLIDERS) },
    { name: "all mature 2030", year: 2030, sliders: PRO_SLIDERS, states: effective(allState("mature"), PRO_SLIDERS) },
  ];
}
