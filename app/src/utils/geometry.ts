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
  "HW-01": "Root Trust",
  "HW-02": "Mem Isol",
  "HW-03": "Intercon",
  "HW-04": "Tamper",
  "HW-05": "Rack Enc",
  "HW-06": "Exec Int",
  "HW-07": "TEE",
  "HW-09": "Boot",
  "HW-10": "Composit",
  "PHY-01": "SCIF",
  "PHY-02": "TEMPEST",
  "PHY-03": "Mantrap",
  "PHY-04": "IDS",
  "PHY-05": "No WiFi",
  "PHY-06": "Zones",
  "PHY-07": "Inspect",
  "PER-01": "SenL",
  "PER-02": "TPI",
  "PER-03": "Behav",
  "PER-04": "Vetting",
  "PER-05": "Post-Emp",
  "PER-06": "Dual Auth",
  "PER-07": "Cameras",
  "PER-08": "No Remote",
  "PER-09": "Duress",
  "SC-01": "Diverse",
  "SC-02": "Inspect",
  "SC-03": "Content",
  "SC-04": "Flow-Down",
  "SC-05": "Counter",
  "SC-06": "Provnce",
  "SC-07": "Custom",
  "AI-01": "Insider",
  "AI-02": "Multi-Mdl",
  "AI-03": "Adv Rob",
  "AI-04": "Quotas",
  "AI-05": "Chaos",
  "AI-06": "Kill-Sw",
  "AI-07": "Outbound",
  "AI-08": "Inbound",
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
