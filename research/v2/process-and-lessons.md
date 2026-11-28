# How v2 was made, what went wrong, and tips for the next agent

## How the work was orchestrated

v2 was built in about a day and a half (26 Nov evening to 28 Nov morning, 2026) by one orchestrating Claude session. It ran specialised subagents, mostly in parallel, and brought every decision that changed the model's meaning to the user. The orchestrator reviewed and committed everything; **subagents were told never to commit or push**.

### The agents, in order

| Stage | Agents | Output (now in this folder) |
|---|---|---|
| Review of v1 | Security-domain review, quantitative-model review (with engine probes), visual research online, run **in parallel** | [`2026-11-review.md`](2026-11-review.md) |
| Visual mockups, rounds 1–2 | One agent per direction: ops room and field manual (lanes), briefing intro, then blueprint, wargame, transit and Swiss, each in parallel from a shared brief | [`visual-directions.md`](visual-directions.md) |
| Scope | SL5 scope and rogue-AI research online | [`scope-and-rogue-ai.md`](scope-and-rogue-ai.md) |
| SL design | One designer with 13 probes, then an **independent skeptical reviewer** who re-implemented the design from its prose, then a follow-up probe of the user's counter-rule | [`threat-relative-sl.md`](threat-relative-sl.md), [`probes/`](probes/) |
| Visual mockups, round 3 | Catalogue-first: stage matrix, floor plan, clusters, in parallel from [a written brief](#the-catalogue-brief) | [`visual-directions.md`](visual-directions.md) |
| Vector backbone | A mapping agent, then an **independent reviewer** who checked the transcription against the RAND PDF and audited 80 links, then a revision | [`vector-model/`](vector-model/) |
| Build | Phase 1 correctness → Pages v1/v2 deploy and landing page → Phase 2A data and engine → Phase 3A UI and 3B intro (parallel, with split file ownership) → docs refresh | Commits `35540c0` … `9eba10c` |
| Check | **Independent code review** of `ffde5b6..8e0037f` from a clean `git archive` (two medium and five lower-severity findings), then a fix agent that fixed all of them | `f68d5d8`, [`probes/codereview/`](probes/codereview/) |
| After user feedback | Recalibration (engine and data), scoring-mode toggle (UI and store), and this documentation, in parallel with split file ownership | Landed: `22af6de` (scoring mode), `504535e` (this folder), `bbc2c18` (recalibration) |

### Patterns that worked

- **Independent review of every load-bearing artefact.**
  - The SL design, the vector map and the code each got a second agent briefed to be skeptical. It re-derived the key numbers from scratch rather than trusting the author's.
  - The SL reviewer's re-implementation matched to the decimal, which made its criticisms credible.
  - The vector reviewer's 96% probe changed the model's structure.
- **Probes before code.** Every model change was tried in a variant engine with flags, so each mechanism's contribution could be measured: "E3 moves results by ≤2 pp", "the OC5 chains change no verdict". Mechanisms that did nothing were cut.
- **Snapshots for probes.** While another agent edited `app/src/engine/`, the design probes ran against a copy of `ec5d9bd`, and the code review ran against a `git archive` of the commit under review. Numbers stayed reproducible while the tree moved.
- **Explicit file ownership for parallel agents.** For example: "you own `app/src/engine/**`, `app/public/data/**` … the other agent owns `app/src/components/**`". There were no merge conflicts.
- **The user reviews data before engine code.** The vector map went to the user as a review page with seven explicit questions, each with a recommendation, before any engine work.
- **Specs as the hand-off.** The Phase 2 and Phase 3 specs fixed terminology, decisions and the quality bar, so implementers didn't re-litigate decisions.

### Phases

- **Phase 1** (`35540c0`), correctness:
  - one `scorePosture` pipeline, so the views agree;
  - unfunded blocks fall back to baseline;
  - engine-ranked CISO picks;
  - target SL = adversary OC;
  - copy fixes (HW-07, Quiet Tap, unsourced claims);
  - regenerated docs.
- **Phase 2A** (`e2e3fe6`), the vector engine:
  - 38 RAND vectors plus authored own-model vectors, and blocks that declare their counters;
  - six approaches × three stages, the easiest path per approach, and a union campaign with detection;
  - diminishing returns, a RAND 1 read as 2%, the floor once per campaign;
  - threat-relative SL with a configurable bar, level plus progress, and SL5 requiring the own-model insider;
  - meters for capability leakage and integrity, needs-government vectors, the AI-propensity slider;
  - 15 new blocks, 6 merges, 5 reclassifications; chains became scenarios; old ids migrate in links.

  The UI ran on a compatibility layer until Phase 3.
- **Phase 3** (`8e0037f`), the interface: the Swiss catalogue (matrix and clusters), the verdict rail in words, the approaches and race views, block drawer, parameters, story playback, and a 14-slide defender-side intro. v2 got its own storage keys.

## Mistakes and what they taught

### 1. Mocking a secondary view first

- **What happened:** two rounds of visual directions were mocked, and compared on a 9-criterion table, using only the new "Attack Flow" view.
- **The user:** "Where is the catalog? I think you missed the point".
- **Why it was wrong:** the catalogue (posture builder) is where users spend their time and act. A look judged on a secondary view gives a misleading comparison.
- **Lesson:** before briefing mockups, list the app's screens by how much they are used and design the primary one first. Any new view must show how it connects to that one.

### 2. A per-category union that made OC1 96%

- **What happened:** the first approved rule for the vector model was "best vector per category, union across categories". The independent reviewer showed it gives a hobbyist (OC1) a 96% success rate against an undefended lab, while RAND defines SL1 as "likely thwarts OC1". Even with every vector strongly countered, OC5 succeeded 95% of the time.
- **Why it was wrong:** RAND scores **steps that contribute to theft**, against an ordinary company (Box 5.1), not complete thefts. A union of ten categories, each scored as a whole theft, saturates.
- **Fix:** approaches × stages (get in × reach × get out), with the union only across approaches. That gave 0.24–0.31.
- **Lesson:**
  - read what a source's numbers *mean* before composing them;
  - sanity-check every new rule against the anchor the source itself gives ("SL1 holds OC1");
  - probe the undefended and fully-defended extremes first.

### 3. A calibration that blocked SL5

- **What happened:** after staging, no posture reached SL5. That was presented as a feature, since RAND 2024 says "Achieving SL5 is currently not possible", and the user approved it with an invented "future capabilities" toggle and five FUT R&D blocks.
- **After shipping, the user:**
  - "Sl5 should be reached with the catalog. Sl5 is not possible is because research is require for some of the Controls";
  - "The sobering numbers don't sound to good. Are you sure about them?"
- **Why it was wrong:** "not possible today" is a statement about lead times and controls that still need research, not about the maths. A model in which the full catalogue *at maturity* cannot reach the top level says the catalogue is wrong. The numbers were also too pessimistic:
  - the baseline undercounted controls labs already run (nothing started as "deployed"; `partially_deployed` mapped to implementing);
  - AI helped only the attacker;
  - the stacking and partial-only vectors capped the top.
- **Lesson:**
  - calibrate against evidence about real labs today, not against a quoted conclusion;
  - make "unreachable today" come from data such as lead times and research flags;
  - when a probe says "nothing reaches the top level", treat it as a bug report on the model first.

### 4. "Route" → "approach"

- **What happened:** the design, the probes and the reviewed draft data all said "route". After the user approved the data, they asked: "is a route an attack path? maybe its bad terminology". The vocabulary was then fixed as vector / stage / approach / attack path / scenario.
- **Cost:** the Phase 2 spec had to tell implementers to rename `routes.json` to `approaches.json` and "route" to "approach" everywhere. The preserved draft still says "route"; it is kept here as [`vector-model/approaches-draft.json`](vector-model/approaches-draft.json).
- **Lesson:** settle user-facing vocabulary with the user *before* naming files and fields, and write a glossary into the spec.

### Smaller ones

- **An agent simplification overruled domain intuition.** The reviewer's bounded breadth (each tier tries its m easiest routes) was neat and one sentence long, but the user rejected it: "top-priority operation DEFINITELY will try all strategies". Capability, not a quota, keeps low tiers out. Bring such simplifications to the user as an explicit choice, with the intuition stated.
- **Inert machinery.** Half the SL design (persistence, the AI uplift, the illustrative OC5 chains) changed no verdict, or broke the OC4/OC5 distinction. Measure each mechanism's marginal effect before shipping it.
- **Hidden knobs.** Route tags flipped verdicts, and each new strategy adds risk under a union. Keep the list of approaches closed and documented.
- **New blocks and old links.** Old share links loaded new blocks as `not_started` instead of at their baseline, which dropped a v1 default link from SL1 to SL0. Always merge `baselineStates(blocks)` under any persisted state.
- **Stories didn't pin the world.** Captions stated fixed levels, but the reader's bar, AI timeline and serving settings leaked into playback. Stories now pin those settings.

## Tips for future agents

### Running things

- **TypeScript scripts:** `npx tsx` may be blocked. Use `node app/scripts/run-ts.mjs <file>`, which uses Vite's module runner. Write a probe **inside `app/`** so relative imports resolve, read JSON from `app/public/data` with `fs`, and delete it afterwards.
- **Calibration tables:** run `cd app && npm run calibrate` and paste the output over `research/scoring-model.md`, Part 11.
- **Checks:** `cd app && npm run lint && npm test && npm run build`. For engine-only work, `npx vitest run tests/engine tests/utils`.
- **The run skill:** `app/.claude/skills/run-sl5-app/SKILL.md` (skill name `run-sl5-app`) covers the dev server, the browser driver and its flows (`smoke`, `views`, `interact`, `story`, `dark`, `gate`, `intro`, `all`), and the gotchas.
- **Playwright** is not a project dependency. In these cloud containers it has been found at `/opt/node-tools`: run `PLAYWRIGHT_DIR=/opt/node-tools node .claude/skills/run-sl5-app/driver.mjs all` from `app/`. Otherwise check `node -e "console.log(require.resolve('playwright'))"` or install `playwright@1.62.0` in a scratch directory. Set `PLAYWRIGHT_DIR`, not `NODE_PATH`.
- **Ports:**
  - `npm run dev` serves `http://localhost:5173/sl5/`; `npm run preview` serves `http://localhost:4173/sl5/` (build first).
  - Poll **`/sl5/`**, not `/`: the bare root 302s and "succeeds" before anything renders.
  - If a parallel session owns 5173, run `npx vite --port 5199 --strictPort` and pass `--url=http://localhost:5199` to the driver.
- **Viewport:** the app gates below 768px. The driver uses 1600×1000.
- **Python** on downloaded or generated data: run with `python3 -I`.

### Working on the model

- **Authoritative sources:** the code in `app/src/engine/` and `app/public/data/`, and [`../scoring-model.md`](../scoring-model.md). This folder records *why*; it is not loaded by anything.
- **Keep the invariants:** monotonicity (advancing a block never raises any tier's p; higher OC and later years never lower it), determinism, no NaN. `monotonicity.test.ts` and `probe-fixture.test.ts` guard them.
- **Before changing a rule:** write a probe that measures the undefended lab, today's baseline, the stories and the full catalogue at maturity in 2026, 2028 and 2030, served and not served. Compare before and after. The scripts in [`probes/`](probes/) show the style.
- **Keep the approach list closed.** Under the union, every new approach adds risk. Variants inside an approach add none.
- **Authored numbers** (own-model scores, structural placeholders, AI shifts, detection, the floor) are assumptions. Mark them `assumption: true` in data and list them in `scoring-model.md`.

### Working on the product

- **v1 is frozen** at `ec5d9bd` and built by the deploy workflow from that commit. Don't edit it. v2 uses the `sl5v2-*` storage keys.
- **PRs go up ready for review.** A Claude code-review workflow comments on non-draft PRs; handle its comments.
- **Defender-side vocabulary only**, and **no probability percentages** in the UI. Coverage percentages, which are shares of controls, are allowed in coverage mode.
- **Scratchpads are ephemeral.** Anything worth keeping goes into `research/v2/` (research) or the code. The claude.ai review pages are private to the owner and may not be readable by you.

## The catalogue brief

The brief that fixed the mockup mistake, summarised because it is a good template for any future visual round:

- **Why:** the earlier round mocked only one secondary view; the main screen is the catalogue.
- **Data:** use the real blocks, posture and attack paths. Don't invent names. Show plain names first and codes second.
- **Each block encodes:** plain name; defense type by form; all five states; whether it is on a leading path; AI erosion; a "start now" mark for long-lead blocks. One block is shown selected, with its detail card.
- **Rest of the screen:** a header with the year, AI capability and an OC selector with the OC4→OC5 gap; a verdict rail in words with values marked "illustrative"; budget; an optional race strip.
- **Constraints:**
  - no percentages;
  - a 1600×1000 canvas with text at least about 11px;
  - Google Fonts only;
  - match your direction's earlier mockup;
  - at most about 4 screenshot-and-fix rounds.
- **Deliverable:** the screenshot path; how space is organised and why; any invented block → position mapping; 3 strengths and 3 risks, including scaling to ~60 blocks; build effort S/M/L.
