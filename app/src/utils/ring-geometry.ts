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

export const RING_CENTER = { x: 310, y: 310 };
export const RING_RADII = [50, 82, 114, 146, 180, 214, 248, 282];
export const RING_BLOCK_SIZE = 16;
export const RING_SVG_SIZE = 620;

export function resolveLayer(raw: string): LayerId | null {
  if ((LAYER_ORDER as readonly string[]).includes(raw)) return raw as LayerId;
  const mapped = LAYER_ALIAS_MAP[raw];
  if (mapped && (LAYER_ORDER as readonly string[]).includes(mapped)) return mapped as LayerId;
  return null;
}

export function blockAngle(index: number, total: number, ringIdx: number): number {
  const base = (index / total) * Math.PI * 2;
  const offset = (ringIdx * Math.PI) / 13;
  return base + offset - Math.PI / 2;
}

export function blockPositionOnRing(
  ringIdx: number,
  blockIdx: number,
  totalOnRing: number
): { x: number; y: number } {
  const angle = blockAngle(blockIdx, totalOnRing, ringIdx);
  const r = RING_RADII[ringIdx];
  return {
    x: RING_CENTER.x + r * Math.cos(angle),
    y: RING_CENTER.y + r * Math.sin(angle),
  };
}
