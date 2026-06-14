# SL5 Explorable — Implementation Plan

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **React 19 + TypeScript** | Component model fits panel layout; TypeScript catches data model bugs early |
| Build | **Vite** | Fast dev server, simple config, good for static sites |
| Block grid | **SVG** (React-managed) | ~47 elements with hover/click — SVG handles this without Canvas complexity. Animations via CSS transitions + GSAP for complex sequences |
| Timeline/charts | **D3.js** (minimal — scales, axes, curves) | Lightweight; only need axis rendering and the AI capability curve |
| Styling | **Tailwind CSS** | Rapid iteration on layout, responsive utilities, consistent color palette |
| State management | **Zustand** | Lightweight, no boilerplate. Single store for simulation state (block states, year, sliders, perspective) |
| Deployment | **Static export → Vercel or GitHub Pages** | No backend. JSON loaded at build time or fetched at init |
| Testing | **Vitest + Testing Library** | Fast, colocated tests for formula logic |

**Not using:** Next.js (no SSR needed), Canvas/WebGL (overkill for 47 elements), Redux (too heavy), D3 force layout (too physics-y for grid).

---

## Project Structure

```
sl5-explorable/
├── public/
│   └── data/                    # JSON data files (copied from research/data/)
│       ├── blocks-network.json
│       ├── blocks-machine.json
│       ├── blocks-physical.json
│       ├── blocks-personnel.json
│       ├── blocks-supply-chain.json
│       ├── blocks-ai-specific.json
│       ├── attack-chains.json
│       ├── world-state.json
│       └── simulation-config.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── store/
│   │   ├── simulation.ts        # Zustand store: block states, year, sliders, perspective
│   │   └── derived.ts           # Computed values: scores, breach probs, recommendations
│   ├── engine/
│   │   ├── scoring.ts           # SL score calculation (category scores, overall hybrid)
│   │   ├── breach.ts            # Breach probability per chain per adversary
│   │   ├── distillation.ts      # Extraction accumulator
│   │   ├── maturation.ts        # Block state progression over time
│   │   ├── ai-curve.ts          # AI capability interpolation with slider adjustment
│   │   └── types.ts             # Core data types (Block, Chain, WorldState, etc.)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx       # Year slider, perspective selector
│   │   │   ├── LeftPanel.tsx    # Block grid container
│   │   │   ├── RightPanel.tsx   # Analysis panel (perspective-dependent)
│   │   │   └── BottomPanel.tsx  # Timeline + sliders (collapsible)
│   │   ├── blocks/
│   │   │   ├── BlockGrid.tsx    # SVG grid layout with category grouping
│   │   │   ├── BlockCell.tsx    # Individual block hex with state encoding
│   │   │   ├── BlockTooltip.tsx # Hover tooltip
│   │   │   ├── BlockDetail.tsx  # Expanded detail view (in right panel)
│   │   │   └── DependencyLines.tsx # SVG lines showing block relationships
│   │   ├── analysis/
│   │   │   ├── ScoreCard.tsx    # SL score, breach probs, depth, extraction
│   │   │   ├── CisoView.tsx    # Priority recommendations, budget
│   │   │   ├── AttackerView.tsx # Best chains, adversary profile
│   │   │   ├── PolicyView.tsx   # Policy levers, regulation impact
│   │   │   └── ObserverView.tsx # All metrics combined
│   │   ├── timeline/
│   │   │   ├── TimelineTrack.tsx    # Year axis with block progress bars
│   │   │   ├── AiCurve.tsx          # Rising AI capability visualization
│   │   │   └── DecisionWindows.tsx  # Closing window indicators
│   │   ├── overlays/
│   │   │   ├── AttackChains.tsx     # Red lines through absent blocks
│   │   │   ├── DefenseRings.tsx     # Concentric layer rings
│   │   │   └── DistillationMeter.tsx # Rising water level
│   │   ├── sliders/
│   │   │   └── GlobalSliders.tsx    # 6 sliders with real-time feedback
│   │   └── intro/
│   │       └── Landing.tsx          # First-visit intro + orientation
│   ├── hooks/
│   │   ├── useBlocks.ts         # Load and access block data
│   │   ├── useSimulation.ts     # Access computed simulation results
│   │   └── useAnimations.ts     # Shared animation utilities
│   └── utils/
│       ├── colors.ts            # Color palette constants
│       ├── geometry.ts          # Hex grid position calculations
│       └── format.ts            # Number formatting (SL scores, probabilities, costs)
├── tests/
│   ├── engine/
│   │   ├── scoring.test.ts      # Verify scoring formula outputs (from scenario-test.py)
│   │   ├── breach.test.ts       # Breach probability calculations
│   │   └── distillation.test.ts # Extraction accumulator
│   └── components/
│       └── BlockGrid.test.tsx   # Render tests for grid states
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

---

## Build Order (Phases)

### Phase 1: Engine + Data (no UI)
**Goal:** Port Python scenario-test logic to TypeScript, verify same outputs.

1. Initialize project (Vite + React + TS + Tailwind)
2. Define `types.ts` — Block, AttackChain, WorldState, SimulationConfig interfaces
3. Implement `scoring.ts` — category scores, overall hybrid SL formula
4. Implement `breach.ts` — sigmoid, effective OC, chain probability
5. Implement `distillation.ts` — extraction accumulator
6. Implement `maturation.ts` — state transitions over time
7. Implement `ai-curve.ts` — interpolation with slider adjustment
8. Write tests that match Python scenario-test outputs
9. Copy JSON data files to `public/data/`

**Deliverable:** `npm test` passes, formulas produce same numbers as Python.

### Phase 2: Block Grid (core visual)
**Goal:** See all 47 blocks, toggle states, watch scores update.

1. Zustand store with block states, year, sliders
2. `derived.ts` — reactive computed scores from store
3. `BlockGrid.tsx` — hex layout, positioned by category
4. `BlockCell.tsx` — state-dependent fill, border, color
5. `Header.tsx` — year slider, perspective tabs (non-functional yet)
6. `ScoreCard.tsx` — live score display
7. Click-to-toggle block states → score updates in real time

**Deliverable:** Can click blocks on/off, score changes, hex grid looks right.

### Phase 3: Timeline + Sliders
**Goal:** Year advancement shows erosion; sliders modify world state.

1. `GlobalSliders.tsx` — 6 sliders wired to store
2. Year slider → updates AI curve → probabilistic blocks dim
3. `TimelineTrack.tsx` — horizontal axis with AI curve overlay
4. Erosion effect — CSS opacity/saturation transition on block cells
5. Block progress bars on timeline (if block has a start_year)

**Deliverable:** Moving year forward visibly erodes probabilistic blocks. Sliders change scores.

### Phase 4: Analysis Panel (perspectives)
**Goal:** Right panel shows perspective-appropriate content.

1. Perspective selector in header → swaps right panel content
2. `CisoView.tsx` — compute priority recommendations (sort by SL impact)
3. `AttackerView.tsx` — show ranked attack chains with probabilities
4. `ScoreCard.tsx` — add breach probabilities per OC level
5. `DistillationMeter.tsx` — visual accumulator
6. `BlockDetail.tsx` — click a block → see all dimensions

**Deliverable:** All 4 perspectives show meaningful, dynamically-computed content.

### Phase 5: Overlays + Polish
**Goal:** Attack chains, defense rings, dependency lines, animations.

1. `AttackChains.tsx` — SVG overlay with red paths
2. `DefenseRings.tsx` — concentric layer visualization
3. `DependencyLines.tsx` — lines between related blocks on selection
4. Hover tooltips on all interactive elements
5. `DecisionWindows.tsx` — closing-window indicators on timeline
6. `Landing.tsx` — first-visit intro with guided orientation
7. Responsive layout adjustments for tablet
8. Performance pass (memoize heavy computations)

**Deliverable:** Full interactive experience with all visual mechanics.

### Phase 6: Content + Attack Chains Data
**Goal:** Fill attack chain narratives, polish text, test with users.

1. Write `attack-chains.json` from draft (7 chains with full data)
2. Write `simulation-config.json` with calibrated parameters
3. Write `world-state.json` (already exists in schema dir — finalize)
4. Review all block descriptions for clarity
5. Add "inspect formula" click-through on scores
6. User testing (show to 2-3 people, iterate)

---

## Data Flow

```
JSON files (loaded once at init)
    │
    ▼
Zustand store (user actions mutate)
    ├── block_states: Record<string, BlockState>
    ├── year: number (2024-2030)
    ├── perspective: "ciso" | "attacker" | "policymaker" | "observer"
    ├── adversary_oc: number (1-5)
    ├── sliders: { ai_timeline, gov_coop, vendor_coop, budget, org_transform, risk_tolerance }
    │
    ▼
Derived computations (recompute on store change)
    ├── category_scores: Record<Category, number>
    ├── overall_sl: number
    ├── breach_probabilities: Record<ChainId, number>
    ├── extraction_progress: number
    ├── priority_recommendations: Block[]
    ├── available_blocks: Block[] (gated by sliders)
    └── defense_layer_status: LayerStatus[]
    │
    ▼
Components (subscribe to relevant slices)
```

---

## Key Implementation Decisions

### Hex Grid Positioning
Pre-compute positions based on category row + index within category. Not physics/force-directed — deterministic placement.

```typescript
function hexPosition(category: Category, index: number): { x: number, y: number } {
  const row = CATEGORY_ORDER.indexOf(category);
  const col = index;
  const offset = row % 2 === 0 ? 0 : HEX_WIDTH / 2; // stagger
  return {
    x: col * HEX_WIDTH * 1.1 + offset,
    y: row * HEX_HEIGHT * 0.85
  };
}
```

### Formula Transparency
Every computed number is clickable → shows the formula that produced it in a tooltip/modal. Values are not magic — the user can inspect and understand.

### State Persistence
- URL hash params to encode current state (year, perspective, block states as bitfield). Enables sharing specific configurations via link.
- localStorage auto-save so user can close tab and resume where they left off.
- JSON export/import for saving and loading named scenarios.

### Animation Budget
- Block state changes: 200ms CSS transition (fill, opacity)
- Score updates: 300ms counter interpolation
- Year advancement: 400ms staggered erosion across blocks
- Panel switches: 200ms fade
- No animation should block interaction

---

## Estimated Effort

| Phase | Effort | Cumulative |
|-------|--------|------------|
| Phase 1: Engine | 2-3 days | 2-3 days |
| Phase 2: Block Grid | 3-4 days | 5-7 days |
| Phase 3: Timeline + Sliders | 2-3 days | 7-10 days |
| Phase 4: Analysis Panel | 3-4 days | 10-14 days |
| Phase 5: Overlays + Polish | 4-5 days | 14-19 days |
| Phase 6: Content + Testing | 2-3 days | 16-22 days |

Total: ~3-4 weeks of focused work.

---

## Resolved Questions

1. **Both modes** — Summary mode is the default (10 groups). Expert mode via toggle (all 47 blocks). Summary is built on top of expert — groups are visual clusters of underlying blocks.
2. **All 7 attack chains** shipped.
3. **GitHub Pages** for deployment.
4. **No accessibility investment** for now.
5. **Mobile deferred** — desktop only, show "use desktop" message on small screens.
