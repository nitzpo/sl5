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

/** Min spacing between adjacent hex centers on a cluster ring. */
const RING_ARC_STEP = 58;
/** Gap between the central node and the nearest cluster edge. */
const CENTER_MARGIN = 34;
/** Horizontal stretch of the cluster ellipse (screens are wide, so we spread
 * clusters wide and keep the vertical extent compact). */
const CLUSTER_ELLIPSE_ASPECT = 2.4;
/** Vertical squeeze of the ellipse: pulls the top/bottom clusters inward so the
 * composition is flatter and uses less vertical space. */
const CLUSTER_ELLIPSE_VSQUEEZE = 0.7;
/** Minimum gap between two cluster edges. If squeezing brings any adjacent pair
 * closer than this, the ellipse is inflated uniformly until it's met — so a flat
 * squeeze never crams clusters together (matters most in the uneven 8-layer view). */
const CLUSTER_MIN_GAP = 56;

/** Where a cluster's label sits, and how it's anchored vertically. */
export interface GroupLabel {
  x: number;
  y: number;
  /** "center" → baseline-middle inside the ring; "above" → sits over the ring. */
  placement: "center" | "above";
}

export interface ClusterLayout {
  /** Absolute position of a block. */
  pos: (block: Block) => { x: number; y: number };
  /** Center of a group's cluster. */
  groupCenter: (group: string) => { x: number; y: number };
  /** Ring radius of a group's cluster. */
  groupRadius: (group: string) => number;
  /** Label position + placement for a group's cluster. */
  groupLabel: (group: string) => GroupLabel;
  /** Ordered groups that actually have blocks. */
  groups: string[];
  /** World bounds enclosing the whole composition. */
  bounds: { minX: number; minY: number; width: number; height: number };
}

/** Font size of a cluster label; drives the estimated label box. */
const LABEL_FONT_SIZE = 13;
/** Approx half-height of the label box (font + a little breathing room). */
const LABEL_HALF_HEIGHT = LABEL_FONT_SIZE / 2 + 3;
/** Approx width per character at LABEL_FONT_SIZE (semibold) — an upper-ish
 * bound so we err toward lifting a label rather than overlapping a hex. */
const LABEL_CHAR_WIDTH = 7.6;
/** Padding kept between the label box and any hexagon. */
const LABEL_HEX_PADDING = 6;

/** Estimated half-extent (width, height) of a centered label box. */
function labelHalfExtent(text: string): { hw: number; hh: number } {
  return { hw: (text.length * LABEL_CHAR_WIDTH) / 2, hh: LABEL_HALF_HEIGHT };
}

/** Radius of a cluster ring holding `count` blocks (evenly spaced, no overlap). */
function ringRadius(count: number): number {
  if (count <= 1) return CLUSTER_BLOCK_SIZE + 6;
  // Circumference must fit `count` blocks at RING_ARC_STEP spacing; a small
  // floor keeps 2-3 block clusters from collapsing onto the center.
  const byArc = (count * RING_ARC_STEP) / (2 * Math.PI);
  return Math.max(byArc, CLUSTER_BLOCK_SIZE * 2);
}

/** Angle of the nth block on a cluster ring (full circle — label is centered). */
function blockAngleOnRing(index: number, count: number): number {
  if (count === 1) return -Math.PI / 2;
  // Start at the top and distribute evenly over the whole circle.
  return -Math.PI / 2 + (index / count) * Math.PI * 2;
}

/**
 * Whether a centered label box (centered on the ring center) clears every hex
 * on the ring. Tests the actual block positions against the label's estimated
 * width AND height — so a wide label like "Monitoring" is lifted when side
 * hexes would intrude, not just when the ring is vertically small.
 *
 * @param positions block centers relative to the cluster center
 */
function centerLabelFits(
  positions: Array<{ dx: number; dy: number }>,
  text: string
): boolean {
  const { hw, hh } = labelHalfExtent(text);
  // Treat each hex as a disc of radius CLUSTER_BLOCK_SIZE; the label as an
  // axis-aligned box. Overlap when the hex center is within (box + hexR + pad)
  // on both axes — the standard circle-vs-rounded-box closest-point test.
  const padX = hw + CLUSTER_BLOCK_SIZE + LABEL_HEX_PADDING;
  const padY = hh + CLUSTER_BLOCK_SIZE + LABEL_HEX_PADDING;
  for (const { dx, dy } of positions) {
    // Closest point on the label box to the hex center, then distance.
    const cx = Math.max(-hw, Math.min(hw, dx));
    const cy = Math.max(-hh, Math.min(hh, dy));
    const distX = Math.abs(dx - cx);
    const distY = Math.abs(dy - cy);
    // Quick reject via bounding pads, then precise circle-box distance.
    if (Math.abs(dx) < padX && Math.abs(dy) < padY) {
      const gap = Math.hypot(distX, distY);
      if (gap < CLUSTER_BLOCK_SIZE + LABEL_HEX_PADDING) return false;
    }
  }
  return true;
}

/**
 * Build a cluster layout for the given grouping.
 *
 * @param blocks all blocks
 * @param orderedGroups the full group order (e.g. CATEGORY_ORDER or LAYER_ORDER)
 * @param groupOf maps a block to its group key
 * @param labelTextOf the display label for a group (used to size the label box
 *   so a wide title is lifted above the ring instead of overlapping side hexes)
 */
export function buildClusterLayout(
  blocks: Block[],
  orderedGroups: readonly string[],
  groupOf: (block: Block) => string,
  labelTextOf: (group: string) => string = (g) => g
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

  // Cluster centers sit on an ELLIPSE around the model node. Screens are wide,
  // so we stretch the horizontal radius (ASPECT) and squeeze the vertical one
  // (VSQUEEZE) — the composition spreads wide and short to fill a landscape
  // canvas instead of a tall square. The squeeze is bounded so clusters never
  // collide (see the constant's note).
  const maxClusterR = Math.max(...groups.map((g) => radii.get(g)!), 0);
  const n = Math.max(groups.length, 1);
  // Base radius: adjacent centers must be far enough apart that clusters don't
  // touch, and every cluster must clear the central node.
  const minSep = 2 * maxClusterR + 24;
  const byNeighbors = n > 1 ? minSep / (2 * Math.sin(Math.PI / n)) : 0;
  const byCenter = CENTER_NODE_RADIUS + CENTER_MARGIN + maxClusterR;
  const baseRadius = Math.max(byNeighbors, byCenter);

  // Distribute clusters around the ellipse, offset by HALF a step so that for
  // even counts NO cluster sits straight up or straight down — they straddle the
  // horizontal sides. That keeps the vertical extent compact and gives the wide,
  // diagonal spread without rotating the whole ring.
  const startAngle = -Math.PI / 2 + Math.PI / n;
  const angleOf = (i: number) => startAngle + (i / n) * Math.PI * 2;

  // Squeezing the ellipse vertically pulls some adjacent clusters closer than a
  // circle would, and clusters vary in size (the 8-layer view especially). So
  // after laying them out, inflate the ellipse uniformly (preserving the flat
  // aspect) until the tightest adjacent-cluster gap meets a floor — no cramping,
  // whatever the grouping.
  let rx = baseRadius * CLUSTER_ELLIPSE_ASPECT;
  let ry = baseRadius * CLUSTER_ELLIPSE_VSQUEEZE;
  const centerAt = (i: number) => ({
    x: CLUSTER_CENTER.x + rx * Math.cos(angleOf(i)),
    y: CLUSTER_CENTER.y + ry * Math.sin(angleOf(i)),
  });
  // The pair whose gap is tightest, and the uniform scale that would lift it to
  // the floor. Scaling rx,ry by s scales the center-to-center distance by s
  // while cluster radii stay fixed, so gap(s) = s·dist0 − r_i − r_j; solve for s.
  if (n > 1) {
    let worstScale = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = centerAt(i);
        const b = centerAt(j);
        const dist0 = Math.hypot(a.x - b.x, a.y - b.y);
        const rSum = radii.get(groups[i])! + radii.get(groups[j])!;
        const gap = dist0 - rSum;
        if (gap < CLUSTER_MIN_GAP && dist0 > 0) {
          worstScale = Math.max(worstScale, (CLUSTER_MIN_GAP + rSum) / dist0);
        }
      }
    }
    rx *= worstScale;
    ry *= worstScale;
  }

  const centers = new Map<string, { x: number; y: number }>();
  groups.forEach((g, i) => {
    centers.set(g, centerAt(i));
  });

  // Precompute each block's absolute position, and its offset from the cluster
  // center (used to test whether a centered label clears the hexes).
  const posMap = new Map<string, { x: number; y: number }>();
  const offsetsByGroup = new Map<string, Array<{ dx: number; dy: number }>>();
  for (const g of groups) {
    const arr = byGroup.get(g)!;
    const center = centers.get(g)!;
    const r = radii.get(g)!;
    const offsets: Array<{ dx: number; dy: number }> = [];
    arr.forEach((b, idx) => {
      const a = blockAngleOnRing(idx, arr.length);
      const dx = r * Math.cos(a);
      const dy = r * Math.sin(a);
      posMap.set(b.id, { x: center.x + dx, y: center.y + dy });
      offsets.push({ dx, dy });
    });
    offsetsByGroup.set(g, offsets);
  }

  // Label placement per cluster: centered inside the ring when the title clears
  // every hex (tested against actual block positions AND the label's width),
  // else lifted above a ring too small/crowded to hold it clear.
  const labels = new Map<string, GroupLabel>();
  for (const g of groups) {
    const center = centers.get(g)!;
    const r = radii.get(g)!;
    const offsets = offsetsByGroup.get(g)!;
    if (centerLabelFits(offsets, labelTextOf(g))) {
      labels.set(g, { x: center.x, y: center.y, placement: "center" });
    } else {
      // Above the ring, clear of the topmost hex (hex reaches up to r + hexSize
      // above center) plus a little breathing room — so the label never sits on
      // a hexagon the way a too-close offset would.
      labels.set(g, {
        x: center.x,
        y: center.y - r - CLUSTER_BLOCK_SIZE - 12,
        placement: "above",
      });
    }
  }

  // World bounds: derive from actual cluster extents so the (wide) ellipse
  // yields a wide rectangle, not a square. Each cluster reaches its ring radius
  // plus hex + block-label headroom; an "above" title adds a little more on top.
  const hexPad = CLUSTER_BLOCK_SIZE + 16; // hex half + short label under it
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const g of groups) {
    const c = centers.get(g)!;
    const r = radii.get(g)!;
    const reach = r + hexPad;
    const label = labels.get(g)!;
    // An "above" label sits higher than the ring; include it in the top extent.
    const top = label.placement === "above" ? Math.min(c.y - reach, label.y - 10) : c.y - reach;
    minX = Math.min(minX, c.x - reach);
    maxX = Math.max(maxX, c.x + reach);
    minY = Math.min(minY, top);
    maxY = Math.max(maxY, c.y + reach);
  }
  // Guard against a degenerate empty layout.
  if (!isFinite(minX)) {
    minX = -100;
    minY = -100;
    maxX = 100;
    maxY = 100;
  }
  const margin = 12;
  const bounds = {
    minX: minX - margin,
    minY: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };

  return {
    pos: (b) => posMap.get(b.id) ?? CLUSTER_CENTER,
    groupCenter: (g) => centers.get(g) ?? CLUSTER_CENTER,
    groupRadius: (g) => radii.get(g) ?? 0,
    groupLabel: (g) => labels.get(g) ?? { x: 0, y: 0, placement: "center" },
    groups,
    bounds,
  };
}
