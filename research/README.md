# research/

Methodology, design notes, schemas, and source material behind [SL5 Explorable](../README.md). This folder documents *why the model is shaped the way it is*; the live app reads its data from [`../app/public/data/`](../app/public/data/).

> **Picking up v2?** Start at [`v2/README.md`](v2/README.md). It is the entry point for the v2 research, with a reading order, the decision log with the user's own words, the initial review, the SL design debate, the reviewed vector-mapping data, probes and the visual directions explored.

## Which version each document describes

SL5 Explorable ships two versions (see [Versions](../README.md#versions)): **v1**, the original app, frozen at commit `ec5d9bd` and live at `/sl5/v1/`, which scored seven narrative attack chains with a coverage-based security level; and **v2**, the current app at `/sl5/v2/`, which scores RAND's attack vectors with a threat-relative security level. Most of this folder was written for v1 and is kept as the reasoning record. Each v1-era document opens with a note saying what changed. Where any of them conflicts with v2, `app/src/engine/` and `scoring-model.md` are authoritative.

| Document | Describes | What to know |
|---|---|---|
| [`scoring-model.md`](scoring-model.md) | **v2** | The reference for the shipped engine: vectors, counters, approaches, the campaign, the threat-relative SL, the meters, every constant and the calibration. Update it alongside `app/src/engine/`. |
| [`schema/`](schema/) | **v2** | JSON Schemas for the data the app loads (below). |
| [`v2/`](v2/README.md) | **v2** | How and why v2 was built: [decisions](v2/decisions.md), the [review of v1](v2/2026-11-review.md), the [threat-relative SL](v2/threat-relative-sl.md), [scope and rogue AI](v2/scope-and-rogue-ai.md), the reviewed [vector-model draft](v2/vector-model/README.md), [visual directions](v2/visual-directions.md), [lessons](v2/process-and-lessons.md) and [probes](v2/probes/README.md). A historical record; where it differs from the code, the code and `scoring-model.md` win. |
| [`source-summaries.md`](source-summaries.md), `rand_full.txt`, `sl5_standard.txt`, `sl5_novel.txt` | Both | Digests and text copies of the public sources. |
| [`distillation-analysis.md`](distillation-analysis.md) | v1-era, still relevant | The reasoning holds; v2 scores distillation as the capability-leakage meter outside the SL. |
| [`attack-chains-draft.md`](attack-chains-draft.md) | v1-era | v1's chains. In v2 they are scenarios that illustrate attack paths but do not score. |
| [`building-blocks-model.md`](building-blocks-model.md), [`block-profiles-draft.md`](block-profiles-draft.md) | v1-era | Block dimensions, which v2 keeps; v2 adds the vectors each block counters. |
| [`formula-calibration-results.md`](formula-calibration-results.md) | v1-era (Python prototype) | Superseded by `scoring-model.md`, Part 11. |
| [`design-decisions.md`](design-decisions.md), [`ideation-log.md`](ideation-log.md) | v1-era | The goals and "aha moments" still frame v2; the mechanics are v1's. |
| [`simulation-structure.md`](simulation-structure.md), [`unified-tool-concept.md`](unified-tool-concept.md), [`visual-layout.md`](visual-layout.md), [`implementation-plan.md`](implementation-plan.md) | v1-era | v1's perspectives, panels, hex map and build plan. v2's interface is described in the [root README](../README.md#whats-on-screen-v2). |

The first-generation Python prototype (`scenario-test.py`) and the frozen `data/` snapshot it read have been **removed**. The prototype had drifted into contradicting the engine (no AI erosion on hard stops, no `hybrid` handling, a flat `0.02` breach probability for any deployed hard stop), so running it gave materially different answers for the same block. Its four validation scenarios were ported to `app/tests/engine/scoring.test.ts`, where they run against the live data and engine.

## Schemas

`schema/` holds JSON Schemas for the v2 data shapes: `vector`, `approach`, `scenario`, `building-block` (including its `counters`) and `world-state`, plus worked examples. Use these when adding or editing data. (A `simulation-config` schema and `app/public/data/simulation-config.json` used to live alongside them; nothing ever loaded the file, its constants contradicted the engine, and both were removed. The model's constants live in `app/src/engine/` and are documented in `scoring-model.md`.)

## Data

- **Canonical / live:** [`../app/public/data/`](../app/public/data/) — `vectors.json`, `approaches.json`, `scenarios.json`, `blocks-*.json` and `world-state.json`, which is what the app actually loads. There is no second copy.

## Source material

`rand_full.txt`, `sl5_standard.txt`, `sl5_novel.txt` are local text copies of the public reports used as references while building the model (RAND *Securing AI Model Weights*; the SL5 Standard and its Novel Recommendations). They are reference inputs, not part of the application.
