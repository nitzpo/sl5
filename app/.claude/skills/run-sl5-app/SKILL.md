---
name: run-sl5-app
description: Build, run, test, and drive the SL5 explorable web app. Use when asked to start or run the app or its dev server, take a screenshot of the map/UI, verify a change in the real browser, drive the intro page, run the engine directly, or run the lint/test/build checks.
---

Vite + React + TypeScript explorable, served under the **`/sl5/` base path**, plus a
second entry point at `/sl5/intro/`. Two ways in, depending on what you touched:

- **UI / pan-zoom / rendering change** → start the dev server, then drive real headless
  Chromium with **`.claude/skills/run-sl5-app/driver.mjs`** (this directory). It asserts
  invariants and writes screenshots.
- **Engine change** (`src/engine/**` — pure functions over JSON) → skip the browser
  entirely and use **`npx tsx`** direct invocation. Most engine PRs need only this.

All paths below are relative to `app/` (the unit). Node 20 / npm 10 verified.

## Prerequisites

Only needed for the browser driver — `npm test`, `lint`, and `build` need none of this.

```bash
sudo apt-get update
sudo apt-get install -y libnspr4 libnss3 libasound2t64
```

That is the **complete** set `chrome-headless-shell` was missing here — it does *not*
need libatk / libatk-bridge / libcups, which the full `npx playwright install-deps`
would drag in. Install those three and stop.

Playwright is deliberately **not** a project dependency (a ~100MB browser download that
every `npm install` and the Pages deploy would otherwise pay for). Install it once to a
scratch dir and point the driver at it. **Versions are pinned** — these are the ones this
skill was verified against, and an unpinned `npm i playwright` will drift:

```bash
mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright@1.62.0
npx playwright@1.62.0 install chromium   # downloads chrome-headless-shell
```

## Setup

```bash
npm install
```

## Run (agent path)

Start the dev server, wait for the port, then drive it. **Poll — don't `sleep`**; a cold
Vite start takes a few seconds.

```bash
npm run dev > /tmp/sl5-dev.log 2>&1 &
timeout 40 bash -c 'until curl -sf http://localhost:5173/sl5/ >/dev/null; do sleep 1; done'

PLAYWRIGHT_DIR=/tmp/pw node .claude/skills/run-sl5-app/driver.mjs all
```

Stop it with `lsof -ti:5173 -sTCP:LISTEN | xargs -r kill` (`$!` is only the npm wrapper —
npm doesn't forward SIGTERM to vite, so kill the port's listener).

Flows — pass one, or `all`:

| flow | what it asserts |
|---|---|
| `smoke` | app loads, all 47 block hexes render, no console errors |
| `panzoom` | content centered on load; opening a panel **pans without rescaling** |
| `gate` | below 768px the gate replaces the app (its `<svg>` never mounts), and tracks a live resize both ways |
| `intro` | `/sl5/intro/` renders, `#hash` deep links resolve, readable at 390px |
| `views` | Clusters / Grid / Rings each mount and lay out |
| `all` | all of the above (24 checks) |

Flags: `--url=http://localhost:4173` (verified against `npm run preview`),
`--out=<dir>` (default `/tmp/sl5-shots`), `--headed`.

Screenshots → `/tmp/sl5-shots/*.png`. Exit code is nonzero if any check fails.
**Open the screenshot** — a blank frame passes no check but means the launch failed.

### Why the driver exists

`tests/utils/pan-zoom.test.ts` covers only the exported pure `recenterOnResize`. The
render path of `src/utils/use-viewbox-pan-zoom.ts` — the latched baseline, the
`computeBaseFit` centering, the ref sync — has **no unit coverage** and is only
observable in a browser with real layout. The `panzoom` flow is that coverage: it reads
the `transform` attribute the hook actually emits and checks `scale` is unchanged while
`tx` moves by exactly half the width change. If you touch that hook, run it.

## Run: engine directly (no browser)

`npx tsx` runs the TypeScript engine as-is. Two things are required: the **`.ts`
extensions in the import paths**, and reading the JSON from `public/data` via `fs` (the
engine takes blocks as an argument; it doesn't load them itself).

Write the probe **inside `app/`** so the imports stay relative — no absolute paths, so it
works in any clone. Run from `app/`:

```bash
cat > engine-probe.ts <<'EOF'
import fs from "fs";
import path from "path";
import { computeCategoryScores, overallSlScore } from "./src/engine/scoring.ts";
import { getAiCapability } from "./src/engine/ai-curve.ts";
import type { Block } from "./src/engine/types.ts";

const dataDir = path.join(import.meta.dirname, "public/data");
const blocks: Block[] = [];
for (const f of fs.readdirSync(dataDir)) {
  if (f.startsWith("blocks-") && f.endsWith(".json"))
    blocks.push(...JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf-8")));
}
console.log("blocks:", blocks.length);              // 47
console.log("AI cap 2027:", getAiCapability(2027)); // 0.65
const cats = computeCategoryScores(blocks, 2026, 0);
console.log("overall SL:", overallSlScore(cats));   // 1 (empty posture)
EOF
npx tsx@4.23.1 engine-probe.ts && rm engine-probe.ts
```

## Run (human path)

```bash
npm run dev                        # → http://localhost:5173/sl5/ and /sl5/intro/
npm run build && npm run preview   # → http://localhost:4173/sl5/ — production build
```

`preview` serves `dist/`, so **build first**. Without a build it still starts and prints a
URL — it just serves **404** on every path, which reads like a broken app rather than a
missing build.

Desktop-only by design; the app gates below 768px. Ctrl-C to stop.

## Checks

```bash
npm run lint      # eslint — currently clean
npm test          # vitest — 13 files, 214 tests pass
npm run build     # tsc -b && vite build → dist/ (two pages)
```

**Timing.** The full suite is ~30s wall, but only ~8s of that is test execution — the rest
is jsdom environment setup and module transform. `vite.config.ts` already defaults to
`environment: 'node'` and only the 3 component test files opt into jsdom via a
`// @vitest-environment jsdom` docblock, so don't "optimize" that; it's already minimal.
Working only on the engine? Scope it and skip jsdom entirely:

```bash
npx vitest run tests/engine tests/utils   # ~12s
```

The browser driver adds **~8s** for all five flows (one browser, reused across flows).
Single flows: `gate` ~2s, `panzoom` ~5s, `smoke` ~10s on a cold Vite start.

## Gotchas

- **Always use the `/sl5/` path when polling for readiness.** `vite.config.ts` sets
  `base: '/sl5/'`. Bare `/` **302s** to `/sl5/` (redirect middleware in the config), so
  `curl -sf localhost:5173` *succeeds* without the app having rendered anything — a
  readiness check against it can pass too early. Poll `localhost:5173/sl5/`, which is a
  real 200. Anything outside the prefix that isn't an alias 404s. Same on preview (4173).
- **Set `PLAYWRIGHT_DIR`, not `NODE_PATH`.** Node ignores `NODE_PATH` for ESM `import`,
  so the driver resolves Playwright with `createRequire`. It tries `PLAYWRIGHT_DIR`, then
  the skill dir, then `process.cwd()` — so a `NODE_PATH`-only invocation may still work
  by accident via that last fallback. Don't rely on it; pass the env var.
- **A first-run modal covers the canvas** and swallows clicks on the map. `driver.mjs`
  dismisses it by matching a *list* of CTA labels, because that button's text changed in
  recent commits (#17/#18). If clicks mysteriously do nothing, that matcher went stale.
- **Don't assert on a "100%" zoom readout by selector.** It's the bottom-left control,
  but the load-bearing value is the `scale(...)` in the transform group's attribute —
  that's what the hook computes. Read the attribute, as the driver does.
- **Emoji render as tofu boxes** in headless screenshots (the gate's 🖥️ becomes a hollow
  rectangle) — no emoji font in this container. It's a screenshot artifact, not a bug;
  the app renders it fine in a real browser. Don't "fix" it.
- **Panel width changes are animated.** Read the transform *after* the transition, or
  you'll catch an intermediate `tx`. The driver's `settled()` helper polls the transform
  until two consecutive samples match — don't replace it with a fixed sleep, which is both
  slower on a fast machine and flaky on a slow one.
- **WSL → Windows Chrome over CDP is a dead end.** `chrome.exe --remote-debugging-port`
  binds to Windows' own loopback and is unreachable from WSL (`curl` to both
  `127.0.0.1` and the host IP times out). Use the Linux Playwright browser.
- **`chromium-cli` is not installed here**, which is why this driver exists rather than
  the inline-heredoc approach used for most web apps.

## Troubleshooting

- **`error while loading shared libraries: libnspr4.so`** on browser launch — the
  `apt-get` line above wasn't run. Needs sudo.
- **`ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'`** — pass
  `PLAYWRIGHT_DIR=/tmp/pw` (or wherever you installed it). Setting `NODE_PATH` will not
  help; see Gotchas.
- **Driver hangs on `svg.touch-none`** — the viewport was below 768px, so the gate
  rendered and the map never mounted. The driver uses 1600x1000 for app flows; only the
  `gate` flow goes narrow.
- **`unknown flow "..."`** (exit 2) — valid flows are `smoke`, `panzoom`, `gate`,
  `intro`, `views`, `all`.
