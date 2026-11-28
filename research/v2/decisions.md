# v2 decision log

A chronological record of the decisions behind SL5 Explorable v2, made between 26 and 28 November 2026. It expands the orchestrating agent's working log. For each decision it gives the options that were on the table, what was chosen, why, who decided, and what was rejected.

- **User** means the repository owner. **Agent** means the orchestrating Claude session or one of the subagents it ran (reviewers, designers, implementers).
- Quotes are the user's own words, verbatim, typos included.
- **Status:** *Active* (holds in the shipped code), *Superseded* (replaced by a later decision), *Reversed* (undone), or *Done* (a one-off that is finished).
- Where this log and the code disagree, the code and [`../scoring-model.md`](../scoring-model.md) win.

The review pages linked below are claude.ai artifacts. They are **private to the repository owner**; everyone else should read the copies in this folder.

## Index

| # | Date | Decision | Decided by | Status |
|---|---|---|---|---|
| [D1](#d1-commission-an-independent-review-of-v1) | 26 Nov | Review v1 with three parallel reviews | User asked, agent structured | Done |
| [D2](#d2-model-first-then-visuals) | 26 Nov | Fix the model first, then the visuals | User | Active |
| [D3](#d3-grow-the-catalogue) | 26 Nov | Grow the catalogue | User | Superseded by D13 |
| [D4](#d4-breach-is-per-campaign-not-cumulative) | 26 Nov | Breach = one campaign against this year's posture | User | Active |
| [D5](#d5-numbers-are-deliberately-vague) | 26 Nov | Bands and words, no percentages | User (principle), agent (vocabulary) | Active |
| [D6](#d6-scope-includes-rogue-ai) | 26 Nov | Scope: weights first, rogue AI included | User asked, agent recommended | Active |
| [D7](#d7-a-threat-relative-security-level) | 26–27 Nov | Threat-relative SL, after a design and an independent review | User | Active |
| [D8](#d8-the-bar-is-1-in-5-and-configurable) | 27 Nov | "Holds" = under 1 in 5, configurable | User | Active |
| [D9](#d9-every-attacker-tries-every-approach) | 27 Nov | Every attacker tries every approach it can afford | User (overruled the agent) | Active |
| [D10](#d10-rogue-ai-option-a) | 27 Nov | SL5 also requires holding the own-model insider | User | Active |
| [D11](#d11-sl-is-a-level-plus-a-progress-bar) | 27 Nov | SL shown as a level plus a progress bar | User accepted agent's pick | Active |
| [D12](#d12-coverage-survives-as-programme-completeness) | 27 Nov | Keep coverage as "programme completeness" | Agent | Active (see D25) |
| [D13](#d13-rebuild-the-backbone-on-rands-attack-vectors) | 27 Nov | Rebuild the model on RAND's attack vectors | User accepted agent's recommendation | Active |
| [D14](#d14-the-vector-map-is-independently-reviewed) | 27 Nov | Independent review of the vector map | Agent | Done |
| [D15](#d15-seven-model-decisions-all-recommended) | 28 Nov | Seven model decisions, "all recommended" | User | Active, except 4 (reversed) |
| [D16](#d16-terminology) | 28 Nov | Vector / stage / approach / attack path / scenario | User | Active |
| [D17](#d17-engine-choices-inside-the-approved-frame) | 28 Nov | Detection, floor, AI uplift, meters | Agent | Active |
| [D18](#d18-visual-direction-swiss-catalogue-first) | 26–27 Nov | Swiss look; stage matrix and clusters; no floor plan | User | Active |
| [D19](#d19-defender-side-framing) | 27 Nov | Everything written from the defender's side | User | Active |
| [D20](#d20-ship-v1-and-v2-side-by-side) | 28 Nov | v1 frozen, v2 beside it, version picker | User | Active |
| [D21](#d21-prs-go-up-ready-for-review) | 28 Nov | PRs ready for review, not draft | User | Active |
| [D22](#d22-implementation-phases-and-code-review) | 27–28 Nov | Phased build, then an independent code review | Agent | Done |
| [D23](#d23-sl5-must-be-reachable-with-the-catalogue) | 28 Nov | SL5 reachable with the full catalogue; research-required flags | User | Active (`bbc2c18`); open questions |
| [D24](#d24-recalibrate-the-sobering-numbers) | 28 Nov | Recalibrate against evidence about today's labs | User asked | Active (`bbc2c18`); open questions |
| [D25](#d25-a-setting-for-the-scoring-method) | 28 Nov | Setting: attack-path analysis or control coverage | User | Active (`22af6de`) |
| [D26](#d26-document-the-research-in-the-repo) | 28 Nov | Put the research in the repo | User | This folder |

---

## 26 November: review and model semantics

### D1. Commission an independent review of v1

- **Ask (user):** "Think about the concept and if we've missed something, if we made any structural mistake, or technical mistake about cybersecurity or some improvements regarding cybersecurity". On visuals: "Try to use skills or get inspiration online … Use subagents as needed."
- **Chosen (agent):** three reviews run in parallel against v1 at commit `ec5d9bd`:
  1. security domain, with the catalogue checked against the SL5 Standard and RAND;
  2. quantitative model, with probes that ran the real engine;
  3. visual research online.

  The three were merged into one report with mockups that used real engine output. It is preserved as [`2026-11-review.md`](2026-11-review.md); the original was the private artifact https://claude.ai/artifact/2KnTxitQ29385dWgeVH81h.
- **Outcome:** ten headline findings and six open questions for the user (D2–D7 below).

### D2. Model first, then visuals

- **Options:** fix the model first, so new views show correct numbers (recommended); or build the new "Attack Flow" view first.
- **Chosen:** model first. User: "Yes".
- **Status:** active. The build ran Phase 1 (correctness), then Phase 2A (vector engine), then Phase 3 (UI).

### D3. Grow the catalogue

- **Options:** keep 47 blocks and 7 chains, or grow to about 53 blocks and 12 chains (SW-01, IAM-01, KEY-01, CUS-01, DET-01, DEC-01, and chains such as "The Golden Key" and "The Trusted Dependency").
- **Chosen:** grow. User: "Yes".
- **Status:** superseded by D13. The blocks were added, but chains stopped being the scoring basis, so the new chains were never written. The shipped catalogue has 56 blocks (47 + 15 new − 8 absorbed + 2 merged ids).

### D4. Breach is per campaign, not cumulative

- **Options** (review question 2):
  - one determined campaign against this year's posture;
  - cumulative, "breached by 2030".

  v1's headline was neither: the worst single chain, with no time window.
- **Chosen:** per campaign. User: "Anyway I think it's simpler to represent "per campaign" and not cumulative".
- **Rejected:** the review's proposed cumulative "breached by year T" line was never built.

### D5. Numbers are deliberately vague

- **User:** "We can't really statistically analyze and provide any concrete probabilities. The numbers should be somewhat vague and represent points, capability, chance etc."
- **Vocabulary options:**
  - percentages (v1);
  - RAND's 1–5 feasibility score;
  - the seven ICD 203 estimative words;
  - a three-state verdict.
- **Chosen:** a three-state verdict per attacker tier, *usually fails / contested / usually succeeds*, with the ICD 203 word in the hover. The UI shows no probability percentages. Money and lead times are shown as ranges.
- **Decided by:** the user set the principle; the agent and the SL reviewer chose the words.
- **Rejected:**
  - the design's "holds / contested / loses". The reviewer warned that "holds" at 19% for a *single* operation reads as "safe".
  - the design's "at risk" qualifier. It reads as "under attack", so it became `marginal`.

### D6. Scope includes rogue AI

- **User:** "Is it part of the sl5 standard to some extent? Remember that sl5 now also deals with rogue ai (look online)".
- **Research (agent):** see [`scope-and-rogue-ai.md`](scope-and-rogue-ai.md). The SL5 Standard (v0.1.x) names misaligned AI as "a distinct form of insider threat" but has no controls specific to it. The SL5 Task Force's AI705 work scores four losses, L-1 to L-4.
- **Chosen (agent recommendation, accepted through D10 and D15.7):**
  - **Primary:** confidentiality of the weights (L-1). This is what the SL measures.
  - **Secondary**, as meters outside the SL:
    - capability leakage (distillation, part of L-2);
    - integrity (sabotage, L-3);
    - the AI insider (the own model getting out, L-1 and L-4).
- **Not built:** the scope research also proposed AI-13 sabotage audits, AI-14 a containment playbook, AI-15 compute attestation and PER-10 insight compartmentalisation. AI-09 to AI-12 were built; the other four were not.

### D7. A threat-relative security level

- **Problem:** v1's SL was a coverage index, 0.3·min + 0.7·mean of category scores, with no reference to any attacker. RAND's SL-n means "robust against OC-n".
- **User:** "Yes, but you need to dig into this and possibly discuss or at least give for review to another agent".
- **Process:** one agent wrote a deep design with 13 probes. An independent agent reviewed it: "adopt with changes … Cut about half the engine machinery." Details are in [`threat-relative-sl.md`](threat-relative-sl.md).
- **Converged rule:** tier *n* holds if one campaign by an OC-*n* attacker succeeds less often than the bar τ. SL is the highest *n* with every tier up to *n* held.
- **Rejected from the design:**
  - persistence ρ derived from the OC time horizons;
  - the campaign-level AI uplift U = 1, which merged OC4 into OC5 by 2030;
  - the unsourced 0.45 hard-stop band;
  - the illustrative OC5-only chains, which changed no verdict;
  - the separate AC/Containment-Level axis;
  - UI hysteresis.

## 27 November: SL rules, the vector backbone, visuals

### D8. The bar is 1 in 5, and configurable

- **Options:**
  - τ = 20%, which is RAND's score-1 boundary and the ICD 203 "very unlikely" edge;
  - a literal reading of "likely thwart", up to about 45%;
  - stricter bars.
- **Chosen:** 1 in 5 by default, framed as a modelling choice ("about 1 in 5"), not as "RAND says infeasible". The agent's example for the user: the Proactive story reached SL4 at 1 in 5 but only SL3 at 1 in 10. User: "OK; maybe this should be configurable somewhere ? (advanced settings, parameters, etc.)". The shipped presets are strict 1/10, standard 1/5 and lenient 1/3, under "How strict is 'stops'" in Parameters.
- **Rejected:** ≈45%. It would let a posture "hold" against a nation-state that succeeds four times in ten.

### D9. Every attacker tries every approach

- **Agent proposal:** the SL reviewer's "simplest viable alternative", bounded breadth. OC1–OC3 use their one easiest route, OC4 its two easiest and OC5 its three easiest: m = (1, 1, 1, 2, 3). The agent's analogy: "a burglar tries the front door; a professional crew tries the door, the window and the roof together".
- **User:** "I don't understand this. A cyber operation may try hunderds of "doors" until it finds a path. or am i misunderstanding?"
- **Agent's clarification:**
  - a "route" is a whole attack *strategy*, and the "hundreds of doors" are already counted inside each strategy's chance;
  - the open question was how many strategies an attacker can run at full strength at once.
- **The two options then put to the user:**
  - *Breadth depends on resources* (agent's preference): one strategy for a hobbyist, two for a nation-state service, three for a top-priority operation, with an Advanced setting to switch to "every strategy".
  - *Everyone tries every strategy*: simpler to explain; low tiers still fail at what they can't afford. The catch: the score depends on how many strategies are written down. The reviewer measured two new routes pushing a solid posture from SL4 to SL3.
- **User:** "i definitely don't agree with you. top-priority operation DEFINITELY will try all strategies; for nation-state i'm not sure how many but could be more than 2. and for lower tier some of the strategies are not really relevant or 0% chance".
- **Agent's response:** the catalogue-size catch was handled by keeping the list of strategies **closed**, so variants inside a strategy add nothing.
- **Chosen:**
  - every tier tries every strategy on a *closed* list;
  - within a strategy it uses its best variant;
  - strategies combine as a union, 1 − ∏(1 − p);
  - low tiers are kept out only by capability (RAND's low feasibility scores), not by a breadth cap.
- **Evidence:** the reviewer's follow-up probes (r6–r8) showed the union is monotone and that adding a variant inside a strategy changes nothing. They also showed it creates **no SL4/SL5 gap on its own**; that has to come from data. See [`threat-relative-sl.md`](threat-relative-sl.md#4-the-union-across-strategies-probe).
- **Rejected:**
  - bounded breadth m = (1, 1, 1, 2, 3);
  - worst chain only;
  - persistence-weighted retries.

### D10. Rogue AI: option A

- **Options:**
  - **A:** SL5 also requires holding the "own model as insider" approach. Below SL5 it is reported but not required.
  - **B:** keep a separate Containment Level on its own AI-capability scale (AC1–AC5), independent of SL.
- **Chosen:** A. User: "A yes".
- **Why:** the SL5 Standard calls misaligned AI an insider threat whose mitigations "substantially overlap with nation-state defenses". The reviewer argued that a parallel ladder adds two acronyms for policymakers, rests on an unverified source, and reuses the attacker AI curve a fourth time.
- **Rejected:** B, the AC/CL ladder.

### D11. SL is a level plus a progress bar

- **User:** "In the original simulator, i could reach sl2.3; do you keep this feature? or are you going to change it to discrete?"
- **Context given:** v1's 2.3 came from the coverage score, which any click nudged, even one irrelevant to the attacker. That score survives as programme completeness. Under a threat-based SL, a defense that blocks no approach the attacker would use leaves the SL where it is. That is deliberate.
- **Options:**
  - (A) **Whole levels only**, "SL2 (marginal)": honest and vague, but many clicks won't move it, which can feel unresponsive. This was the design's choice.
  - (B) **Continuous**, "SL 2.3": the strongest attacker held off, measured between tiers. 2.3 means OC2 is stopped and the posture is about a third of the way to stopping OC3. It never gets worse when a defense is added.
  - (C) **Level + progress bar**, "SL2 ▰▰▰▱▱▱ toward SL3": the same calculation as B, drawn as a bar.
- **Chosen:** C, with the decimal shown on hover. The agent recommended it because it keeps the sense of progress of v1's 2.3 and fits the vague-numbers rule; the user replied "your pick sounds good". A `marginal` mark flags a held tier that sits close to the bar.

### D12. Coverage survives as "programme completeness"

- **Chosen (agent, on the design's and the reviewer's advice):** keep v1's coverage number, renamed and demoted to a secondary readout. It answers a real question, how much of the catalogue is built, but says nothing about which attackers are stopped.
- **Status:** active. D25 adds a setting to make it the headline again.

### D13. Rebuild the backbone on RAND's attack vectors

- **User challenge:** "But i'm wondering if that whole algorithm would work well. Do we really have attack paths that are this good? and covering all cases? i'm not sure. How was the original standard / docs talking about this? Think about it - if there is a control that doesn't have an attack path through it, it will never matter to anything in our simulator. then why is it there at all?..."
- **What the sources say (agent):**
  - RAND builds its levels from about 38 attack vectors in 9 categories (Table 5.1), each with an expert feasibility score for each OC tier (Table 5.2).
  - A measure goes in the lowest SL whose OC can feasibly use the vector it counters, where feasible means a score above 1.
  - The SL5 Standard is a control overlay on NIST SP 800-53, not a set of attack paths.
- **Options:**
  - **A.** Use RAND's vectors as the backbone. Every control maps to the vectors it counters, and a test fails if one maps to none, which answers "why is it there?" by construction. The attacker tries every category it can afford. The chains become stories.
  - **B.** Keep chains, but write about 30 of them to cover everything. Still arbitrary authoring, just more of it.
  - **C.** A pure checklist: SL is whichever RAND or SL5 benchmark list you've completed. Faithful to the sources, but static. It ignores attacker capability, AI uplift and the year, which is most of what makes this an explorable.
- **Chosen:** A. The agent recommended it ("the version a security expert can't easily dismiss"; effort L, mostly data work), and the user replied "yes let's go with your recommednation".
  - Every block must counter at least one vector, or be flagged, merged or dropped.
  - The old chains become illustrative **scenarios** that do not score.
  - In v1, 28 of 47 blocks sat on no chain.
- **Rejected:** B and C, for the reasons above. v1 had patched the gap with "supporting families", where blocks earned partial credit for sharing a group with a chain step. The review had flagged that credit as nonsense, for example link encryptors reducing API distillation.

### D14. The vector map is independently reviewed

- **Chosen (agent):**
  1. one agent transcribed Table 5.2 and mapped the controls;
  2. a second agent checked the transcription against the RAND PDF and audited 80 links;
  3. the mapping was revised;
  4. it went to the user as a review page before any engine code: https://claude.ai/artifact/HHF2qoBJJuv7ydggFPig5X (private).
- **Findings:**
  - All 38 rows matched the PDF.
  - About 15 links were corrected.
  - Scoring every category as a whole theft gave an undefended lab a 96% loss to OC1.

  See [`vector-model/README.md`](vector-model/README.md).

## 28 November: the seven decisions, terminology, release

### D15. Seven model decisions, "all recommended"

The vector review page put seven questions to the user, each with a recommendation. The user answered "all recommended". The exact text shown is in [`vector-model/review/review-page-decisions.json`](vector-model/review/review-page-decisions.json).

1. **Score attacks as approaches made of three stages.**
   - Six approaches: remote intrusion, insider, physical, supply chain, served model, AI insider.
   - Within each, the engine finds the attacker's easiest attack path, one vector each for *get in → reach the weights → get them out*. The campaign is the union across approaches.
   - *Rejected:* each vector as a complete theft. RAND scores steps that "contribute to" theft (Box 5.1); scored as whole thefts, an undefended lab loses to OC1 96% of the time.
2. **Diminishing returns.**
   - The best strong counter multiplies a vector's chance by about 0.3. Further counters multiply by ×0.8, then ×0.9, then ×0.95.
   - Partial counters together never beat one strong counter.
   - *Rejected:* independent multiplication, which rewards piling up weak controls and splitting one block into two (a v1 finding).
3. **A RAND score of 1 reads as a 2% chance.**
   - *Options:* 10%, 5%, 2%, 0%.
   - At 5% an undefended lab still loses to a hobbyist about 3 times in 10, so SL1 would fail against OC1, which contradicts RAND's "SL1 likely thwarts OC1".
4. **SL5 unreachable, plus a "future capabilities" switch.**
   - The recommendation was to keep SL5 honest by default and add 3–5 clearly labelled R&D blocks (FUT-01…05) behind a toggle, to show what SL5 would take.
   - **Reversed on 28 Nov** (D23).
5. **Catalogue changes.**
   - *6 merges:* AI-03 → AI-07/08; HW-10 → HW-06; PER-07 → PER-02; PER-05 → PER-03; SC-02/05/06 → SC-08; PHY-05 → PHY-08.
   - *5 new blocks:* END-01 patching and endpoints; CFG-01 configuration integrity; GOV-01 governance and investor vetting; ACA-01 access-control verification; SRV-01 hardened weight-access interface.
   - *5 reclassifications to hybrid:* AI-06, HW-07, SC-07, HW-05, AI-04.
   - *Rescopes:* IAM-01, AI-05, AI-01.
6. **"Needs government."**
   - Military or police seizure (V-PHYS-7) and access approved by the lab's own leadership or owners (V-HUM-5) have no lab-level counter.
   - They keep scoring, carry a badge, and are reduced by the government-partnership setting, so users see that part of SL5 is a policy question.
   - *Rejected:* dropping them, which would hide the policy dependency.
7. **The AI insider.**
   - It is scored against the current year's AI capability band, AC = 1 + 4·aiCap (an authored assumption), with a separate "propensity to try" setting (`ai_propensity`, default 0.5).
   - Sabotage and integrity stay outside the SL, in their own meter.
   - *Considered, not adopted:* the reviewer's "AC+1 stress" toggle.

### D16. Terminology

- **User:** "is a route an attack path? maybe its bad terminology".
- **Chosen:** the agent proposed five terms, noting that "route" had been covering two different things, and the user replied "ok". "Avenue" and "line of attack" were considered for "approach" and rejected; "approach" is plain English and doesn't clash with "path". The terms are used in UI, code and data:
  - **attack vector:** one technique (RAND's term);
  - **stage:** get in / reach the weights / get them out;
  - **approach:** a broad way in (insider, remote intrusion, physical, supply chain, served model, AI insider). Never "route";
  - **attack path:** one vector per stage chained together; the engine finds the easiest one per approach;
  - **scenario:** a path told as a story (the old chains).
- **Note:** the reviewed draft data predates this and still says "route". It is kept here as [`vector-model/approaches-draft.json`](vector-model/approaches-draft.json).

### D17. Engine choices inside the approved frame

These were made by the agent in the Phase 2 spec, inside the user's decisions. They are documented in `scoring-model.md`.

- **Detection.**
  - The campaign tries approaches in descending order of success. A failed attempt is caught with probability *q*, and that ends the campaign: `P = Σ_k p_k · Π_{j<k} (1 − p_j)(1 − q)`.
  - *q* grows with DET-01 and DEC-01 up to about 0.5, and erodes with AI.
  - The SL reviewer's probe showed detection is a real lever for balanced postures and does nothing when one approach dominates.
- **Residual floor:** once per campaign, never per vector. v1 applied it per chain, so floors added up across chains.
- **Attacker AI uplift:** a per-vector `ai_shift`, giving effective tier = OC + shift·aiCap. AI is counted once per number.
- **Distillation** (V-ML-5) leaves the SL and breach and becomes the capability-leakage meter. The model-served toggle switches the served-model approach on and off.
- **Sabotage** (V-SELF-5) becomes the integrity meter.

### D18. Visual direction: Swiss, catalogue first

Full record with images: [`visual-directions.md`](visual-directions.md).

- **Round 1** (in the review): attack-flow lanes, in a dark ops-room look and a light field-manual look, plus a "briefing dossier" intro.
- **Review question 4.** User: "Let's think of more alternatives and compare all the alternatives". Round 2 added four directions (blueprint, wargame, transit map, Swiss signal) and a scored comparison: https://claude.ai/artifact/MmfzgFFbzfHuZ8HKWkh9kF (private).
- **Mistake.** Only the attack-flow view had been mocked. User: "But you only designed the view with the lines per attack story. Where is the catalog? I think you missed the point". Round 3 mocked the catalogue first: stage matrix, facility floor plan, evolved clusters.
- **User decisions:**
  - "Stage matrix is pretty good, but maybe also the evolved clusters. maybe we should have both views available" → both views ship.
  - "Facility plan is nice in theory but i would completely skip it" → dropped.
  - "THe designs later a bit too catchy, but the first one (the recommended) is decent" → Swiss signal. Transit, blueprint, wargame and ops room were rejected.
  - Intro: "the new breifing intro is cool in it's CONTENT, but i don't like this style too much … remember that the simulator is for the defenders to plan defences, not plan attacks..." → keep the content, drop the dossier styling (D19). The agent had built the style from intelligence-dossier conventions (classification banners, an actor file, a threat-tier stamp) and agreed it dressed the tool up as the attacker's file.

### D19. Defender-side framing

- **Chosen (user, through D18):** every label is written from the defender's side: "Where you're exposed", "Approaches still open", "Next defense to fund", "What still gets through".
- **Banned:** "Attack flow", "Seven ways in", "victory", dossier styling, threat-actor files, stamps.
- **Result:** the v2 intro was rewritten as a 14-slide deck in the app's Swiss style.

### D20. Ship v1 and v2 side by side

- **User:** "i want to keep the old version as v1, and this as v2; so they both should be accesible somehow from my github pages. possibly even with a page coming in with selection of which version to choose, maybe nicely designed with thumbnails or some styling".
- **Chosen:**
  - v1 is frozen at commit `ec5d9bd` and served at `/sl5/v1/`; v2 is at `/sl5/v2/`.
  - A Swiss-style version picker with thumbnails sits at `/sl5/`.
  - Old links (`/sl5/?state`, `/sl5/intro/`) redirect to v1.
  - v2 uses its own storage keys (`sl5v2-state`, `sl5v2-scenarios`, `sl5v2_intro_seen`), because both versions share one origin.
  - Commit `ffde5b6`.

### D21. PRs go up ready for review

- **User:** "main moved forward with automated code review, so when you open a pr put it in review (not draft) and listen and handle comments coming in".
- **Chosen:** PRs are opened ready for review. PR #27 carries all v2 work.

### D22. Implementation phases and code review

| Phase | Commit | What |
|---|---|---|
| 1 | `35540c0` | Correctness fixes: one scoring pipeline, a real budget cap, engine-ranked CISO picks, the review's copy fixes |
| Pages | `ffde5b6` | v1 and v2 side by side, version picker |
| 2A | `e2e3fe6` | The vector engine and the threat-relative SL ([phase spec summary](process-and-lessons.md#phases)) |
| 3 | `8e0037f` | The v2 interface: Swiss catalogue, verdict in words, defender-side intro |
| Docs | `9eba10c` | README versions, model doc, research banners |
| Review fixes | `f68d5d8` | Fixes for the independent code review's two medium findings |
| Scoring mode | `22af6de` | The scoring-method setting (D25) |
| Research docs | `504535e` | This folder (D26) |
| Recalibration | `bbc2c18` | SL5 reachable with the catalogue, research-required flags, evidence-based baseline, defender AI (D23, D24) |
| Proactive split | see git log | Realistic Proactive ends at SL4; the old schedule becomes the Crash Program (D27) |

The independent code review of `ffde5b6..8e0037f` found two medium bugs, both fixed with tests:
1. a story played over a shared link could overwrite the reader's saved posture;
2. old share links loaded new blocks as `not_started` instead of at their baseline.

`f68d5d8` also fixed its five lower-severity findings: stories now pin the bar, AI timeline, propensity and serving so captions match the rail; the drawer shows budget-capped states; next-defense costs show only what is left to pay; the race view stopped recomputing every frame; and the Versions link works in dev.

It found nothing serious in the engine: about 10,800 random property trials with no monotonicity violations and no NaN.

## 28 November: feedback after v2 shipped

### D23. SL5 must be reachable with the catalogue

- **User:** "Sl5 should be reached with the catalog. Sl5 is not possible is because research is require for some of the Controls".
- **Chosen:**
  - The full catalogue, at maturity, must reach SL5.
  - What makes SL5 unreachable *today* is research and lead time on the research-heavy controls, not the maths.
  - Retire the invented FUT-01…05 blocks and the future-capabilities toggle. Flag the existing research-heavy controls with `research_required` instead.
- **Reverses:** D15.4.
- **Why D15.4 was wrong:** it treated RAND's 2024 "Achieving SL5 is currently not possible" as a property of the catalogue. The constraint is that some controls cannot yet be built.
- **What was done** (commit `bbc2c18`, with D24; details in [`scoring-model.md`](../scoring-model.md) Parts 3, 7 and 12):
  - **FUT blocks retired.** `blocks-future.json` and the toggle are gone from the data, engine, store, view bar, Parameters and Race view. Old saves and share links drop the FUT ids and the toggle. The catalogue is 56 blocks.
  - **Seven controls flagged `research_required`**, each with a one-line `research_note`: HW-04 chip-level tamper protection, HW-06 execution integrity verification, SRV-01 the hardened weight-access and serving interface, ACA-01 access-control verification, AI-02 decorrelated multi-model review, AI-10 AI-control protocols and SC-03 adversarial content screening. Where the data called the work research-grade, lead times were lengthened (for example SRV-01 18–36 → 36–60 months, AI-10 12–24 → 36–60), so a programme that starts them in 2026 lands them in 2029–2032. The drawer and the tile's label show the flag. Otherwise they are ordinary blocks.
  - **Erosion is read relative to what a control was built for.** `erosion tier = max(1, tier − DESIGN_TIER_RELIEF × (first_required − 1))`, with `DESIGN_TIER_RELIEF` = 0.75. Before, every SL5-grade probabilistic control kept 40% of its effect against OC5 at every stage, so even the mature catalogue could not hold OC5. Without the relief it is SL4.80 in 2026.
  - **The served approach got an exit stage.** Model extraction (V-ML-4) used to skip *reach* and *get out*, which left a floor no counter could pass. It now exits through a new structural vector, V-X-5 (weight-scale volume out through the API), metered by AI-07 (strong) and SRV-01 (partial).
  - **31 vector-map links changed**, mostly strong counters on the controls the SL5 benchmark relies on, the research-required ones above all. They are listed with reasons in `scoring-model.md` Part 12.
- **Result** (default world, model served):
  - The mature catalogue is **SL5 in 2026, 2028 and 2030, but marginal**: OC5 succeeds 0.17–0.19 of the time against a bar of 0.20. In a favourable world it is clear (0.07–0.08).
  - **Without the research-required controls it is not SL5:** SL4.84 in 2026, SL3.94 in 2030. Without SRV-01 alone there is no SL5.
  - The Proactive story reaches SL5 in 2030 only because it starts the research controls in 2024.
  - So research and lead time keep SL5 out of reach today, not the arithmetic.
- **Status:** active. The open questions it raised are listed [under D24](#open-questions-from-the-recalibration).

### D24. Recalibrate the "sobering" numbers

- **User:** "The sobering numbers don't sound to good. Are you sure about them?"
- **Evidence:** in the v2 calibration as first shipped (default world, model served):
  - the 2026 baseline was SL1 and marginal, falling below SL1 by 2028;
  - the Proactive story reached only SL3 in 2030;
  - the full catalogue never passed SL3 with the model served;
  - even with the FUT blocks, in a favourable world, it touched SL5 only in 2026.
- **Diagnosis (agent):** the numbers were too pessimistic. Three causes were suspected, and probes on the binding paths tested them:
  1. **The baseline undercounted what labs already run. Confirmed.** No block started as `deployed`, and `partially_deployed` maps to *implementing*, so identity, patching and the SOC counted at 0.4.
  2. **AI helped only the attacker. Confirmed, but a small effect.** The baseline's collapse came mostly from under-credit meeting AI-lifted feasibility.
  3. **The calibration blocked SL5. Confirmed** (the single-stage served approach, partial-only counters on every binding stage, erosion read without regard to what a control was built for; see D23).

  **Refuted:** the residual floor (0.03 at OC5, never binding) and the structural placeholders as such. They bound only because their counters were weak, so the fix went into the counters, not into p.
- **Chosen:** recalibrate against evidence-based targets (where labs stand against RAND's levels today), add a modest, capped defender-AI term, and fix data and structure rather than global constants.
- **Targets**, from public evidence: RAND's 2024 report and its Aug 2026 SL3 report, Anthropic's ASL-3, GovAI on RSP v3, Google DeepMind's Frontier Safety Framework, IFP, the SL5 Task Force and Ladish. The sources and confidence levels are in [`scoring-model.md`](../scoring-model.md#calibration-targets-and-evidence).
  - A typical frontier lab in 2026 is **SL2, contesting SL3**, mostly through an insider (moderate confidence).
  - Held fixed, it **declines by about a level by 2030, not below SL1** (low–moderate).
  - The **full catalogue, matured, is SL5** in 2026 and 2030, marginal allowed, with no invented blocks (moderate on direction; the margin is authored).
  - **Without the research-required controls, not SL5** (moderate).
  - Stories: Do Nothing declines; Budget-Constrained between; Reactive ≈ SL3; Proactive SL4, and SL5 by 2030 only if its research started in 2024.
- **What was done** (commit `bbc2c18`):
  1. **Evidence-based baselines.** Six controls start `deployed`, each citing its evidence: IAM-01, END-01, CFG-01, DET-01, SW-01 and AI-08. NET-04 is partial from 2025 (ASL-3's software egress limits).
  2. **Defender AI.** Eleven detection, monitoring, review and patching blocks carry `defender_ai`. On the vectors they counter they win back half of the attacker's AI uplift (`DEFENDER_AI_SHARE` 0.5, read at the erosion tier only), and half of AI's erosion of detection. It never exceeds the uplift it offsets, so a later year is never safer. The effect is modest: the baseline held to 2030 is SL1.55 without it and 1.61 with it.
  3. **Design-tier relief, the served exit stage, the 31 map changes and the research-required flags** (D23).
  4. **Stories rescheduled.** Proactive starts the research controls in 2024 ($4.0B). Reactive buys AI-07 and AI-08 after the Feb 2026 distillation disclosure ($1.95B). Captions, intro copy and the intro's budget game were updated (the game now starts in 2028).
  5. **The targets are tests** (`tests/engine/calibration.test.ts`, `scripts.test.ts`), and `npm run calibrate` regenerates the tables in `scoring-model.md` Part 11.
- **Before → after** (SL value, model served, default world; m = marginal; "before" for the full catalogue is with the future toggle off):

  | Posture | 2026 | 2028 | 2030 |
  |---|---|---|---|
  | 2026 baseline | 1.51 m → **2.31 m** | 0.84 → **1.72** | 0.75 → **1.60** |
  | Do Nothing | 1.51 m → **2.33 m** | 0.85 → **1.73** | 0.76 → **1.62** |
  | Budget-Constrained | 1.71 → **2.41 m** | 1.65 → **1.90** | 1.56 → **1.83** |
  | Reactive CISO | 1.60 → **2.32 m** | 1.50 → **1.81** | 1.92 → **2.97** |
  | Proactive Program | 2.51 m → **2.83** | 2.86 → **4.73 m** | 3.60 m → **5.00 m** |
  | Full catalogue | 3.77 m → **5.00 m** | 3.65 m → **5.00 m** | 2.96 → **5.00 m** |
  | Full catalogue, research controls not built | — | — | **3.94** |

- **Status:** active, with the open questions below.

#### Open questions from the recalibration

These came out of D23 and D24, and are waiting for the user:

1. **SL5 is only marginal in the default world.** The mature catalogue holds OC5 at 0.17–0.19 against the 0.20 bar. A strict bar loses it, and a government partnership makes it clear. `DESIGN_TIER_RELIEF` = 0.75 is the reading that holds OC5 through 2030 (at 0.5 it is lost from 2028). At 1.0 an SL5-grade control would not erode against OC5 at all, and OC5 would be 0.15–0.16, which gives more margin. Keep 0.75, or move to 1.0? *Withdrawn in D27: more margin would push the wrong way.*
2. **The 31 vector-map changes are pending the user's review.** The original map went to the user before any engine code (D14, D15). These changes were made by the agent during the recalibration. Each carries a `why` and a `note` in the data, and they are listed in `scoring-model.md` Part 12.
3. **The intro's budget game moved from 2026 to 2028.** Today's baseline is now SL2, and no $150M year buys SL3 from there. So the game starts in 2028, after the lab has slipped to SL1, and asks whether you can get back to SL2. The alternative is to keep 2026 with a different goal or budget.
4. **Reactive ends at 2.97**, just short of the "≈ SL3" target: OC3 succeeds 0.21 of the time in 2030 against the 0.20 bar. The README calls it "about SL3". Accept that, or tune the story over the line?
5. **With the model not served and full cooperation, SL5 holds even without the research controls** (OC5 0.11–0.12 in the favourable world). In the default world with the model not served, it holds in 2026 (OC5 0.19) and is lost from 2028. This is consistent with RAND: its call for R&D is about serving production models at SL5, and its other SL5 condition is help from the national security community. But it means "SL5 needs research" holds only for a served model, or without government help. Accept, or make the research controls load-bearing in every world?

### D25. A setting for the scoring method

- **User:** "Can we add the setting to select the scoring logic between the old % of controls Vs the attack path analysis?"
- **Chosen:**
  - A `scoringMode` setting: *attack-path analysis* (`paths`, the default) or *control coverage* (`coverage`, the v1 formula).
  - It is persisted and travels in share links.
  - The rail shows a one-line "Other method: SLx" note, so users see where the two disagree. That disagreement is the teaching point.
- **What was done** (commit `22af6de`):
  - `scoringMode` is saved with the posture and carried in share links. Old links, which don't have it, load as `paths`.
  - It is set in two places: "How to score your security level" at the top of Parameters, and a "Scored by: Attack paths | Coverage" switch at the head of the rail.
  - **Coverage mode** reads the engine's own programme completeness (0.3 × the weakest category + 0.7 × the mean, v1's method) as a level plus a progress bar. Under it, each category shows its coverage share and "x of y in place", with the weakest flagged. The tier ladder is hidden, and the next defense is ranked by coverage gained per $M. The share is printed as "NN% coverage". This is the one percentage in the UI: it is a share of controls built, not a probability, so the no-percentages rule exempts it (`data-coverage-share`).
  - **Both modes** show "Other method: SLx by … · higher / lower", and the hover explains why the two differ. At today's 2026 baseline, attack paths give SL2 (marginal) and control coverage gives SL1.
  - **Stories pin `paths`.** Their captions state threat-relative outcomes, so the switch is locked while a story plays and the reader's choice comes back when it stops.
  - Tests: `tests/store/scoring-mode.test.ts`, `tests/ui/scoring-mode.test.tsx`.
- **Status:** active.

### D26. Document the research in the repo

- **User:** "did you document inside the repo your research? (like we had in v1) I want agents coming in later to be able to pick it up and/or understand your thinking".
- **Chosen:** this folder, `research/v2/`. It holds distilled documents, the reviewed draft data, the scripts that built it, selected probes, and compressed mockup images. Third-party full texts are cited, not copied.

### D27. Proactive ends at SL4; SL5 by 2030 takes a Crash Program

- **User:** "What does it mean that SL5 is only marginal in that world? … it sounds too optimistic to me that SL5 will be achieved with the proactive program by 2030. Maybe in the super proactive, non-realistic program … even if we are proactive, we won't reach SL5 by 2030. Maybe we reach SL4. … Are you sure you didn't just push it too much to the other side?"
- **"Marginal"** means the tier holds, but campaign success sits within 25% of the bar (0.15–0.20 on the standard bar). The mature catalogue's OC5 was 0.17–0.19 in the default world: about 1 in 6 campaigns get through against a 1-in-5 bar. A strict bar or one more year of AI would tip it back to SL4.
- **Diagnosis:** yes, D24 overshot, in the story rather than the engine.
  - The old "Proactive Program" started all 49 programmes in 2024, research controls included, with government cooperation at 0.7. That is a crash programme.
  - D24's claim that it reached SL5 "only because the research started in 2024" was wrong. With its research moved to 2026 it still reached SL5 in 2029 (OC5 0.19–0.20), because research controls matter less once government cooperation is 0.5 or more.
  - The engine meets its targets: the full catalogue is SL5 only when **mature**, SL4.8–4.9 when merely deployed, and SL3.8 without the SL5 build.
- **Evidence for the user's intuition:** the SL5 Task Force's goal is nation-state-level security (SL4) by 2028/29, with SL5 something to *be able to activate* later. IFP: "years away" against capable nation-states. RAND: SL5 "currently not possible" and needs the national-security community.
- **Chosen (stories only; no engine constants changed):**
  - **Crash Program** (new, "proactive plus"): the old schedule. Everything from 2024, government cooperation 0.9, org transformation 0.9. SL3 2026.5, SL4 2028, SL5 from 2029, only just. The same plan started in 2026 is SL4 in 2030 (asserted).
  - **Proactive Program** (rewritten, realistic): the same 49 programmes and $4B, sequenced:
    - the SL3–SL4 programme in 2024–25;
    - research-gated controls from 2026.5;
    - the facility and the rest of the SL5 build from 2027;
    - government cooperation 0.5.
    
    SL3 2027.5, SL4 2028.5, SL4 in 2030 with OC5 contested (0.27, physical). SL5 would arrive around 2032.
- **Not adopted:**
  - A longer maturity time (half the build time instead of 12 months) moved no story by more than 0.02.
  - Raising `DESIGN_TIER_RELIEF` to 1.0 (open question 1 above) is withdrawn.
- **Tests:** `scripts.test.ts` asserts both stories. The monotone-curve tests now apply to the Crash Program, the schedule they were staged for. Proactive must never give back a level, and on its 2029–30 plateau it may drift up by less than a point per half-year. The browser driver checks Proactive ends at SL4 and Crash at SL5.
- **Status:** active.

