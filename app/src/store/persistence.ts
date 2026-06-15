import type { BlockState, Perspective, Sliders } from "../engine/types";

const STORAGE_KEY = "sl5-state";
const SCENARIOS_KEY = "sl5-scenarios";

export interface PersistedState {
  blockStates: Record<string, BlockState>;
  year: number;
  perspective: Perspective;
  adversaryOc: number;
  sliders: Sliders;
  modelServedExternally: boolean;
  expertMode: boolean;
}

export interface SavedScenario {
  name: string;
  savedAt: number;
  state: PersistedState;
}

export function loadScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedScenario[];
  } catch {
    return [];
  }
}

export function saveScenarios(scenarios: SavedScenario[]): void {
  try {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
  } catch {
    /* ignore storage quota / availability errors */
  }
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

export function stateToShareUrl(state: PersistedState, name?: string): string {
  const payload = name ? { s: state, n: name } : state;
  const json = JSON.stringify(payload);
  const encoded = toUrlSafeBase64(json);
  return `${window.location.origin}${window.location.pathname}#state=${encoded}`;
}

export interface ParsedHashState {
  state: PersistedState;
  name?: string;
}

function parseHashPayload(json: string): ParsedHashState | null {
  const parsed = JSON.parse(json);
  if (parsed && typeof parsed === "object" && "s" in parsed) {
    return { state: parsed.s as PersistedState, name: parsed.n };
  }
  return { state: parsed as PersistedState };
}

// Capture hash at module load time (before React StrictMode double-mounts)
let capturedHashState: ParsedHashState | null = null;
try {
  const hash = window.location.hash;
  if (hash.startsWith("#state=")) {
    const encoded = hash.slice(7);
    const json = fromUrlSafeBase64(encoded);
    capturedHashState = parseHashPayload(json);
  }
} catch {
  // invalid hash — ignore
}

export function loadFromUrlHash(): ParsedHashState | null {
  const result = capturedHashState;
  capturedHashState = null;
  return result;
}

export function loadFromUrlHashLive(): ParsedHashState | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith("#state=")) return null;
    const encoded = hash.slice(7);
    const json = fromUrlSafeBase64(encoded);
    return parseHashPayload(json);
  } catch {
    return null;
  }
}

export function clearUrlHash(): void {
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}
