import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Map-style pan/zoom for an SVG canvas. The view is a single transform
 * `translate(tx, ty) scale(scale)` applied to a `<g>` that wraps all content;
 * the `<svg>` itself has NO viewBox, so SVG user units are CSS pixels by
 * definition. Panning and zooming move only the group — so text stays crisp and
 * the math stays in one coordinate space.
 *
 * The absence of a viewBox is load-bearing, not an omission. A viewBox maps user
 * units onto the element box, so whenever the element resizes the browser
 * rescales the entire scene to fit — a second zoom this hook cannot see, which
 * made the map shrink when a panel opened while the readout still said 100%.
 * Sizing it from React state only moves the problem: state lags the DOM by a
 * render, so the frame a panel opens would map the old, wider box onto the new,
 * narrower element. With no viewBox the mapping is fixed by layout and cannot go
 * stale; the view's world bounds reach this hook through `setWorldBounds`
 * instead, where they are used to compute the baseline fit.
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

/** px per world unit that frames `w` inside `vp`. The baseline "100%". */
function fitRatio(
  vp: { width: number; height: number },
  w: { width: number; height: number }
): number {
  return Math.min(vp.width / w.width, vp.height / w.height) * FIT_ZOOM;
}

/**
 * The baseline fit: the view's world bounds framed in the viewport, centered.
 *
 * `latched` is the latched px-per-world-unit factor, or null before the first
 * committed measurement. It is LATCHED on that first measurement and then held
 * fixed, which is what makes 100% mean a stable amount of zoom. If it were
 * recomputed from the live viewport, opening a panel would shrink the baseline —
 * and so the rendered content — while `scale` still read 100%. Only the
 * centering offsets track the current viewport.
 *
 * Falling back to the live ratio when `latched` is null keeps this correct on the
 * render that first sees a viewport, before the latching effect has run.
 *
 * `ready` is false until both the viewport and the world bounds are known.
 * Callers must not paint before then: any transform derived from a missing input
 * is wrong, and painting it is what caused the jump-then-snap.
 *
 * A pure module-level function taking `latched` as a parameter, rather than a
 * closure reading the latch ref — so calling it during render reads no ref.
 */
function computeBaseFit(
  vp: { width: number; height: number },
  w: { minX: number; minY: number; width: number; height: number } | null,
  latched: number | null
): { k: number; tx: number; ty: number; ready: boolean } {
  if (!w || vp.width === 0 || vp.height === 0 || w.width <= 0 || w.height <= 0) {
    return { k: latched ?? 1, tx: 0, ty: 0, ready: false };
  }
  const k = latched ?? fitRatio(vp, w);
  return {
    k,
    tx: vp.width / 2 - (w.minX + w.width / 2) * k,
    ty: vp.height / 2 - (w.minY + w.height / 2) * k,
    ready: true,
  };
}

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
 * Because it is identical on both sides it cancels out, and the result reduces
 * to `tx + (next.width − prev.width) / 2`: a pure half-the-size-change pan. It
 * stays an explicit parameter to document that invariant and to reject a
 * degenerate scale rather than propagate it.
 *
 * Exported for tests; the hook calls it from the measuring layout effect and
 * from the ResizeObserver fallback.
 */
export function recenterOnResize(
  view: ViewTransform,
  prev: { width: number; height: number },
  next: { width: number; height: number },
  k: number
): ViewTransform {
  // Non-finite covers the pre-measurement window, where k can arrive as NaN
  // (0/0 from an unmeasured ratio) or Infinity. Either would produce NaN
  // offsets and blank the canvas, so hold the view instead.
  if (!Number.isFinite(k) || k === 0) return view;
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

  // The latched baseline `k` that `computeBaseFit` (above) is documented around.
  // It lives in BOTH a ref and state, deliberately.
  //
  // The ref is the commit-phase source of truth: `latchBaseline` and
  // `setWorldBounds` both write it from effects, and the measuring layout effect
  // reads it back in the same commit — a state value would still be one render
  // behind there. The state mirror exists only so RENDER has something pure to
  // read, and it is kept in step by `latchBaseline` writing both at once.
  const latchedK = useRef<number | null>(null);
  const [latchedKState, setLatchedKState] = useState<number | null>(null);

  /**
   * Establish the baseline from a COMMITTED measurement. Called only from the
   * measuring layout effect, so the latch is never set during render — a render
   * React throws away can no longer pin the zoom baseline permanently.
   */
  const latchBaseline = useCallback(
    (
      vp: { width: number; height: number },
      w: { minX: number; minY: number; width: number; height: number } | null
    ) => {
      if (latchedK.current !== null) return;
      if (!w || vp.width === 0 || vp.height === 0 || w.width <= 0 || w.height <= 0) return;
      latchedK.current = fitRatio(vp, w);
      setLatchedKState(latchedK.current);
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
  //
  // Reads the `viewport` and latch STATE, not the refs. Each pair is written
  // together (see the measuring layout effect), so they can only disagree between
  // that effect and the render it schedules — and because it is a *layout*
  // effect, that render lands before the browser paints. The size a pristine view
  // frames itself against is therefore always the current one by the time
  // anything is visible, and reading state keeps this render pure.
  const fit = useMemo(
    () => computeBaseFit(viewport, world, latchedKState),
    [viewport, world, latchedKState]
  );
  // Memoized so it is referentially stable across renders that change nothing
  // about it — the ref-sync layout effect below depends on it.
  const effectiveView: ViewTransform = useMemo(
    () => (pristine ? { tx: fit.tx, ty: fit.ty, scale: 1 } : view),
    [pristine, fit, view]
  );

  const setWorldBounds = useCallback(
    (rect: { minX: number; minY: number; width: number; height: number } | null) => {
      // Compared here, OUTSIDE the state updater. The updater must stay pure:
      // React may call it more than once (StrictMode) or discard the render it
      // belongs to, and clearing the latch from inside would then drop the
      // baseline for a render that never commits.
      const cur = worldRefForFit.current;
      if (
        rect &&
        cur &&
        cur.minX === rect.minX &&
        cur.minY === rect.minY &&
        cur.width === rect.width &&
        cur.height === rect.height
      ) {
        return; // unchanged — don't churn state every render
      }
      // New world bounds mean a new baseline: re-latch against them, so each
      // view frames itself rather than inheriting the previous view's zoom.
      // Safe outside the updater because this runs in a layout effect (commit
      // phase), and the very next render re-derives the fit from the new bounds.
      latchedK.current = null;
      worldRefForFit.current = rect;
      setWorld(rect);
    },
    []
  );

  // Live view kept in refs so drags and the measuring layout effect can read the
  // current values without re-binding listeners.
  //
  // Synced in a LAYOUT effect, and this one must stay declared ABOVE the
  // measuring layout effect: effects run in declaration order, so this ordering
  // is what guarantees the measuring effect reads the current view rather than
  // the previous render's.
  //
  // A passive `useEffect` here would be wrong — it runs *after* paint, so on the
  // commit where a panel opens the measuring effect would recenter from the old
  // view, paint that, and only correct itself on the next render: the flicker
  // this hook exists to avoid. A layout effect runs in the commit phase, before
  // paint, so every reader below still sees the current value. Every consumer of
  // these refs (the effects, the pointer handlers, `commitView`) runs after
  // commit, so none of them needs the value during render.
  const viewRef = useRef(effectiveView);
  const pristineRef = useRef(pristine);
  useLayoutEffect(() => {
    viewRef.current = effectiveView;
    pristineRef.current = pristine;
  }, [effectiveView, pristine]);
  // Drag state for the measuring layout effect. A ref, not the `dragging`
  // state: the pointer handlers set this at gesture start, so it is already
  // true on the very first pointermove commit — whereas the state lands a
  // render later, leaking the reflow this guard exists to prevent.
  const draggingRef = useRef(false);
  // World bounds for the stable callbacks (fitBounds), which must not be
  // recreated on every bounds change but still need the current value.
  //
  // NOT synced from `world` during render: `setWorldBounds` writes this ref in
  // the commit phase and is the one place bounds change, so it is always the
  // fresher of the two. Re-assigning from state here would roll it back to the
  // previous value for the render between the write and the state landing.
  const worldRefForFit = useRef(world);

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
  // Deliberately has no dependency array: the element can be resized by a commit
  // that changes nothing this hook owns (a sibling panel mounting), so there is
  // no dependency that would catch it. Running on every commit IS the trigger.
  // The missing dep array is the mechanism, not an oversight, and the
  // unchanged-size guard below is what keeps `setViewport` from looping — so the
  // exhaustive-deps warning is suppressed rather than satisfied.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    // `getBoundingClientRect` forces a synchronous layout. With no deps this
    // runs on every commit, and a pan calls setView on every pointermove — so
    // without this guard each drag frame would pay a forced reflow. A drag can
    // only translate the content; it never resizes the element, so there is
    // nothing to measure. The ResizeObserver still covers the case of the window
    // being resized mid-drag.
    if (draggingRef.current) return;
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const next = { width: box.width, height: box.height };
    const prev = viewportRef.current;
    // Latch BEFORE the unchanged-size guard below. The two inputs to the
    // baseline arrive independently: on the commit where world bounds land, the
    // element has usually already been measured, so the size is unchanged and
    // that guard returns early — latching after it would leave the baseline
    // unset until something happened to resize the canvas.
    latchBaseline(next, worldRefForFit.current);
    if (prev.width === next.width && prev.height === next.height) return;
    viewportRef.current = next;
    setViewport(next);
    // A resize the user didn't ask for (a panel opening) must preserve the
    // center; the very first measurement has no previous center to preserve.
    // A pristine view re-derives from the baseline fit and re-centers itself.
    if (prev.width > 0 && prev.height > 0 && !pristineRef.current) {
      const v = viewRef.current;
      const recentered = recenterOnResize(
        v,
        prev,
        next,
        computeBaseFit(next, world, latchedK.current).k * v.scale
      );
      viewRef.current = recentered;
      setView(recentered);
    }
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      // Border box, to match the layout effect's getBoundingClientRect. Mixing
      // box models would make the two sources disagree by exactly the border +
      // padding the moment any is added to the <svg>: both "size unchanged"
      // short-circuits would then miss and the paths would recenter against
      // each other every commit. `contentRect` is the content box, so it is
      // only safe while that padding is zero — not a property to rely on.
      const entry = entries[0];
      if (!entry) return;
      const borderBox = entry.borderBoxSize?.[0];
      const box = borderBox
        ? { width: borderBox.inlineSize, height: borderBox.blockSize }
        : el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
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
      setView((v) =>
        recenterOnResize(v, prev, next, computeBaseFit(next, world, latchedK.current).k * v.scale)
      );
    });

    ro.observe(el);
    return () => ro.disconnect();
    // Re-observes when the SVG element is swapped (view switch) or the world
    // bounds change, since both change what the baseline fit means.
  }, [world, resetKey]);

  /**
   * Map a client (mouse) point into the SVG's own coordinate space. With no
   * viewBox, user units ARE CSS pixels, so subtracting the element's origin is
   * exact — no scale factor is involved. The result is the space the pan/zoom
   * transform group is positioned in.
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
        draggingRef.current = true;
        setDragging(true);
        node?.setPointerCapture(pointerId);
      }
      // There is no viewBox, so client-space deltas are already transform units
      // — panning tracks the cursor exactly 1:1, with no conversion.
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
      draggingRef.current = false;
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
   * Frame a world-space rectangle (in the view's own world coordinates) within the
   * visible canvas: scale so it fits, then translate so its center sits at the
   * center of the visible area. `padding` (CSS px) is the breathing room
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

      // Everything here is in CSS px: with no viewBox, user units are pixels,
      // so padding and insetTop need no unit conversion.
      const padding = opts?.padding ?? 40;
      const insetTop = opts?.insetTop ?? 0;

      const availW = vp.width - padding * 2;
      const availH = vp.height - insetTop - padding * 2;
      if (availW <= 0 || availH <= 0) return;

      // Absolute px-per-world-unit needed to fit the rect, expressed as a
      // multiple of the baseline fit so it round-trips through `scale`.
      const base = computeBaseFit(vp, worldRefForFit.current, latchedK.current);
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
    []
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
