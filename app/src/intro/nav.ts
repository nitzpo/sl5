// Links from the introduction back to the instrument.
//
// BASE_URL is Vite's configured base: '/sl5/' in dev, '/sl5/v2/' on Pages
// (`vite build --base /sl5/v2/`). Building every link from it means the intro
// at /sl5/v2/intro/ hands off to /sl5/v2/, never to the frozen v1.

export const APP_URL = import.meta.env.BASE_URL;

/** v2 shares its origin with v1, so it keeps its own key. App.tsx reads the
 * same one to decide whether to show its first-run modal. */
export const INTRO_SEEN_KEY = "sl5v2_intro_seen";

/** Open the app with a scripted story already playing. `App.tsx` reads the
 * param on mount, starts the script, and strips it from the URL. */
export function storyUrl(scriptId: string): string {
  return `${import.meta.env.BASE_URL}?story=${encodeURIComponent(scriptId)}`;
}

/**
 * Someone who just read the introduction shouldn't be met by the first-run
 * modal: it is a shorter version of what they've been reading.
 */
export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Storage unavailable (private mode, quota). The modal is a minor
    // annoyance, not worth failing the navigation over.
  }
}
