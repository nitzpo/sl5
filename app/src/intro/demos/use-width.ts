import { useLayoutEffect, useRef, useState } from "react";

/**
 * The rendered width of an element, so an SVG chart can draw at one SVG unit
 * per CSS pixel. A chart scaled down through a fixed viewBox would shrink its
 * labels below 12px on a phone; drawing at the real width keeps them legible.
 * jsdom has no ResizeObserver, so tests get `fallback`.
 */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.round(w));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
