import type { BlockState, DefenseType } from "../../engine/types";

/**
 * Defense type is shown by SHAPE, never by colour:
 *   hard stop     → a solid bar / solid hexagon edge
 *   probabilistic → a perforated bar / dotted edge
 *   hybrid        → split: solid top, perforated bottom / half and half
 * State is shown by FILL: not started (empty outline), investing (a tip),
 * implementing (the lower third), deployed (full), mature (full + an inner
 * hairline).
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The rects of a vertical type bar of size w × h at (x, y). */
export function typeBarRects(type: DefenseType, x: number, y: number, w: number, h: number): Rect[] {
  if (type === "hard_stop") return [{ x, y, width: w, height: h }];
  const gap = Math.max(2, h * 0.09);
  if (type === "probabilistic") {
    const n = h >= 22 ? 4 : 3;
    const cell = (h - gap * (n - 1)) / n;
    return Array.from({ length: n }, (_, k) => ({ x, y: y + k * (cell + gap), width: w, height: cell }));
  }
  // hybrid: solid top half, two perforations below
  const top = h * 0.5;
  const cell = (h - top - gap * 2) / 2;
  return [
    { x, y, width: w, height: top },
    { x, y: y + top + gap, width: w, height: cell },
    { x, y: y + top + gap * 2 + cell, width: w, height: cell },
  ];
}

/** Share of a hexagon's height (from the bottom) the state fills. */
export const STATE_FILL: Readonly<Record<BlockState, number>> = {
  not_started: 0,
  investing: 0.2,
  implementing: 0.38,
  deployed: 1,
  mature: 1,
};

/** The same for a matrix tile, which is short and wide: a tip and a band
 * that sit under the label, so a half-built block never cuts through its
 * own name. */
export const TILE_FILL: Readonly<Record<BlockState, number>> = {
  not_started: 0,
  investing: 0.11,
  implementing: 0.28,
  deployed: 1,
  mature: 1,
};

/** Pointy-top hexagon vertices. */
export function hexPoints(cx: number, cy: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function hexPath(cx: number, cy: number, r: number): string {
  return "M" + hexPoints(cx, cy, r).map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L") + " Z";
}

/** Open polyline over a run of hexagon vertices (for the hybrid split edge). */
export function hexRun(cx: number, cy: number, r: number, from: number, to: number): string {
  const p = hexPoints(cx, cy, r);
  const idx: number[] = [];
  for (let i = from; i <= to; i++) idx.push(i % 6);
  return "M" + idx.map((i) => `${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)}`).join(" L");
}

/** Catmull-Rom through points, as cubic Béziers. */
export function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
