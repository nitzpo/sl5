// The shipped catalogue and threat model, fetched once, on demand.
//
// The deck itself inlines the little copy it needs (content.ts), so the first
// slides render with no requests at all. The demos that run the real engine
// need the real data, so the first slide that shows one fetches the same JSON
// the instrument loads, and every later demo reuses the same promise.

import { useEffect, useState } from "react";
import type { Block, ThreatModel } from "../engine/types";

export const MODEL_FILES = ["vectors.json", "approaches.json", "scenarios.json"] as const;

/** Every block file, including the future-capability (R&D) blocks. The engine
 * keeps those out of the catalogue unless a demo switches them on. */
export const BLOCK_FILES = [
  "blocks-network.json",
  "blocks-machine.json",
  "blocks-physical.json",
  "blocks-personnel.json",
  "blocks-supply-chain.json",
  "blocks-ai-specific.json",
  "blocks-future.json",
] as const;

export interface ThreatData {
  blocks: Block[];
  model: ThreatModel;
}

let pending: Promise<ThreatData> | null = null;

async function fetchJson(file: string) {
  const resp = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!resp.ok) throw new Error(`${file}: HTTP ${resp.status}`);
  return resp.json();
}

/** Load once per page. A failure is not cached, so a later demo can retry. */
export function loadThreatData(): Promise<ThreatData> {
  if (!pending) {
    pending = Promise.all([...MODEL_FILES.map(fetchJson), ...BLOCK_FILES.map(fetchJson)])
      .then(([vectors, approaches, scenarios, ...blockArrays]) => ({
        blocks: (blockArrays as Block[][]).flat(),
        model: { vectors, approaches, scenarios } as ThreatModel,
      }))
      .catch((e: unknown) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}

/** Test hook: forget the cached load. */
export function resetThreatDataCache(): void {
  pending = null;
}

export type ThreatDataState =
  | { status: "loading" }
  | { status: "ready"; data: ThreatData }
  | { status: "error"; error: string };

export function useThreatData(): ThreatDataState {
  const [state, setState] = useState<ThreatDataState>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    loadThreatData().then(
      (data) => alive && setState({ status: "ready", data }),
      (e: unknown) => alive && setState({ status: "error", error: e instanceof Error ? e.message : String(e) })
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
