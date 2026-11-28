import type { BlockState, Sliders } from "../engine/types";
import { migrateBlockOrder, migrateBlockStates } from "../engine/catalogue";
import { DEFAULT_AI_PROPENSITY, DEFAULT_SL_BAR } from "../engine/threat-sl";
import { DEFAULT_SCORING_MODE, isScoringMode, type ScoringMode } from "../model/scoring-mode";

// v2 shares its origin with the frozen v1 (/sl5/v1/), so it has its own keys
// and never writes v1's unprefixed ones. Share links (#state=) are not keyed and
// still open here; `migratePersistedState` brings old ids up to date.
export const STORAGE_KEY = "sl5v2-state";
export const SCENARIOS_KEY = "sl5v2-scenarios";

export interface PersistedState {
  blockStates: Record<string, BlockState>;
  /** Funding priority: block ids in the order they were advanced.
   * Absent in old saves — derived from blockStates on load. */
  advanceOrder?: string[];
  year: number;
  /** v1's analysis-panel choice. Old links still carry it; v2 ignores it. */
  perspective?: string;
  adversaryOc: number;
  sliders: Sliders;
  modelServedExternally: boolean;
  /** The retired future-capabilities toggle (FUT-xx blocks, removed in the
   * Nov 2026 recalibration). Saves and links made before then may carry it;
   * it is dropped on load. */
  futureCapabilities?: boolean;
  /** How the headline level is scored. Absent in saves and links made before
   * the setting existed, which open in attack-path mode. */
  scoringMode?: ScoringMode;
}

/**
 * Bring a saved posture or share link from an older catalogue up to date:
 * merged-away block ids (PER-05, SC-02, ...) map onto the blocks that
 * absorbed them, the retired FUT-xx blocks and future toggle are dropped,
 * sliders added since get their defaults, and the scoring mode defaults to
 * attack paths. Idempotent, so it is safe on every load path. Blocks added
 * since are filled in at their baseline when the store applies the state
 * (`snapshotFrom` in simulation.ts), which is where the catalogue is known.
 */
export function migratePersistedState(state: PersistedState): PersistedState {
  const sliders = { ...(state.sliders ?? {}) } as Partial<Sliders>;
  if (typeof sliders.sl_bar !== "number") sliders.sl_bar = DEFAULT_SL_BAR;
  if (typeof sliders.ai_propensity !== "number") sliders.ai_propensity = DEFAULT_AI_PROPENSITY;
  const { futureCapabilities: _retired, ...rest } = state;
  void _retired;
  return {
    ...rest,
    blockStates: migrateBlockStates(state.blockStates ?? {}),
    ...(state.advanceOrder ? { advanceOrder: migrateBlockOrder(state.advanceOrder) } : {}),
    sliders: sliders as Sliders,
    scoringMode: isScoringMode(state.scoringMode) ? state.scoringMode : DEFAULT_SCORING_MODE,
  };
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
    return (JSON.parse(raw) as SavedScenario[]).map((sc) => ({ ...sc, state: migratePersistedState(sc.state) }));
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
    return migratePersistedState(JSON.parse(raw) as PersistedState);
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
    return { state: migratePersistedState(parsed.s as PersistedState), name: parsed.n };
  }
  return { state: migratePersistedState(parsed as PersistedState) };
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
