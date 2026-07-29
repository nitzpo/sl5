import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { DesktopGate, useIsDesktopWidth } from "./components/overlays/DesktopGate";
import { initAnalytics } from "./analytics";

initAnalytics();

/** The desktop check sits above `App`, not inside it.
 *
 * Inside `App` it can only ever be an early `return` — and effects run before a
 * return is even considered, so the whole data load, the store hydration and the
 * pan/zoom listeners would still fire behind a gate whose entire point is that
 * none of that should happen. Here, `App` simply doesn't mount. */
function Root() {
  return useIsDesktopWidth() ? <App /> : <DesktopGate />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
