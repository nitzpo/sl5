# research/

Methodology, design notes, schemas, and source material behind [SL5 Explorable](../README.md). This folder documents *why the model is shaped the way it is*; the live app reads its data from [`../app/public/data/`](../app/public/data/).

> ⚠️ **Generation note.** Most documents here (notably `scoring-model.md`, `formula-calibration-results.md`, the JSON schemas, and `scenario-test.py` with its frozen `data/`) describe the **first-generation Python prototype** of the model. The shipped app re-designed the breach model (capability gate + monotone get-past, see the root README) and re-tuned the block data, so specific formulas, constants, and calibration numbers in these files may not match the live engine. They remain valuable as the reasoning record; where they conflict, `app/src/engine/` is authoritative.

## Methodology & design

- `building-blocks-model.md` — the building-block framing of security.
- `scoring-model.md` — how per-category and overall Security Levels are computed.
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
- **`data/` (here):** a frozen snapshot from an earlier modeling pass, kept because the legacy Python prototype `scenario-test.py` reads it (`Path(__file__).parent / "data"`). It is **not** what the app uses and may differ; treat `../app/public/data/` as the source of truth.

## Source material

`rand_full.txt`, `sl5_standard.txt`, `sl5_novel.txt` are local text copies of the public reports used as references while building the model (RAND *Securing AI Model Weights*; the SL5 Standard and its Novel Recommendations). They are reference inputs, not part of the application.
