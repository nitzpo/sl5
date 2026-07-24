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

/** Half-width of the wedge kept clear around the NE label spoke, so blocks never
 * sit on top of the diagonal ring labels. Everything else is usable. */
const LABEL_WEDGE_HALF = Math.PI / 12; // ±15°

export function resolveLayer(raw: string): LayerId | null {
  if ((LAYER_ORDER as readonly string[]).includes(raw)) return raw as LayerId;
  const mapped = LAYER_ALIAS_MAP[raw];
  if (mapped && (LAYER_ORDER as readonly string[]).includes(mapped)) return mapped as LayerId;
  return null;
}

/** Per-ring rotation (fraction of a slot) so rings don't align their block
 * angles — avoids radial "spokes" of stacked blocks across rings. */
const RING_PHASE = 0.37;

/**
 * Largest step < total that is coprime with `total`, so index*step (mod total)
 * visits every slot exactly once while jumping ~half the ring each time. That
 * scatters consecutive indices to opposite sides.
 */
function scatterStride(total: number): number {
  if (total < 3) return 1;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  // Start near total/2 (biggest jump) and walk down to the first coprime step.
  for (let s = Math.floor(total / 2); s >= 1; s--) {
    if (gcd(s, total) === 1) return s;
  }
  return 1;
}

/**
 * Angle of the nth block on a given ring. Blocks fill EVENLY-spaced slots across
 * almost the whole ring (all but a small wedge kept clear for the NE labels), so
 * they never overlap or sit on a label. But the index→slot mapping is permuted by
 * a coprime stride, so successive block indices land on opposite sides — related
 * blocks (usually adjacent in the data) end up across the circle from each other
 * and their relation arcs cross the middle. Deterministic and stable.
 */
export function blockAngle(ringIdx: number, index: number, total: number): number {
  const usable = Math.PI * 2 - 2 * LABEL_WEDGE_HALF;
  const start = LABEL_SPOKE_ANGLE + LABEL_WEDGE_HALF;
  if (total <= 1) return start + usable / 2;
  // Permute which evenly-spaced slot this index occupies.
  const slot = (index * scatterStride(total)) % total;
  // Evenly space slots across the usable arc; +0.5 centers them in their cells,
  // and the per-ring phase offsets each ring so they don't align.
  const frac = (slot + 0.5 + ringIdx * RING_PHASE) / total;
  return start + (frac % 1) * usable;
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
