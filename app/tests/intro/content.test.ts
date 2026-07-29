// The introduction page at /sl5/intro/ inlines the slice of copy it needs so it
// can render instantly without fetching public/data. These tests read the real
// data off disk and assert the inlined values still match, so the two can't
// drift silently — the intro would otherwise happily teach stale numbers.

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import type { AttackChain, Block } from "../../src/engine/types";
import {
  CATALOG,
  DEMO_BLOCKS,
  EXFILTRATION_CONSEQUENCES,
  GLOSSARY,
  LONG_GAME,
  OC_TIERS,
  RECURSIVE_RISK,
  SL_LEVELS,
  SOURCES,
} from "../../src/intro/content";
import { BLOCK_SHORT_LABELS } from "../../src/utils/geometry";
import { getStateEffectiveness } from "../../src/engine/scoring";
import { computeDecisionWindows } from "../../src/utils/decision-windows";
import { SLIDES } from "../../src/intro/slides";

const DATA = path.join(__dirname, "../../public/data");

function loadBlocks(): Block[] {
  const blocks: Block[] = [];
  for (const file of fs.readdirSync(DATA)) {
    if (file.startsWith("blocks-") && file.endsWith(".json")) {
      blocks.push(...JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8")));
    }
  }
  return blocks;
}

const blocks = loadBlocks();
const chains: AttackChain[] = JSON.parse(
  fs.readFileSync(path.join(DATA, "attack-chains.json"), "utf-8")
);
const worldState = JSON.parse(fs.readFileSync(path.join(DATA, "world-state.json"), "utf-8"));

describe("intro OC tiers match world-state.json", () => {
  it("covers every tier in the same order", () => {
    expect(OC_TIERS.map((t) => t.level)).toEqual(
      worldState.oc_definitions.map((d: { level: number }) => d.level)
    );
  });

  it("carries the same numbers and description per tier", () => {
    for (const tier of OC_TIERS) {
      const source = worldState.oc_definitions.find(
        (d: { level: number }) => d.level === tier.level
      );
      expect(source, `OC${tier.level} missing from world-state.json`).toBeDefined();
      expect(tier.name).toBe(source.name);
      expect(tier.description).toBe(source.description);
      expect(tier.budgetMillions).toBe(source.budget_millions);
      expect(tier.teamSize).toBe(source.team_size);
      expect(tier.timeHorizonMonths).toBe(source.time_horizon_months);
      // The intro title-cases the snake_case source values for display, so
      // compare on a normalized form rather than verbatim.
      expect(tier.typicalActors.map(normalize)).toEqual(
        source.typical_actors.map(normalize)
      );
      expect(tier.keyCapabilities.map(normalize)).toEqual(
        source.key_capabilities.map(normalize)
      );
    }
  });
});

/** "50_plus_zero_days_simultaneously" and "50+ zero-days simultaneously" agree. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

describe("intro SL levels match world-state.json", () => {
  it("carries the same fields per level", () => {
    expect(SL_LEVELS).toHaveLength(worldState.sl_definitions.length);
    for (const sl of SL_LEVELS) {
      const source = worldState.sl_definitions.find(
        (d: { level: number }) => d.level === sl.level
      );
      expect(source, `SL${sl.level} missing from world-state.json`).toBeDefined();
      expect(sl.name).toBe(source.name);
      expect(sl.description).toBe(source.description);
      expect(sl.defendsAgainst).toBe(source.defends_against);
      expect(sl.requiredIndependentLayers).toBe(source.required_independent_layers);
      expect(sl.achievable).toBe(source.achievable);
    }
  });

  it("still has SL5 as the unachievable one — the intro says so in prose", () => {
    expect(SL_LEVELS.filter((s) => !s.achievable).map((s) => s.level)).toEqual([5]);
  });

  it("SL5 still requires 8 independent layers", () => {
    expect(SL_LEVELS.find((s) => s.level === 5)!.requiredIndependentLayers).toBe(8);
  });
});

describe("intro stakes copy matches world-state.json", () => {
  it("quotes the exfiltration consequences verbatim", () => {
    expect([...EXFILTRATION_CONSEQUENCES]).toEqual(
      worldState.stakes.exfiltration_consequences
    );
  });

  it("quotes the recursive risk verbatim", () => {
    expect(RECURSIVE_RISK).toBe(worldState.stakes.recursive_risk);
  });
});

describe("intro demo blocks match blocks-*.json", () => {
  it("every demo block still exists with the same name, type and AI shift", () => {
    for (const demo of Object.values(DEMO_BLOCKS)) {
      const source = blocks.find((b) => b.id === demo.id);
      expect(source, `${demo.id} no longer exists in public/data`).toBeDefined();
      expect(demo.name).toBe(source!.name);
      expect(demo.category).toBe(source!.category);
      expect(demo.defenseType).toBe(source!.defense_type);
      expect(demo.aiOcShift).toBe(source!.adversary_exploitation.ai_oc_shift);
      expect(demo.deployMonths.min).toBe(source!.dimensions.time_to_deploy_months.min);
      expect(demo.deployMonths.max).toBe(source!.dimensions.time_to_deploy_months.max);
    }
  });

  it("the three blocks the decision-window demo teaches with still land in three tiers", () => {
    // The demo's whole point is showing closed / closing / on-the-horizon side
    // by side at one year. If the data's deploy times shift, that spread can
    // collapse and the slide silently stops teaching the distinction.
    const shown = ["HW-07", "NET-01", "PER-05"];
    const blockStates = Object.fromEntries(shown.map((id) => [id, "not_started"]));
    const urgencies = computeDecisionWindows(
      shown.map((id) => blocks.find((b) => b.id === id)!),
      blockStates,
      2027
    ).map((w) => w.urgency);
    expect(new Set(urgencies)).toEqual(new Set(["overdue", "urgent", "upcoming"]));
  });

  it("short labels match the app's BLOCK_SHORT_LABELS", () => {
    for (const demo of Object.values(DEMO_BLOCKS)) {
      expect(demo.shortLabel).toBe(BLOCK_SHORT_LABELS[demo.id]);
    }
  });

  it("still has one block of each defense type to teach with", () => {
    const types = new Set(Object.values(DEMO_BLOCKS).map((b) => b.defenseType));
    expect(types).toEqual(new Set(["hard_stop", "probabilistic", "hybrid"]));
  });
});

describe("intro chain walkthrough matches attack-chains.json", () => {
  const source = chains.find((c) => c.id === LONG_GAME.id)!;

  it("the chain still exists at the same OC tier", () => {
    expect(source, `chain ${LONG_GAME.id} no longer exists`).toBeDefined();
    expect(LONG_GAME.typicalOc).toBe(source.adversary_profile.typical_oc);
    expect(LONG_GAME.brief).toBe(source.narrative.brief);
  });

  it("the steps, their gaps and their stopper text are unchanged", () => {
    const sourceSteps = source.narrative.steps ?? [];
    expect(LONG_GAME.steps).toHaveLength(sourceSteps.length);
    LONG_GAME.steps.forEach((step, i) => {
      expect(step.phase).toBe(sourceSteps[i].phase);
      expect(step.description).toBe(sourceSteps[i].description);
      expect(step.blockGapUsed).toBe(sourceSteps[i].block_gap_used);
      if (step.blockGapUsed) {
        const detail = source.stopper_details?.find(
          (d) => d.block_id === step.blockGapUsed
        );
        expect(step.howItStops).toBe(detail?.how_it_stops);
      }
    });
  });

  it("every block the walkthrough names is one the intro can render", () => {
    for (const step of LONG_GAME.steps) {
      if (step.blockGapUsed) expect(DEMO_BLOCKS[step.blockGapUsed]).toBeDefined();
    }
  });
});

describe("intro catalogue counts match the shipped data", () => {
  it("block, category and chain counts", () => {
    expect(CATALOG.blocks).toBe(blocks.length);
    expect(CATALOG.categories).toBe(new Set(blocks.map((b) => b.category)).size);
    expect(CATALOG.chains).toBe(chains.length);
  });
});

describe("intro effectiveness figures come from the engine", () => {
  // The lifecycle slide renders these from getStateEffectiveness(), so this
  // pins the ladder the slide's prose implies.
  it("the state ladder is 0 / 10 / 40 / 85 / 100 percent", () => {
    expect([
      getStateEffectiveness("not_started"),
      getStateEffectiveness("investing"),
      getStateEffectiveness("implementing"),
      getStateEffectiveness("deployed"),
      getStateEffectiveness("mature"),
    ]).toEqual([0, 0.1, 0.4, 0.85, 1.0]);
  });
});

describe("slide registry", () => {
  it("has unique slugs — they're the URL fragments", () => {
    const slugs = SLIDES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("runs act 1 fully before act 2", () => {
    const acts = SLIDES.map((s) => s.act);
    expect(acts).toEqual([...acts].sort());
  });

  it("every slide has a title for the progress rail and document title", () => {
    for (const s of SLIDES) expect(s.title.length).toBeGreaterThan(0);
  });
});

describe("glossary", () => {
  // A reader told us they didn't know what OC meant, so the two abbreviations
  // the whole framework rests on have to spell themselves out — in the entry
  // label, not only somewhere in the prose.
  it("expands OC and SL in the label itself", () => {
    expect(GLOSSARY.oc.label).toMatch(/Operational Capability/);
    expect(GLOSSARY.sl.label).toMatch(/Security Level/);
  });

  it("defines every abbreviation the intro leans on", () => {
    for (const key of ["oc", "sl", "tee", "ciso", "scif", "sf86", "tempest"]) {
      expect(GLOSSARY, `${key} missing from the glossary`).toHaveProperty(key);
    }
  });

  it("every entry has a real label and a definition that reads as a sentence", () => {
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      expect(entry.label.length, `${key} label`).toBeGreaterThan(2);
      // Long enough to actually explain, and punctuated — a bare noun phrase
      // isn't a definition.
      expect(entry.definition.length, `${key} definition`).toBeGreaterThan(40);
      expect(entry.definition, `${key} definition`).toMatch(/[.!?]$/);
    }
  });

  it("no definition explains a term with the abbreviation it's defining", () => {
    // "OC — the OC tier of the attacker" would pass every check above and teach
    // nothing. Only guards the two that started this.
    expect(GLOSSARY.oc.definition).not.toMatch(/\bOC\b(?!\d)/);
    expect(GLOSSARY.sl.definition).not.toMatch(/\bSL\b(?!\d)/);
  });
});

describe("intro source links", () => {
  it("are all absolute https URLs", () => {
    for (const s of SOURCES) expect(s.href).toMatch(/^https:\/\//);
  });

  it("cover the four documents the app's footer cites", () => {
    const hrefs = SOURCES.map((s) => s.href);
    expect(hrefs).toContain("https://www.rand.org/pubs/research_reports/RRA2849-1.html");
    expect(hrefs).toContain("https://sl5.org/sl5-standard");
    expect(hrefs).toContain("https://sl5.org/projects/sl5-novel-recommendations");
    expect(hrefs).toContain("https://ai-2027.com");
  });
});
