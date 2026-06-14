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
├── App.tsx               # composition: header, canvas, right panels, bottom panel
├── components/
│   ├── blocks/            # hex grid, block cell, detail, dependency + chain overlays
│   ├── rings/             # defense-in-depth concentric-ring view
│   ├── analysis/          # CISO / Attacker / Policy / Observer panels, ScoreCard, ChainStrip
│   ├── timeline/          # year-axis track with threat/defense/AI curves
│   ├── timelapse/         # scripted scenario playback bar + selector
│   ├── sliders/           # world-parameter sliders
│   ├── layout/            # header, right panels, bottom panel, verdict banner
│   └── overlays/          # intro overlay
├── engine/               # pure model: scoring, breach, budget, ai-curve, distillation, maturation
├── store/                # simulation, derived (reactive results), view (badge toggles), persistence
├── utils/                # geometry, ring-geometry, colors, decision-windows, format
└── timelapse/            # playback store + scripts

public/data/              # block + attack-chain + world-state + config JSON (loaded at runtime)
tests/engine/             # vitest unit tests for the engine
```

The model is fully separated from rendering: `engine/` is pure functions, `store/derived.ts` turns store state into results, and components subscribe. To change the simulation's behavior, start in `engine/` and `public/data/`.

## Deploy

Pushed builds deploy to GitHub Pages via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). The Vite `base` (`/sl5/`) must match the repository name so asset paths resolve on Pages.
