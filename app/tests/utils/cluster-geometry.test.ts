import { describe, it, expect } from "vitest";
import type { Block, Category } from "../../src/engine/types";
import { buildClusterLayout } from "../../src/utils/cluster-geometry";
import { CATEGORY_ORDER } from "../../src/utils/geometry";

// Minimal block factory — only the fields the layout reads (id, category).
function mk(id: string, category: Category): Block {
  return { id, category } as Block;
}

const blocks: Block[] = [
  mk("NET-01", "network"),
  mk("NET-02", "network"),
  mk("NET-03", "network"),
  mk("PER-01", "personnel"),
  mk("AI-01", "ai_specific"),
];

function layout() {
  return buildClusterLayout(blocks, CATEGORY_ORDER, (b) => b.category);
}

describe("cluster-geometry", () => {
  it("is deterministic: same block → same position", () => {
    const a = layout().pos(blocks[0]);
    const b = layout().pos(blocks[0]);
    expect(a).toEqual(b);
  });

  it("only includes groups that have blocks", () => {
    const l = layout();
    // network, personnel, ai_specific have blocks; others don't.
    expect(l.groups).toEqual(["network", "personnel", "ai_specific"]);
  });

  it("places each block on its cluster's ring (radius from center)", () => {
    const l = layout();
    const center = l.groupCenter("network");
    const r = l.groupRadius("network");
    for (const b of blocks.filter((x) => x.category === "network")) {
      const p = l.pos(b);
      const dist = Math.hypot(p.x - center.x, p.y - center.y);
      expect(dist).toBeCloseTo(r, 3);
    }
  });

  it("keeps blocks in a cluster from overlapping (distinct angles)", () => {
    const l = layout();
    const net = blocks.filter((b) => b.category === "network").map((b) => l.pos(b));
    const keys = new Set(net.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`));
    expect(keys.size).toBe(net.length);
  });

  it("world bounds enclose every block position", () => {
    const l = layout();
    for (const b of blocks) {
      const p = l.pos(b);
      expect(p.x).toBeGreaterThanOrEqual(l.bounds.minX);
      expect(p.x).toBeLessThanOrEqual(l.bounds.minX + l.bounds.width);
      expect(p.y).toBeGreaterThanOrEqual(l.bounds.minY);
      expect(p.y).toBeLessThanOrEqual(l.bounds.minY + l.bounds.height);
    }
  });

  it("supports an alternate grouping (single group)", () => {
    const l = buildClusterLayout(blocks, ["all"], () => "all");
    expect(l.groups).toEqual(["all"]);
    // All 5 blocks share one ring → 5 distinct positions.
    const keys = new Set(blocks.map((b) => {
      const p = l.pos(b);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }));
    expect(keys.size).toBe(5);
  });
});
