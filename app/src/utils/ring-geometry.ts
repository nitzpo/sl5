export const LAYER_ORDER = [
  "accelerator_security",
  "host_security",
  "network_boundary",
  "physical_perimeter",
  "access_control",
  "monitoring_detection",
  "personnel_trust",
  "supply_chain_integrity",
] as const;

export type LayerId = (typeof LAYER_ORDER)[number];

export const LAYER_LABELS: Record<string, string> = {
  accelerator_security: "Accelerator",
  host_security: "Host/OS",
  network_boundary: "Network",
  physical_perimeter: "Physical",
  access_control: "Access Ctrl",
  monitoring_detection: "Monitoring",
  personnel_trust: "Personnel",
  supply_chain_integrity: "Supply Chain",
};

export const LAYER_COLORS: Record<string, string> = {
  accelerator_security: "#a78bfa",
  host_security: "#60a5fa",
  network_boundary: "#34d399",
  physical_perimeter: "#fbbf24",
  access_control: "#f472b6",
  monitoring_detection: "#38bdf8",
  personnel_trust: "#fb923c",
  supply_chain_integrity: "#a3e635",
};

export const LAYER_ALIAS_MAP: Record<string, string> = {
  detection: "monitoring_detection",
  insider_threat: "personnel_trust",
  integrity_verification: "monitoring_detection",
  resource_boundary: "access_control",
  response_validation: "monitoring_detection",
  last_resort: "accelerator_security",
  physical_control: "physical_perimeter",
  data_boundary: "network_boundary",
  input_boundary: "network_boundary",
};

export const RING_CENTER = { x: 330, y: 330 };
export const RING_RADII = [54, 88, 122, 156, 192, 226, 260, 294];
export const RING_BLOCK_SIZE = 17;
export const RING_SVG_SIZE = 660;

/** Layer labels sit along this radial spoke (north-east), inside a wedge kept
 * clear of blocks — so the eight labels never stack into one column. */
export const LABEL_SPOKE_ANGLE = -Math.PI / 4;

/**
 * Usable arc for block clusters: from due-East (0) clockwise 270° to due-North,
 * leaving the top-right quartile empty (that's where the diagonal layer labels
 * live). SVG y is down, so increasing angle sweeps clockwise: 0=E, π/2=S, π=W,
 * 3π/2=N.
 */
const CLUSTER_ARC_START = 0; // due East
const CLUSTER_ARC_SPAN = (3 * Math.PI) / 2; // 270°, E → S → W → N

/** Target arc-length gap between adjacent blocks within a cluster (px). Held
 * constant across rings by scaling the angular step by 1/radius, so a cluster
 * reads as an evenly-spaced run whether it's on an inner or outer ring. */
const BLOCK_ARC_GAP = 40;

export function resolveLayer(raw: string): LayerId | null {
  if ((LAYER_ORDER as readonly string[]).includes(raw)) return raw as LayerId;
  const mapped = LAYER_ALIAS_MAP[raw];
  if (mapped && (LAYER_ORDER as readonly string[]).includes(mapped)) return mapped as LayerId;
  return null;
}

const RING_COUNT = RING_RADII.length;

/**
 * Angle of the nth block on a given ring. Each ring gets its own angular slot
 * evenly spaced across the 270° usable arc, and its blocks run SEQUENTIALLY
 * within it at a constant arc-length gap (so inner and outer clusters are spaced
 * the same in pixels). The run is centered in its slot but clamped to the usable
 * arc, so no cluster spills into the empty top-right quartile (the label wedge).
 * The result: each layer reads as one compact cluster, and the clusters spiral
 * outward around the circle instead of every ring wrapping the whole round.
 */
export function blockAngle(ringIdx: number, index: number, total: number): number {
  const r = RING_RADII[ringIdx];
  // Constant pixel gap → smaller angular step on bigger rings. But a small inner
  // ring may not fit its blocks at that gap; cap the run to the usable arc (with
  // a little margin) so it never wraps into the empty top-right — inner clusters
  // just pack a bit tighter, which reads fine at that radius.
  const maxRunArc = CLUSTER_ARC_SPAN * 0.96;
  const step = total > 1 ? Math.min(BLOCK_ARC_GAP / r, maxRunArc / (total - 1)) : 0;
  const runArc = (total - 1) * step;

  // This ring's slot within the usable arc.
  const slotStart = CLUSTER_ARC_START + (ringIdx / RING_COUNT) * CLUSTER_ARC_SPAN;
  const slotEnd = CLUSTER_ARC_START + ((ringIdx + 1) / RING_COUNT) * CLUSTER_ARC_SPAN;
  const slotCenter = (slotStart + slotEnd) / 2;

  // Center the run in the slot, then clamp so the whole run stays inside the
  // usable arc [START, START+SPAN] — never entering the top-right quartile.
  let runStart = slotCenter - runArc / 2;
  const minStart = CLUSTER_ARC_START;
  const maxStart = CLUSTER_ARC_START + CLUSTER_ARC_SPAN - runArc;
  runStart = Math.max(minStart, Math.min(maxStart, runStart));

  return runStart + index * step;
}

export function blockPositionOnRing(
  ringIdx: number,
  blockIdx: number,
  totalOnRing: number
): { x: number; y: number } {
  const angle = blockAngle(ringIdx, blockIdx, totalOnRing);
  const r = RING_RADII[ringIdx];
  return {
    x: RING_CENTER.x + r * Math.cos(angle),
    y: RING_CENTER.y + r * Math.sin(angle),
  };
}

/** Where a ring's label anchors: on the spoke, at the ring's radius. */
export function ringLabelPosition(ringIdx: number): { x: number; y: number } {
  const r = RING_RADII[ringIdx];
  return {
    x: RING_CENTER.x + r * Math.cos(LABEL_SPOKE_ANGLE),
    y: RING_CENTER.y + r * Math.sin(LABEL_SPOKE_ANGLE),
  };
}
