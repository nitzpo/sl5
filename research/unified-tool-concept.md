# SL5 Explorable — Unified Tool Concept

## Merging the Four Directions

The four initial directions map to views/panels within a single unified tool:

| Original Direction | Becomes | Implementation |
|---|---|---|
| Timeline Race | Timeline Track (side panel) | Horizontal 2024-2030, block progress bars, AI curve, decision windows |
| Threat Sandbox | Attacker Perspective | Select adversary OC → see viable chains, breach probability, best attack path |
| SL5 Architect | CISO Perspective | Toggle blocks, set priorities, see posture improvement, budget tracking |
| Assumption Explorer | Global Sliders | AI timeline, cooperation levels, risk tolerance — world state parameters |

## Layout (Rough Concept)

```
┌──────────────────────────────────────────────────────────────┐
│  [Year: 2026 ←──●──→ 2030]    [Perspective: CISO ▼]         │
├──────────────────────────────────────────────────────────────┤
│                          │                                    │
│   BUILDING BLOCKS        │     ANALYSIS PANEL                 │
│   (main area)            │     (context-dependent)            │
│                          │                                    │
│   ┌─┐ ┌─┐ ┌─┐ ┌─┐      │     CISO: "Next priority? Gap?"    │
│   │N│ │M│ │P│ │H│      │     Attacker: "Best path? OC?"     │
│   └─┘ └─┘ └─┘ └─┘      │     Policy: "What incentive?"      │
│   ┌─┐ ┌─┐ ┌─┐          │     Observer: "Full metrics"       │
│   │S│ │A│ │ │           │                                    │
│   └─┘ └─┘ └─┘          │     ┌────────────────────────┐     │
│                          │     │ SL Score: 3.7          │     │
│   [Summary ○ Expert ●]   │     │ Breach P (OC4): 34%    │     │
│                          │     │ Depth: 3/8 layers       │     │
│                          │     │ Extraction: 23%         │     │
│                          │     └────────────────────────┘     │
│                          │                                    │
├──────────────────────────┴────────────────────────────────────┤
│  TIMELINE TRACK                                               │
│  2024──|──2025──|──2026──●──2027──|──2028──|──2029──|──2030   │
│  [block progress bars]  [AI capability curve]  [decision Δ]   │
├───────────────────────────────────────────────────────────────┤
│  GLOBAL SLIDERS                                               │
│  AI advancement: [pessimistic ──●── optimistic]               │
│  Gov cooperation: [none ──●── full]                           │
│  Vendor cooperation: [none ────── full]                       │
│  Annual budget: [$50M ──────●── $2B]                          │
│  Org transformation: [reluctant ──●── committed]              │
├───────────────────────────────────────────────────────────────┤
│  STAKES (collapsed by default)                                │
│  "If breached: [brief summary of consequences]"               │
└───────────────────────────────────────────────────────────────┘
```

## Interaction Flow

### First Visit
1. User sees default state: year 2026, no blocks deployed, all global sliders at "current reality"
2. Score shows SL ~2.0 (most labs today)
3. Attacker panel shows: "OC3 has 60% breach probability. OC4 has 95%."
4. Immediate aha: "we're not secure"

### Exploration
5. User starts toggling blocks ON → watches score climb, attack chains close
6. Timeline shows: some blocks light up immediately, others show "deploying..." progress bars
7. User moves year slider to 2028 → AI curve rises → some probabilistic blocks degrade → score drops
8. Aha: "I deployed monitoring but by 2028 it's less effective because AI amplifies the adversary"

### Deep Dive
9. User clicks a specific attack chain → narrative unfolds (Option B or C)
10. Chain highlights which blocks would stop it → user toggles those → chain closes
11. User switches to attacker perspective → sees "next best chain" shift

### Discovery
12. User notices some blocks are grayed out (can't deploy — vendor dependency, research needed)
13. User adjusts vendor cooperation slider → block becomes available
14. Aha: "Policy decisions (requiring vendor security features) unlock blocks that labs can't get alone"

## Information Architecture

### Summary Mode (10 groups)
1. Network Isolation (NET-01, NET-02, NET-07)
2. Bandwidth Control (NET-03, NET-04, NET-05, NET-06)
3. Hardware Security (HW-01, HW-02, HW-03, HW-04, HW-06, HW-09, HW-10)
4. Confidential Computing (HW-07, HW-08)
5. Physical Facility (PHY-01, PHY-02, PHY-03, PHY-04, PHY-05, PHY-06)
6. Hardware Inspection (PHY-07, SC-02, SC-05, SC-06)
7. Personnel Program (PER-01, PER-02, PER-03, PER-04, PER-05, PER-06, PER-07, PER-08)
8. Supply Chain (SC-01, SC-03, SC-04, SC-07)
9. AI Controls (AI-01, AI-02, AI-03, AI-04, AI-05, AI-06)
10. Anti-Distillation (AI-07 + rate limiting + output monitoring)

### Expert Mode
All ~43 blocks individually toggleable with full detail panels.

## Technology Considerations (for later)

- Static site (no backend needed for core simulation)
- All computation client-side (formulas are lightweight)
- JSON data files for block definitions, formulas, attack chains
- Framework: likely React + D3/Recharts for visualizations
- Or: simpler vanilla JS + Canvas (like TensorFlow Playground)
- Must work well on desktop; tablet nice-to-have; mobile unlikely for this density

## What Makes This Unique (Positioning)

Compared to existing resources:
- RAND report: static PDF, comprehensive but not interactive
- AI 2027 forecast: narrative with some interactivity, but about timelines not security architecture
- Google SAIF: framework/checklist, not a simulation
- TensorFlow Playground: great UX but about ML, not security

Our tool: **the first interactive simulation that lets you build and stress-test an AI security architecture against evolving threats.** It makes the abstract (SL levels, attack vectors, defense-in-depth) tangible through direct manipulation and immediate feedback.
