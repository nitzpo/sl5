# research/v2: the research behind SL5 Explorable v2

This folder records how and why v2 was built, in November 2026. Use it to pick up the work or to understand a decision. It holds the review that started v2, the design debates, the user's decisions in their own words, the reviewed data drafts and the scripts behind them, probe scripts, and the visual directions explored.

## What v2 is

v1, frozen at commit `ec5d9bd` and live at `/sl5/v1/`, scored seven hand-written attack chains and showed a **coverage-based** security level. v2, live at `/sl5/v2/`, rebuilds the model on RAND's evidence:

- **RAND's 38 attack vectors** (*Securing AI Model Weights*, Tables 5.1–5.2), plus authored vectors for the lab's own model acting as an insider. Every defensive block declares the vectors it counters.
- **Six approaches × three stages** (get in → reach the weights → get them out). The engine finds the attacker's easiest attack path in each approach, and every attacker tries every approach it can afford.
- **A threat-relative security level:** SL n means every attacker tier up to OC-n usually fails, i.e. succeeds less often than a configurable bar of about 1 in 5. SL5 also requires holding the lab's own model as an insider.
- **Deliberately vague numbers:** band words and a level with a progress bar, not percentages.
- **A Swiss-style, defender-side interface** with the catalogue as the main screen.

## Which documents are authoritative

> **For anything the app computes, the code wins:** [`app/src/engine/`](../../app/src/engine/), the data in [`app/public/data/`](../../app/public/data/), and the model reference [`research/scoring-model.md`](../scoring-model.md).

This folder explains *why*. It is a historical record: numbers in it come from probes and drafts at the time, and several were later changed. In particular the recalibration of 28 Nov, which made SL5 reachable with the full catalogue and retired the "future capabilities" blocks, was still in progress when this folder was written. If a number here disagrees with `scoring-model.md`, trust `scoring-model.md`.

## Reading order

1. **[`decisions.md`](decisions.md)**: the decision log. Twenty-six decisions in order, each with the options, what was chosen, why, who decided, and the user's words. **Start here.**
2. **[`2026-11-review.md`](2026-11-review.md)**: the review of v1 that started it all. Every finding with evidence and sources, plus a table of what v2 did with each.
3. **[`threat-relative-sl.md`](threat-relative-sl.md)**: how the SL rule was designed, cut down by an independent reviewer, corrected by the user ("a top-priority operation DEFINITELY will try all strategies"), and probed.
4. **[`vector-model/README.md`](vector-model/README.md)**: how RAND's table was transcribed and verified, how controls were mapped, the reviewer's corrections, the staging fix, and the seven approved decisions.
5. **[`scope-and-rogue-ai.md`](scope-and-rogue-ai.md)**: what the SL5 Standard covers, its versions, the AI705 losses L-1 to L-4, and how rogue AI entered the model.
6. **[`visual-directions.md`](visual-directions.md)**: every look and layout mocked, how they scored, the user's feedback, and what shipped.
7. **[`process-and-lessons.md`](process-and-lessons.md)**: how the work was orchestrated, the mistakes and what they taught, and practical tips for running things.

## Map of this folder

```
research/v2/
├── README.md                  this file
├── decisions.md               the decision log (D1–D26)
├── 2026-11-review.md          the initial review of v1, converted from HTML
├── threat-relative-sl.md      SL design → independent review → user correction → adopted rule
├── scope-and-rogue-ai.md      SL5 scope, versions, AI705 losses, rogue AI, chosen scope
├── visual-directions.md       all visual directions with images, scores, feedback, outcome
├── process-and-lessons.md     orchestration, mistakes and learnings, tips for agents
├── img/                       19 compressed mockups and screenshots (JPEG, ≤1600px wide)
│   ├── v1-*.jpg               v1 for reference
│   ├── dir-*.jpg              path-view directions: ops room, field manual, briefing intro,
│   │                          Swiss, transit, blueprint, wargame
│   ├── cat-*.jpg              catalogue-first round: stage matrix, floor plan, clusters
│   └── v2-*.jpg               what shipped: matrix, clusters, approaches, story, intro, picker
├── vector-model/              the reviewed draft data (the shipped data in app/public/data wins)
│   ├── README.md              how it was built, verified, corrected and approved
│   ├── coverage.md            the mapping's rationale document (revision 2)
│   ├── vectors.json           50 vectors: RAND 38 + 8 own-model (authored) + 4 structural
│   ├── control_map.json       block → vectors it counters (strong/partial, with reasons)
│   ├── approaches-draft.json  the six approaches by stage (renamed from routes.json)
│   ├── proposals.json         approved merges, new blocks, reclassifications, rescopes
│   ├── stories.json           the v1 chains as vector paths (became scenarios.json)
│   ├── catalogues.json        current vs proposed block ids (read by the probe)
│   ├── probe_output.txt       the calibration probe's output
│   ├── src/                   the Python that built and probed the data
│   └── review/                the independent reviewer's link verdicts, transcription check,
│                              96% probe, and the text of the seven decisions
└── probes/                    selected TypeScript probes, with a README on each
    ├── sl-design/             the variant engine of the SL design (v1 snapshot)
    ├── sl-review/             the union-across-strategies probes r6–r8 and their outputs
    └── codereview/            the v2 property probe (mono.ts) and the old-link probe
```

## Where the v1 research lives

The documents directly in [`research/`](../) (`design-decisions.md`, `ideation-log.md`, `building-blocks-model.md`, `attack-chains-draft.md` and so on) are the **v1-era** research. Each opens with a note on what changed. [`research/README.md`](../README.md) says which of them still apply. The source texts used by both versions (`rand_full.txt`, `sl5_standard.txt`, `sl5_novel.txt`) are there too.

## Notes on sources and privacy

- The review pages shown to the user during this work were claude.ai artifacts. They are **private to the repository owner**:
  - the initial review: https://claude.ai/artifact/2KnTxitQ29385dWgeVH81h
  - the visual comparison: https://claude.ai/artifact/MmfzgFFbzfHuZ8HKWkh9kF
  - the vector map review: https://claude.ai/artifact/HHF2qoBJJuv7ydggFPig5X

  Their content is reproduced in this folder.
- Third-party texts (the RAND report and PDF, the SL5 Standard and Novel Recommendations, the IFP essay) are cited, not copied, except for the RAND Table 5.2 scores transcribed in `vector-model/vectors.json` and short quotations.
- **Authored assumptions are marked as such**:
  - the own-model vectors and their AC1–AC5 scores;
  - the structural stage placeholders;
  - the mapping of the year's AI capability to AC bands;
  - the bar, which is a modelling choice rather than a RAND number.

  `scoring-model.md` has the full list for the shipped engine.
- User quotes in `decisions.md` are verbatim, including typos.
