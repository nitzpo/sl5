# SL5 Explorable — app

The frontend for [SL5 Explorable](../README.md). A static, client-side interactive simulation; all state and data live in the browser.

## Stack

- **React 19** + **TypeScript**
- **Vite 8** (build/dev) — static output, base path `/sl5/`
- **Tailwind CSS v4**
- **Zustand** for state
- **All-SVG rendering** (no Canvas), **no backend**

## Scripts

```bash
npm install
npm run dev        # dev server (HMR) at /sl5/
npm run build      # tsc -b + vite build → dist/
npm run preview    # serve the production build
npm test           # vitest run (engine unit tests)
npm run test:watch # vitest in watch mode
npm run lint       # eslint
```

Requires Node 20+.

## Layout

```
src/
├── App.tsx               # composition: header, map canvas, right panels, bottom panel
├── components/
│   ├── clusters/          # default view: category clusters around the model node
│   ├── blocks/            # hex grid view, block cell, detail, dependency + chain overlays
│   ├── rings/             # defense-in-depth concentric-ring view
│   ├── canvas/            # shared map-style pan/zoom SVG canvas
│   ├── analysis/          # CISO / Attacker / Policy / Observer panels, ScoreCard, ChainStrip
│   ├── timeline/          # year-axis track with threat/defense/AI curves
│   ├── timelapse/         # scripted scenario playback bar + selector
│   ├── sliders/           # world-parameter sliders
│   ├── layout/            # header, right panels, tabbed bottom panel, verdict banner
│   └── overlays/          # intro overlay
├── engine/               # pure model: scoring, breach, budget, ai-curve, distillation, maturation
├── store/                # simulation, derived (reactive results), view (badge toggles), persistence
├── utils/                # geometry, ring/cluster layout, use-viewbox-pan-zoom, colors, decision-windows, format
└── timelapse/            # playback store + scripts

public/data/              # block + attack-chain + world-state + config JSON (loaded at runtime)
tests/                    # vitest unit tests (engine/ scoring & breach, utils/ layout geometry)
```

The three map views (**Clusters** — default, **Grid**, **Rings**) share one
map-style pan/zoom canvas (`components/canvas/PanZoomCanvas.tsx` +
`utils/use-viewbox-pan-zoom.ts`): wheel-zoom at the cursor, drag-to-pan, and
auto-fit when an attack chain is selected.

The model is fully separated from rendering: `engine/` is pure functions, `store/derived.ts` turns store state into results, and components subscribe. To change the simulation's behavior, start in `engine/` and `public/data/`.

## Deploy

Pushed builds deploy to GitHub Pages via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). The Vite `base` (`/sl5/`) must match the repository name so asset paths resolve on Pages.
