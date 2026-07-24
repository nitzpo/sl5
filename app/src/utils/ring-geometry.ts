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
// Radii start high enough that even the innermost ring can hold a compact,
// non-overlapping run of its blocks (the smallest ring must fit up to 8-9
// hexes); the outer ring still clears the 660 viewBox.
export const RING_RADII = [96, 124, 152, 180, 208, 236, 264, 292];
export const RING_BLOCK_SIZE = 17;
export const RING_SVG_SIZE = 660;

/** Layer labels sit along this radial spoke (north-east), inside a wedge kept
 * clear of blocks — so the eight labels never stack into one column. */
export const LABEL_SPOKE_ANGLE = -Math.PI / 4;

/** Half-width of the wedge kept clear around the NE label spoke, so a cluster
 * never sits on top of the diagonal ring labels. Everything else is usable. */
const LABEL_WEDGE_HALF = Math.PI / 10; // ±18°

/** Arc-length gap between adjacent blocks within a ring's run (px). Constant
 * across rings (angular step scales by 1/radius), so every cluster is a compact,
 * evenly-spaced run whether on an inner or outer ring. */
const BLOCK_ARC_GAP = 38;

export function resolveLayer(raw: string): LayerId | null {
  if ((LAYER_ORDER as readonly string[]).includes(raw)) return raw as LayerId;
  const mapped = LAYER_ALIAS_MAP[raw];
  if (mapped && (LAYER_ORDER as readonly string[]).includes(mapped)) return mapped as LayerId;
  return null;
}

const RING_COUNT = RING_RADII.length;
/** Coprime with RING_COUNT (8): stepping the ring index by this around the
 * circle scatters the clusters so consecutive rings land far apart (their
 * relation arcs cross), instead of neighbouring rings sitting side by side. */
const RING_SCATTER_STRIDE = 3;

/**
 * Angle where ring `ringIdx`'s cluster is CENTERED. Ring centers are spread
 * around the usable arc (all but a wedge for the NE labels) but permuted by a
 * coprime stride, so adjacent rings don't sit next to each other — their runs
 * land on scattered, far-apart arcs.
 */
function ringCenterAngle(ringIdx: number): number {
  const usable = Math.PI * 2 - 2 * LABEL_WEDGE_HALF;
  const start = LABEL_SPOKE_ANGLE + LABEL_WEDGE_HALF;
  const scattered = (ringIdx * RING_SCATTER_STRIDE) % RING_COUNT;
  // +0.5 centers the cluster in its cell.
  return start + ((scattered + 0.5) / RING_COUNT) * usable;
}

/**
 * Angle of the nth block on a given ring. Each ring's blocks form ONE compact
 * sequential run (adjacent hexagons at a constant arc-length gap), centered on
 * the ring's scattered center angle. The runs are scattered around the circle
 * (see ringCenterAngle) rather than laid out in ring order, so relations between
 * blocks on different rings cross the middle. Deterministic and stable.
 */
export function blockAngle(ringIdx: number, index: number, total: number): number {
  const center = ringCenterAngle(ringIdx);
  if (total <= 1) return center;
  const r = RING_RADII[ringIdx];

  // Keep every run a compact cluster: cap its total arc well under a full turn
  // (a big count on a small inner ring packs a touch tighter rather than
  // wrapping the whole ring). Constant pixel gap otherwise.
  const usableStart = LABEL_SPOKE_ANGLE + LABEL_WEDGE_HALF;
  const usableSpan = Math.PI * 2 - 2 * LABEL_WEDGE_HALF;
  const maxRunArc = Math.min(usableSpan, Math.PI * 1.1); // ≤ ~200°
  const step = Math.min(BLOCK_ARC_GAP / r, maxRunArc / (total - 1));
  const runArc = (total - 1) * step;

  // Centered run around the scattered center, then clamp the whole run inside
  // the usable arc so it never crosses the label wedge.
  let runStart = center - runArc / 2;
  const norm = (a: number) => ((a - usableStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const startFrac = norm(runStart); // 0..2π from the usable-arc start
  const maxFrac = usableSpan - runArc;
  if (startFrac > maxFrac) {
    // Run would spill past the usable arc's end (into the wedge) — pull it back.
    runStart = usableStart + Math.min(startFrac, maxFrac);
    // If the center sat inside the wedge itself, clamp to the near edge.
    if (startFrac > usableSpan) runStart = usableStart;
  }
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
