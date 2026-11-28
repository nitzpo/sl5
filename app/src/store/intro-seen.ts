/**
 * The first-run modal's "seen" flag. v2 shares its origin with the frozen v1,
 * so it has its own key (v1 keeps `sl5_intro_seen`); the introduction at
 * /sl5/v2/intro/ writes the same v2 key, so reading it there means the modal
 * stays away. Guarded: localStorage throws outright in some private modes.
 */
export const INTRO_SEEN_KEY = "sl5v2_intro_seen";

export function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Storage unavailable: the modal is a minor annoyance, not worth failing over.
  }
}
