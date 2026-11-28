---
name: run-sl5-app
description: Build, run, test, and drive the SL5 explorable web app (v2). Use when asked to start or run the app or its dev server, take a screenshot of the catalogue/UI, verify a change in the real browser, drive the intro page, run the engine directly, or run the lint/test/build checks.
---

Vite + React + TypeScript explorable, served under the **`/sl5/` base path**, plus a
second entry point at `/sl5/intro/`. This is v2; the Pages deploy builds it with
`--base /sl5/v2/` next to the frozen v1 at `/sl5/v1/` (see `../site/README.md`). Two
ways in, depending on what you touched:

- **UI / layout / rendering change** → start the dev server, then drive real headless
  Chromium with **`.claude/skills/run-sl5-app/driver.mjs`** (this directory). It asserts
  invariants and writes screenshots.
- **Engine change** (`src/engine/**` — pure functions over JSON) → skip the browser
  entirely and run a TypeScript probe with **`node scripts/run-ts.mjs`** (Vite's own
  module runner; `npx tsx` may be blocked). Most engine PRs need only this.

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
every `npm install` and the Pages deploy would otherwise pay for). Some containers already
have one: `node -e "console.log(require.resolve('playwright'))"` (e.g. `/opt/node-tools`).
Otherwise install it once to a scratch dir and point the driver at it. **Versions are
pinned** — these are the ones this skill was verified against, and an unpinned
`npm i playwright` will drift:

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
| `smoke` | app loads past the first-run modal; every block of the catalogue renders once (counted from `public/data`: 56 today); the rail states a level and band words; a path is drawn; **no `%` anywhere on screen** (text, titles, aria labels; quoted research prose excepted); **nothing under 12px**; no console errors |
| `views` | Stage matrix, Clusters, Approaches and Race each mount and lay out (tile/hex/lane/bar counts); nothing under 12px on the race |
| `interact` | click advances a block, right-click steps it back; Shift-click opens the block drawer, Escape closes it; the Parameters drawer has the scoring method, strictness, propensity, serving, government; switching the scoring method to control coverage and back flips the rail |
| `story` | Scenarios ▾ → Proactive Program plays with the transport and a caption in the rail; the end shows a takeaway; Proactive reaches SL5 by 2030; stopping restores the reader's year |
| `dark` | `prefers-color-scheme: dark` paints the dark paper |
| `gate` | below 768px the gate replaces the app (no catalogue mounts), and tracks a live resize both ways |
| `intro` | `/sl5/intro/` renders, `#the-oc-ladder` deep-links to its slide (title and position read from `src/intro/slides/index.ts`), readable at 390px |
| `all` | all of the above (40 checks, ~15s) |

Flags: `--url=http://localhost:4173` (works against `npm run preview` too),
`--out=<dir>` (default `/tmp/sl5-shots`), `--headed`.

Screenshots → `<out>/*.png`: `smoke`, `view-{matrix,clusters,approaches,race}`,
`drawer`, `parameters`, `story-{playing,end}`, `dark-{matrix,clusters}`, `gate`,
`intro{,-deeplink,-phone}`. Exit code is nonzero if any check fails. **Open the
screenshots** — a blank frame passes no check but means the launch failed.

After a visible UI change, also refresh the version picker's v2 thumbnail from the repo
root: `PLAYWRIGHT_DIR=/tmp/pw node site/capture-thumbnails.mjs --only v2` (it builds v2,
serves it on a free port, dismisses the first-run modal and writes
`site/thumbs/v2.webp`; see `site/README.md`). The root README's `assets/screenshot.png`
is the same main screen at 1600×1000, device scale factor 1, saved as PNG.

### Why the driver exists

The unit tests render components in jsdom, which has no layout. The stage matrix
measures its tiles to draw the attack-path overlay (`useGeometry` in
`components/catalogue/StageMatrix.tsx`), the clusters SVG scales to fit, and the 12px
floor depends on that scale — all only observable in a real browser. The `smoke` flow's
`%` check is the browser-side half of `tests/ui/catalogue.test.tsx`; the 12px floor has
no jsdom half, so only the driver checks it.

## Run: engine directly (no browser)

`node scripts/run-ts.mjs <file.ts>` runs a TypeScript file through Vite's module runner
(it calls an exported `main` if there is one). Write the probe **inside `app/`** so the
imports stay relative, read the JSON from `public/data` via `fs`, and delete it after:

```bash
cat > probe.ts <<'EOF'
import fs from "fs";
import path from "path";
import { scorePosture } from "./src/engine/posture.ts";
import { baselineStates } from "./src/engine/baseline.ts";
import type { Block } from "./src/engine/types.ts";

const dir = path.join(import.meta.dirname, "public/data");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
const blocks: Block[] = fs.readdirSync(dir).filter((f) => f.startsWith("blocks-")).flatMap(read);
const model = { vectors: read("vectors.json"), approaches: read("approaches.json"), scenarios: read("scenarios.json") };
const sliders = { ai_timeline: 0.5, gov_cooperation: 0.2, vendor_cooperation: 0.3, budget_millions: 200,
  org_transformation: 0.3, risk_tolerance: 0.5, sl_bar: 0.2, ai_propensity: 0.5 };
const s = scorePosture({ blocks, model, blockStates: baselineStates(blocks), year: 2026, sliders,
  adversaryOc: 4, modelServedExternally: true });
console.log("SL", s.sl.level, s.tiers.map((t) => t.band)); // SL 2, [usually fails, usually fails, usually succeeds, ...]
EOF
node scripts/run-ts.mjs probe.ts && rm probe.ts
```

## Run (human path)

```bash
npm run dev                        # → http://localhost:5173/sl5/ and /sl5/intro/
npm run build && npm run preview   # → http://localhost:4173/sl5/ — production build
```

`preview` serves `dist/`, so **build first**. Without a build it still starts and prints a
URL — it just serves **404** on every path, which reads like a broken app rather than a
missing build.

Desktop-only by design; the app gates below 768px. Ctrl-C to stop. The first-run modal
remembers itself under `sl5v2_intro_seen`; saved state lives under `sl5v2-state` and
`sl5v2-scenarios` (v1, frozen at `/sl5/v1/`, keeps the unprefixed keys).

The headline level has a **scoring-mode** setting (`scoringMode`: `paths`, the default
attack-path analysis, or `coverage`, v1's control coverage), set at the top of Parameters
or with the rail's "Scored by" switch; it is saved, travels in share links, and stories
pin `paths` while they play.

## Checks

```bash
npm run lint      # eslint — clean
npm test          # vitest — 31 files, 419 tests
npm run build     # tsc -b && vite build → dist/ (two pages)
```

**Timing.** The full suite is a few seconds of test execution plus jsdom setup.
`vite.config.ts` defaults to `environment: 'node'`; only the component test files opt into
jsdom via a `// @vitest-environment jsdom` docblock, so don't "optimize" that. Working only
on the engine? Scope it:

```bash
npx vitest run tests/engine tests/utils
```

## Gotchas

- **Always use the `/sl5/` path when polling for readiness.** `vite.config.ts` sets
  `base: '/sl5/'`. Bare `/` **302s** to `/sl5/`, so `curl -sf localhost:5173` *succeeds*
  without the app having rendered anything. Poll `localhost:5173/sl5/`. Same on preview.
- **Another dev server may own 5173** (a parallel session working on the intro, say).
  Run your own with `npx vite --port 5199 --strictPort` and pass `--url=http://localhost:5199`.
- **Set `PLAYWRIGHT_DIR`, not `NODE_PATH`.** Node ignores `NODE_PATH` for ESM `import`,
  so the driver resolves Playwright with `createRequire`. It tries `PLAYWRIGHT_DIR`, then
  the skill dir, then `process.cwd()`.
- **The first-run modal covers the app** on a fresh profile. The driver closes it with
  "Explore freely" (Escape as a fallback). If clicks mysteriously do nothing, that label
  changed.
- **Editing files while a driver run is in flight** makes Vite full-reload the page
  mid-flow. Let a run finish before saving.
- **Emoji render as tofu boxes** in headless screenshots (no emoji font here). A
  screenshot artifact, not a bug.
- **WSL → Windows Chrome over CDP is a dead end.** Use the Linux Playwright browser.
- **`chromium-cli` is not installed here**, which is why this driver exists.

## Troubleshooting

- **`error while loading shared libraries: libnspr4.so`** on browser launch — the
  `apt-get` line above wasn't run. Needs sudo.
- **`ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'`** — pass
  `PLAYWRIGHT_DIR=/tmp/pw` (or wherever you installed it). Setting `NODE_PATH` will not
  help; see Gotchas.
- **Driver hangs on `[data-block-id]`** — the viewport was below 768px, so the gate
  rendered and the app never mounted. The driver uses 1600x1000 for app flows; only the
  `gate` flow goes narrow.
- **`unknown flow "..."`** (exit 2) — valid flows are `smoke`, `views`, `interact`,
  `story`, `dark`, `gate`, `intro`, `all`.
