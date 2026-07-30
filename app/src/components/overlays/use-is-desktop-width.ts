// The width check that gates the whole app, kept apart from `DesktopGate` so
// that file only exports a component (react-refresh needs that to hot-reload it).

import { useCallback, useSyncExternalStore } from "react";

/** Tailwind's `md`. The app's own responsive rules break below this. */
export const MIN_WIDTH_PX = 768;
const QUERY = `(min-width: ${MIN_WIDTH_PX}px)`;

/** True when the viewport is wide enough to run the instrument.
 *
 * `useSyncExternalStore` rather than state + an effect: `matchMedia` IS an
 * external store, and the snapshot is re-read on every render. That covers the
 * case the old effect re-read for — a rotation between the first render and the
 * effect — without a setState in an effect body, so a phone never gets a frame
 * of the app before the gate appears. Mounting the map even once costs a data
 * load and a pan/zoom layout pass. */
export function useIsDesktopWidth(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia(QUERY);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // Server/prerender has no viewport to measure; assume desktop so the gate
    // isn't baked into static HTML.
    () => true
  );
}
