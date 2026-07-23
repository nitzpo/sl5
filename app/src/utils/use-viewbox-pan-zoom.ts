import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Map-style pan/zoom for an SVG canvas. The view is a single transform
 * `translate(tx, ty) scale(scale)` applied to a `<g>` that wraps all content;
 * the `<svg>` itself keeps a fixed viewBox equal to its pixel size. Panning and
 * zooming move the group, never the viewBox — so text stays crisp and the math
 * stays in one coordinate space.
 *
 * Unlike a scroll-container pan, this works at ANY zoom (even fully zoomed out)
 * and lets you drag the content past its own edges (there is no scroll range to
 * clamp against) — the Google-Maps feel.
 *
 *   - wheel  → zoom toward the cursor (the point under the pointer stays put)
 *   - drag on empty canvas → pan (a press only becomes a pan past DRAG_THRESHOLD,
 *     so a plain click still lands on whatever hex/background was under it)
 *   - presses that start on an interactive target (hex cell, button) never pan
 */

const DRAG_THRESHOLD = 4; // px before a press counts as a drag
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const ZOOM_STEP = 1.2; // multiplicative step for the +/- buttons

/** Elements whose presses should never start a pan (they own the click). */
function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  // A hex cell is an SVG <g class="cursor-pointer">; buttons/links own their
  // clicks too. Pan only starts from inert canvas space (the background rect),
  // never from something the user meant to click.
  return !!el.closest(
    "button, a, input, [role='button'], .cursor-pointer, [data-no-pan]"
  );
}

function clampScale(s: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

export interface ViewTransform {
  tx: number;
  ty: number;
  scale: number;
}

export interface PanZoomState {
  /** Attach to the <svg> element (used to map client → SVG coordinates). */
  ref: React.RefObject<SVGSVGElement | null>;
  /** The current transform, as an SVG `transform` attribute string. */
  transform: string;
  /** Current scale factor (for a "100%" readout). */
  scale: number;
  /** True while an active pan drag is in progress. */
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

/**
 * @param resetKey when this value changes (e.g. the active view mode), the
 * transform resets to identity so switching views starts centered, not wherever
 * the previous view was panned to.
 */
export function useViewBoxPanZoom(resetKey?: unknown): PanZoomState {
  const ref = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<ViewTransform>({ tx: 0, ty: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);

  // Reset to identity when the resetKey changes (e.g. switching views), using
  // React's "adjust state during render" pattern (state, not a ref, so the
  // linter is happy) — happens before paint without a cascading effect.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setView({ tx: 0, ty: 0, scale: 1 });
  }

  // Live view kept in a ref so a drag can compute deltas against the press-time
  // value without re-binding listeners. Synced in an effect (not during render).
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  /**
   * Map a client (mouse) point to SVG viewBox coordinates — the space the
   * transform group lives in. Uses the SVG's own CTM so it works regardless of
   * how the viewBox is scaled to fit the element (each view sets its own
   * viewBox = its world bounds), then removes the current pan/zoom transform so
   * we get the point in untransformed content space.
   */
  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el || typeof el.getScreenCTM !== "function") {
      return { x: 0, y: 0 };
    }
    const ctm = el.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    // client → viewBox space (before our translate/scale group).
    const vx = (clientX - ctm.e) / ctm.a;
    const vy = (clientY - ctm.f) / ctm.d;
    return { x: vx, y: vy };
  }, []);

  /** Convert a client-space delta into viewBox-space delta (for panning). */
  const clientDeltaToSvg = useCallback((dx: number, dy: number) => {
    const el = ref.current;
    const ctm = el?.getScreenCTM?.();
    if (!ctm) return { dx, dy };
    return { dx: dx / ctm.a, dy: dy / ctm.d };
  }, []);

  const zoomAt = useCallback(
    (svgX: number, svgY: number, factor: number) => {
      setView((v) => {
        const nextScale = clampScale(v.scale * factor);
        const applied = nextScale / v.scale; // may differ if clamped
        // Keep the point (svgX, svgY) fixed on screen while scaling:
        //   screen = tx + world * scale  →  world = (screen - tx) / scale
        // solve for tx' so that world maps back to the same screen point.
        const tx = svgX - (svgX - v.tx) * applied;
        const ty = svgY - (svgY - v.ty) * applied;
        return { tx, ty, scale: nextScale };
      });
    },
    []
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const { x, y } = clientToSvg(e.clientX, e.clientY);
      // Trackpad pinch and mouse wheel both arrive as deltaY; normalize to a
      // gentle multiplicative zoom per notch.
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(x, y, factor);
    },
    [clientToSvg, zoomAt]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return; // left button only
    if (isInteractiveTarget(e.target)) return;

    const start = {
      clientX: e.clientX,
      clientY: e.clientY,
      tx: viewRef.current.tx,
      ty: viewRef.current.ty,
    };
    let active = false;
    const pointerId = e.pointerId;
    const node = ref.current;

    const onMove = (ev: PointerEvent) => {
      const dxClient = ev.clientX - start.clientX;
      const dyClient = ev.clientY - start.clientY;
      if (!active && Math.hypot(dxClient, dyClient) < DRAG_THRESHOLD) return;
      if (!active) {
        active = true;
        setDragging(true);
        node?.setPointerCapture(pointerId);
      }
      // Convert the client-space drag to viewBox units so panning tracks the
      // cursor 1:1 on screen no matter how the viewBox is fit to the element.
      const { dx, dy } = clientDeltaToSvg(dxClient, dyClient);
      setView((v) => ({ ...v, tx: start.tx + dx, ty: start.ty + dy }));
    };

    const onUp = () => {
      if (active && node?.hasPointerCapture(pointerId)) {
        node.releasePointerCapture(pointerId);
      }
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [clientDeltaToSvg]);

  /** Zoom the +/- buttons apply, centered on the canvas middle. */
  const zoomByStep = useCallback(
    (factor: number) => {
      const el = ref.current;
      const rect = el?.getBoundingClientRect();
      if (!rect) return;
      const { x, y } = clientToSvg(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
      zoomAt(x, y, factor);
    },
    [clientToSvg, zoomAt]
  );

  const zoomIn = useCallback(() => zoomByStep(ZOOM_STEP), [zoomByStep]);
  const zoomOut = useCallback(() => zoomByStep(1 / ZOOM_STEP), [zoomByStep]);
  const reset = useCallback(() => setView({ tx: 0, ty: 0, scale: 1 }), []);

  return {
    ref,
    transform: `translate(${view.tx} ${view.ty}) scale(${view.scale})`,
    scale: view.scale,
    dragging,
    onPointerDown,
    onWheel,
    zoomIn,
    zoomOut,
    reset,
  };
}
