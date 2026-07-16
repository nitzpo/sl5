import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Map-style drag-to-pan for a scroll container. Grabbing empty canvas space and
 * dragging updates scrollLeft/scrollTop by the pointer delta — the same gesture
 * you'd use on a map. Trackpad two-axis scroll keeps working unchanged; this is
 * the mouse affordance on top of it.
 *
 * A press only becomes a pan once the pointer moves past DRAG_THRESHOLD, so a
 * plain click still lands on whatever was under it (hex select, background
 * clear). Presses that start on an interactive target (hex cell, button) are
 * ignored so they never hijack a click.
 */
const DRAG_THRESHOLD = 4; // px before a press counts as a drag

/** Elements whose presses should never start a pan (they own the click). */
function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  // A hex cell is an SVG <g class="cursor-pointer">; buttons/links own their
  // clicks too. Pan only starts from inert canvas space (the background rect,
  // container padding), never from something the user meant to click.
  return !!el.closest(
    "button, a, input, [role='button'], .cursor-pointer, [data-no-pan]"
  );
}

export interface PanDragState {
  /** Attach to the scroll container. */
  ref: React.RefObject<HTMLDivElement | null>;
  /** True while an active pan drag is in progress. */
  dragging: boolean;
  /** True when the content overflows in either axis (so panning is possible). */
  overflowing: boolean;
  /** onPointerDown handler for the container. */
  onPointerDown: (e: React.PointerEvent) => void;
}

export function usePanDrag(): PanDragState {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  // Live drag bookkeeping kept in a ref so listeners don't re-bind per move.
  const drag = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scrollX: number;
    scrollY: number;
    pointerId: number;
  } | null>(null);

  // Track whether content overflows so we can show the grab cursor only when
  // panning is actually possible.
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflowing(
      el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
    );
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Observe the scrolled content too — zoom changes its size, not the box.
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    if (e.button !== 0) return; // left button only
    if (isInteractiveTarget(e.target)) return;

    drag.current = {
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      scrollX: el.scrollLeft,
      scrollY: el.scrollTop,
      pointerId: e.pointerId,
    };

    const onMove = (ev: PointerEvent) => {
      const d = drag.current;
      const node = ref.current;
      if (!d || !node) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (!d.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!d.active) {
        d.active = true;
        setDragging(true);
        node.setPointerCapture(d.pointerId);
      }
      node.scrollLeft = d.scrollX - dx;
      node.scrollTop = d.scrollY - dy;
    };

    const onUp = () => {
      const node = ref.current;
      const d = drag.current;
      if (node && d?.active && node.hasPointerCapture(d.pointerId)) {
        node.releasePointerCapture(d.pointerId);
      }
      drag.current = null;
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  return { ref, dragging, overflowing, onPointerDown };
}
