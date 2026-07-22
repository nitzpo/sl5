// Google Analytics (gtag.js) — loaded only in production builds.
//
// `import.meta.env.PROD` is true in `vite build` (what the GitHub Pages deploy
// runs) and false in `npm run dev`, so analytics never fire locally. The
// measurement ID is public by design (it ships in any client-side GA setup),
// so there's no secret to keep out of the bundle.

const MEASUREMENT_ID = "G-XQZ5YKCL8D";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function initAnalytics() {
  if (!import.meta.env.PROD) return;

  // Load the gtag library.
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Standard gtag bootstrap.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag pushes the raw `arguments` object onto dataLayer (not an array copy).
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);
}
