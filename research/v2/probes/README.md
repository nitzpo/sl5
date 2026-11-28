# Probes

Selected probe scripts from the v2 research. They measured the effect of a rule *before* it went into the engine. They are kept as evidence and as templates, **not as runnable tests**:

- Each one imports a **snapshot** of the app at a specific commit, or engine paths as they were then.
- The absolute scratch paths have been rewritten to relative ones. You still have to recreate the snapshot each script expects, or point the imports at the current engine, which has a different API for the v1-era scripts.
- To run TypeScript here, use `node app/scripts/run-ts.mjs <file>` from the repo root; `npx tsx` may be blocked. The scripts export `main` or run at top level.

## `sl-design/`: the threat-relative SL design (26 Nov)

| File | What it is |
|---|---|
| `lib.ts` | Loader. Reads blocks, chains and world state from `./snap/app/public/data` and imports engine functions from `./snap/app/src/engine/*`, i.e. a copy of **v1 at `ec5d9bd`**. Defines the slider presets. |
| `scenarios.ts` | The postures used throughout: baseline 2026, Do Nothing, Budget-Constrained, Reactive, Proactive, Proactive + PER-02/04, Cheap27 ($559M) and full catalogue, at 2030. |
| `model.ts` | **The variant engine.** v1's chain engine with every proposed change behind a flag: `perBlockLift`, `hsReanchor`, `oc5Chains`, `campaign: "max" \| "persist"`, `residual: "perChain" \| "campaign"`, `includeDistillation`, `detection`, `opLift`, `byRoute`. `CURRENT` reproduces v1 exactly (max difference 0 over 300 postures); `PROPOSED` is the design. Also `thrSl()`, `campaign()`, `HS_THRESHOLDS` (the design's reading of Table 5.2) and the illustrative OC5 chains. |

The design's other probes (p0–p12) are not copied. Their results are tabulated in [`../threat-relative-sl.md`](../threat-relative-sl.md).

To recreate the snapshot:

```bash
git worktree add /tmp/sl5-v1 ec5d9bd
mkdir -p research/v2/probes/sl-design/snap && ln -s /tmp/sl5-v1/app research/v2/probes/sl-design/snap/app
```

## `sl-review/`: the independent reviewer's follow-up (27 Nov)

These test the rule the user asked for: every tier tries every strategy, the best variant within a strategy, a union across strategies.

| File | What it shows |
|---|---|
| `modelq.ts` | The reviewer's copy of the variant engine, plus a `PARAM.lookup` hook for a stubbed Table 5.2 hard-stop lookup. Imports `../sl-design/lib.ts`. |
| `r6_union.ts` → `r6.out` | **The union-across-strategies probe.** Coverage SL vs the new SL for the eight postures; P(SL5 \| SL ≥ 4) over 600 strong postures; catalogue-size sensitivity (a duplicate variant vs a new strategy); the detection variant with q = 0 / 0.2 / 0.5; a monotonicity spot check. |
| `r7_fixes.ts` → `r7.out` | Candidate data fixes for the missing SL4/SL5 gap: "sharp" OC5-only variants and a 6-block vs broad Table 5.2 lookup. |
| `r8_lowshift.ts` → `r8.out` | The fix that worked: OC5-only variants built from low-AI-shift steps (P(SL5 \| SL ≥ 4) 81% → 44%, OC5/OC4 ratio 2.27, every SL4 verdict unchanged). |

They import `../sl-design/scenarios.ts`, `../sl-design/lib.ts` and `../sl-design/snap/app/src/engine/dependencies.ts`, so they need the same `ec5d9bd` snapshot. The reviewer's first-round probes (r1–r5: sensitivity, an independent re-implementation, simpler alternatives, top-m breadth, hard-stop band) are not copied; their findings are in [`../threat-relative-sl.md`](../threat-relative-sl.md#2-the-independent-review-adopt-with-changes).

## `codereview/`: the independent code review of v2 (28 Nov)

These ran against a `git archive` of commit **`8e0037f`** (the first v2 UI) unpacked at `../tree/`.

| File | What it shows |
|---|---|
| `data.ts` | Loader for the shipped v2 data (`blocks-*`, `vectors.json`, `approaches.json`, `scenarios.json`) from `../tree/app/public/data`, plus the app's default sliders. |
| `mono.ts` | **Property probe of the v2 engine.** The seed is the second script argument (`process.argv[3]`; default 1). 4,000 trials per seed: random postures, funding orders, budgets, every slider, all three bar presets, served on/off. It advances one random block and checks that no tier, approach, meter, scenario, AI insider or SL value gets worse, and that nothing is NaN. About 10,800 trials found 0 violations. **The template for any future engine change.** |
| `v1link.ts` | The probe behind the "old links load new blocks as not_started" finding. It migrates a v1 default-posture share link and compares SL with the v2 baseline across years. It reads `v1blocks.txt` (all of v1's `blocks-*.json` concatenated: `git show ec5d9bd:app/public/data/blocks-network.json` and so on), which is not copied. |

To recreate the tree:

```bash
mkdir -p research/v2/probes/tree && git archive 8e0037f app | tar -x -C research/v2/probes/tree
```

Do not commit the tree or the `snap/` symlink.

## Other probes worth knowing about

- [`../vector-model/src/probe.py`](../vector-model/src/probe.py) is the reviewed calibration probe for the staged vector model. The shipped engine reproduces it as a test fixture (`app/tests/engine/probe-fixture.test.ts`).
- [`../vector-model/review/union_probe.py`](../vector-model/review/union_probe.py) is the 96% finding.
- `app/scripts/calibration.ts` (`npm run calibrate`) prints the shipped calibration tables.
