import { describe, it, expect } from "vitest";
import { resolveLayer } from "../../src/utils/ring-geometry";
import { NO_DEADLINE_MONTHS } from "../../src/utils/decision-windows";
import type { AttackChain, Block } from "../../src/engine/types";
import fs from "fs";
import path from "path";

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
const blockIds = new Set(blocks.map((b) => b.id));

describe("block data integrity", () => {
  it("has unique block ids", () => {
    expect(blockIds.size).toBe(blocks.length);
  });

  it("every dependency reference resolves to a real block", () => {
    for (const b of blocks) {
      for (const list of [
        b.dependencies?.requires ?? [],
        b.dependencies?.enhances ?? [],
        b.dependencies?.enabled_by ?? [],
      ]) {
        for (const id of list) {
          expect(blockIds.has(id), `${b.id} references unknown block ${id}`).toBe(true);
        }
      }
    }
  });

  it("hard `requires` chains are acyclic", () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const byId = new Map(blocks.map((b) => [b.id, b]));
    function visit(id: string, trail: string[]) {
      if (done.has(id)) return;
      expect(visiting.has(id), `requires cycle: ${[...trail, id].join(" → ")}`).toBe(false);
      visiting.add(id);
      for (const req of byId.get(id)?.dependencies?.requires ?? []) {
        visit(req, [...trail, id]);
      }
      visiting.delete(id);
      done.add(id);
    }
    for (const b of blocks) visit(b.id, []);
  });

  it("every layer contribution resolves to a canonical layer", () => {
    for (const b of blocks) {
      for (const raw of b.defense_in_depth?.layer_contributions ?? []) {
        expect(resolveLayer(raw), `${b.id}: unresolvable layer "${raw}"`).not.toBeNull();
      }
    }
  });

  it("cost and deploy-time ranges are ordered and sane", () => {
    for (const b of blocks) {
      const cost = b.dimensions.cost.upfront_millions;
      expect(cost.min, `${b.id} cost.min`).toBeGreaterThanOrEqual(0);
      expect(cost.max, `${b.id} cost range inverted`).toBeGreaterThanOrEqual(cost.min);

      const t = b.dimensions.time_to_deploy_months;
      expect(t.min, `${b.id} deploy min`).toBeGreaterThan(0);
      // Either a real range, or the documented open-ended sentinel — but a
      // sentinel-sized minimum is always a data error.
      expect(t.max, `${b.id} deploy range inverted`).toBeGreaterThanOrEqual(t.min);
      expect(t.min, `${b.id} sentinel-sized deploy minimum`).toBeLessThan(NO_DEADLINE_MONTHS);
    }
  });

  it("ai_oc_shift stays within the modeled range", () => {
    for (const b of blocks) {
      const shift = b.adversary_exploitation.ai_oc_shift;
      expect(shift, `${b.id} ai_oc_shift`).toBeGreaterThanOrEqual(0);
      expect(shift, `${b.id} ai_oc_shift`).toBeLessThanOrEqual(3);
    }
  });
});

describe("attack-chain data integrity", () => {
  it("every exploited block resolves", () => {
    for (const c of chains) {
      for (const id of c.blocks_exploited) {
        expect(blockIds.has(id), `${c.id}: unknown exploited block ${id}`).toBe(true);
      }
    }
  });

  it("every stopper resolves, and stopper_details refer to listed stoppers", () => {
    for (const c of chains) {
      for (const id of c.stoppers ?? []) {
        expect(blockIds.has(id), `${c.id}: unknown stopper ${id}`).toBe(true);
      }
      for (const d of c.stopper_details ?? []) {
        expect(
          (c.stoppers ?? []).includes(d.block_id),
          `${c.id}: stopper_details for ${d.block_id} which is not a stopper`
        ).toBe(true);
      }
    }
  });

  it("min_oc within 1-5 and ≤ typical_oc", () => {
    for (const c of chains) {
      expect(c.adversary_profile.min_oc).toBeGreaterThanOrEqual(1);
      expect(c.adversary_profile.min_oc).toBeLessThanOrEqual(5);
      expect(c.adversary_profile.typical_oc).toBeGreaterThanOrEqual(c.adversary_profile.min_oc);
    }
  });

  it("every chain can be stopped: it has at least one stopper or exploited block", () => {
    for (const c of chains) {
      expect(
        c.blocks_exploited.length + (c.stoppers ?? []).length,
        `${c.id} has no defenses at all`
      ).toBeGreaterThan(0);
    }
  });
});
