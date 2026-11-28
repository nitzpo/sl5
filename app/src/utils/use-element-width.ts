import { useLayoutEffect, useState, type RefObject } from "react";

/** The live content width of an element, so an SVG can be laid out at its
 * real pixel size (and its 12px labels stay 12px) instead of being scaled. */
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback = 0): number {
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setWidth(el.getBoundingClientRect().width || fallback);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return width;
}
