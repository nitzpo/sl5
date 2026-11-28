// The introduction inlines the little reference data its first slides need, so
// they render with no requests. These tests read the shipped JSON off disk and
// assert every inlined value still matches, so the two can't drift silently.

import { describe, it, expect } from "vitest";
import type { AttackVector, Block, Scenario } from "../../src/engine/types";
import {
  AI_SHIFT_GROUPS,
  BUILD_COST_MILLIONS,
  CATALOG,
  DEMO_BLOCKS,
  EXFILTRATION_CONSEQUENCES,
  GLOSSARY,
  OC_TIERS,
  OWN_MODEL_STEPS,
  RACE_BLOCKS,
  RECURSIVE_RISK,
  SL_LEVELS,
  SOURCES,
  SUPPLIES,
} from "../../src/intro/content";
import { SLIDES, slideIndex } from "../../src/intro/slides";
import { loadThreatDataFromDisk, readData } from "./load-data";

const { blocks, model } = loadThreatDataFromDisk();
const vectors: AttackVector[] = model.vectors;
const scenarios: Scenario[] = model.scenarios;
const worldState = readData("world-state.json");
const byId = new Map<string, Block>(blocks.map((b) => [b.id, b]));

/** "50_plus_zero_days_simultaneously" and "50+ zero-days simultaneously" agree. */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

describe("attacker tiers match world-state.json", () => {
  it("covers every tier, in order, with the same numbers and words", () => {
    expect(OC_TIERS.map((t) => t.level)).toEqual(worldState.oc_definitions.map((d: { level: number }) => d.level));
    for (const tier of OC_TIERS) {
      const src = worldState.oc_definitions.find((d: { level: number }) => d.level === tier.level);
      expect(tier.name).toBe(src.name);
      expect(tier.description).toBe(src.description);
      expect(tier.budgetMillions).toBe(src.budget_millions);
      expect(tier.teamSize).toBe(src.team_size);
      expect(tier.timeHorizonMonths).toBe(src.time_horizon_months);
      expect(tier.typicalActors.map(normalize)).toEqual(src.typical_actors.map(normalize));
      expect(tier.keyCapabilities.map(normalize)).toEqual(src.key_capabilities.map(normalize));
      expect(tier.short.length).toBeGreaterThan(0);
    }
  });

  it("still has OC5 a hundred times OC4's budget: the cliff the ladder draws", () => {
    const oc4 = OC_TIERS.find((t) => t.level === 4)!;
    const oc5 = OC_TIERS.find((t) => t.level === 5)!;
    expect(oc5.budgetMillions / oc4.budgetMillions).toBe(100);
  });
});

describe("security levels match world-state.json", () => {
  it("carries the same fields per level, with SL5 the unachievable one", () => {
    expect(SL_LEVELS).toHaveLength(worldState.sl_definitions.length);
    for (const sl of SL_LEVELS) {
      const src = worldState.sl_definitions.find((d: { level: number }) => d.level === sl.level);
      expect(sl.name).toBe(src.name);
      expect(sl.description).toBe(src.description);
      expect(sl.defendsAgainst).toBe(src.defends_against);
      expect(sl.requiredIndependentLayers).toBe(src.required_independent_layers);
      expect(sl.achievable).toBe(src.achievable);
    }
    expect(SL_LEVELS.filter((s) => !s.achievable).map((s) => s.level)).toEqual([5]);
  });
});

describe("stakes copy matches world-state.json", () => {
  it("quotes the consequences and the recursive risk verbatim", () => {
    expect([...EXFILTRATION_CONSEQUENCES]).toEqual(worldState.stakes.exfiltration_consequences);
    expect(RECURSIVE_RISK).toBe(worldState.stakes.recursive_risk);
  });

  it("draws the build cost from the consequence that states it", () => {
    expect(EXFILTRATION_CONSEQUENCES.some((c) => c.includes("$1-10B+"))).toBe(true);
    expect(BUILD_COST_MILLIONS).toEqual({ min: 1000, max: 10000 });
  });
});

describe("catalogue figures match the data", () => {
  it("counts blocks, categories, research-required blocks, vectors and scenarios", () => {
    expect(CATALOG.blocks).toBe(blocks.length);
    expect(CATALOG.categories).toBe(new Set(blocks.map((b) => b.category)).size);
    expect(CATALOG.research).toBe(blocks.filter((b) => b.research_required).length);
    expect(CATALOG.randVectors).toBe(vectors.filter((v) => v.source === "rand").length);
    expect(CATALOG.ownModelVectors).toBe(vectors.filter((v) => v.source === "authored").length);
    expect(CATALOG.structuralVectors).toBe(vectors.filter((v) => v.source === "structural").length);
    expect(CATALOG.scenarios).toBe(scenarios.length);
  });

  it("groups RAND's vectors by AI lift exactly as vectors.json does", () => {
    const rand = vectors.filter((v) => v.source === "rand");
    for (const g of AI_SHIFT_GROUPS) {
      expect(rand.filter((v) => v.ai_shift === g.shift).length, `ai_shift ${g.shift}`).toBe(g.count);
    }
    expect(AI_SHIFT_GROUPS.reduce((s, g) => s + g.count, 0)).toBe(rand.length);
  });

  it("names the demo blocks as blocks-*.json does", () => {
    for (const d of Object.values(DEMO_BLOCKS)) {
      const src = byId.get(d.id);
      expect(src, `${d.id} no longer exists`).toBeDefined();
      expect(d.name).toBe(src!.name);
      expect(d.defenseType).toBe(src!.defense_type);
      expect(d.deployMonths.min).toBe(src!.dimensions.time_to_deploy_months.min);
      expect(d.deployMonths.max).toBe(src!.dimensions.time_to_deploy_months.max);
    }
    expect(new Set(["NET-01", "PER-03", "NET-05"].map((id) => DEMO_BLOCKS[id].defenseType))).toEqual(
      new Set(["hard_stop", "probabilistic", "hybrid"])
    );
  });

  it("lists the own model's steps by stage, sabotage excluded", () => {
    const own = vectors.filter((v) => v.source === "authored" && v.lane !== "integrity");
    const names = (stage: string) => own.filter((v) => v.stage === stage).map((v) => v.name).sort();
    expect([...OWN_MODEL_STEPS.reach].sort()).toEqual(names("reach"));
    expect([...OWN_MODEL_STEPS.exfil].sort()).toEqual(names("exfil"));
  });

  it("races real long-lead blocks from the catalogue", () => {
    for (const id of RACE_BLOCKS) expect(byId.get(id), `${id} missing`).toBeDefined();
  });
});

describe("slide registry", () => {
  it("has 12 to 14 slides, act I before act II, each with a title", () => {
    expect(SLIDES.length).toBeGreaterThanOrEqual(12);
    expect(SLIDES.length).toBeLessThanOrEqual(14);
    const acts = SLIDES.map((s) => s.act);
    expect(acts).toEqual([...acts].sort());
    for (const s of SLIDES) expect(s.title.length).toBeGreaterThan(0);
  });

  it("has unique slugs and aliases, and every alias resolves to its slide", () => {
    const all = SLIDES.flatMap((s) => [s.slug, ...(s.aliases ?? [])]);
    expect(new Set(all).size).toBe(all.length);
    SLIDES.forEach((s, i) => {
      expect(slideIndex(s.slug)).toBe(i);
      for (const a of s.aliases ?? []) expect(slideIndex(a)).toBe(i);
    });
  });

  it("keeps the slugs whose topic survived", () => {
    for (const slug of ["start", "why-it-gets-worse", "the-oc-ladder", "security-levels", "sources", "blocks", "attack-paths", "timeline"]) {
      expect(slideIndex(slug), slug).toBeGreaterThanOrEqual(0);
    }
    // Retired v1 slugs still land somewhere sensible.
    for (const slug of ["the-asset", "why-steal-them", "lifecycle", "constraints", "the-rest"]) {
      expect(slideIndex(slug), slug).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("glossary", () => {
  it("spells out OC and SL in the label itself, without defining them by themselves", () => {
    expect(GLOSSARY.oc.label).toMatch(/Operational Capability/);
    expect(GLOSSARY.sl.label).toMatch(/Security Level/);
    expect(GLOSSARY.oc.definition).not.toMatch(/\bOC\b(?!\d)/);
    expect(GLOSSARY.sl.definition).not.toMatch(/\bSL\b(?!\d)/);
  });

  it("defines the instrument's terminology", () => {
    for (const key of ["attackVector", "stage", "approach", "attackPath", "scenario", "bands"]) {
      expect(GLOSSARY, `${key} missing`).toHaveProperty(key);
    }
  });

  it("every entry is a real label and a sentence", () => {
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      expect(entry.label.length, `${key} label`).toBeGreaterThan(2);
      expect(entry.definition.length, `${key} definition`).toBeGreaterThan(40);
      expect(entry.definition, `${key} definition`).toMatch(/[.!?]$/);
    }
  });
});

describe("sources", () => {
  it("are absolute https links to the five documents", () => {
    const hrefs = SOURCES.map((s) => s.href);
    for (const h of hrefs) expect(h).toMatch(/^https:\/\//);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "https://www.rand.org/pubs/research_reports/RRA2849-1.html",
        "https://sl5.org/sl5-standard",
        "https://sl5.org/projects/sl5-novel-recommendations",
        "https://www.rand.org/pubs/research_reports/RRA4704-1.html",
        "https://ai-2027.com",
      ])
    );
  });

  it("mark only the supplies the figure has columns for", () => {
    const keys = new Set<string>(SUPPLIES.map((s) => s.key));
    for (const s of SOURCES) for (const k of [...s.primary, ...s.informs]) expect(keys).toContain(k);
  });
});
