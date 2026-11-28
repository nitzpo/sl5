import type { Block, Category } from "../engine/types";

export const HEX_WIDTH = 52;
export const HEX_HEIGHT = 46;
export const HEX_MARGIN = 4;

export const CATEGORY_ORDER: Category[] = [
  "network",
  "machine",
  "physical",
  "personnel",
  "supply_chain",
  "ai_specific",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  network: "Network",
  machine: "Machine",
  physical: "Physical",
  personnel: "Personnel",
  supply_chain: "Supply Chain",
  ai_specific: "AI-Specific",
};

// Short labels for display below hex (max ~8 chars)
export const BLOCK_SHORT_LABELS: Record<string, string> = {
  "NET-01": "Air Gap",
  "NET-02": "Enclave",
  "NET-03": "Dual Enc",
  "NET-04": "BW Limit",
  "NET-05": "Diodes",
  "NET-06": "PDS",
  "NET-07": "Link Enc",
  "IAM-01": "Identity",
  "DET-01": "SOC/IR",
  "DEC-01": "Decoys",
  "END-01": "Patching",
  "CFG-01": "Gold Img",
  "HW-01": "Root Trust",
  "HW-02": "Mem Isol",
  "HW-03": "Intercon",
  "HW-04": "Tamper",
  "HW-05": "Rack Enc",
  "HW-06": "Exec Int",
  "HW-07": "TEE",
  "HW-09": "Boot",
  "KEY-01": "Wt Keys",
  "CUS-01": "Custody",
  "ACA-01": "Verif AC",
  "SRV-01": "Wt API",
  "PHY-01": "SCIF",
  "PHY-02": "TEMPEST",
  "PHY-03": "Mantrap",
  "PHY-04": "IDS",
  "PHY-06": "Zones",
  "PHY-07": "Inspect",
  "PHY-08": "No Ports",
  "PER-01": "SenL",
  "PER-02": "TPI",
  "PER-03": "Behav",
  "PER-04": "Vetting",
  "PER-06": "Dual Auth",
  "PER-08": "No Remote",
  "PER-09": "Duress",
  "GOV-01": "Gov Vet",
  "SC-01": "Diverse",
  "SC-03": "Content",
  "SC-04": "Flow-Down",
  "SC-07": "Custom",
  "SC-08": "HW Prov",
  "SW-01": "ML Supply",
  "AI-01": "Insider",
  "AI-02": "Multi-Mdl",
  "AI-04": "Quotas",
  "AI-05": "Drills",
  "AI-06": "Kill-Sw",
  "AI-07": "Outbound",
  "AI-08": "Inbound",
  "AI-09": "Sandbox",
  "AI-10": "AI Ctrl",
  "AI-11": "No Self",
  "AI-12": "Lineage",
  // Future-capability blocks (counted only with the world toggle on).
  "FUT-01": "Ver HW",
  "FUT-02": "Cleared",
  "FUT-03": "Ver Stack",
  "FUT-04": "Sov Site",
  "FUT-05": "AI Mon",
};

const ROW_HEIGHT = 70; // more space for labels below hex

export function hexPosition(
  category: Category,
  indexInCategory: number
): { x: number; y: number } {
  const row = CATEGORY_ORDER.indexOf(category);
  const col = indexInCategory;
  const cellWidth = HEX_WIDTH + HEX_MARGIN;

  return {
    x: col * cellWidth + HEX_WIDTH / 2 + 70,
    y: row * ROW_HEIGHT + HEX_HEIGHT / 2 + 30,
  };
}

/** Grid position of a block (category row + index within category). */
export function blockGridPosition(
  blocks: Block[],
  block: Block
): { x: number; y: number } {
  const catBlocks = blocks.filter((b) => b.category === block.category);
  return hexPosition(block.category, catBlocks.indexOf(block));
}

export function hexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push(
      `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`
    );
  }
  return points.join(" ");
}

export function gridDimensions(maxBlocksInCategory: number) {
  const width =
    maxBlocksInCategory * (HEX_WIDTH + HEX_MARGIN) + HEX_WIDTH + 90;
  const height = CATEGORY_ORDER.length * ROW_HEIGHT + 50;
  return { width, height };
}
