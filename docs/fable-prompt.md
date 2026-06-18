# Fable AI Prompt — UI/Project Review

Concise prompt for Fable AI to review and improve the SL5 Explorable project.

---

You are reviewing and improving an interactive explorable simulation called "SL5 Explorable" — a tool for understanding the security posture of AI labs protecting frontier model weights at the highest security levels (SL5 = nation-state adversary resistant).

## What This Is

An interactive instrument (not a dashboard, not a report) where users manipulate building blocks of security, adjust world-state assumptions, and see immediate feedback on breach probability, security score, and attack viability. Audience: policymakers, AI lab security managers, AI security community.

**Core "aha" moments to engineer:**
1. SL5 is extremely hard — even SL4 is aspirational for most labs
2. OC4→OC5 adversary jump is qualitative, not just quantitative
3. Strong AI models for cyber change the OC scale — OC4 capability jumps forward over time
4. Insider threat is a distinct, hard-to-mitigate class
5. Time pressure is real — some blocks have 36-48 month lead times, must start now

## Tech Stack
React 19 + TypeScript + Vite + Tailwind CSS + Zustand. All SVG rendering (no Canvas). Static site, no backend — all data in JSON files.

## Current State (what's built)

**Main views:**
- Category Grid: hexagonal blocks grouped by 6 categories (Network, Machine/HW, Physical, Personnel, Supply Chain, AI-Specific). ~47 blocks total. Click for detail, right-click to cycle state (not_started → investing → implementing → deployed → mature).
- Defense Rings: concentric ring visualization showing blocks by defense-in-depth layer (8 layers from accelerator core outward to supply chain). Shows layer strength %.

**Analysis panels (right side, perspective-dependent):**
- CISO view: priority recommendations, budget tracking, weakest category
- Attacker view: best attack chains, breach probability by adversary OC level
- Policymaker view: policy lever impact analysis
- Observer view: all metrics combined

**Bottom panel:**
- Timeline track (2024-2030) with block deployment progress bars
- Global sliders: AI timeline, government cooperation, vendor cooperation, budget, org transformation, risk tolerance

**Scoring engine:**
- Per-category SL scores, overall hybrid SL score
- Breach probability per attack chain per adversary capability level
- AI degradation of probabilistic defenses over time
- Distillation/extraction progress accumulator

**Other:**
- Scenario save/load via URL hash (shareable states)
- Timelapse playback (scripted scenarios)
- Intro overlay for first-time visitors
- Grid/Rings view toggle
- Zoom control
- Mobile gate (desktop only)

## Design Philosophy
- Direct manipulation → immediate feedback (every interaction produces visible change within 100ms)
- Progressive disclosure: summary → expert mode toggle
- Color by defense type: blue = hard stop (AI-resistant), amber = probabilistic (degrades with AI), teal = hybrid
- Fill-from-bottom encoding for block state progress
- Red erosion overlay shows AI degradation eating into block effectiveness
- Dark theme (gray-900/950 backgrounds)

## Block Properties (each of ~47 blocks)
- Category, defense type (hard_stop/probabilistic/hybrid)
- Cost ($M), time to deploy, prerequisites
- Effectiveness curve over time
- AI degradation rate (how much advanced AI erodes this defense)
- Defense-in-depth layer contributions
- Attack chains it participates in

## Two Simultaneous Races (core insight)
1. **Deployment race:** can defenders deploy before the threat arrives?
2. **Futureproofing race:** which blocks remain effective as AI amplifies adversaries?

Hard stops (air gap, crypto, memory isolation) are future-proof. Probabilistic defenses (monitoring, vetting, review) erode over time.

## What I Want From You

1. **UI/UX critique:** What feels clunky, unclear, or underutilized? Where does information density overwhelm or underwhelm?
2. **Interaction design:** What interactions are missing that would deepen understanding? What would make the "aha" moments land harder?
3. **Visual hierarchy:** Is the most important information (breach probability, weakest links, time pressure) front-and-center?
4. **New feature ideas** that serve the educational/analytical mission. Some already planned but not built:
   - Dependency lines between blocks (showing requires/enhances relationships)
   - "Decision windows closing" indicator (blocks that must start NOW)
   - Animated attack chain flow visualization
   - Summary mode (10 group clusters instead of 47 individual blocks)
   - Uncertainty visualization (expert disagreement on block feasibility)
5. **What would make this more compelling** as a communication tool for policymakers who have 10 minutes?

Be concrete and specific. Propose actual interactions, layouts, or visual treatments — not abstract principles. Prioritize ideas by impact-to-effort ratio.
