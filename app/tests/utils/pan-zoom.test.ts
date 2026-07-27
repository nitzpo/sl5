import { describe, it, expect } from "vitest";
import { recenterOnResize, type ViewTransform } from "../../src/utils/use-viewbox-pan-zoom";

/**
 * The contract for what happens when a panel opens and the canvas shrinks:
 * the map PANS so the old center stays centered, and the zoom never changes.
 * Before this, the SVG viewBox was the view's world bounds with
 * preserveAspectRatio, so shrinking the element silently rescaled everything —
 * the map got smaller while the readout still said 100%.
 */

/** Screen position of a world point under a view. */
function project(v: ViewTransform, k: number, wx: number, wy: number) {
  return { x: v.tx + wx * k, y: v.ty + wy * k };
}

/** World point currently under the center of a viewport. */
function centerWorld(v: ViewTransform, k: number, vp: { width: number; height: number }) {
  return { wx: (vp.width / 2 - v.tx) / k, wy: (vp.height / 2 - v.ty) / k };
}

describe("recenterOnResize", () => {
  const k = 2; // px per world unit, latched
  const view: ViewTransform = { tx: 120, ty: 80, scale: 1 };

  it("moves the old center to the new center", () => {
    const prev = { width: 1000, height: 600 };
    const next = { width: 700, height: 600 }; // right panel opened

    const before = centerWorld(view, k, prev);
    const after = recenterOnResize(view, prev, next, k);

    // That same world point now sits at the center of the smaller viewport.
    const pos = project(after, k, before.wx, before.wy);
    expect(pos.x).toBeCloseTo(next.width / 2, 10);
    expect(pos.y).toBeCloseTo(next.height / 2, 10);
  });

  it("never changes the zoom", () => {
    const prev = { width: 1000, height: 600 };
    const next = { width: 700, height: 420 };
    // Both dimensions shrank; scale must survive untouched, since the whole
    // complaint was "zoom stays 100% but the view actually becomes smaller".
    expect(recenterOnResize(view, prev, next, k).scale).toBe(view.scale);
  });

  it("pans by exactly half the size change", () => {
    // A pure translation: shrinking the width by 300px moves content left by
    // 150px, which is what keeps the midpoint fixed.
    const prev = { width: 1000, height: 600 };
    const next = { width: 700, height: 500 };
    const after = recenterOnResize(view, prev, next, k);
    expect(after.tx).toBeCloseTo(view.tx - 150, 10);
    expect(after.ty).toBeCloseTo(view.ty - 50, 10);
  });

  it("is symmetric — reopening restores the original view", () => {
    const big = { width: 1000, height: 600 };
    const small = { width: 700, height: 600 };
    const closed = recenterOnResize(view, big, small, k);
    const reopened = recenterOnResize(closed, small, big, k);
    expect(reopened.tx).toBeCloseTo(view.tx, 10);
    expect(reopened.ty).toBeCloseTo(view.ty, 10);
  });

  it("holds the center at any zoom level", () => {
    const prev = { width: 1200, height: 800 };
    const next = { width: 1200, height: 500 }; // bottom panel opened
    for (const zoom of [0.4, 1, 2.5]) {
      const kz = k * zoom;
      const v = { ...view, scale: zoom };
      const before = centerWorld(v, kz, prev);
      const pos = project(recenterOnResize(v, prev, next, kz), kz, before.wx, before.wy);
      expect(pos.y).toBeCloseTo(next.height / 2, 10);
    }
  });

  it("leaves the view alone when k is degenerate", () => {
    // Guards the pre-measurement window, where a bad k would produce NaN
    // offsets and blank the canvas.
    const v = recenterOnResize(view, { width: 100, height: 100 }, { width: 50, height: 50 }, 0);
    expect(v).toEqual(view);
  });
});
