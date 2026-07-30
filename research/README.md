# research/

Methodology, design notes, schemas, and source material behind [SL5 Explorable](../README.md). This folder documents *why the model is shaped the way it is*; the live app reads its data from [`../app/public/data/`](../app/public/data/).

> ⚠️ **Generation note.** Most documents here (notably `formula-calibration-results.md` and the JSON schemas) describe the **first-generation Python prototype** of the model. The shipped app re-designed the breach model (capability gate + monotone get-past, see the root README) and re-tuned the block data, so specific formulas, constants, and calibration numbers in these files may not match the live engine. They remain valuable as the reasoning record; where they conflict, `app/src/engine/` is authoritative.
>
> The prototype itself (`scenario-test.py` and the frozen `data/` snapshot it read) has been **removed**. It had drifted into contradicting the engine — no AI erosion on hard stops, no `hybrid` handling at all, and a flat `0.02` breach probability for any deployed hard stop — so running it gave materially different answers for the same block. Its four validation scenarios are ported to `app/tests/engine/scoring.test.ts`, where they run against the live data and the live engine on every test run.
>
> **Exception:** `scoring-model.md` has been rewritten to describe the model **as shipped**, including its calibration. It tracks `app/src/engine/` and should be updated alongside it.

## Methodology & design

- `building-blocks-model.md` — the building-block framing of security.
- `scoring-model.md` — **the reference for the shipped engine**: SL scores, breach probability, budget, and the scenario calibration.
- `design-decisions.md` — key modeling choices and trade-offs.
- `distillation-analysis.md` — model-extraction / distillation risk reasoning.
- `formula-calibration-results.md` — calibration of the scoring/breach formulas.
- `simulation-structure.md`, `unified-tool-concept.md`, `visual-layout.md` — system and UX design.
- `attack-chains-draft.md`, `block-profiles-draft.md` — authoring drafts for the chain/block content.
- `ideation-log.md`, `source-summaries.md` — process notes and source digests.
- `implementation-plan.md` — original build plan.

## Schemas

`schema/` holds JSON Schemas for the data shapes (`building-block`, `attack-chain`, `world-state`, `simulation-config`) plus worked examples. Use these when adding or editing data.

## Data

- **Canonical / live:** [`../app/public/data/`](../app/public/data/) — what the app actually loads.
There is no longer a second copy. The `data/` snapshot that used to sit here existed only to feed `scenario-test.py`, and all six of its files had drifted from the live ones; both are gone.

## Source material

`rand_full.txt`, `sl5_standard.txt`, `sl5_novel.txt` are local text copies of the public reports used as references while building the model (RAND *Securing AI Model Weights*; the SL5 Standard and its Novel Recommendations). They are reference inputs, not part of the application.
