import type { Block } from "../engine/types";

/**
 * Cluster layout: blocks grouped into clusters arranged on a circle around a
 * central "Model / Weights" node. Each cluster lays its blocks out on a single
 * ring, so hexes never overlap and intra-cluster connections cross the open
 * middle where they're easy to read.
 *
 * The layout is grouping-agnostic: the caller passes ordered group keys and a
 * `groupOf(block)` mapping, so the same geometry serves the 6-category and the
 * 8-layer groupings. All positions are in a world space centered on (0,0); the
 * view fits its viewBox to the computed bounds, so the composition fills the
 * canvas regardless of how many groups there are.
 */

export const CLUSTER_CENTER = { x: 0, y: 0 };
export const CLUSTER_BLOCK_SIZE = 19;

/** Center-node radius reserved at the middle. */
export const CENTER_NODE_RADIUS = 34;

/** Angular gap (radians) kept clear at the top of a cluster ring for its label. */
const LABEL_GAP = 0.5;
/** Min spacing between adjacent hex centers on a cluster ring. */
const RING_ARC_STEP = 58;
/** Gap between the central node and the nearest cluster edge. */
const CENTER_MARGIN = 34;

export interface ClusterLayout {
  /** Absolute position of a block. */
  pos: (block: Block) => { x: number; y: number };
  /** Center of a group's cluster. */
  groupCenter: (group: string) => { x: number; y: number };
  /** Ring radius of a group's cluster. */
  groupRadius: (group: string) => number;
  /** Ordered groups that actually have blocks. */
  groups: string[];
  /** World bounds enclosing the whole composition. */
  bounds: { minX: number; minY: number; width: number; height: number };
}

/** Radius of a cluster ring holding `count` blocks (evenly spaced, no overlap). */
function ringRadius(count: number): number {
  if (count <= 1) return CLUSTER_BLOCK_SIZE + 6;
  // Circumference must fit `count` blocks at RING_ARC_STEP spacing; a small
  // floor keeps 2-3 block clusters from collapsing onto the center.
  const byArc = (count * RING_ARC_STEP) / (2 * Math.PI);
  return Math.max(byArc, CLUSTER_BLOCK_SIZE * 2);
}

/** Angle of the nth block on a cluster ring (top gap reserved for the label). */
function blockAngleOnRing(index: number, count: number): number {
  if (count === 1) return -Math.PI / 2;
  // Distribute over the circle minus a wedge at top (−π/2) for the label.
  const start = -Math.PI / 2 + LABEL_GAP / 2;
  const arc = Math.PI * 2 - LABEL_GAP;
  return start + (index / count) * arc;
}

/**
 * Build a cluster layout for the given grouping.
 *
 * @param blocks all blocks
 * @param orderedGroups the full group order (e.g. CATEGORY_ORDER or LAYER_ORDER)
 * @param groupOf maps a block to its group key
 */
export function buildClusterLayout(
  blocks: Block[],
  orderedGroups: readonly string[],
  groupOf: (block: Block) => string
): ClusterLayout {
  // Bucket blocks by group, preserving catalog order within each.
  const byGroup = new Map<string, Block[]>();
  for (const b of blocks) {
    const g = groupOf(b);
    const arr = byGroup.get(g);
    if (arr) arr.push(b);
    else byGroup.set(g, [b]);
  }

  // Only groups with blocks get a cluster, in the given order.
  const groups = orderedGroups.filter((g) => (byGroup.get(g)?.length ?? 0) > 0);

  const radii = new Map<string, number>();
  for (const g of groups) radii.set(g, ringRadius(byGroup.get(g)!.length));

  // Cluster centers sit on a circle whose radius leaves room for the biggest
  // cluster plus the center node — tight enough to fill the canvas, loose
  // enough that adjacent clusters don't collide.
  const maxClusterR = Math.max(...groups.map((g) => radii.get(g)!), 0);
  const n = Math.max(groups.length, 1);
  // Chord between adjacent centers must exceed the two touching cluster radii.
  const minSep = 2 * maxClusterR + 24;
  const byNeighbors = n > 1 ? minSep / (2 * Math.sin(Math.PI / n)) : 0;
  const byCenter = CENTER_NODE_RADIUS + CENTER_MARGIN + maxClusterR;
  const clusterRingRadius = Math.max(byNeighbors, byCenter);

  const centers = new Map<string, { x: number; y: number }>();
  groups.forEach((g, i) => {
    // Start at the top, go clockwise.
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    centers.set(g, {
      x: CLUSTER_CENTER.x + clusterRingRadius * Math.cos(angle),
      y: CLUSTER_CENTER.y + clusterRingRadius * Math.sin(angle),
    });
  });

  // Precompute each block's absolute position.
  const posMap = new Map<string, { x: number; y: number }>();
  for (const g of groups) {
    const arr = byGroup.get(g)!;
    const center = centers.get(g)!;
    const r = radii.get(g)!;
    arr.forEach((b, idx) => {
      const a = blockAngleOnRing(idx, arr.length);
      posMap.set(b.id, {
        x: center.x + r * Math.cos(a),
        y: center.y + r * Math.sin(a),
      });
    });
  }

  // World bounds: farthest cluster reach + label/hex headroom.
  const reach = clusterRingRadius + maxClusterR;
  const pad = CLUSTER_BLOCK_SIZE + 28; // hex + label + cluster label above
  const half = reach + pad;
  const bounds = {
    minX: CLUSTER_CENTER.x - half,
    minY: CLUSTER_CENTER.y - half,
    width: half * 2,
    height: half * 2,
  };

  return {
    pos: (b) => posMap.get(b.id) ?? CLUSTER_CENTER,
    groupCenter: (g) => centers.get(g) ?? CLUSTER_CENTER,
    groupRadius: (g) => radii.get(g) ?? 0,
    groups,
    bounds,
  };
}
