# SL5 Explorable

**An interactive instrument for understanding what it takes to defend frontier AI model weights from nation-state attackers.**

🔗 **[Live demo →](https://nitzpo.github.io/sl5/)** · 📖 **[Start with the introduction →](https://nitzpo.github.io/sl5/intro/)**

![SL5 Explorable](assets/screenshot.png)

> ⚠️ **Disclaimer.** This is an educational, illustrative model — not authoritative security guidance. The blocks, attack-vector mappings, scenarios, costs, and probabilities are a *modeling interpretation* synthesized from public sources (see [Data & sources](#data--sources)), not official figures. Use it to build intuition, not to make procurement or accreditation decisions.

---

## What is this?

SL5 Explorable is an *explorable explanation* — a manipulable instrument rather than a dashboard or a report. You assemble a security posture out of ~56 defensive **building blocks**, dial in **world-state assumptions** (AI timeline, budget, government/vendor cooperation, adversary capability), and watch the breach probability, security level, and attack viability respond in real time.

"SL5" is the top of a 1–5 **Security Level** scale: resistance to a top-tier nation-state adversary (operational-capability level **OC5**) that is willing to spend years and hundreds of millions of dollars to steal a model's weights. Even **SL4** is aspirational for most labs today.

**Audience:** policymakers, AI-lab security leaders, and the wider AI-security community.

The tool is built around **two simultaneous races**:

1. **The deployment race** — can defenders stand up enough independent layers *before* the threat arrives? Some blocks (air-gapped facilities, custom silicon) have 36–48-month lead times, so the decision window is closing now.
2. **The futureproofing race** — which defenses stay effective as AI amplifies attackers? **Hard stops** (air gap, cryptography, memory isolation) are future-proof; **probabilistic** defenses (monitoring, vetting, review) erode as adversary capability climbs.

### Ideas it tries to make tangible

- **SL5 is extremely hard** — stacking enough *independent* layers to stop OC5 is a multi-year, multi-hundred-million-dollar program.
- **OC4 → OC5 is a qualitative jump**, not just a bigger budget.
- **Strong AI shifts the OC scale** — capabilities that are OC5-only today move within reach of lesser actors over time.
- **Insider threat is a distinct, hard-to-mitigate class** — including the AI system itself acting as an insider.
- **Time pressure is real** — long-lead blocks must be started years ahead.

### The introduction

New to the problem? [`/sl5/intro/`](https://nitzpo.github.io/sl5/intro/) is a standalone
~5-minute slideshow, linked from the app's `Intro` button and its first-run modal. Act I
covers why a cyber superpower would spend a state-scale budget to steal model weights, why
the problem worsens as AI improves, the OC1–OC5 adversary ladder and the SL1–SL5 scale, and
the source material. Act II teaches the instrument itself — blocks, the build lifecycle,
budget and dependency caps, an example attack path, and the timeline — with small
interactive demos driven by the same engine functions the app runs on. It's a separate Vite
entry point, so it loads instantly, ships no simulation store, and every slide is linkable
(`/sl5/intro/#the-oc-ladder`). Unlike the app, it reads fine on a phone.

---

## How the model works

Everything runs client-side from JSON data — no backend. The model as shipped, with
every formula, constant and the calibration table, is in
[`research/scoring-model.md`](research/scoring-model.md); the engine is
`app/src/engine/` and every number in the UI goes through one function,
`scorePosture` (`posture.ts`).

- **Attack vectors** (`app/public/data/vectors.json`) are the backbone: RAND's 38
  vectors with their Table 5.2 feasibility (1–5) for each attacker tier OC1–OC5
  against a minimally defended lab, read as a probability (1 → 0.02, 2 → 0.3, 3 → 0.5,
  4 → 0.7, 5 → 0.9). Each sits at a **stage**: get in, reach the weights, get them out.
  Two kinds are ours, not RAND's, and labelled as assumptions: 8 vectors for **the
  lab's own model as an insider**, scored per AI-capability band, and 4 **structural
  placeholders** ("nothing stops this stage" at a minimal lab).
- **Approaches** (`approaches.json`) group the vectors into broad ways in — remote,
  insider, physical, supply chain, the served model, and the lab's own model. An
  **attack path** takes one vector per stage, and the engine finds the attacker's
  easiest path in each approach. A **campaign** succeeds if any approach works: every
  attacker tries every approach, most likely first.
- **Building blocks** (`blocks-*.json`, 56 today) each **counter** the vectors they make
  harder, strongly or partially, from a reviewed vector × control map. Counters have
  **diminishing returns**: the best strong counter multiplies a vector by 0.3, further
  counters by 0.8, 0.9 and 0.95, and partials together never beat one strong counter. A
  block's state (not started → mature), the cooperation sliders and its `completed_by`
  companions scale its effect, and counters **erode against stronger attackers**: hard
  stops in a narrow band (0.98 → 0.86 of their effect from OC1 to OC5), probabilistic
  controls in a wide one (0.95 → 0.40), hybrids between.
- **AI lifts the attacker, once.** Each vector carries an authored `ai_shift`: as AI
  capability grows (0 in 2024 → 1 in 2030 on the default curve), an OC-n attacker scores
  like OC-n plus up to one tier on code, credential and ML-stack vectors, and barely
  moves on physical and human ones. Feasibility and counter erosion are both read at
  that tier; defender-side erosion is not applied on top.
- **Detection and a floor.** Security operations and deception give a chance that a
  failed attempt is caught and the campaign stopped (about half when mature, eroded by
  AI). And no campaign reaches zero: a residual floor of 3% of what the same attacker
  gets against an undefended lab applies once per campaign.
- **The security level is threat-relative.** RAND's SL-n is the level meant to stop an
  OC-n actor, so **tier n holds** when fewer than τ of OC-n's campaigns succeed (τ = 0.20
  by default; strict 0.10 and lenient 0.33 in advanced settings), and the **SL** is the
  highest n with every tier up to n held. SL5 also requires holding the lab's own model
  as an insider, scored on this year's AI-capability band and multiplied by the chance
  it tries at all (`ai_propensity`). The SL comes with a **progress** bar toward the next
  level (how far that tier has come from certain success to the bar, on a log scale), a
  *marginal* flag, what limits it, and a word per tier — *usually fails*, *contested*,
  *usually succeeds* — rather than a percentage.
- **SL5 is out of reach with today's catalogue**, as RAND says it currently is. A world
  toggle adds five clearly labelled **future capabilities** (verified accelerator
  hardware at scale, a government-cleared workforce with state counter-intelligence, a
  formally verified weight-access stack, a sovereign protected facility, trustworthy AI
  monitors). With all of them and a favourable world, SL5 is reachable for a few years,
  marginally, before AI catches up.
- **Things no lab can do alone** — military takeover, access the organisation itself
  approves — are still scored, flagged, and relieved only by government cooperation.
- **Outside the SL**: API distillation copies capability rather than weights, so it is a
  separate *capability leakage* meter (per campaign, and cumulative since 2026); sabotage
  by the lab's own model is a separate *integrity* meter.
- **Scenarios** (`scenarios.json`) are the former attack chains — *The Quiet Tap*, *The
  Long Game* — retold as specific paths through the vectors. They illustrate; the SL is
  computed over approaches.
- **Programme completeness** is the old coverage score (a weighted mean of block
  effectiveness per category, 0.3·min + 0.7·mean), kept as a secondary readout. It
  measures breadth, not whether any tier holds.
- **Budget** is binding and order-aware: blocks are funded in the order you advanced
  them, a block past the budget line is not built, and controls the lab already runs are
  sunk cost. **Prerequisites** are hard: a block deployed without its `requires` is
  capped at implementing. The **risk-tolerance** slider sets the planning cost basis.
- **You don't start from nothing.** The app opens on a researched starting posture from
  each block's `baseline_state` — SL1 in 2026, slipping to SL0 by 2028 if nothing is added,
  as AI lifts attackers past today's controls.

The calibration is honest about what it cannot hold: with the model served, a ~$3B
programme that starts in 2024 reaches SL3 by 2030, only just; the full catalogue never
reaches SL5. The constants that are ours rather than RAND's — the own-model scores, the
structural placeholders, the future blocks, the AI shifts, detection and the floor — are
listed as [authored assumptions](research/scoring-model.md#authored-assumptions). The
reviewed calibration probe is reproduced by the engine as a test fixture, and the places
where the engine departs from it are documented. JSON schemas live in
[`research/schema/`](research/schema/). The older documents in [`research/`](research/)
describe earlier generations of the model; where they differ, the engine and
`scoring-model.md` are authoritative.

### Not modeled (yet)

Ideas the research docs argue for that the simulation does not implement — listed here so the docs don't over-promise:

- **Cross-approach compounds** — an external prompt injection that steers the lab's own
  model, for instance. The campaign is a union over approaches and misses them.
- **Uncertainty bands** on scores (`open_questions` are surfaced as contested badges, not as error bars).
- **Split SL** for the same model (weights-at-rest vs served externally) — the serving
  toggle and the capability-leakage meter carry that story instead.

---

## Run locally

```bash
cd app
npm install
npm run dev        # http://localhost:5173/sl5/       — the explorable
                   # http://localhost:5173/sl5/intro/ — the introduction
```

Other scripts:

```bash
npm run build      # type-check + production build to app/dist (two pages: / and /intro/)
npm run preview    # serve the production build
npm test           # run the engine unit tests (vitest)
npm run lint       # eslint
```

Requires Node 20+. The app is desktop-only (it gates small screens).

---

## Project structure

```
.
├── app/                      # the React + TypeScript + Vite app (the explorable)
│   ├── intro/index.html       # second page entry → /sl5/intro/
│   ├── src/
│   │   ├── components/        # SVG views: clusters (default), grid, rings, analysis, timeline
│   │   ├── engine/            # vector model, threat-relative SL, budget, AI-curve, distillation
│   │   ├── intro/             # the standalone introduction: slides + its own demos
│   │   ├── store/             # Zustand state (simulation, derived, view, persistence)
│   │   ├── timelapse/         # scripted scenario playback
│   │   └── utils/             # geometry, ring/cluster layout, pan-zoom, colors, decision windows
│   ├── public/data/           # canonical blocks, vectors, approaches, scenarios (JSON)
│   └── tests/                 # vitest unit tests (engine, layout geometry, introduction)
├── research/                 # methodology, design notes, JSON schemas, source material
└── .github/workflows/        # GitHub Pages deploy
```

---

## Data & sources

The block, vector-mapping and scenario data is an **illustrative modeling interpretation** synthesized from public material — not a reproduction of any source document:

- RAND, *Securing AI Model Weights* (RRA2849-1)
- The **SL5 Standard for AI Security** and its **Novel Recommendations**
- The **AI 2027** forecast

Canonical data the app loads is in `app/public/data/` — the single source of truth. (An earlier Python prototype and its frozen data snapshot lived under `research/`; both were removed once `app/tests/engine/` covered the same scenarios against live data. See [`research/README.md`](research/README.md).)

---

## Contributing

Issues and PRs welcome. Common changes:

- **Add or tune a building block** — edit `app/public/data/blocks-*.json` following `research/schema/building-block.schema.json`.
- **Add or retune a counter** — edit a block's `counters` (vector id, strong or partial, why); `tests/engine/data-integrity.test.ts` checks every block counters something and every vector is countered or flagged.
- **Add a scenario** — edit `app/public/data/scenarios.json` (`research/schema/scenario.schema.json`); every step's gap and every stopper must counter one of the scenario's vectors.
- **Engine changes** — keep `npm test` green; monotonicity is asserted in `app/tests/engine/monotonicity.test.ts`, the reviewed calibration probe in `probe-fixture.test.ts`, and the calibration targets in `calibration.test.ts`. `npm run calibrate` regenerates the table in `research/scoring-model.md`.

---

## License

[MIT](LICENSE) © 2026 Nitzan Pomerantz.

## Acknowledgments

Built on the public analysis of RAND and the authors of the SL5 Standard and its Novel Recommendations, and informed by the AI 2027 forecast.
