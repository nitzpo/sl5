import type { Block, Category } from "../engine/types";
import { CATEGORY_ORDER } from "./geometry";

/**
 * Cluster layout: the 47 blocks grouped into 6 category clusters arranged on a
 * circle around a central "Model / Weights" node. Each cluster packs its blocks
 * into a compact disc with a deterministic phyllotaxis (sunflower) spiral — even
 * spacing, no physics sim, stable positions run-to-run.
 *
 * All positions are in a fixed world space centered on CLUSTER_CENTER; the view
 * places this world inside a pannable/zoomable <g>, so the world size here is
 * just the intrinsic layout, independent of the viewport.
 */

export const CLUSTER_CENTER = { x: 0, y: 0 };
export const CLUSTER_BLOCK_SIZE = 20; // between grid (24) and rings (17)

/** Radius of the ring the cluster centers sit on. */
const CLUSTER_RING_RADIUS = 300;
/** Spacing step of the intra-cluster spiral (hex center to hex center-ish). */
const PACK_STEP = 26;
/** Golden angle — the phyllotaxis constant for even disc packing. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Category cluster centers, one per CATEGORY_ORDER slot, starting at top. */
export function clusterCenter(category: Category): { x: number; y: number } {
  const i = CATEGORY_ORDER.indexOf(category);
  // -PI/2 puts the first category at the top; go clockwise from there.
  const angle = -Math.PI / 2 + (i / CATEGORY_ORDER.length) * Math.PI * 2;
  return {
    x: CLUSTER_CENTER.x + CLUSTER_RING_RADIUS * Math.cos(angle),
    y: CLUSTER_CENTER.y + CLUSTER_RING_RADIUS * Math.sin(angle),
  };
}

/** Intra-cluster offset for the nth block in a cluster (phyllotaxis disc). */
function packOffset(indexInCluster: number): { x: number; y: number } {
  // r = step*sqrt(i) spreads points with uniform density; angle = i*goldenAngle
  // rotates each successive point by the golden angle — the sunflower pattern.
  const r = PACK_STEP * Math.sqrt(indexInCluster);
  const angle = indexInCluster * GOLDEN_ANGLE;
  return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
}

/** Absolute world position of a block: cluster center + intra-cluster offset. */
export function clusterBlockPosition(
  blocks: Block[],
  block: Block
): { x: number; y: number } {
  const center = clusterCenter(block.category);
  const catBlocks = blocks.filter((b) => b.category === block.category);
  const idx = catBlocks.indexOf(block);
  const off = packOffset(idx < 0 ? 0 : idx);
  return { x: center.x + off.x, y: center.y + off.y };
}

/** Approximate packed radius of a cluster with `count` blocks (for the hull). */
export function clusterRadius(count: number): number {
  if (count <= 1) return CLUSTER_BLOCK_SIZE + 8;
  return PACK_STEP * Math.sqrt(count - 1) + CLUSTER_BLOCK_SIZE + 8;
}

/**
 * World-space bounding box of the whole layout, so the view can compute an
 * initial transform that fits everything on screen without measuring the DOM.
 */
export function clusterWorldBounds(blocks: Block[]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  let maxReach = 0;
  for (const category of CATEGORY_ORDER) {
    const count = blocks.filter((b) => b.category === category).length;
    const center = clusterCenter(category);
    const reach =
      Math.hypot(center.x - CLUSTER_CENTER.x, center.y - CLUSTER_CENTER.y) +
      clusterRadius(count);
    maxReach = Math.max(maxReach, reach);
  }
  // Add label headroom above each cluster.
  const pad = 24;
  const half = maxReach + pad;
  return {
    minX: CLUSTER_CENTER.x - half,
    minY: CLUSTER_CENTER.y - half,
    width: half * 2,
    height: half * 2,
  };
}
