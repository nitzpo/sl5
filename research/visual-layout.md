# SL5 Explorable — Visual & Layout Design

## Design Philosophy

Inspired by: explorabl.es, TensorFlow Playground, Nicky Case's work.
Core principle: **direct manipulation → immediate feedback**. Every interaction produces a visible change in the system state within 100ms.

Not a dashboard. Not a report. An *instrument* you play to build intuition.

---

## Screen Layout (Desktop — 1440px+)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                              │
│ [SL5 Explorable]  Year:[2024─●─2030]  Perspective:[CISO|ATK|POL|OBS]  │
├────────────────────────────────┬────────────────────────────────────────┤
│                                │                                        │
│  LEFT: BLOCK GRID              │  RIGHT: ANALYSIS PANEL                 │
│  (55% width)                   │  (45% width)                           │
│                                │                                        │
│                                │                                        │
│                                │                                        │
│                                │                                        │
│                                │                                        │
│                                │                                        │
│                                │                                        │
├────────────────────────────────┴────────────────────────────────────────┤
│ BOTTOM: TIMELINE + SLIDERS (collapsible)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Left Panel: Block Grid

### Layout: Hexagonal Grid by Category

```
        ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
  NET   │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │
        └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
     ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
  HW │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │ │ 8 │ │ 9 │ │10│
     └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
        ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
  PHY   │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │
        └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
     ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
  PER│ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │ │ 8 │
     └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
        ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
  SC    │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │
        └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
     ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
  AI │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │ │ 8 │
     └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
```

### Block Cell States (visual encoding)

| State | Fill | Border | Icon |
|-------|------|--------|------|
| Not started | Empty/gray | Dotted | — |
| Investing | 20% fill from bottom | Dashed | $ |
| Implementing | 60% fill from bottom | Solid thin | ⚙ |
| Deployed | Solid fill | Solid thick | ✓ |
| Mature | Solid fill + glow | Double | ★ |
| Unavailable (vendor/research gated) | Hatched gray | Gray | 🔒 |

### Color by Defense Type
- Hard stops: **blue** — solid, certain
- Probabilistic: **amber/orange** — warns of degradation
- Hybrid: **teal** — in between

### Interaction
- **Click** → select block → detail appears in right panel
- **Right-click / long-press** → cycle state: not_started → investing → deployed (quick toggle)
- **Hover** → tooltip with name + one-line summary + current effectiveness %
- **Dependencies** → when block selected, lines/arrows show requires/enhances relationships

### Summary Mode
In summary mode, blocks cluster into 10 groups. Each group is a larger hexagon containing its member blocks as small dots. Click to expand.

---

## Right Panel: Analysis

Context-dependent on perspective. Always shows:

### Score Card (always visible, top of right panel)

```
┌─────────────────────────────────┐
│  SL Equivalent: 2.18           │
│  ████████░░░░░░░░░░░  (44%)    │
│                                 │
│  vs OC3: 12% breach/yr         │
│  vs OC4: 47% breach/yr         │
│  vs OC5: 81% breach/yr         │
│                                 │
│  Defense depth: 3/8 layers      │
│  Extraction: 23% (4yr exposed)  │
│  Uncertainty: ±0.6 SL           │
└─────────────────────────────────┘
```

### Per-Perspective Content (below score card)

**CISO View:**
```
┌─────────────────────────────────┐
│  PRIORITY RECOMMENDATIONS       │
│                                 │
│  1. ▲ PER-01 (SenL Framework)  │
│     Impact: +0.4 SL | $15M     │
│     "Personnel is your weakest  │
│      category at SL 1.96"       │
│                                 │
│  2. ▲ AI-01 (Insider Controls) │
│     Impact: +0.3 SL | $20M     │
│     "AI-specific at 2.48 —     │
│      only category below 2.5"   │
│                                 │
│  3. ▲ SC-01 (Supplier Diverse) │
│     Impact: +0.2 SL | $10M     │
│     "Single vendor = correlated │
│      failure across HW layer"   │
│                                 │
│  BUDGET: $200M/yr              │
│  Used: $140M | Remaining: $60M │
│                                 │
│  ⚠ DECISION WINDOWS CLOSING:   │
│  • HW-03: must start by 2026   │
│    to deploy by 2029 (chip      │
│    design cycle)                │
└─────────────────────────────────┘
```

**ATTACKER View:**
```
┌─────────────────────────────────┐
│  ADVERSARY PROFILE              │
│  OC: [3 ───●─── 5]  AI: 2028  │
│  Effective OC: 4.6             │
│                                 │
│  BEST ATTACK CHAINS             │
│                                 │
│  1. "The Long Game"     P=20%  │
│     ├─ PER-04 ✗ (absent)      │
│     ├─ PER-03 ◐ (implementing) │
│     └─ PER-05 ✗ (absent)      │
│     → Recruit insider, extract │
│       weights over 6 months    │
│                                 │
│  2. "Patient Distillation" 41% │
│     └─ AI-07 ◐ (implementing)  │
│     → Cumulative API extraction │
│       — 41% fidelity by 2028   │
│                                 │
│  3. "Poisoned Chip"      P=8%  │
│     ├─ SC-02 ◐ (implementing)  │
│     ├─ SC-06 ◐ (implementing)  │
│     └─ HW-04 ✗ (absent)       │
│                                 │
│  BLOCKED CHAINS (by deployed): │
│  • "Remote Ghost" — NET-01 ■   │
│  • "Zero-Day Cascade" — HW-07■ │
└─────────────────────────────────┘
```

**POLICYMAKER View:**
```
┌─────────────────────────────────┐
│  POLICY LEVERS                  │
│                                 │
│  If government cooperation      │
│  moves from 0.2 → 0.8:         │
│  • Unlocks: PER-04 (SF-86)     │
│  • Accelerates: PHY-01 by 12mo │
│  • Overall: +0.7 SL by 2029    │
│                                 │
│  If vendor cooperation          │
│  moves from 0.3 → 0.9:         │
│  • Unlocks: HW-03, HW-04       │
│  • Accelerates: HW-01 by 18mo  │
│  • Overall: +0.5 SL by 2029    │
│                                 │
│  REGULATION IMPACT ANALYSIS     │
│  "Require SL4 for frontier     │
│   models" →                     │
│   Gap from current: 22 blocks   │
│   Est. industry cost: $8-40B    │
│   Timeline to compliance: 3-5yr │
│                                 │
│  INDUSTRY-WIDE BOTTLENECKS      │
│  • Cleared personnel: 5000 need │
│    vs ~200 available w/ AI exp  │
│  • Air-gap architects: ~50 in   │
│    private sector globally      │
│  • Accelerator vendors: 3 total │
└─────────────────────────────────┘
```

**OBSERVER View:**
Shows all metrics from all perspectives simultaneously in a denser layout. Full category breakdown, all chains, all sliders visible.

---

## Bottom Panel: Timeline + Sliders

### Timeline Track

```
  2024    2025    2026    2027    2028    2029    2030
   |───────|───────|───●───|───────|───────|───────|
                    ▲ current year

  AI Capability: ░░░░░░░░░████████████████████████  (65% @ 2027)
                         ↗ accelerating

  Block Progress:
  NET-01: ░░░░░░░░████████████████  deployed 2027
  HW-03:  ░░░░░░░░░░░░░░░░░░░████  deployed 2029 (vendor)
  PER-04: ────────────────────────  unavailable (no gov cooperation)

  ⚠ Decision window closing:
  HW-03 ━━━━━━━╋━━━━━  must start by [2026] or miss 2029 deploy
```

### Global Sliders (always visible, compact)

```
  AI timeline   [slow ─────●───── fast]     Gov coop  [none ──●────── full]
  Vendor coop   [none ────●──── full]       Budget    [$50M ───●──── $2B]
  Org transform [reluctant ──●── committed] Risk tol  [conserv ────●─ aggr]
```

Each slider shows real-time impact: moving it updates scores, chain probabilities, and block availability instantly.

---

## Key Visual Mechanics

### 1. The "Erosion" Effect
As year advances, probabilistic blocks visually dim/desaturate. Hard stops stay solid. This makes the degradation visible without reading numbers.

```
2026: AI-03 [████████] bright orange
2028: AI-03 [████░░░░] faded orange (AI degrading it)
2030: AI-03 [███░░░░░] very faded (nearly ineffective)

2026: NET-01 [████████] solid blue
2030: NET-01 [████████] still solid blue (hard stop — no erosion)
```

### 2. Attack Chain Overlay
When in Attacker view, red dotted lines connect blocks that form chains. Absent blocks pulse red. The "best chain" is highlighted with thicker line + probability badge.

### 3. Defense Layer Rings
Concentric rings around the block grid showing 8 defense layers. Each ring lights up as blocks contributing to that layer are deployed. Gaps in rings = vulnerabilities.

```
         ╭─── physical perimeter ───╮
       ╭──── network boundary ────╮  │
     ╭───── host security ─────╮  │  │
   ╭────── accelerator ──────╮  │  │  │
  ╭─────── access control ──╮ │  │  │  │
  │  ╭──── monitoring ────╮ │ │  │  │  │
  │  │  ╭── personnel ──╮ │ │ │  │  │  │
  │  │  │  ╭ supply ch ╮│ │ │ │  │  │  │
  │  │  │  │  [BLOCKS]  │ │ │ │  │  │  │
  │  │  │  ╰────────────╯ │ │ │  │  │  │
  │  │  ╰─────────────────╯ │ │  │  │  │
  │  ╰───────────────────────╯ │  │  │  │
  ╰─────────────────────────────╯  │  │  │
```

Lit ring = layer active. Dark/broken ring = layer has gaps. Correlated layers (shared dependencies) have a connecting mark between them.

### 4. The Distillation Meter
Always visible if model is served externally. A rising water level that fills over time:

```
  ┌──┐
  │  │ 80% — model effectively stolen
  │  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  │  │
  │▓▓│ 41% — current extraction
  │▓▓│
  │▓▓│
  │▓▓│
  └──┘
  Distillation: 41%
  (rate: ~8%/yr with current defenses)
```

### 5. Uncertainty Visualization
- Score shown as range: "SL 2.18 ±0.6"
- Blocks with "fundamental" uncertainty: dashed border + ? icon
- Open questions accessible via hover

---

## Micro-Interactions

| Action | Result | Feedback |
|--------|--------|----------|
| Toggle block to deployed | Score updates, layer rings light, chains recalculate | Block animates fill, score counter ticks up, chain lines fade if closed |
| Move year forward | AI curve rises, probabilistic blocks dim, new blocks become available | Smooth transition, blocks that degrade pulse briefly |
| Change adversary OC | Chain probabilities update, best chain shifts | Red lines redraw, probability badges animate |
| Move slider | Affected blocks highlight briefly, scores update | Yellow flash on affected blocks, scores smoothly interpolate |
| Click attack chain | Narrative unfolds, relevant blocks pulse | Side panel slides to chain detail, involved blocks glow |

---

## Progressive Disclosure

### Level 0: Landing
- Brief intro paragraph (2-3 sentences)
- "What is SL5 and why does it matter?" — 50 words max
- Default state loaded (2026, no investment, CISO perspective)
- Immediate visual: "Current state: SL 1.8. Here's what that means."

### Level 1: Exploration
- Toggle blocks, move year, see numbers change
- Guided by CISO recommendations panel

### Level 2: Understanding
- Switch perspectives, explore attack chains
- Adjust sliders to see policy impact
- Notice erosion effect as year advances

### Level 3: Expertise
- Expert mode (all 47 blocks)
- Inspect formulas (click score → formula tooltip)
- Create custom scenarios
- Export configurations

---

## Color Palette

| Element | Color | Meaning |
|---------|-------|---------|
| Hard stop blocks | #2563EB (blue-600) | Reliable, certain |
| Probabilistic blocks | #D97706 (amber-600) | Degrades over time |
| Hybrid blocks | #0D9488 (teal-600) | Mixed characteristics |
| Absent/not started | #6B7280 (gray-500) | Not contributing |
| Attack chains | #DC2626 (red-600) | Threat |
| Score positive | #059669 (emerald-600) | Good/improving |
| Score negative/gap | #DC2626 (red-600) | Bad/vulnerable |
| AI capability curve | #7C3AED (violet-600) | Rising threat multiplier |
| Unavailable/locked | #9CA3AF (gray-400) hatched | Gated by external factor |

---

## Responsive Considerations

**Desktop (1440px+):** Full layout as shown — side-by-side panels
**Tablet (768-1439px):** Stack analysis below blocks, sliders in bottom drawer
**Mobile:** Not primary target. Offer "read-only" summary view — pre-computed scenarios with commentary. Interactive simulation too dense for touch/small screen.

---

## Technology Implications

- ~47 blocks × state animations → needs efficient rendering (Canvas or WebGL for blocks, DOM for panels)
- Real-time formula computation on every interaction → Web Workers for heavy math (but current formulas are lightweight, probably fine on main thread)
- JSON data files loaded at init → small payload (~200KB total for all blocks + config)
- No backend needed — everything client-side
- Framework: React + Canvas/SVG hybrid likely best balance of interactivity and DOM integration
- Or: vanilla JS + SVG (lighter, inspired by TensorFlow Playground's approach)
- D3.js for timeline and data-driven visual elements
- CSS transitions for smooth state changes on DOM elements

---

## What This Design Communicates

Before reading any numbers, the *visual form* should communicate:
1. **Many moving parts** (47 blocks = complex system, no single fix)
2. **Categories matter** (grouping shows you can't just do network without personnel)
3. **Time is an adversary** (erosion effect, rising AI curve, closing windows)
4. **Hard stops vs probabilistic** (blue stays solid, orange fades — visceral difference)
5. **Defense in depth** (concentric rings — more = better, gaps = vulnerable)
6. **The attacker has paths** (red lines threading through absent blocks)
