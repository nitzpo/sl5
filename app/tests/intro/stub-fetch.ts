// Serve public/data off disk, the way the dev server and Pages both do, for
// the introduction's component tests.

import fs from "fs";
import path from "path";
import { vi } from "vitest";
import { DATA_DIR } from "./load-data";

export function stubFetch() {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const file = String(url).split("/data/")[1];
    const full = file ? path.join(DATA_DIR, file) : "";
    if (!file || !fs.existsSync(full)) return { ok: false, status: 404, json: async () => null } as Response;
    return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(full, "utf-8")) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function stubFailingFetch() {
  const fetchMock = vi.fn(async () => ({ ok: false, status: 404, json: async () => null }) as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
