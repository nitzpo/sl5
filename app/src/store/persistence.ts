import type { BlockState, Perspective, Sliders } from "../engine/types";

const STORAGE_KEY = "sl5-state";

export interface PersistedState {
  blockStates: Record<string, BlockState>;
  year: number;
  perspective: Perspective;
  adversaryOc: number;
  sliders: Sliders;
  modelServedExternally: boolean;
  expertMode: boolean;
}

export function saveToLocalStorage(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadFromLocalStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function toUrlSafeBase64(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafeBase64(str: string): string {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

export function stateToShareUrl(state: PersistedState): string {
  const json = JSON.stringify(state);
  const encoded = toUrlSafeBase64(json);
  return `${window.location.origin}${window.location.pathname}#state=${encoded}`;
}

// Capture hash at module load time (before React StrictMode double-mounts)
let capturedHashState: PersistedState | null = null;
try {
  const hash = window.location.hash;
  if (hash.startsWith("#state=")) {
    const encoded = hash.slice(7);
    const json = fromUrlSafeBase64(encoded);
    capturedHashState = JSON.parse(json) as PersistedState;
  }
} catch {
  // invalid hash — ignore
}

export function loadFromUrlHash(): PersistedState | null {
  const result = capturedHashState;
  capturedHashState = null;
  return result;
}

export function loadFromUrlHashLive(): PersistedState | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith("#state=")) return null;
    const encoded = hash.slice(7);
    const json = fromUrlSafeBase64(encoded);
    return JSON.parse(json) as PersistedState;
  } catch {
    return null;
  }
}

export function clearUrlHash(): void {
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}
