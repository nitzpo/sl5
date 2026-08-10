# SL5 Explorable

**An interactive instrument for understanding what it takes to defend frontier AI model weights from nation-state attackers.**

🔗 **[Live demo →](https://nitzpo.github.io/sl5/)** · 📖 **[Start with the introduction →](https://nitzpo.github.io/sl5/intro/)**

![SL5 Explorable](assets/screenshot.png)

> ⚠️ **Disclaimer.** This is an educational, illustrative model — not authoritative security guidance. The blocks, attack chains, costs, and probabilities are a *modeling interpretation* synthesized from public sources (see [Data & sources](#data--sources)), not official figures. Use it to build intuition, not to make procurement or accreditation decisions.

---

## What is this?

SL5 Explorable is an *explorable explanation* — a manipulable instrument rather than a dashboard or a report. You assemble a security posture out of ~46 defensive **building blocks**, dial in **world-state assumptions** (AI timeline, budget, government/vendor cooperation, adversary capability), and watch the breach probability, security level, and attack viability respond in real time.

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

Everything runs client-side from JSON data — no backend.

- **Building blocks** (`app/public/data/blocks-*.json`) — each block has a category, a **defense type** (🔵 hard-stop / 🟠 probabilistic / 🔷 hybrid), cost, deploy time, an effectiveness curve, an AI-erosion rate, dependencies, and which defense-in-depth layer(s) it contributes to. A block moves through states: *not started → investing → implementing → deployed → mature.* Hard `requires` dependencies are enforced: a block claiming deployed while a prerequisite isn't operational is capped at implementing.
- **No control is the whole thing its name implies on its own.** 19 blocks declare `completed_by` — companions without which the control genuinely works but is weaker than the version the standard describes. An air gap is the type specimen: it stops remote exploitation the day it exists, but with no controlled way to move data across it people carry drives, and with a live BMC on the management VLAN there is still a route in. So `NET-01` alone counts for 55% of `NET-01`, and each companion (`NET-05` diodes, `NET-04` bandwidth caps, `PER-08` no remote management) closes an equal part of the rest. This is deliberately *soft*, unlike `requires`: nothing is capped, the block just isn't priced as more than it is. It exists because the introduction's mini-game exposed the lesson-breaking alternative — one click on the air gap was the single best purchase at any budget, which taught that one structural buy is most of security. It isn't.
- **Attack chains** (`app/public/data/attack-chains.json`) — multi-step exfiltration scenarios (e.g., *The Quiet Tap*, *The Poisoned Chip*, *Patient Distillation*). Each names the blocks it exploits and its stoppers — and both are mechanical: every listed stopper reduces its chain.
- **Breach probability** is **capability-gated and monotonic**: for a chain,

  ```
  P(breach) = max( precondition × gate(min_OC) × ∏ get-past(block) × depth-discount,
                   gate(min_OC) × residual_risk )
  ```

  The **capability gate** asks whether the adversary can even attempt the chain — it is steep (≈85% at the chain's minimum OC, ≈10% one tier below), so OC tiers are qualitative jumps, and AI capability lifts an adversary's *effective* OC over time, reopening gates from below. The per-block **get-past** term falls from 1 (absent) toward `1 − resist` as a defense matures — so improving a defense can *never* raise breach probability (asserted by property tests). Both defense types weaken against a stronger adversary, but hard stops erode across a narrow band (0.98→0.86) where probabilistic controls fall much further (0.95→0.40) — structural controls are the best buy without being absolute. AI is counted exactly once per number: breach takes AI's attacker-side lift through effective OC, while the SL score takes the defender-side erosion of probabilistic blocks. Independent deployed layers earn a defense-in-depth discount; a layer whose blocks share a failure mode (`shared_dependencies`) earns half credit.

  Beyond a chain's 3–5 named steps, the rest of that defense **family** (same `summary_group`) counts at reduced weight — so most of the catalog bears on some path, and a chain can't be shut down by maturing three blocks. And no live chain reaches zero: a gate-scaled **residual risk** floor stands for the insider never caught and the zero-day nobody found. A chain held inert by a precondition (an air-gapped model has no extraction channel) stays exactly zero.
- **Security Level** blends the weakest category with the average: `SL = 0.3·min(categories) + 0.7·mean(categories)`. Each category is a weighted mean over the blocks the modeled threat actually touches — chain steps at full weight, their surrounding defense families at the same reduced weight breach gives them — so coverage of that threat drives the score rather than raw catalog depth, and a block is worth the same to both numbers.
- **Budget** is binding and order-aware: blocks are funded in the order you advanced them, so activating one more block can only cap *that* block, never evict an earlier commitment. The **risk-tolerance** slider sets the planning cost basis (aggressive = optimistic costs, conservative = worst-case) — which is what decides whether a given budget buys the whole wishlist or leaves real gaps.
- **You don't start from nothing.** Labs in 2026 already run some of these controls, so the app opens on a researched **starting posture** (≈SL 1.4, not SL 1.0) rather than a bare field, taken from each block's `current_state.baseline_state`. Blocks at their baseline are **sunk cost** — they consume no budget, because a lab doesn't re-buy what it already operates; advancing one past its baseline is what costs. `partially_deployed` maps onto `implementing` rather than getting a state of its own, which slightly *understates* current postures — the safe direction for a tool about how hard this is. See [`app/src/engine/baseline.ts`](app/src/engine/baseline.ts).

The model as shipped — every formula, constant, and the scenario calibration — is documented in [`research/scoring-model.md`](research/scoring-model.md). The surrounding reasoning record lives in [`research/`](research/) (`design-decisions.md`, `distillation-analysis.md`, `formula-calibration-results.md`); those describe the earlier Python-prototype generation, and where they differ from the shipped engine (`app/src/engine/`), the engine and `scoring-model.md` are authoritative. JSON schemas live in [`research/schema/`](research/schema/).

### Not modeled (yet)

Ideas the research docs argue for that the simulation does not implement — listed here so the docs don't over-promise:

- **Inbound inference-channel attacks** (prompt-driven exploitation of the serving stack; block AI-08 exists in the data but has no engine mechanics beyond a generic block).
- **Uncertainty bands** on scores (`open_questions` are surfaced as contested badges, not as ±SL error bars).
- **Split SL** for the same model (weights-at-rest vs served-externally) — the extraction meter carries the served-model story instead.

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
│   │   ├── engine/            # scoring, breach, budget, AI-curve, distillation
│   │   ├── intro/             # the standalone introduction: slides + its own demos
│   │   ├── store/             # Zustand state (simulation, derived, view, persistence)
│   │   ├── timelapse/         # scripted scenario playback
│   │   └── utils/             # geometry, ring/cluster layout, pan-zoom, colors, decision windows
│   ├── public/data/           # canonical block + attack-chain data (JSON)
│   └── tests/                 # vitest unit tests (engine, layout geometry, introduction)
├── research/                 # methodology, design notes, JSON schemas, source material
└── .github/workflows/        # GitHub Pages deploy
```

---

## Data & sources

The block and attack-chain data is an **illustrative modeling interpretation** synthesized from public material — not a reproduction of any source document:

- RAND, *Securing AI Model Weights* (RRA2849-1)
- The **SL5 Standard for AI Security** and its **Novel Recommendations**
- The **AI 2027** forecast

Canonical data the app loads is in `app/public/data/` — the single source of truth. (An earlier Python prototype and its frozen data snapshot lived under `research/`; both were removed once `app/tests/engine/` covered the same scenarios against live data. See [`research/README.md`](research/README.md).)

---

## Contributing

Issues and PRs welcome. Common changes:

- **Add or tune a building block** — edit `app/public/data/blocks-*.json` following `research/schema/building-block.schema.json`.
- **Add an attack chain** — edit `app/public/data/attack-chains.json` (`research/schema/attack-chain.schema.json`); optional `narrative.steps` and `stopper_details` power the chain strip.
- **Engine changes** — keep `npm test` green; the breach model's monotonicity and capability-scaling are asserted in `app/tests/engine/breach.test.ts`.

---

## License

[MIT](LICENSE) © 2026 Nitzan Pomerantz.

## Acknowledgments

Built on the public analysis of RAND and the authors of the SL5 Standard and its Novel Recommendations, and informed by the AI 2027 forecast.
