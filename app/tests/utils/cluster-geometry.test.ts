import { describe, it, expect } from "vitest";
import type { Block, Category } from "../../src/engine/types";
import { buildClusterLayout } from "../../src/utils/cluster-geometry";
import { CATEGORY_ORDER } from "../../src/utils/geometry";

// Minimal block factory — only the fields the layout reads (id, category).
function mk(id: string, category: Category): Block {
  return { id, category } as Block;
}

// Realistic-ish sizes: network is a roomy 7-block cluster (centers its label),
// personnel is a single block (label lifts above), ai_specific has a couple.
const blocks: Block[] = [
  ...Array.from({ length: 7 }, (_, i) => mk(`NET-0${i}`, "network" as Category)),
  mk("PER-01", "personnel"),
  mk("AI-01", "ai_specific"),
  mk("AI-02", "ai_specific"),
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

  it("centers the label inside a roomy ring", () => {
    const l = layout();
    // network has 3 blocks → roomy enough to center.
    const label = l.groupLabel("network");
    const center = l.groupCenter("network");
    expect(label.placement).toBe("center");
    expect(label.x).toBeCloseTo(center.x, 6);
    expect(label.y).toBeCloseTo(center.y, 6);
  });

  it("moves the label above the ring for a single-block cluster", () => {
    // personnel + ai_specific each have exactly one block here.
    const l = layout();
    const label = l.groupLabel("personnel");
    const center = l.groupCenter("personnel");
    expect(label.placement).toBe("above");
    expect(label.y).toBeLessThan(center.y); // sits above the ring center
  });

  it("lifts a label that is too WIDE to fit even a roomy ring", () => {
    // Same 3-block network ring, but a very long title: a centered box would
    // overlap the side hexes horizontally, so it must be lifted above.
    const l = buildClusterLayout(
      blocks,
      CATEGORY_ORDER,
      (b) => b.category,
      (g) => (g === "network" ? "A Very Long Cluster Title Indeed" : g)
    );
    expect(l.groupLabel("network").placement).toBe("above");
  });

  it("spreads clusters wider than tall (landscape) and off the vertical axis", () => {
    const many: Block[] = [
      ...Array.from({ length: 7 }, (_, i) => mk(`NET-${i}`, "network")),
      ...Array.from({ length: 10 }, (_, i) => mk(`HW-${i}`, "machine")),
      ...Array.from({ length: 7 }, (_, i) => mk(`PHY-${i}`, "physical")),
      ...Array.from({ length: 8 }, (_, i) => mk(`PER-${i}`, "personnel")),
      ...Array.from({ length: 7 }, (_, i) => mk(`SC-${i}`, "supply_chain")),
      ...Array.from({ length: 8 }, (_, i) => mk(`AI-${i}`, "ai_specific")),
    ];
    const l = buildClusterLayout(many, CATEGORY_ORDER, (b) => b.category);
    // Wider than tall.
    expect(l.bounds.width).toBeGreaterThan(l.bounds.height);
    // No cluster center sits exactly on the vertical axis through the origin
    // (the tilt/stagger pushes them diagonally).
    for (const g of l.groups) {
      expect(Math.abs(l.groupCenter(g).x)).toBeGreaterThan(1);
    }
  });

  it("supports an alternate grouping (single group)", () => {
    const l = buildClusterLayout(blocks, ["all"], () => "all");
    expect(l.groups).toEqual(["all"]);
    // All blocks share one ring → one distinct position each.
    const keys = new Set(blocks.map((b) => {
      const p = l.pos(b);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }));
    expect(keys.size).toBe(blocks.length);
  });
});
