# The reviewed vector model (draft data, 27–28 Nov 2026)

This folder preserves the data the user reviewed and approved before any engine code was written. It maps every defensive block to the RAND attack vectors it counters, and groups the vectors into approaches and stages.

> **This is a draft. The shipped data in [`../../../app/public/data/`](../../../app/public/data/) is authoritative.** Phase 2A turned this draft into the app's `vectors.json`, `approaches.json`, `scenarios.json` and the `counters` field of every `blocks-*.json`, and the data has changed since (see [How this relates to the shipped data](#how-this-relates-to-the-shipped-data)). Use this folder to understand *why* a link or score is what it is, not as a source to load.

## Files

| File | What it is |
|---|---|
| `vectors.json` | 50 vectors: RAND's 38 (Table 5.2 feasibility per OC tier, transcription verified against the PDF), 8 authored own-model vectors V-SELF-1…8 (scored on AI bands AC1–AC5; `assumption: true`), and 4 structural stage placeholders V-X-1…4 (p = 1.0 at an SL1 victim). Each vector has a `stage`, plus `stages_skipped`, `assumes_defense` (residual vectors) and `rapidly_changing`. |
| `control_map.json` | Block → `[{vector_id, strength: strong\|partial, why, type_override?, proposal?}]`. 64 block ids (57 current and 7 proposed), 307 links. |
| `approaches-draft.json` | **Renamed from `routes.json`.** The six headline approaches plus the V-ML-5 capability meter, each with candidate vectors per stage. It was written before the user changed "route" to "approach" (D16), so its contents still say "route". The scripts in `src/` read and write `routes.json`. |
| `proposals.json` | The catalogue changes: merges, new blocks, reclassifications to hybrid, rescopes. All were approved (D15.5). |
| `stories.json` | The seven v1 attack chains re-expressed as vector sequences, with fit notes. These became `scenarios.json`. |
| `catalogues.json` | Which block ids are current or proposed, and declared defense types. The probe reads it. |
| `coverage.md` | **The rationale document** (revision 2): the vector table with GAP flags, weak blocks, choke points, cheap gaps, the calibration probe, routes, open questions, the story check, and the reviewer verdicts not applied as written. Start here. |
| `probe_output.txt` | The output of `src/probe.py`: the calibration table behind decisions D15.1–3. |
| `src/` | The Python that writes and checks the JSON (`build.py` with the `*_data.py` sources, `map_rev2.py` holding the 117-entry audit trail of revision 2, `coverage.py`, `probe.py`). |
| `review/link_verdicts.csv` | The independent reviewer's verdict on 80 links, all strong links included. |
| `review/check_transcription.py` | Checks `vectors.json` against a ground-truth list typed from the RAND PDF layout (Table 5.2, pp. 15–17). |
| `review/union_probe.py` | The reviewer's probe that found the 96% problem (lightly patched to skip the V-X placeholders added later). |
| `review/review-page-decisions.json` | The exact text of the seven decisions and the calibration rows shown to the user on the review page. |

To re-run anything, work in a scratch copy:

```bash
mkdir -p /tmp/vm && cp research/v2/vector-model/*.json /tmp/vm/ && cp research/v2/vector-model/approaches-draft.json /tmp/vm/routes.json
python3 -I research/v2/vector-model/src/probe.py /tmp/vm                    # reproduces probe_output.txt
python3 -I research/v2/vector-model/review/check_transcription.py /tmp/vm/vectors.json   # "issues: 0"
python3 -I research/v2/vector-model/review/union_probe.py /tmp/vm            # OC1 0.96 against an undefended lab
```

Rebuilding the JSON with `src/build.py <repo> <out>` reads v1's block and chain data (`app/public/data/blocks-*.json` and `attack-chains.json`). Those files no longer exist at HEAD. Point it at a checkout of commit `35540c0` (Phase 1), for example with `git worktree add /tmp/p1 35540c0`.

## How the mapping was built

1. **Transcription.** One agent transcribed RAND's Table 5.2 (*Securing AI Model Weights*, RRA2849-1) from `research/rand_full.txt`: 38 vectors in 9 categories, each with a 1–5 feasibility score for OC1–OC5.
   - A RAND score is the chance that **one operation completes this step** against an ordinary company with only ubiquitous security (Box 5.1): 1 = up to 20%, 2 = 20–40%, 3 = 40–60%, 4 = 60–80%, 5 = over 80%.
   - The table itself is RAND's; only the scores and short paraphrased names are reproduced in `vectors.json`, with line references back to the source.
2. **Authored own-model vectors.** Seven, later eight, vectors for the lab's own model as an insider, scored on AC1–AC5 with a one-line rationale each. They are marked as assumptions and grounded in the SL5 Novel Recommendations (see [`../scope-and-rogue-ai.md`](../scope-and-rogue-ai.md)).
3. **Control mapping.** Every block, the 47 existing ones plus the 10 approved Phase-2 blocks, was mapped to the vectors it counters:
   - **strong** means a primary counter;
   - **partial** means it reduces feasibility, or works only with others.

   A block that countered nothing was flagged for folding or dropping. Where a block's declared type was wrong for a particular vector, the link carries a `type_override`; for example, HW-07 confidential computing has no link to V-PHYS-1, because of memory-bus interposers.
4. **Self-check:** every block appears in the map; every vector has a counter or a GAP flag; the JSON parses.

**First-pass headline:**
- 13 of 45 vectors had no strong counter, 5 of them cheap (score ≥3 at OC1–OC3): misconfiguration, ML-stack bugs, planted devices, compromised products and services, and the model manipulating its operators.
- With the 47 v1 blocks alone, 19 vectors had no strong counter, 10 of them cheap. IAM-01, SW-01, KEY-01 and CUS-01 close six of those.

## Transcription verification

An independent agent checked every row against the RAND PDF's layout text (Table 5.2, pp. 15–17).

- **All 38 rows match:** name, category, the five scores, and the asterisk. There are no discrepancies.
- **Interleaved lines.** In the extracted text the "Social engineering*" and "Password brute-forcing" lines are interleaved. The PDF layout confirms 3 4 5 5 5 for social engineering and 2 2 3 3 4 for passwords, as transcribed.
- **"Eight" vs nine.** RAND's prose says *eight* vectors score 1 at OC1–OC3 and more above. The table gives **nine**: V-ACS-2, V-ML-4, V-NET-2, V-PHYS-4, V-PHYS-5, V-PHYS-6, V-PHYS-7, V-HUM-3 and V-HUM-4. The "eight" is a slip in RAND's own text, probably leaving out military takeover (1/1/1/1/2).

The PDF and its full layout text are not copied here; cite RAND RRA2849-1.

## The reviewer's corrections

The reviewer audited 80 links (`review/link_verdicts.csv`) and returned "needs fixes before the user reviews it". The top 15 corrections, all applied in revision 2:

1. **NET-05 → V-NET-1:** strong → partial. Diodes don't stop inbound malware (Stuxnet, Agent.btz), media carried in by insiders, or induced emergency links.
2. **KEY-01 → V-ACS-4:** strong → partial. RAND's cases are third-party roots (Comodo, DigiNotar, Flame). NET-03 and SC-07 were added as partials.
3. **PER-08 → V-SUP-3:** strong → partial. On-site contractors, colo and cloud staff, and subcontractor credentials remain.
4. **PER-08 → V-BYP-3:** strong → partial; **IAM-01 → V-BYP-3:** partial → strong. RAND's examples are password recovery, break-glass, impersonation and legacy authentication.
5. **AI-08 → V-ML-3:** strong → partial; **AI-09 → V-ML-3:** partial → strong; AI-01 → V-ML-3 added as partial. Injection filters can be bypassed.
6. **AI-07 → V-ML-5:** strong → partial. Rate limits only slow distillation, which gets its own meter.
7. **NET-01 → V-SELF-3:** strong → partial. The escape that matters is internal.
8. **AI-12 → V-SELF-5:** strong → partial. Lineage proves provenance, not soundness.
9. **SC-07 → V-SUP-2:** strong → partial. Only critical components are built in-house.
10. **V-SELF-1 split** into weights self-exfiltration (V-SELF-1) and self-distilled data (new V-SELF-8). NET-04 and AI-11 are strong only on the weights.
11. **Removed** HW-04/KEY-01 → V-PHYS-5 and PHY-03 → V-PHYS-4, because they contradict `assumes_defense`. PHY-04 was taken off V-PHYS-4's assumed defenses.
12. **AI-04 → V-SELF-6:** hybrid `type_override`; quotas are software.
13. **IAM-01 → V-CRED-1** is strong only if IAM-01 covers help-desk and recovery identity proofing. Its scope was extended to do so.
14. **KEY-01 → V-BYP-1 and V-CRED-3:** none → partial, since either one exposes only ciphertext.
15. **NET-02 → V-NET-2:** none → partial. HW-05 and PHY-02 are strong on EM side channels only.

**Own-model scores.** Four of the seven authored vectors were a bare 1-2-3-4-5 ramp, i.e. placeholders.
- V-SELF-6 became 2 3 4 5 5 and V-SELF-7 became 2 2 3 4 5.
- V-SELF-4 (covert and side channels) became residual on NET-04 and AI-07.
- V-SELF-1 was re-judged to 1 2 4 5 5.

**Reviewer findings the author did not apply as written** (full table at the end of `coverage.md`):
- PER-06 moved from the human-intelligence vectors to the insider's standing access (V-X-1). Dual authorisation limits what an insider can do, not whether one is recruited, and keeping it on both stages would count it twice.
- "Top-k route breadth" was not applied, because the user ruled that every attacker tries every approach (D9).

**Gaps the reviewer added, which became the 5 new blocks of D15.5:**
- patch and endpoint management (END-01);
- configuration integrity, a RAND SL3 gold image (CFG-01);
- investor and governance vetting (GOV-01);
- access-control assurance (ACA-01);
- a hardened weight-access interface (SRV-01).

## The staging fix: 96% → 0.24–0.31

**The problem.** The rule first approved was "best vector per category, union across categories". The reviewer's `union_probe.py` showed that, with nothing defended, **OC1 succeeds 96% of the time** against an SL1-grade victim, while RAND defines SL1 as "likely thwarts OC1". Even with every vector strongly countered (×0.3), OC1 still succeeded 56% of the time and OC5 95%. No tier could get under the 1-in-5 bar.

**The cause.** RAND scores steps that "contribute to" theft (Box 5.1), not whole thefts. Ten categories, each scored as a complete theft, add up.

**The fix.** Approaches × stages:
- every vector belongs to a stage: **entry** (get a foothold), **reach** (get to the weights or their keys) or **exfil** (get them out);
- an approach takes the attacker's best vector at each stage it needs, and path success is the product over stages;
- the union is taken only across approaches;
- structural placeholders V-X-1…4 stand for "nothing stops this stage" at an SL1 victim (p = 1.0), so stage controls such as NET-04, the bandwidth cap, have something to act on.

**Result** (`probe_output.txt`, a RAND 1 read as 0.05):

| Undefended lab | OC1 | OC2 | OC3 | OC4 | OC5 |
|---|---|---|---|---|---|
| Category union, before staging | 0.96 | 0.99 | 1.00 | 1.00 | 1.00 |
| Staged, model served | **0.31** | 0.63 | 1.00 | 1.00 | 1.00 |
| Staged, model not served | **0.24** | 0.50 | 0.99 | 0.99 | 1.00 |

OC1 was still above the bar. The remote approach alone gives 0.15, and the rest comes from the 0.05 reading of a RAND "1" on approaches OC1 can barely run. Reading a 1 as 0.02 brings OC1 (not served) to 0.19, which is decision 3 below.

Staging still left **nothing reaching SL5**. The full proposed catalogue, eroded, reached about SL3; without erosion, SL4. That fed decision 4.

## The seven approved decisions

On 28 Nov the user answered the review page's seven questions with "all recommended". They are summarised here; the full options and rejected alternatives are in [`../decisions.md`](../decisions.md#d15-seven-model-decisions-all-recommended), and the exact text is in `review/review-page-decisions.json`.

1. **Approaches × stages.** Easiest path per approach; every attacker tries every approach.
2. **Diminishing returns.** The best strong counter ×0.3, then ×0.8 / ×0.9 / ×0.95; partials never beat one strong counter.
3. **A RAND score of 1 reads as 2%.**
4. **SL5 unreachable, plus a "future capabilities" switch** with labelled R&D blocks. **Reversed on 28 Nov** (D23): the full catalogue must reach SL5, and research-heavy controls are flagged instead.
5. **Catalogue changes** from `proposals.json`: 6 merges, 5 new blocks, 5 reclassifications to hybrid, 3 rescopes.
6. **"Needs government"** for V-PHYS-7 (military seizure) and V-HUM-5 (leadership-approved access), reduced by the government-partnership setting.
7. **The AI insider** is scored against the year's AI band, with a propensity setting; integrity stays outside the SL.

## How this relates to the shipped data

Phase 2A built the app's data from this draft. Known differences (check `scoring-model.md` Part 12 and the data for the current state):

- **Files:**
  - `routes.json` became `app/public/data/approaches.json`, using "approach" throughout;
  - `stories.json` became `scenarios.json`;
  - the control map moved into each block as `counters`.
- **A RAND "1" is read as 0.02** in the app, not 0.05. `tests/engine/probe-fixture.test.ts` still reproduces this folder's `probe.py` numbers by running the engine under the probe's conditions (a 1 read as 0.05, no AI, no detection, no floor).
- **Documented departures from the probe:**
  - residual vectors are always candidates;
  - the stacking ladder is ordered by reach, to stay monotone with fractional effectiveness;
  - sabotage (V-SELF-5) moved to the integrity meter.
- **App-only mechanics** not in the probe: block states and sliders, the per-vector attacker AI shift, detection q, the residual floor, government relief and AI propensity.
- **Catalogue:** the shipped catalogue applies `proposals.json` in full, giving 56 blocks.
  - Phase 2A also added five FUT-01…05 R&D blocks behind a toggle (decision 4). The recalibration after D23 removes them.
  - The recalibration may also change baseline states, counter links and constants. Where this folder and `app/public/data/` disagree, **the shipped data wins**.
