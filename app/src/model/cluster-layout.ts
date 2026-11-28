import type { Block, Category } from "../engine/types";
import { cellOrder } from "./catalogue-layout";

/**
 * The clusters view: each category a honeycomb, three above the model
 * weights and three below. Positions are in a fixed viewBox; the view scales
 * it to fit. Order inside a cluster is the matrix's fixed cell order, so a
 * block never moves when the posture changes.
 */
export const VIEW_W = 1140;
export const VIEW_H = 840;
/** Layout radius (spacing) and drawn radius of a hexagon. */
export const HEX_LAYOUT_R = 46;
export const HEX_R = 42;
const COL_STEP = Math.sqrt(3) * HEX_LAYOUT_R;
const ROW_STEP = 1.5 * HEX_LAYOUT_R;

export const WEIGHTS = { x: VIEW_W / 2, y: 420, r: 60 };

type Slot = { cx: number; labelY: number; firstRowY: number };
const TOP = { labelY: 30, firstRowY: 96 };
const BOTTOM = { labelY: 508, firstRowY: 574 };
/** Which category sits where: entry-heavy families face the outside world at
 * the top and bottom edges; machine and AI, which act nearer the weights,
 * take the right-hand slots. */
export const SLOTS: Record<Category, Slot> = {
  ai_specific: { cx: 190, ...TOP },
  network: { cx: 570, ...TOP },
  machine: { cx: 950, ...TOP },
  supply_chain: { cx: 190, ...BOTTOM },
  personnel: { cx: 570, ...BOTTOM },
  physical: { cx: 950, ...BOTTOM },
};

/** Columns per cluster: 3 or 4, whichever leaves fewer empty places (ties
 * go wide), and never more than four rows. */
export function clusterColumns(n: number): number {
  if (n <= 4) return Math.max(1, n);
  let best = 4;
  let bestEmpty = Infinity;
  for (const c of [3, 4]) {
    const rows = Math.ceil(n / c);
    if (rows > 4) continue;
    const empty = rows * c - n;
    if (empty < bestEmpty || (empty === bestEmpty && c > best)) {
      best = c;
      bestEmpty = empty;
    }
  }
  return best;
}

export interface ClusterLayout {
  pos: Map<string, { x: number; y: number }>;
  clusters: Array<{ category: Category; x0: number; labelY: number; count: number }>;
}

export function clusterLayout(blocks: Block[]): ClusterLayout {
  const pos = new Map<string, { x: number; y: number }>();
  const clusters: ClusterLayout["clusters"] = [];
  for (const [category, slot] of Object.entries(SLOTS) as [Category, Slot][]) {
    const members = blocks.filter((b) => b.category === category).sort(cellOrder);
    const cols = clusterColumns(members.length);
    const width = cols * COL_STEP + (members.length > cols ? COL_STEP / 2 : 0);
    const x0 = slot.cx - width / 2;
    members.forEach((b, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const inRow = Math.min(cols, members.length - row * cols);
      // A partial last row is centred under the full ones, by whole steps so
      // it keeps the honeycomb's alternating offset (a half step would put it
      // straight under the row above: 11 AI blocks did).
      const pad = Math.floor((cols - inRow) / 2) * COL_STEP;
      const offset = row % 2 === 1 ? COL_STEP / 2 : 0;
      pos.set(b.id, {
        x: x0 + COL_STEP / 2 + col * COL_STEP + offset + pad,
        y: slot.firstRowY + row * ROW_STEP,
      });
    });
    clusters.push({ category, x0: x0 + COL_STEP / 2 - HEX_R, labelY: slot.labelY, count: members.length });
  }
  return { pos, clusters };
}
