import { describe, it, expect } from "vitest";
import type { Block, Category } from "../../src/engine/types";
import {
  clusterBlockPosition,
  clusterCenter,
  clusterWorldBounds,
  CLUSTER_CENTER,
} from "../../src/utils/cluster-geometry";
import { CATEGORY_ORDER } from "../../src/utils/geometry";

// Minimal block factory — only the fields the layout reads (id, category).
function mk(id: string, category: Category): Block {
  return { id, category } as Block;
}

describe("cluster-geometry", () => {
  const blocks: Block[] = [
    mk("NET-01", "network"),
    mk("NET-02", "network"),
    mk("NET-03", "network"),
    mk("PER-01", "personnel"),
    mk("AI-01", "ai_specific"),
  ];

  it("is deterministic: same block → same position", () => {
    const a = clusterBlockPosition(blocks, blocks[0]);
    const b = clusterBlockPosition(blocks, blocks[0]);
    expect(a).toEqual(b);
  });

  it("places the first block of a cluster at the cluster center", () => {
    const first = clusterBlockPosition(blocks, blocks[0]); // NET-01, index 0
    const center = clusterCenter("network");
    expect(first.x).toBeCloseTo(center.x, 6);
    expect(first.y).toBeCloseTo(center.y, 6);
  });

  it("spreads later blocks in a cluster away from its center", () => {
    const center = clusterCenter("network");
    const third = clusterBlockPosition(blocks, blocks[2]); // NET-03, index 2
    const dist = Math.hypot(third.x - center.x, third.y - center.y);
    expect(dist).toBeGreaterThan(0);
  });

  it("gives each category a distinct cluster center around the origin", () => {
    const centers = CATEGORY_ORDER.map((c) => clusterCenter(c));
    // All centers are equidistant from the origin (on the cluster ring).
    const radii = centers.map((p) =>
      Math.hypot(p.x - CLUSTER_CENTER.x, p.y - CLUSTER_CENTER.y)
    );
    for (const r of radii) expect(r).toBeCloseTo(radii[0], 6);
    // And no two centers coincide.
    const keys = new Set(centers.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`));
    expect(keys.size).toBe(CATEGORY_ORDER.length);
  });

  it("world bounds enclose every block position", () => {
    const b = clusterWorldBounds(blocks);
    for (const block of blocks) {
      const p = clusterBlockPosition(blocks, block);
      expect(p.x).toBeGreaterThanOrEqual(b.minX);
      expect(p.x).toBeLessThanOrEqual(b.minX + b.width);
      expect(p.y).toBeGreaterThanOrEqual(b.minY);
      expect(p.y).toBeLessThanOrEqual(b.minY + b.height);
    }
  });
});
