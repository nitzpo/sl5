import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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

/**
 * What "100%" means. The canvas fits each view's world bounds into the viewport
 * on load; that fit is the baseline every scale is reported against, so 100% is
 * "the whole diagram, framed" rather than an arbitrary 1:1 pixel mapping. The
 * factor below trims that baseline — the honest fit read slightly too large,
 * with content crowding the viewport edges.
 */
const FIT_ZOOM = 0.88;

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

/**
 * Re-anchor a pan so the world point at the center of the OLD visible area sits
 * at the center of the NEW one, at unchanged zoom. This is the Google-Maps
 * behavior when a panel opens: the map pans, it never rescales.
 *
 * `k` is the absolute px-per-world-unit factor in force (baseline × scale) and
 * is deliberately the same on both sides — a viewport resize must not change it.
 * Exported for tests; the hook uses it on every ResizeObserver callback.
 */
export function recenterOnResize(
  view: ViewTransform,
  prev: { width: number; height: number },
  next: { width: number; height: number },
  k: number
): ViewTransform {
  if (k === 0) return view;
  const worldCX = (prev.width / 2 - view.tx) / k;
  const worldCY = (prev.height / 2 - view.ty) / k;
  return {
    ...view,
    tx: next.width / 2 - worldCX * k,
    ty: next.height / 2 - worldCY * k,
  };
}

export interface PanZoomState {
  /**
   * Attach to the <svg> element. A callback ref (not a RefObject) so the native
   * wheel listener attaches to whatever SVG is currently mounted and re-attaches
   * when the element is swapped (e.g. switching views mounts a new <svg>).
   */
  ref: (el: SVGSVGElement | null) => void;
  /**
   * Call with the view's world bounds whenever they are known/change. The hook
   * needs them to compute the baseline fit that "100%" is measured against.
   */
  setWorldBounds: (
    rect: { minX: number; minY: number; width: number; height: number } | null
  ) => void;
  /**
   * False until both the viewport and the view's world bounds have been
   * measured. Content must stay hidden until then — painting a transform built
   * from missing inputs is what makes the diagram appear off to one side and
   * then snap into place on the first interaction.
   */
  ready: boolean;
  /** The current transform, as an SVG `transform` attribute string. */
  transform: string;
  /** Current scale factor (for a "100%" readout). */
  scale: number;
  /** True while an active pan drag is in progress. */
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  /**
   * Returns true if this click immediately followed a pan drag and should be
   * ignored (a drag past DRAG_THRESHOLD still fires a synthetic click, which
   * would otherwise clear the selection). Call it at the top of the canvas's
   * background-click handler and bail when it returns true.
   */
  consumeClickAfterDrag: () => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  /** Frame a world-space rectangle within the visible canvas. */
  fitBounds: (
    rect: { minX: number; minY: number; width: number; height: number },
    opts?: { padding?: number; insetTop?: number }
  ) => void;
}

/**
 * @param resetKey when this value changes (e.g. the active view mode), the
 * transform resets to identity so switching views starts centered, not wherever
 * the previous view was panned to.
 */
export function useViewBoxPanZoom(resetKey?: unknown): PanZoomState {
  // Internal element ref for coordinate math (CTM reads, pointer handlers). The
  // exposed `ref` is a callback (see below) that keeps this in sync AND rebinds
  // the native wheel listener as the SVG mounts / is replaced.
  const ref = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);

  // The viewport in CSS px, tracked live. The <svg> has no viewBox, so SVG user
  // units are already CSS px; this size is only used to compute the fit.
  //
  // The ref is the fresher of the two: the measuring layout effect writes it
  // synchronously before paint, while the state update it schedules lands on the
  // next render. Rendering reads whichever is newer (see `liveViewport`).
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const viewportRef = useRef(viewport);

  // The active view's world bounds. STATE, not a ref: the baseline fit is
  // computed during render, so storing these in a ref meant the first paint
  // could read them as null (the child effect that reports them runs after the
  // parent renders) and fall back to an unscaled, unshifted transform — the
  // content rendered in raw world coordinates, jammed against the top-left,
  // until the next wheel event recomputed it.
  const [world, setWorld] = useState<{
    minX: number;
    minY: number;
    width: number;
    height: number;
  } | null>(null);

  /**
   * The baseline fit: the view's world bounds framed in the viewport, centered.
   *
   * `k` is LATCHED on the first real measurement and then held fixed, which is
   * what makes 100% mean a stable amount of zoom. If it were recomputed from the
   * live viewport, opening a panel would shrink the baseline — and so the
   * rendered content — while `scale` still read 100%, which is the exact bug
   * being fixed. Only the centering offsets track the current viewport.
   *
   * `ready` is false until both the viewport and the world bounds are known.
   * Callers must not paint before then: any transform derived from a missing
   * input is wrong, and painting it is what caused the jump-then-snap.
   */
  const latchedK = useRef<number | null>(null);
  const baseFit = useCallback(
    (
      vp: { width: number; height: number },
      w: { minX: number; minY: number; width: number; height: number } | null
    ) => {
      if (!w || vp.width === 0 || vp.height === 0 || w.width <= 0 || w.height <= 0) {
        return { k: latchedK.current ?? 1, tx: 0, ty: 0, ready: false };
      }
      if (latchedK.current === null) {
        latchedK.current = Math.min(vp.width / w.width, vp.height / w.height) * FIT_ZOOM;
      }
      const k = latchedK.current;
      return {
        k,
        tx: vp.width / 2 - (w.minX + w.width / 2) * k,
        ty: vp.height / 2 - (w.minY + w.height / 2) * k,
        ready: true,
      };
    },
    []
  );

  // `scale` is relative to the baseline fit; tx/ty are ABSOLUTE px offsets, so
  // the neutral view is the baseline's own translation, not (0, 0). `pristine`
  // marks a view the user hasn't touched yet, so it keeps re-deriving from the
  // baseline until the viewport and world bounds have both been measured.
  const [view, setView] = useState<ViewTransform>({ tx: 0, ty: 0, scale: 1 });
  const [pristine, setPristine] = useState(true);

  // Reset to the baseline fit when the resetKey changes (e.g. switching views),
  // using React's "adjust state during render" pattern (state, not a ref, so the
  // linter is happy) — happens before paint without a cascading effect.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setPristine(true);
  }

  // An untouched view tracks the baseline fit exactly: this is what centers the
  // content on first paint (once the ResizeObserver reports a real size) and
  // what re-centers it after a view switch.
  // Prefer the ref: on the render triggered by a resize it already holds the
  // measured size, so a pristine view frames itself against the CURRENT box
  // instead of the previous one. Falls back to state on the very first render,
  // before anything has been measured.
  const liveViewport = viewportRef.current.width > 0 ? viewportRef.current : viewport;
  const fit = baseFit(liveViewport, world);
  const effectiveView: ViewTransform = pristine
    ? { tx: fit.tx, ty: fit.ty, scale: 1 }
    : view;

  const setWorldBounds = useCallback(
    (rect: { minX: number; minY: number; width: number; height: number } | null) => {
      setWorld((cur) => {
        if (
          rect &&
          cur &&
          cur.minX === rect.minX &&
          cur.minY === rect.minY &&
          cur.width === rect.width &&
          cur.height === rect.height
        ) {
          return cur; // unchanged — don't churn state every render
        }
        // New world bounds mean a new baseline: re-latch against them, so each
        // view frames itself rather than inheriting the previous view's zoom.
        latchedK.current = null;
        return rect;
      });
    },
    []
  );

  // Live view kept in refs so drags and the measuring layout effect can read the
  // current values without re-binding listeners.
  //
  // These are assigned DURING RENDER, not in an effect. The measuring layout
  // effect below reads `pristineRef`/`viewRef`, and a passive `useEffect` runs
  // *after* paint — so syncing there handed the layout effect values that were
  // one render stale. On the commit where a panel opens it would recenter from
  // the old view, paint that, and only correct itself on the next render: the
  // flicker. Assigning during render keeps every reader on the current value.
  const viewRef = useRef(effectiveView);
  const pristineRef = useRef(pristine);
  // World bounds for the stable callbacks (fitBounds), which must not be
  // recreated on every bounds change but still need the current value.
  const worldRefForFit = useRef(world);
  viewRef.current = effectiveView;
  pristineRef.current = pristine;
  worldRefForFit.current = world;

  /**
   * Every gesture commits the current effective view into state first (so a
   * pristine view's baseline-derived position becomes the concrete starting
   * point) and then applies the change on top of it.
   */
  const commitView = useCallback(
    (fn: (v: ViewTransform) => ViewTransform) => {
      setPristine(false);
      setView(fn(viewRef.current));
    },
    []
  );

  /**
   * Keep the map still when the viewport resizes — opening a side or bottom
   * panel shrinks the canvas, and this is what makes that behave like Google
   * Maps: the zoom level does not change, and whatever was at the center of the
   * old visible area is panned to the center of the new one. Without this the
   * content would appear to jump (the old center drifts off toward the panel)
   * even though nothing about the transform changed.
   */
  // Measure synchronously, BEFORE the browser paints. The ResizeObserver's first
  // callback lands after a paint, so relying on it alone meant one frame drawn
  // at the wrong size — invisible on load (the layout effect below beats it) but
  // a visible flicker when a panel opened and changed the canvas width.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const next = { width: box.width, height: box.height };
    const prev = viewportRef.current;
    if (prev.width === next.width && prev.height === next.height) return;
    viewportRef.current = next;
    setViewport(next);
    // A resize the user didn't ask for (a panel opening) must preserve the
    // center; the very first measurement has no previous center to preserve.
    // A pristine view re-derives from the baseline fit and re-centers itself.
    if (prev.width > 0 && prev.height > 0 && !pristineRef.current) {
      const v = viewRef.current;
      const recentered = recenterOnResize(v, prev, next, baseFit(next, world).k * v.scale);
      viewRef.current = recentered;
      setView(recentered);
    }
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0 || box.height === 0) return;
      const next = { width: box.width, height: box.height };
      const prev = viewportRef.current;
      viewportRef.current = next;
      setViewport(next);

      if (prev.width === 0 || prev.height === 0) return; // first measure: nothing to preserve
      // Already handled. Panel opens are React commits, so the layout effect
      // above measured and recentered them BEFORE paint and left viewportRef at
      // the new size; this callback then arrives post-paint with nothing to do.
      // What reaches the code below is a resize React didn't cause — a window
      // resize or a zoom change — where this observer is the only signal.
      if (prev.width === next.width && prev.height === next.height) return;
      // A view the user hasn't touched re-derives from the baseline fit on its
      // own, which already re-centers it for the new size.
      if (pristineRef.current) return;

      // `k` is latched, so the zoom is untouched and this is a pure pan —
      // exactly what Google Maps does when a panel opens.
      setView((v) => recenterOnResize(v, prev, next, baseFit(next, world).k * v.scale));
    });

    ro.observe(el);
    return () => ro.disconnect();
    // Re-observes when the SVG element is swapped (view switch) or the world
    // bounds change, since both change what the baseline fit means.
  }, [baseFit, world, resetKey]);

  /**
   * Map a client (mouse) point into the SVG's own coordinate space — which is
   * now 1:1 with CSS pixels, because the viewBox is set to the element's pixel
   * size. So this is just "subtract the element's origin", and the result is
   * the space the pan/zoom transform group is positioned in.
   */
  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const zoomAt = useCallback(
    (svgX: number, svgY: number, factor: number) => {
      commitView((v) => {
        const nextScale = clampScale(v.scale * factor);
        const applied = nextScale / v.scale; // may differ if clamped
        // Keep the point (svgX, svgY) fixed on screen while scaling:
        //   screen = tx + world * k  →  world = (screen - tx) / k
        // solve for tx' so that world maps back to the same screen point. The
        // baseline k is common to both sides, so only the ratio matters here.
        return {
          tx: svgX - (svgX - v.tx) * applied,
          ty: svgY - (svgY - v.ty) * applied,
          scale: nextScale,
        };
      });
    },
    [commitView]
  );

  // Zoom-to-cursor via a NATIVE wheel listener with { passive: false }. React's
  // synthetic onWheel is passive, so e.preventDefault() there is a no-op and page
  // scroll would leak through during zoom (and warn). A native listener works.
  // Latest zoomAt/clientToSvg kept in a ref (synced in an effect, not during
  // render) so the handler always calls the current versions.
  const zoomAtRef = useRef(zoomAt);
  const clientToSvgRef = useRef(clientToSvg);
  useEffect(() => {
    zoomAtRef.current = zoomAt;
    clientToSvgRef.current = clientToSvg;
  }, [zoomAt, clientToSvg]);

  // Stable wheel handler (reads the refs above, so it never needs re-creating).
  const handleWheelRef = useRef((e: WheelEvent) => {
    e.preventDefault();
    const { x, y } = clientToSvgRef.current(e.clientX, e.clientY);
    // Trackpad pinch and mouse wheel both arrive as deltaY; normalize to a
    // gentle multiplicative zoom per notch.
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomAtRef.current(x, y, factor);
  });

  // Callback ref: React calls it with the element on mount and `null` on unmount
  // (and both, old→new, when the element is swapped). We bind the native wheel
  // listener to whatever <svg> is currently mounted — so wheel-zoom works on the
  // first render and keeps working after switching views replaces the SVG.
  const setRef = useCallback((el: SVGSVGElement | null) => {
    const prev = ref.current;
    if (prev) prev.removeEventListener("wheel", handleWheelRef.current);
    ref.current = el;
    if (el) el.addEventListener("wheel", handleWheelRef.current, { passive: false });
  }, []);

  // Set for one click after a real pan drag ends, so the trailing synthetic
  // click on the canvas doesn't clear the selection.
  const didDragRef = useRef(false);
  const consumeClickAfterDrag = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return true;
    }
    return false;
  }, []);

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
      // The viewBox is the element's pixel size, so a client-space drag is
      // already in transform units — panning tracks the cursor exactly 1:1.
      setPristine(false);
      setView((v) => ({ ...v, tx: start.tx + dxClient, ty: start.ty + dyClient }));
    };

    const onUp = () => {
      if (active && node?.hasPointerCapture(pointerId)) {
        node.releasePointerCapture(pointerId);
      }
      // Mark that a real drag happened so the trailing synthetic click is
      // swallowed by consumeClickAfterDrag instead of clearing the selection.
      if (active) didDragRef.current = true;
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

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
  // Back to the baseline fit — pristine again, so it re-derives from the
  // current viewport rather than freezing a stale centering.
  const reset = useCallback(() => setPristine(true), []);

  /**
   * Frame a world-space rectangle (in the SVG's viewBox coordinates) within the
   * visible canvas: scale so it fits, then translate so its center sits at the
   * center of the visible area. `padding` (viewBox units) is the breathing room
   * left around the rect; `insetTop` reserves space at the top of the viewport
   * (e.g. for the floating chain strip) so the framed content isn't hidden under
   * it.
   */
  const fitBounds = useCallback(
    (
      rect: { minX: number; minY: number; width: number; height: number },
      opts?: { padding?: number; insetTop?: number }
    ) => {
      const vp = viewportRef.current;
      if (rect.width <= 0 || rect.height <= 0) return;
      if (vp.width === 0 || vp.height === 0) return;

      // Everything here is in CSS px: the viewBox matches the element's pixel
      // size, so padding and insetTop need no unit conversion.
      const padding = opts?.padding ?? 40;
      const insetTop = opts?.insetTop ?? 0;

      const availW = vp.width - padding * 2;
      const availH = vp.height - insetTop - padding * 2;
      if (availW <= 0 || availH <= 0) return;

      // Absolute px-per-world-unit needed to fit the rect, expressed as a
      // multiple of the baseline fit so it round-trips through `scale`.
      const base = baseFit(vp, worldRefForFit.current);
      if (!base.ready || base.k === 0) return;
      const scale = clampScale(Math.min(availW / rect.width, availH / rect.height) / base.k);
      const k = base.k * scale;

      // Center of the available region, shifted down by the top inset so the
      // framed content isn't hidden under the floating chain strip.
      const availCX = vp.width / 2;
      const availCY = insetTop + (vp.height - insetTop) / 2;

      setPristine(false);
      setView({
        tx: availCX - (rect.minX + rect.width / 2) * k,
        ty: availCY - (rect.minY + rect.height / 2) * k,
        scale,
      });
    },
    [baseFit]
  );

  // `scale` stays the user-facing number (1 = "100%" = the framed fit), while
  // the group is actually drawn at fit.k × scale. tx/ty are absolute px, so the
  // transform is a plain translate+scale. Built from `effectiveView` so an
  // untouched view renders AT the baseline fit rather than at tx/ty = 0.
  const k = fit.k * effectiveView.scale;

  return {
    ref: setRef,
    setWorldBounds,
    // Not ready = viewport or world bounds not measured yet. Any transform we
    // could compute now would be wrong, so the canvas hides for that one frame
    // instead of painting content in raw world coordinates and snapping later.
    ready: fit.ready,
    transform: `translate(${effectiveView.tx} ${effectiveView.ty}) scale(${k})`,
    scale: effectiveView.scale,
    dragging,
    onPointerDown,
    consumeClickAfterDrag,
    zoomIn,
    zoomOut,
    reset,
    fitBounds,
  };
}
