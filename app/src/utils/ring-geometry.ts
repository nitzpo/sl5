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

export function resolveLayer(raw: string): LayerId | null {
  if ((LAYER_ORDER as readonly string[]).includes(raw)) return raw as LayerId;
  const mapped = LAYER_ALIAS_MAP[raw];
  if (mapped && (LAYER_ORDER as readonly string[]).includes(mapped)) return mapped as LayerId;
  return null;
}

export function blockAngle(index: number, total: number): number {
  // Keep a wedge clear around the label spoke; distribute blocks evenly over
  // the rest. No per-ring rotation jitter — stable, comparable positions.
  const excludeHalf = Math.PI / 10;
  const availableArc = Math.PI * 2 - excludeHalf * 2;
  const startAngle = LABEL_SPOKE_ANGLE + excludeHalf;
  const pos = ((index + 0.5) / total) * availableArc;
  return startAngle + pos;
}

export function blockPositionOnRing(
  ringIdx: number,
  blockIdx: number,
  totalOnRing: number
): { x: number; y: number } {
  const angle = blockAngle(blockIdx, totalOnRing);
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
