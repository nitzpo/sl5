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

export const RING_SVG_SIZE = 700;
export const RING_CENTER = { x: RING_SVG_SIZE / 2, y: RING_SVG_SIZE / 2 };
// Radii: the radial step (34) is >= the hex diameter, so blocks on adjacent
// rings can't collide even at the same angle; the inner radius is high enough
// that even the busiest ring holds a compact, non-overlapping run; the outer
// ring + hex still clears the viewBox.
export const RING_RADII = [76, 110, 144, 178, 212, 246, 280, 314];
export const RING_BLOCK_SIZE = 17;

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
  // Prefer the constant pixel gap; only if the run wouldn't fit the usable arc
  // does it pack tighter. (Capping the arc more aggressively would force inner
  // rings to overlap — a big count on a small ring genuinely needs most of the
  // arc to stay non-overlapping.)
  const step = Math.min(BLOCK_ARC_GAP / r, usableSpan / (total - 1));
  const runArc = (total - 1) * step;

  // Clamp the CENTER (as a fraction of the usable arc from its start) so the
  // whole run stays inside the usable arc — keeping the run centered on its
  // scattered center as closely as the arc allows, rather than snapping to an
  // edge. runArc ≤ usableSpan by construction, so [half, span−half] is valid.
  const norm = (a: number) => ((a - usableStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const half = runArc / 2;
  const centerFrac = Math.max(half, Math.min(usableSpan - half, norm(center)));
  const runStart = usableStart + centerFrac - half;
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
