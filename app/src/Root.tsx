import App from "./App";
import { DesktopGate } from "./components/overlays/DesktopGate";
import { useIsDesktopWidth } from "./components/overlays/use-is-desktop-width";

/** The desktop check sits above `App`, not inside it.
 *
 * Inside `App` it can only ever be an early `return` — and effects run before a
 * return is even considered, so the whole data load, the store hydration and the
 * pan/zoom listeners would still fire behind a gate whose entire point is that
 * none of that should happen. Here, `App` simply doesn't mount.
 *
 * Its own file rather than inline in `main.tsx`: a component defined in the
 * entry point can't be hot-reloaded, since that file also has the
 * `createRoot` side effect. */
export function Root() {
  return useIsDesktopWidth() ? <App /> : <DesktopGate />;
}
