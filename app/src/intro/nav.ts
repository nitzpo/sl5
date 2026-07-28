// Links from the introduction back to the explorable.
//
// BASE_URL is Vite's base ('/sl5/' in production, '/sl5/' in dev too) so these
// work identically on GitHub Pages and locally.

export const APP_URL = import.meta.env.BASE_URL;

/** Open the app with a scripted story already playing. `App.tsx` reads the
 * param on mount, starts the script, and strips it from the URL. */
export function storyUrl(scriptId: string): string {
  return `${import.meta.env.BASE_URL}?story=${encodeURIComponent(scriptId)}`;
}

/**
 * Someone who just read the introduction shouldn't be met by the first-run
 * modal — it's a shorter version of what they've been reading. Reuses the app's
 * existing `sl5_intro_seen` key rather than adding a second flag.
 */
export function markIntroSeen(): void {
  try {
    localStorage.setItem("sl5_intro_seen", "1");
  } catch {
    // Storage unavailable (private mode / quota) — the modal is a minor
    // annoyance, not worth failing the navigation over.
  }
}
