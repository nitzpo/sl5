# SL5 Explorable — app (v2)

The frontend for [SL5 Explorable](../README.md): a static, client-side instrument for
planning how a frontier AI lab defends its model weights. All data and state live in the
browser; there is no backend. The root README covers what the tool is, how the model
works, the versions (v1 is frozen at `/sl5/v1/`) and the data sources.

## Stack

React 19 + TypeScript, Vite 8 (two entry points), Tailwind CSS v4, Zustand, all-SVG
rendering. Served under the base path `/sl5/` locally; the Pages deploy builds it with
`--base /sl5/v2/`.

## Scripts

```bash
npm install
npm run dev        # http://localhost:5173/sl5/ (the app) and /sl5/intro/ (the introduction)
npm run build      # tsc -b + vite build → dist/ (two pages)
npm run preview    # serve dist/ (build first)
npm test           # vitest: engine, store, story, UI and introduction tests
npm run test:watch # vitest in watch mode
npm run lint       # eslint
npm run calibrate  # print the calibration tables for research/scoring-model.md
```

Requires Node 20+. `node scripts/run-ts.mjs <file.ts>` runs a TypeScript probe against
the engine through Vite's module runner. To run, drive and screenshot the app in a real
browser, see [`.claude/skills/run-sl5-app/SKILL.md`](.claude/skills/run-sl5-app/SKILL.md).

## What's on screen

- **Catalogue**, the main screen, in two views: the **stage matrix** (attack stage ×
  category) and **clusters** (categories around the weights). The easiest attack path is
  drawn through both. Click a block to advance it, right-click to step it back,
  Shift-click for its drawer.
- **Approaches**: one lane per broad way in, along its easiest path, with your defenses at
  each stage.
- **Race**: long-lead defenses against the year AI lifts the attacker a tier, and your SL
  over the years beside the scripted stories.
- **The verdict rail**: the threat-relative security level, each attacker tier in words,
  what still gets through, the next defense to fund, programme completeness and budget.
- **Parameters** (advanced settings), **Scenarios** (one-minute stories and saved
  postures) and **Share** (a link to your posture) in the header.

Every number comes from one engine call, `scorePosture`, so no two panels can disagree.
The app gates screens below 768px; the introduction works on a phone.

## Layout

```
src/
├── App.tsx, main.tsx     # the app entry: data load, views, drawers, playback
├── components/
│   ├── catalogue/         # stage matrix, clusters, block tiles, click handling
│   ├── approaches/        # approach lanes
│   ├── race/              # the race view
│   ├── rail/              # the verdict rail
│   ├── detail/            # the block drawer
│   ├── params/            # the parameters drawer
│   ├── timelapse/         # story transport and caption
│   ├── layout/            # header, view bar, shared-link banner, scenarios menu
│   ├── overlays/          # first-run modal, small-screen gate
│   └── marks/             # shared SVG marks (type bars, band cells)
├── engine/               # the pure model: vectors, threat-relative SL, budget, baseline,
│                         #   dependencies, AI curve, distillation; `posture.ts` is the entry
├── model/                # view models: layouts, names, words (bands, money), race
├── store/                # Zustand: simulation, derived scores, UI, persistence
├── timelapse/            # story scripts, playback store and loop
├── utils/                # next-defense ranking, decision windows, timeline, formatting
└── intro/                # the standalone introduction (second entry, intro/index.html)

public/data/              # the JSON the app loads at runtime (below)
scripts/                  # calibration table generator, TypeScript runner
tests/                    # vitest (see below)
```

The engine is pure functions over the JSON; `store/derived.ts` turns store state into a
score and components subscribe. To change what the model says, start in `src/engine/` and
`public/data/`.

## Data

| File | What |
|---|---|
| `vectors.json` | Attack vectors: RAND's, the lab's own model's, and structural placeholders |
| `approaches.json` | The approaches and the meters outside the SL, as vectors per stage |
| `scenarios.json` | Scenarios (the former attack chains) as specific paths |
| `blocks-*.json` | The building blocks by category, each with the vectors it counters; `blocks-future.json` holds the R&D blocks |
| `world-state.json` | Timeline, AI capability curve, OC and SL definitions |

Schemas are in [`../research/schema/`](../research/schema/).

## Tests

`npm test` runs everything. Most files run in Node; the component tests opt into jsdom
with a `// @vitest-environment jsdom` docblock.

- `tests/engine/`: scoring, the vector model, monotonicity, calibration targets, the
  reviewed probe fixture, data integrity, the stories.
- `tests/store/`: persistence and old-link migration, funding order, story playback
  against the reader's saved posture.
- `tests/timelapse/`: story beats and the transport.
- `tests/ui/`, `tests/overlays/`: the main screen, the rail, drawers, the first-run modal
  (no percentages on screen, storage keys).
- `tests/intro/`: the introduction and its budget game.
- `tests/utils/`: the next-defense ranking, decision windows, the timeline.

## Deploy

On push to `main`, [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds
this app with `--base /sl5/v2/`, the frozen v1 with `--base /sl5/v1/`, and the version picker
from [`../site/`](../site/README.md), and publishes them to GitHub Pages together.
