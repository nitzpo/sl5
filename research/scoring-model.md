# SL5 Explorable — Scoring Model

This describes the model **as implemented in v2** (`/sl5/v2/`): the vector backbone
and the threat-relative security level from Phase 2, under the Phase 3 interface. It is
the reference for `app/src/engine/`. (v1, frozen at `/sl5/v1/`, scored seven attack
chains with a capability-gated breach probability and a coverage SL; none of that is
in the engine any more.)

| File | What it does |
|---|---|
| `vector-model.ts` | Attack vectors → counters → paths → approaches → campaign, per tier |
| `threat-sl.ts` | Threat-relative SL: held tiers, level, progress, word bands |
| `posture.ts` | `scorePosture`, the one pipeline every number in the UI goes through |
| `breach.ts` | The counter-erosion bands (hard stop / probabilistic / hybrid) |
| `scoring.ts` | Block effectiveness (state, sliders, enablement) and programme completeness |
| `budget.ts`, `dependencies.ts`, `baseline.ts` | What a programme can pay for, prerequisite caps, the starting posture |
| `ai-curve.ts`, `distillation.ts` | The AI capability curve; the cumulative extraction meter |
| `catalogue.ts` | Merged block ids, so saved postures and share links from before the merges still load |
| `maturation.ts` | When a story's block reaches each state, from its lead time |

`scorePosture` runs budget → prerequisites → the vector model at every tier →
the SL, the approaches, the own-model insider, two meters, per-block relevance
and programme completeness. The verdict rail, the catalogue's path and marks, the
Approaches and Race views, the next-defense ranking and the introduction's demos all
call it, and `tests/engine/posture.test.ts` asserts the rail, the Race view's
SL-over-years strip and the next-defense ranking agree exactly. The UI shows its
numbers as words (Part 6), never as percentages.

**Recalibrated in November 2026.** After v2 shipped, the user asked whether the
numbers were right ("the sobering numbers don't sound too good") and pointed out that
"SL5 should be reached with the catalog; SL5 is not possible because research is
required for some of the controls". The recalibration, its evidence and its targets
are in [Calibration targets and evidence](#calibration-targets-and-evidence); the
future-capability blocks and their toggle were retired for research-required
controls (Part 7).

**Everything here is a model.** Every constant below is a judgement call made to
get the relationships right, and the ones that are authored rather than taken
from RAND are labelled **(authored)**. The full list is in
[Authored assumptions](#authored-assumptions).

| Number | Question | Where |
|---|---|---|
| **Security level** (0–5, shown as level + progress) | Which adversary tiers does this posture hold, this year? | `threat-sl.ts` |
| **Campaign success**, per tier OC1–OC5 | Would an OC-n actor get the weights in one campaign, this year? | `vector-model.ts` |
| **Approaches** | Which broad way in is easiest, and along which path? | `vector-model.ts` |
| **Own-model insider** | Would the lab's own misaligned model get out? | `posture.ts` |
| **Capability leakage**, **integrity** | Distillation through the API; sabotage by the lab's own model. Outside SL | `posture.ts` |
| **Programme completeness** (1–5) | How much of the catalogue is in place? The old coverage SL, kept as secondary | `scoring.ts` |

---

## Part 1 — Vocabulary and data

| Term | Meaning |
|---|---|
| **attack vector** | One technique, RAND's term (Table 5.1/5.2). `vectors.json`. |
| **stage** | `entry` (get in), `reach` (reach the weights or their keys), `exfil` (get them out). |
| **approach** | A broad way in: `remote`, `insider`, `physical`, `supply_chain`, `served`, `ai_insider`. `approaches.json`. |
| **attack path** | One vector per stage. The engine finds the attacker's easiest path within each approach. |
| **scenario** | A path told as a story — the former attack chains. `scenarios.json`. |

**Vectors** (51):
- **38 RAND vectors**, with RAND Table 5.2's 1–5 feasibility per OC tier against an
  SL1-grade victim. Transcription checked twice against the PDF.
- **8 authored vectors for the lab's own model as an insider (V-SELF-1…8)**, scored
  1–5 per AI-capability band AC1–AC5 **(authored)**. They are P(this step succeeds |
  a misaligned instance at this band attempts it) at a lab with no AI-specific
  controls; the chance it tries at all is the separate `ai_propensity`.
- **5 structural stage placeholders (V-X-1…5)**: standing insider access, reading
  weights from hardware in hand, bulk network egress, physical carry-out, and
  weight-scale output through the inference API (V-X-5, added in the recalibration).
  p = 1.0 at every tier **(authored)**: they stand for "nothing stops this stage at an
  SL1 victim", so stage controls have something to act on. RAND scores entry and
  reach steps; its Box 5.1 treats getting weights out of an SL1 victim as given.

Some vectors skip stages (`stages_skipped`): armed break-in and military takeover
carry the hardware out; model extraction needs nothing to reach (it works through
the API), but its weight-scale output still has to leave through the API (V-X-5);
unsanctioned workloads (V-SELF-6) need nothing to leave. A **residual** vector
(`assumes_defense`) was scored by RAND as if the defense it defeats exists (V-NET-1
air-gap bridging assumes NET-01).

**Counters** live on the blocks (`counters` in `blocks-*.json`): 56 blocks and 297
links, 69 of them strong: the reviewed vector × control map plus the recalibration's
31 changes (Part 12). Every block
counters at least one vector; every vector has a counter or a flag (residual,
needs-government, or an off-headline lane). Nineteen links carry a `type_override`
where a block's declared type is wrong for that vector (a kill-switch is a response,
not a hard stop, against an escaping model).

**Catalogue changes in Phase 2** (all approved): ten Phase-2 blocks (SW-01, IAM-01,
KEY-01, CUS-01, DET-01, DEC-01, AI-09…AI-12); five new blocks (END-01, CFG-01,
GOV-01, ACA-01, SRV-01); six merges (AI-03 → AI-07/AI-08, HW-10 → HW-06, PER-07 →
PER-02, PER-05 → PER-03, SC-02/05/06 → SC-08, PHY-05 → PHY-08); five
reclassifications to hybrid (AI-06, HW-07, SC-07, HW-05, AI-04); rescopes of IAM-01,
AI-05 and AI-01; and five future-capability blocks (FUT-01…05), retired in the Nov
2026 recalibration (Part 7). Old ids in
saved postures and share links are mapped onto their successors on load
(`catalogue.ts`, `persistence.ts`).

---

## Part 2 — A vector's probability

```
p(v, tier) = feasibility(v, tier_v) × stack(counters on v, tier_v) × governmentRelief(v)
```

### RAND score → probability

| RAND score | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| RAND's bin | up to 20% | 20–40% | 40–60% | 60–80% | over 80% |
| p | **0.02** | 0.3 | 0.5 | 0.7 | 0.9 |

2–5 are the bin midpoints. A 1 is read as 0.02 rather than the 0.10 midpoint: RAND
calls those steps likely infeasible for that tier, and at 0.10 an undefended lab
could never hold OC1 (the review's sensitivity table: OC1 against an undefended,
unserved lab is 0.33 at 0.10, 0.24 at 0.05, 0.19 at 0.02). That is the reading that
lets RAND's "SL1 likely thwarts OC1" come out true.

Between whole tiers the probability is interpolated linearly; above OC5 it is capped
at the OC5 value.

### Attacker AI uplift: the effective tier (authored)

```
tier_v = min(5, OC + ai_shift_v × aiCapability(year))
```

`aiCapability` is the curve in `ai-curve.ts` (0 in 2024, 0.35 in 2026, 0.82 in 2028,
1.0 in 2030 on the default timeline slider). `ai_shift` is authored per RAND vector,
with a one-line basis in `vectors.json`:

| ai_shift | Vectors | Why |
|---|---|---|
| **1.0** (the cap: one full tier at full AI) | V-CODE-1…4, V-CRED-1, V-CRED-4, V-ACS-3, V-BYP-1, V-ML-1, V-ML-2, V-ML-3, V-ML-5, V-SUP-2 | Code, credentials and ML-stack work is what AI automates (Big Sleep 2024, AIxCC 2025); RAND flags the credential and AI-specific vectors as "could change very rapidly" |
| **0.75** | V-CRED-2, V-CRED-3, V-BYP-2 | Helped, but compute-bound or enumeration-bound |
| **0.5** | V-ACS-1, V-ACS-4, V-BYP-3, V-ML-4, V-NET-1, V-NET-2, V-SUP-1 | AI helps, but something physical or structural bounds the step (model extraction is bounded by what each response leaks) |
| **0.25** | V-ACS-2, V-PHYS-1…6, V-SUP-3, V-HUM-1…4, V-NET-3 | People and places |
| **0** | V-PHYS-7, V-HUM-5 | Military force; a sanctioned decision |

The cap at 1.0 is deliberate: an OC-n actor with full AI assistance does what an
OC-(n+1) actor does today on the most AI-sensitive steps, which is the tool's
"strong AI shifts the OC scale" thesis without letting it run away. An earlier
draft used 1.5 for zero-days and ML vectors; it moved OC3 to OC4.5 on those steps
by 2030 and made SL3 unreachable for any catalogue.

The lab's own model is scored on its **AC band**, `AC = 1 + 4 × aiCapability`
(2026 ≈ AC2.4, 2030 = AC5), with no `ai_shift`: its capability *is* the band.

### AI is counted once

AI reaches every campaign number through one channel only: the attacker's tier
(`tier_v` for human approaches, the AC band for the lab's own model). Feasibility
and counter erosion are both read at that tier, which is what "an attacker this
capable" means. The defender-side erosion of block effectiveness (`aiDegradation`
in `scoring.ts`) is switched off in the vector model, so a block's `ai_oc_shift`
never touches a campaign number (`tests/engine/ai-drift.test.ts` asserts it); it
feeds only programme completeness. The one other place AI appears is detection
(Part 4), which is a different quantity: the chance a *failed* attempt is caught.

### Defender AI (authored, Nov 2026)

Before the recalibration AI helped only the attacker. Detection, monitoring, review
and patching get the same progress: AI-assisted triage and hunting, behavioural
analytics, LLM supervisors, AI vulnerability discovery and patch generation
(Big Sleep 2024, DARPA AIxCC 2025). Eleven blocks carry `defender_ai` with a
one-line `defender_ai_note`: DET-01, DEC-01, PER-03, END-01, SW-01, AI-01, AI-02,
AI-07, AI-08, AI-10, ACA-01 (no hard stops: a wall does not get smarter).

```
uplift_v      = tier_v − OC                      (human attackers, after the cap at 5)
              = (AC − 1) / 4                     (the lab's own model: at most one tier)
erosion tier  = … − DEFENDER_AI_SHARE × uplift_v   for a defender_ai counter only
q            ×= (1 − 0.4 × (1 − DEFENDER_AI_SHARE) × aiCapability)   per defender_ai detection block
DEFENDER_AI_SHARE = 0.5
```

The defender wins back **half of the attacker's AI uplift**, in the one place that
uplift meets an AI-augmented defense: the tier the counter's erosion is read at
(never feasibility, never effectiveness), and the AI erosion of detection q. It is
counted once, and capped by construction: it can never exceed the uplift it offsets,
so it does nothing where attacker AI does nothing (2024; OC5, already at the cap;
vectors with ai_shift 0), and **a later year never lowers any success number** (the
erosion tier still rises with AI capability, at half the attacker's rate; the property
test is unchanged). Effect: modest. The 2026 baseline held fixed is SL1.55 in 2030 without
it and SL1.61 with it; the mature catalogue's OC5 campaign in 2030 is 0.21 without
it and 0.19 with it.

### Government relief

Vectors no lab can counter alone carry `needs_government`: V-PHYS-7 (military
takeover) and V-HUM-5 (access the organisation itself approves, including under
legal compulsion). They are still scored, and multiplied by
`1 − 0.5 × gov_cooperation` **(authored)** — halved under a full partnership.

---

## Part 3 — Counters

### Block effectiveness

A counter acts with its block's effectiveness `e ∈ [0, 1]`:

```
e = stateEffectiveness(state) × orgMult × vendorMult × govMult × enablementFactor
```

| state | not_started | investing | implementing | deployed | mature |
|---|---|---|---|---|---|
| effectiveness | 0 | 0.10 | 0.40 | 0.85 | 1.00 |

The slider multipliers each cap at a 25–30% penalty and apply only where they mean
something (low organisational readiness, high vendor dependency, supply-chain and
personnel blocks under low government cooperation). `enablementFactor` is the
`completed_by` discount: a block missing its companions counts for
`standalone_share` of itself, and each operational companion closes an equal part of
the rest (an air gap with no diode is one people carry drives across). 27 blocks
declare companions. All of this is unchanged from Phase 1.

### Erosion with the attacker's tier

A counter keeps `retention(type, tier)` of its effect:

| tier | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| hard stop | 0.98 | 0.95 | 0.92 | 0.89 | 0.86 |
| probabilistic | 0.95 | 0.81 | 0.68 | 0.54 | 0.40 |
| hybrid | halfway | | | | |

The ends are the bands the chain model was calibrated on (`breach.ts`): structural
controls erode in a narrow band, monitoring and vetting in a wide one. The
intermediate values are the reviewed table (linear, rounded to two decimals), and
fractional tiers interpolate. A counter's **reach** is `x = retention × e`.

### Erosion is read relative to what a control was built for (Nov 2026)

```
erosion tier = max(1, tier_v − DESIGN_TIER_RELIEF × (d − 1))   d = sl_requirement.first_required
DESIGN_TIER_RELIEF = 0.75
```

The band is read at the attacker's tier *relative to the tier the control was built
to hold*. `sl_requirement.first_required` is data (RAND's benchmark levels and the SL5
Standard), and RAND specifies SL-n's measures to thwart OC-n: an SL5-grade insider
programme holds up against OC5 better than an SL2-grade background check does. The
chain-era band had no such notion; read at the raw tier it left every SL5-grade
probabilistic control at 40% of its effect against OC5, at every stage of every path,
so even the mature catalogue could not hold OC5 (RAND's definition of SL5, and of the
benchmark RAND built to reach it). **Why 0.75:** it is the reading that lets the
mature catalogue hold OC5 in the app's default world, served, through 2030 — as the
1 → 0.02 reading of a RAND score is the one that lets SL1 hold OC1. At 0.5 the mature
catalogue holds OC5 in 2026 only just (0.20) and loses it from 2028 (SL4.96); at 1.0 an
SL5-grade control would not erode against OC5 at all (OC5 0.15–0.16). What 0.75
leaves: against OC5 an SL5-grade probabilistic control keeps 0.81 of its effect, an
SL3-grade one 0.61, an SL2-grade one 0.50; hard stops 0.95, 0.91 and 0.88. AI still
erodes all of them as it lifts attackers, so the futureproofing race survives.
Without it (option `designTierRelief: false`) the mature catalogue is SL4.80 in 2026
(OC5 0.28). The 2026 baseline barely moves with it (SL2.26 without, 2.32 with): its
controls are SL2–3-grade.

### Stacking: diminishing returns

```
one strong counter     × (1 − 0.7·x)       the 0.3 rung
the rest, best first   × (1 − 0.2·x), × (1 − 0.1·x), × (1 − 0.05·x)
                                            the 0.8 / 0.9 / 0.95 rungs; further counters add nothing
```

- The strong counter on the 0.3 rung is chosen to give the defender the most credit,
  and the ladder is ordered by reach. The result is the minimum over every valid rung
  assignment, which is what makes it **monotone**: raising one counter's reach lowers
  every assignment's product, and adding a counter only adds assignments.
- **Partials together never beat one strong counter**: three rungs reach at best
  0.8 × 0.9 × 0.95 = 0.684 > 0.3.
- Fully deployed, un-eroded, the best a vector can do is 0.3 × 0.684 = 0.205 of its
  feasibility. Against OC5, read at the raw tier, it is ~0.29 with hard stops, ~0.44
  with hybrids and ~0.62 with probabilistic counters; built for SL5 (design-tier
  relief) ~0.23, ~0.28 and ~0.32. That is why OC5 is hard to hold with anything but
  structural controls and SL5-grade programmes.

### Residual vectors are always candidates

A residual vector is admitted at its stage whether or not its assumed defense is
deployed, and the defenses it assumes never counter it. RAND scored it as if the
defense exists, so its score is a lower bound on the stage without the defense too.
The reference probe admitted it only once the defense was deployed — which let
deploying mantraps (PHY-03) raise the physical approach by opening "evasion of
physical access control". Always-on is the monotone reading, and agrees with the
probe whenever the assumed defenses are in place.

---

## Part 4 — Paths, approaches and the campaign

```
path(v at stage s) = p(v) × Π over the approach's other stages t (not skipped by v) of  max p in t
approach p        = max over its paths
```

Each human approach is evaluated at OC1…OC5. The **served** approach exists only
when the model is served externally (world toggle). Every attacker tries **every**
approach; there is no breadth limit.

### Campaign, with detection

```
campaign = Σ_k p_k · Π_{j<k} (1 − p_j)(1 − q)        approaches tried in descending p
final    = max(campaign, floor)
```

`q` is the chance a failed attempt is caught and the campaign stopped. Trying the
most likely approach first is the attacker's best order (swapping two adjacent
attempts changes the sum by `q·(p_i − p_j)`). `q = 0` is the plain union
`1 − Π(1 − p)`. The campaign never falls when any approach rises, and never rises
when `q` rises.

```
q = Σ  w_b × e(b) × (1 − 0.4 × (1 − DEFENDER_AI_SHARE) × aiCapability)     w = 0.4 DET-01, 0.1 DEC-01
```

**(authored)** Security operations carry most of it, deception the rest: both
mature, q = 0.5 — about half of failed attempts are caught and stop the campaign. AI-
assisted evasion takes 40% of it at full capability; both blocks are AI-augmented
(defender AI, Part 2), so they win half of that back (q = 0.40 in 2030, was 0.30). q does not
depend on the tier: catching a failed attempt is mostly about the defender's
telemetry, and the per-vector DET-01/DEC-01 partials already erode with the tier.
DET-01 thus acts twice, by design of the spec: as partial counters on the vectors it
sees, and as the campaign-level stop.

### Residual floor: once per campaign

```
floor(OC-n, year) = 0.03 × campaign of OC-n against an undefended lab, same year
```

**(authored)** No posture drives a campaign to zero: the insider never caught, the
zero-day nobody found, the failure mode nobody modelled. The floor scales with what
this attacker could do against nothing, so a weak attacker gets no free 3% shot, and
it does not depend on any block, so advancing a block can never raise the final
number. It is applied once per campaign, never per vector. The lab's own model has
its own floor, `0.03 × propensity × undefended own-model success`.

---

## Part 5 — The lab's own model, and the meters outside SL

**Own-model insider** (`aiInsider`): the `ai_insider` approach (reach → exfil, no
entry: it is already inside) at this year's AC band, times **`ai_propensity`**
(default 0.5, **authored**: the chance a misaligned model tries at all). It is
reported at every level and **required only for SL5** ("own-model insider", the
approved option A).

**Integrity** (`integrity`): sabotage — subverting oversight it helped build,
sandbagging, tampering with results (V-SELF-5) — damages integrity rather than moving
weights, so it is **not** part of SL or the campaign. It is its own meter, at the AC
band, times propensity, for a later view. (The reviewed approach list had V-SELF-5
among the AI insider's reach vectors; it never bound there.)

**Capability leakage** (`capabilityLeakage`): API distillation (V-ML-5) copies
capability, not weights, so it is outside SL and the campaign. Two numbers: the
per-campaign success at the adversary tier, and the cumulative extraction since 2026
from the existing accumulator (`distillation.ts`), with its rate cut by the counters
on V-ML-5 (today only AI-07, a partial). Both are 0 when the model is not served.
The accumulator's old NET-04 rate cut is no longer applied: the vector review found
bandwidth caps do not bound distillation (gigabytes, not terabytes).

---

## Part 6 — The threat-relative security level

```
tier n holds   ⇔  campaign(OC-n) < τ
SL             =  the highest n such that every tier ≤ n holds   (SL5 also needs the own-model insider < τ)
               =  0 when OC1 does not hold
```

**τ** is the slider `sl_bar`: strict 0.10, **standard 0.20 (default)**, lenient 0.33
("stops OC-n" = fewer than about one in five campaigns succeed). A stricter bar never
raises the level.

**Progress** toward the next level:

```
progress = clamp( log(p_next) / log(τ), 0, 1 )        p_next = campaign of the first tier that fails
```

On a log scale, how far that tier has come from certain success (p = 1 → 0) to the
bar (p = τ → 1). Log because defenses multiply probabilities. It depends only on
`p_next` and τ, so it never falls when a block is advanced and never rises when the
clock moves forward, and it reaches exactly 1 as the tier starts to hold, so
`level + progress` (the continuous readout, `sl.value`) is monotone in the posture.
At SL4 the next level needs both OC5 and the own-model insider, so progress is the
smaller of the two. At SL5 progress is 1.

**Marginal**: the highest held tier is within 25% of τ (p ≥ 0.75τ).

**limitedBy**: the tier that blocks the next level, its easiest approach (or the own
model, when that is what blocks SL5) and the path.

**Words, not percentages.** Each tier and meter carries a band — `usually fails`
(p < τ), `contested` (τ…0.55), `usually succeeds` (> 0.55) — and the ICD 203 word
(almost no chance < 0.05, very unlikely < 0.20, unlikely < 0.45, roughly even ≤ 0.55,
likely ≤ 0.80, very likely ≤ 0.95, almost certain) as `detail` for hover.

---

## Part 7 — Research-required controls (replaces the future capabilities)

Until the Nov 2026 recalibration SL5 was out of reach of the catalogue by arithmetic,
and a world toggle added five invented R&D blocks (FUT-01…05) to reach it. The user's
correction: "SL5 should be reached with the catalog. SL5 is not possible because
research is required for some of the controls." So the FUT blocks and the toggle are
gone (data, engine, store, persistence: old saves and links drop them, `catalogue.ts`),
the mature catalogue reaches SL5 (Part 11), and the controls in today's catalogue that
need research to reach the grade the SL5 benchmark asks for carry
`research_required: true` and a one-line `research_note`:

| Block | Feasibility | Lead time (months) | What the research is |
|---|---|---|---|
| HW-04 Tamper Protection (Chip-Level) | 55 | 48–72 | tamper response at accelerator scale; no module validated at FIPS 140-3 Level 4 |
| HW-06 Execution Integrity Verification (incl. the former HW-10 composition work) | 78 | 36–60 → **48–72** | verifying every workload and operator on accelerators |
| SRV-01 Hardened Weight-Access & Serving Interface | 55 | 18–36 → **36–60** | RAND: "more R&D is needed" to serve production models at SL5 (an ML-specific HSM) |
| ACA-01 Access-Control Assurance & Formal Verification | 50 | 24–48 → **36–72** | verifying a whole weight-access stack, not a kernel |
| AI-02 Multi-Model Decorrelated Review | 40 | 24–60 → **36–72** | can a decorrelated model catch a more capable one's deception? |
| AI-10 AI-Control Protocols | 55 | 12–24 → **36–60** | control protocols over all agent activity at frontier capability |
| SC-03 Adversarial Content Screening | 18 | 24–999 (research-gated) | poisoning detection against a sophisticated adversary |

They are ordinary blocks: they cost money, count once built, and the stories and the
Race view schedule them by their lead times. Lead times were lengthened where the data
called the work research-grade, so a programme that starts them in 2026 lands them in
2029–2032 (the Race view shows them landing after the threat front). The recalibration
gave them the strong counters the SL5 benchmark expects of them (Part 12), which is what
makes them load-bearing: **without them, the mature catalogue stops at SL4.8 in 2026 and
SL3.9 in 2030** (default world, served), and SL5 is lost without SRV-01 alone (the
served model) and, by 2030, without HW-04. Proactive reaches SL5 in 2030 only because
it starts all of them in 2024. That — research and lead time, not the arithmetic — is
why SL5 is out of reach today, as RAND says it currently is.

One nuance the numbers show and RAND's text supports: with the model **not served**
and **full government cooperation**, the mature catalogue holds OC5 even without the
research-required controls (OC5 0.11–0.12). RAND's call for R&D is specifically about
serving production models at SL5, and its other SL5 condition is "assistance from the
national security community".

## Part 8 — Programme completeness (the old coverage SL)

Unchanged formula, kept as a secondary readout:

```
categoryScore = 1 + (Σ wᵢ · effᵢ / Σ wᵢ) × 4        effᵢ with defender-side AI erosion
overall       = 0.3 × min(categories) + 0.7 × mean(categories)
```

Relevance now comes from the vector map instead of chain names: a block that is a
strong counter on at least one vector weighs 1, a partial-only block 0.34 (the old
supporting weight). A full catalogue reaches about 3.9 (the app's sliders, 2030) to
5.0 (perfect sliders, before the AI curve leaves zero); an undefended lab is 1.0, the
2026 baseline 1.6. It measures breadth, not whether any tier holds.

---

## Part 9 — Budget and prerequisites

Unchanged from Phase 1. `costBasis = min + (1 − risk_tolerance) × (max − min)`;
active blocks consume the budget in advancement order; an unfunded block falls back
to its baseline (it is not built); blocks at or below their baseline are sunk cost.
A block claiming deployed while a `requires` prerequisite is not operational is
capped at implementing, to fixpoint.

The starting posture is each block's researched `baseline_state`
(`deployed` → deployed, `partially_deployed` → implementing, the rest →
not_started). Before the recalibration no block was `deployed`, so controls every
frontier lab runs counted at 0.4. Now six are `deployed`, each with the evidence in its
`current_state.summary` ("Counted as deployed at baseline…"): IAM-01 (hardware keys
and SSO), END-01 (patching, endpoint protection, ASL-3 binary allowlisting), CFG-01
(infrastructure as code), DET-01 (a SOC with incident response), SW-01 (pinned,
mirrored dependencies) and AI-08 (production prompt classifiers). NET-04 is
`partially_deployed` from 2025 (ASL-3's software egress limits are the partial
version of the hardware cap). Still partial: KEY-01 (KMS encryption at rest — the
attestation-gated half is not deployed), AI-09 (sandboxes), PER-06 (two-party weight
access, public at one lab), PHY-03 (datacenter-entrance vestibules, not every red-zone
boundary); SC-08 inherits SC-06's partial deployment. No baseline is `mature`.

## Part 10 — Next defense to fund

The rail's "next defense to fund" (`utils/ciso-recommendations.ts`; v1 showed it in
its CISO panel). Each candidate move (a block plus any missing prerequisites, as a
bundle, deployed) is scored through `scorePosture` and ranked by

```
( Δcampaign(adversary OC) + 0.25 × Δcampaign(adversary OC + 1) ) / max($M, 1)
```

— the cut against today's adversary, plus a small term for the next tier (none
above OC5) so that, between moves that do the same now, the one that also prepares
for the next wins. Cost is the budget model's own, and zero for a block the programme
is already paying for. Moves the remaining budget cannot pay for, and moves that change
no number, are left out. Research-required blocks are offered like any other.

---

## Calibration targets and evidence

The Nov 2026 recalibration set its targets from public evidence on where frontier labs
stand, then fixed data and structure to meet them. All numbers below are the app's
default world (model served, the app's sliders, the standard bar) unless stated.

### Evidence

| Source | What it says |
|---|---|
| RAND, *Securing AI Model Weights* (RRA2849-1, 2024), [rand.org](https://www.rand.org/pubs/research_reports/RRA2849-1.html) | SL3 is meant to thwart cybercrime syndicates or insider threats. "Achieving SL5 is currently not possible. Realizing all SL5 measures will likely require assistance from the national security community." "More R&D is needed to enable organizations to support production models while meeting SL5 security requirements" (an ML-specific HSM-like interface). |
| RAND, *Achieving AI Model Weight Security Level 3* (RRA4704-1, Aug 2026), [rand.org](https://www.rand.org/pubs/research_reports/RRA4704-1.html) | SL3 as 262 controls adapted from NIST SP 800-53 against 31 high-feasibility vectors, "feasible, incremental implementation within six to 12 months": SL3 is reachable now, but is a programme, not the default. |
| Anthropic, *Activating ASL-3 protections* (May 2025), [anthropic.com](https://www.anthropic.com/news/activating-asl3-protections) | ASL-3 security targets "sophisticated non-state attackers"; nation-states are out of scope except with non-novel attack chains, and so are sophisticated insiders. More than 100 controls, including two-party authorization for weight access, binary allowlisting and preliminary egress bandwidth controls. |
| GovAI on Anthropic's RSP v3 (Feb 2026), [governance.ai](https://www.governance.ai/analysis/anthropics-rsp-v3-0-how-it-works-whats-changed-and-some-reflections) | ASL-3 protections remain in place; RAND SL4 (state-level adversaries) is now framed as an industry-wide recommendation; SL5 "isn't currently possible". |
| Google DeepMind, *Frontier Safety Framework* v2 (Feb 2025), [deepmind.google](https://deepmind.google/blog/updating-the-frontier-safety-framework/) | Security levels per critical capability, on RAND's scale, with particularly high levels for ML R&D; SL4 for automated ML R&D must be adopted "by the frontier AI field as a whole". |
| IFP, *A Sprint Toward Security Level 5* (Nevo, 2025), [ifp.org](https://ifp.org/a-sprint-toward-security-level-5/) | DeepMind's plan "is to increase their security to SL2", which "would only secure them against professional opportunistic efforts but not cybercrime syndicates or insider threats"; OpenAI makes "no commitments to any concrete security measures". Against capable nation-states "we'd still be years away". Lists the R&D SL5 needs (hardware, software verification, facilities). |
| SL5 Task Force, *SL5 Standard* v0.1 and *Novel Recommendations* (2025–26), [substack](https://sl5taskforce.substack.com/p/releasing-the-sl5-standard-v01); `research/sl5_standard.txt`, `research/sl5_novel.txt` | "Current best practices for frontier AI organizations do not reach SL5. In fact, on the default path, SL5 will not be realized before automated AI R&D thresholds are reached." Goal: nation-state-level security by 2028/29, and the option to activate SL5 within 3–6 months. Several controls are flagged as open research (adversarial content detection, ML-specific HSMs, confidential computing that excludes the CPU). |
| Ladish (Palisade Research), *AI companies are not on track to secure model weights* (2024), [EA Forum](https://forum.effectivealtruism.org/posts/fJycPfYuBHKoai98q/ai-companies-are-not-on-track-to-secure-model-weights) | "My informed guess is that most labs are somewhere between Security Level 2 and Security Level 3." |
| OpenAI, *Updating our Preparedness Framework* (Apr 2025), [openai.com](https://openai.com/index/updating-our-preparedness-framework/) | High-capability systems need security controls; no RAND level is stated. |

### Targets, and how sure we are

| Target | Basis | Confidence |
|---|---|---|
| A typical frontier lab in 2026 is **SL2, contesting SL3**: OC2 usually fails; OC3 on the contested / usually-succeeds line, mostly through an insider | ASL-3 (the strongest public posture) covers sophisticated non-state outsiders but scopes out sophisticated insiders; DeepMind planned SL2; OpenAI commits to nothing concrete; Ladish "between SL2 and SL3"; RAND's 2026 SL3 is a 6–12-month programme | moderate |
| Held fixed, it **declines by about a level by 2030, not below SL1** | AI lifts attackers (authored shifts), defender AI wins back part | low–moderate |
| The **full catalogue, matured, is SL5** in 2026 and still in 2030 (marginal allowed), with no invented blocks | the catalogue is RAND's SL5 benchmark plus the SL5 Standard; RAND defines the benchmark as what thwarts OC5 | moderate on direction; the margin is authored |
| **Without the research-required controls, not SL5** (default world); SL5 is out of reach *today* because they can't be built yet | RAND: R&D needed for production serving; SL5 Standard and IFP list open research | moderate |
| Stories: **Do Nothing declines; Budget-Constrained between; Reactive ≈ SL3; Proactive SL4, SL5 by 2030 only if its research started in 2024** | user targets; RAND's SL3 report; lead times | ordering high, levels moderate |

### Diagnosis before the recalibration

Which approach and vector bound each tier (served, default world), with the old numbers:

| Posture | Year | SL (before) | Next tier fails via | Binding path (entry › reach › exit) | Why |
|---|---|---|---|---|---|
| Baseline | 2026 | 1.51 (marginal) | OC2, remote 0.24 | social engineering 0.59 › privilege escalation 0.44 › bulk egress 0.92 | identity, patching and the SOC counted at 0.4 (`partially_deployed` → implementing); nothing on egress |
| Baseline | 2028 | 0.84 | OC1, remote 0.14 | social engineering 0.50 › escalation 0.31 › egress 0.90 | AI lifts credential attacks one tier against counters credited at 0.4; q eroded 0.14 → 0.11 |
| Baseline | 2030 | 0.75 | OC1, remote 0.16 | same | same |
| Proactive | 2026 | 2.51 (marginal) | OC3, insider 0.24 | bribery 0.58 › standing access 0.51 › carry-out 0.80 | bribery and standing access had no strong counter that holds against OC3 |
| Proactive | 2028 | 2.86 | OC3, insider 0.15 | same | same |
| Proactive | 2030 | 3.60 (marginal) | OC4, served 0.24 | model extraction 0.24 (one stage) | extraction skipped reach and exit, base 0.5 at OC5, one hybrid counter (AI-07) |
| Full catalogue | 2026 | 3.77 (marginal) | OC4 served 0.17; OC5 insider 0.26, served 0.28, physical 0.23 | bribery 0.79 › standing access 0.62 › carry-out 0.53; extraction 0.28; PACS evasion 0.85 › hardware penetration 0.50 (uncountered residual) | every SL5-grade probabilistic counter kept 40% of its effect at every stage (chain-era erosion); partial-only vectors; extraction a single stage whose floor with ideal counters is 0.5 × 0.205 = 0.10 |
| Full catalogue | 2028 | 3.65 (marginal) | OC4 served 0.20 | extraction | same |
| Full catalogue | 2030 | 2.96 | OC3 insider 0.12 + served 0.08; own model 0.22 | operator manipulation 0.79 › covert channels 0.56 | no strong counter on the own model's manipulation or covert channels |

The three suspected causes: **baseline under-credit — confirmed** (no block was
`deployed`); **no defender AI — confirmed, but a small effect** (the baseline's
collapse was mostly under-credit meeting AI-lifted feasibility); **a blocked SL5 —
confirmed** for the single-stage served approach, partial-only vectors on every
binding stage and erosion read without regard to what a control was built for.
**Refuted:** the residual floor (0.03 at OC5, never binding) and the structural
placeholders as such (p = 1.0 is RAND's Box 5.1; they bound only because their
counters were weak, and were fixed through counters, not by changing p).

### What changed

1. **Evidence-based baselines** (Part 9): six controls `deployed`, NET-04 partial from 2025.
2. **Defender AI** (Part 2): half the attacker's uplift won back on eleven AI-augmented blocks.
3. **Erosion relative to design tier** (Part 3): `DESIGN_TIER_RELIEF` 0.75.
4. **The served approach** (Part 1): extraction no longer skips the exit stage; V-X-5 is its exit, metered by AI-07 (strong) and SRV-01.
5. **31 vector-map changes** (Part 12): strong counters from controls the SL5 benchmark relies on, mostly the research-required ones.
6. **FUT blocks and the toggle retired; seven controls flagged `research_required`**, with longer lead times (Part 7).
7. **Stories rescheduled**: Proactive starts the research controls in 2024 ($4.0B); Reactive buys AI-07/AI-08 after the Feb 2026 distillation disclosure ($1.95B).

### Before → after (SL value, served, default world)

| Posture | 2026 | 2028 | 2030 |
|---|---|---|---|
| 2026 baseline | 1.51 m → **2.31 m** | 0.84 → **1.72** | 0.75 → **1.60** |
| Do Nothing | 1.51 m → **2.33 m** | 0.85 → **1.73** | 0.76 → **1.62** |
| Budget-Constrained | 1.71 → **2.41 m** | 1.65 → **1.90** | 1.56 → **1.83** |
| Reactive CISO | 1.60 → **2.32 m** | 1.50 → **1.81** | 1.92 → **2.97** |
| Proactive Program | 2.51 m → **2.83** | 2.86 → **4.73 m** | 3.60 m → **5.00 m** |
| Full catalogue | 3.77 m → **5.00 m** | 3.65 m → **5.00 m** | 2.96 → **5.00 m** |
| Full catalogue, research controls not built | — | — | **3.94** |

m = marginal. "Before" for the full catalogue is with the future toggle off.

## Part 11 — Calibration

Generated from the code (`npm run calibrate`, i.e. `node scripts/run-ts.mjs
scripts/calibration.ts`). Cells are campaign success against each tier; **bold** =
held (below τ = 0.20). "Own model" is the AI-insider number at that year's AC band.
SL is level + progress. Stories play at neutral sliders plus their own overrides, as
in `tests/engine/scripts.test.ts` (in the app a story keeps the reader's cooperation
sliders, which are lower by default, so Budget-Constrained and Reactive read a little
lower there; their captions are checked against that).

#### A. The app's default world (model served; app sliders; stories at neutral sliders + their own overrides)

| Posture | Year | OC1 | OC2 | OC3 | OC4 | OC5 | Own model | SL | Limited by |
|---|---|---|---|---|---|---|---|---|---|
| Undefended lab | 2026 | 0.37 | 0.80 | 1.00 | 1.00 | 1.00 | 0.29 (AC2.4) | 0 + 0.61 | OC1 remote |
|  | 2028 | 0.54 | 0.95 | 1.00 | 1.00 | 1.00 | 0.45 (AC4.3) | 0 + 0.38 | OC1 remote |
|  | 2030 | 0.60 | 0.98 | 1.00 | 1.00 | 1.00 | 0.45 (AC5.0) | 0 + 0.31 | OC1 remote |
| 2026 baseline | 2026 | **0.06** | **0.17** | 0.60 | 0.65 | 0.81 | 0.21 (AC2.4) | 2 + 0.31 (marginal) | OC3 insider |
|  | 2028 | **0.08** | 0.31 | 0.62 | 0.69 | 0.82 | 0.33 (AC4.3) | 1 + 0.72 | OC2 remote |
|  | 2030 | **0.10** | 0.38 | 0.63 | 0.71 | 0.83 | 0.33 (AC5.0) | 1 + 0.60 | OC2 remote |
| Do Nothing | 2026 | **0.06** | **0.16** | 0.58 | 0.64 | 0.80 | 0.20 (AC2.4) | 2 + 0.33 (marginal) | OC3 insider |
|  | 2028 | **0.08** | 0.30 | 0.61 | 0.67 | 0.81 | 0.32 (AC4.3) | 1 + 0.73 | OC2 remote |
|  | 2030 | **0.09** | 0.37 | 0.62 | 0.69 | 0.82 | 0.32 (AC5.0) | 1 + 0.62 | OC2 remote |
| Budget-Constrained | 2026 | **0.05** | **0.16** | 0.51 | 0.58 | 0.73 | 0.20 (AC2.4) | 2 + 0.41 (marginal) | OC3 insider |
|  | 2028 | **0.06** | 0.23 | 0.36 | 0.51 | 0.66 | 0.30 (AC4.3) | 1 + 0.90 | OC2 served |
|  | 2030 | **0.06** | 0.26 | 0.34 | 0.51 | 0.64 | 0.30 (AC5.0) | 1 + 0.83 | OC2 served |
| Reactive CISO | 2026 | **0.06** | **0.16** | 0.59 | 0.64 | 0.80 | 0.20 (AC2.4) | 2 + 0.32 (marginal) | OC3 insider |
|  | 2028 | **0.06** | 0.27 | 0.47 | 0.57 | 0.70 | 0.32 (AC4.3) | 1 + 0.81 | OC2 served |
|  | 2030 | **0.04** | **0.15** | 0.21 | 0.37 | 0.55 | 0.23 (AC5.0) | 2 + 0.97 | OC3 served |
| Proactive Program | 2026 | **0.03** | **0.10** | 0.26 | 0.35 | 0.54 | **0.18** (AC2.4) | 2 + 0.83 | OC3 remote |
|  | 2028 | **0.02** | **0.06** | **0.10** | **0.18** | 0.31 | 0.25 (AC4.3) | 4 + 0.73 (marginal) | OC5 physical |
|  | 2030 | **0.02** | **0.03** | **0.04** | **0.09** | **0.15** | **0.15** (AC5.0) | 5 + 1.00 (marginal) | — |
| Full catalogue | 2026 | **0.01** | **0.02** | **0.05** | **0.08** | **0.17** | **0.07** (AC2.4) | 5 + 1.00 (marginal) | — |
|  | 2028 | **0.02** | **0.03** | **0.06** | **0.10** | **0.18** | **0.14** (AC4.3) | 5 + 1.00 (marginal) | — |
|  | 2030 | **0.02** | **0.04** | **0.06** | **0.11** | **0.19** | **0.16** (AC5.0) | 5 + 1.00 (marginal) | — |
| Full catalogue, research controls not built | 2026 | **0.01** | **0.04** | **0.11** | **0.16** | 0.26 | **0.07** (AC2.4) | 4 + 0.84 (marginal) | OC5 served |
|  | 2028 | **0.02** | **0.08** | **0.12** | **0.20** | 0.27 | **0.14** (AC4.3) | 4 + 0.81 (marginal) | OC5 served |
|  | 2030 | **0.02** | **0.10** | **0.12** | 0.22 | 0.27 | **0.20** (AC5.0) | 3 + 0.94 | OC4 served |

#### B. The app's default world, model not served

| Posture | Year | OC1 | OC2 | OC3 | OC4 | OC5 | Own model | SL | Limited by |
|---|---|---|---|---|---|---|---|---|---|
| Undefended lab | 2026 | 0.28 | 0.69 | 0.99 | 1.00 | 1.00 | 0.29 (AC2.4) | 0 + 0.80 | OC1 remote |
|  | 2028 | 0.41 | 0.90 | 0.99 | 1.00 | 1.00 | 0.45 (AC4.3) | 0 + 0.55 | OC1 remote |
|  | 2030 | 0.47 | 0.95 | 0.99 | 1.00 | 1.00 | 0.45 (AC5.0) | 0 + 0.46 | OC1 remote |
| 2026 baseline | 2026 | **0.05** | **0.14** | 0.59 | 0.64 | 0.80 | 0.21 (AC2.4) | 2 + 0.32 | OC3 insider |
|  | 2028 | **0.06** | 0.26 | 0.61 | 0.68 | 0.81 | 0.33 (AC4.3) | 1 + 0.82 | OC2 remote |
|  | 2030 | **0.07** | 0.32 | 0.62 | 0.69 | 0.82 | 0.33 (AC5.0) | 1 + 0.70 | OC2 remote |
| Do Nothing | 2026 | **0.05** | **0.13** | 0.57 | 0.63 | 0.79 | 0.20 (AC2.4) | 2 + 0.34 | OC3 insider |
|  | 2028 | **0.06** | 0.26 | 0.59 | 0.66 | 0.80 | 0.32 (AC4.3) | 1 + 0.84 | OC2 remote |
|  | 2030 | **0.07** | 0.31 | 0.61 | 0.68 | 0.81 | 0.32 (AC5.0) | 1 + 0.72 | OC2 remote |
| Budget-Constrained | 2026 | **0.04** | **0.13** | 0.49 | 0.56 | 0.72 | 0.20 (AC2.4) | 2 + 0.43 | OC3 insider |
|  | 2028 | **0.04** | **0.18** | 0.33 | 0.48 | 0.64 | 0.30 (AC4.3) | 2 + 0.68 (marginal) | OC3 remote |
|  | 2030 | **0.04** | 0.21 | 0.32 | 0.48 | 0.62 | 0.30 (AC5.0) | 1 + 0.97 | OC2 remote |
| Reactive CISO | 2026 | **0.05** | **0.14** | 0.58 | 0.63 | 0.79 | 0.20 (AC2.4) | 2 + 0.34 | OC3 insider |
|  | 2028 | **0.04** | 0.21 | 0.44 | 0.55 | 0.69 | 0.32 (AC4.3) | 1 + 0.96 | OC2 remote |
|  | 2030 | **0.03** | **0.10** | **0.19** | 0.34 | 0.54 | 0.23 (AC5.0) | 3 + 0.66 (marginal) | OC4 physical |
| Proactive Program | 2026 | **0.02** | **0.08** | 0.25 | 0.34 | 0.53 | **0.18** (AC2.4) | 2 + 0.86 | OC3 remote |
|  | 2028 | **0.01** | **0.04** | **0.08** | **0.15** | 0.27 | 0.25 (AC4.3) | 4 + 0.80 | OC5 physical |
|  | 2030 | **0.01** | **0.03** | **0.04** | **0.08** | **0.13** | **0.15** (AC5.0) | 5 + 1.00 (marginal) | — |
| Full catalogue | 2026 | **0.01** | **0.02** | **0.05** | **0.08** | **0.16** | **0.07** (AC2.4) | 5 + 1.00 (marginal) | — |
|  | 2028 | **0.01** | **0.03** | **0.05** | **0.10** | **0.17** | **0.14** (AC4.3) | 5 + 1.00 (marginal) | — |
|  | 2030 | **0.01** | **0.03** | **0.06** | **0.10** | **0.17** | **0.16** (AC5.0) | 5 + 1.00 (marginal) | — |
| Full catalogue, research controls not built | 2026 | **0.01** | **0.03** | **0.07** | **0.11** | **0.19** | **0.07** (AC2.4) | 5 + 1.00 (marginal) | — |
|  | 2028 | **0.01** | **0.05** | **0.08** | **0.14** | 0.20 | **0.14** (AC4.3) | 4 + 0.98 | OC5 physical |
|  | 2030 | **0.02** | **0.06** | **0.09** | **0.15** | 0.21 | **0.20** (AC5.0) | 4 + 0.97 | OC5 physical |

#### C. Favourable world (model not served; full government, vendor and organisational cooperation; stories keep their own overrides)

| Posture | Year | OC1 | OC2 | OC3 | OC4 | OC5 | Own model | SL | Limited by |
|---|---|---|---|---|---|---|---|---|---|
| Undefended lab | 2026 | 0.28 | 0.69 | 0.99 | 1.00 | 1.00 | 0.29 (AC2.4) | 0 + 0.80 | OC1 remote |
|  | 2028 | 0.41 | 0.90 | 0.99 | 1.00 | 1.00 | 0.45 (AC4.3) | 0 + 0.55 | OC1 remote |
|  | 2030 | 0.47 | 0.95 | 0.99 | 1.00 | 1.00 | 0.45 (AC5.0) | 0 + 0.46 | OC1 remote |
| 2026 baseline | 2026 | **0.05** | **0.13** | 0.54 | 0.60 | 0.76 | **0.18** (AC2.4) | 2 + 0.38 | OC3 insider |
|  | 2028 | **0.05** | 0.24 | 0.56 | 0.64 | 0.77 | 0.29 (AC4.3) | 1 + 0.87 | OC2 remote |
|  | 2030 | **0.06** | 0.30 | 0.57 | 0.66 | 0.78 | 0.30 (AC5.0) | 1 + 0.75 | OC2 remote |
| Do Nothing | 2026 | **0.05** | **0.13** | 0.54 | 0.60 | 0.76 | **0.18** (AC2.4) | 2 + 0.38 | OC3 insider |
|  | 2028 | **0.05** | 0.24 | 0.56 | 0.64 | 0.77 | 0.29 (AC4.3) | 1 + 0.87 | OC2 remote |
|  | 2030 | **0.06** | 0.30 | 0.57 | 0.66 | 0.78 | 0.30 (AC5.0) | 1 + 0.75 | OC2 remote |
| Budget-Constrained | 2026 | **0.04** | **0.12** | 0.47 | 0.54 | 0.70 | **0.20** (AC2.4) | 2 + 0.47 | OC3 insider |
|  | 2028 | **0.04** | **0.18** | 0.32 | 0.47 | 0.62 | 0.29 (AC4.3) | 2 + 0.70 (marginal) | OC3 remote |
|  | 2030 | **0.04** | 0.20 | 0.31 | 0.46 | 0.60 | 0.28 (AC5.0) | 1 + 0.99 | OC2 remote |
| Reactive CISO | 2026 | **0.05** | **0.13** | 0.56 | 0.61 | 0.77 | **0.20** (AC2.4) | 2 + 0.36 | OC3 insider |
|  | 2028 | **0.04** | 0.20 | 0.43 | 0.53 | 0.67 | 0.31 (AC4.3) | 1 + 0.98 | OC2 remote |
|  | 2030 | **0.02** | **0.09** | **0.17** | 0.33 | 0.52 | 0.23 (AC5.0) | 3 + 0.69 (marginal) | OC4 physical |
| Proactive Program | 2026 | **0.02** | **0.08** | 0.25 | 0.34 | 0.53 | **0.18** (AC2.4) | 2 + 0.86 | OC3 remote |
|  | 2028 | **0.01** | **0.04** | **0.08** | **0.15** | 0.27 | 0.25 (AC4.3) | 4 + 0.80 | OC5 physical |
|  | 2030 | **0.01** | **0.03** | **0.04** | **0.08** | **0.13** | **0.15** (AC5.0) | 5 + 1.00 (marginal) | — |
| Full catalogue | 2026 | **0.01** | **0.02** | **0.03** | **0.03** | **0.07** | **0.06** (AC2.4) | 5 + 1.00 | — |
|  | 2028 | **0.01** | **0.03** | **0.03** | **0.04** | **0.08** | **0.10** (AC4.3) | 5 + 1.00 | — |
|  | 2030 | **0.01** | **0.03** | **0.03** | **0.04** | **0.08** | **0.11** (AC5.0) | 5 + 1.00 | — |
| Full catalogue, research controls not built | 2026 | **0.01** | **0.02** | **0.04** | **0.06** | **0.11** | **0.06** (AC2.4) | 5 + 1.00 | — |
|  | 2028 | **0.01** | **0.03** | **0.05** | **0.08** | **0.12** | **0.13** (AC4.3) | 5 + 1.00 | — |
|  | 2030 | **0.01** | **0.04** | **0.05** | **0.08** | **0.12** | **0.18** (AC5.0) | 5 + 1.00 (marginal) | — |

Stories at 2030 (SL value, served): Do Nothing 1.62 < Budget-Constrained 1.84 < Reactive CISO 2.98 < Proactive Program 5.00

### Targets (asserted in `tests/engine/calibration.test.ts` and `scripts.test.ts`)

| Target | Result |
|---|---|
| Undefended: OC1 held (SL1, with a 1 read as 0.02), OC2 not | Holds with no AI and the model not served (2024). Serving the model or 2026's AI drops it to SL0. |
| Today's 2026 baseline: SL2, OC3 between 0.35 and 0.65 via the insider | SL2 (served marginal: OC2 0.17; not served 0.14); OC3 0.59–0.60, insider |
| Held fixed: declines, never below SL1 by 2030 | 2.31 → 1.60 (served) |
| Full catalogue: SL5 in 2026, 2028, 2030, every world and serving setting; not marginal in a favourable world | SL5 everywhere; marginal in the default world (OC5 0.17–0.19), clear in a favourable one (0.07–0.08) |
| Without the research-required controls: never SL5 (default world, served) | SL4.84 (2026) → SL3.94 (2030); without SRV-01 alone, no SL5 |
| Stories at 2030: Do Nothing < Budget < Reactive < Proactive, real gaps | 1.62 < 1.84 < 2.98 < 5.00 |
| Do Nothing: SL2 in 2026, below by 2030, never below SL1 | 2.33 → 1.62 |
| Reactive ≈ SL3 by 2030, and worse in 2028 than in 2026 | 2.98; 1.81 in 2028 |
| Proactive: SL4+ by 2030 served and not; SL5 by 2030 only with its research controls started by 2024.5 | SL5 (marginal); without them < SL5; SL4.73 in 2028 |
| Defender AI modest: no effect before AI; never more than a quarter off any tier | asserted |
| Monotone in blocks, tier and year; deterministic; no NaN | Property tests (`monotonicity.test.ts`) |

### What the numbers say

1. **An undefended lab barely holds OC1, and only without serving and AI.**
2. **Today's typical lab is SL2, and OC3 is where it fails**, mostly through an insider
   (extortion or bribery › standing access › carry-out): the case ASL-3 scopes out.
   Held fixed, it slips to SL1 by 2028 as AI lifts the attackers, and stays there.
3. **SL3 needs breadth, SL4 needs structure, SL5 needs research.** Reactive buys
   breadth late and ends one step short of SL3; Proactive's hardware root of trust and
   weight keys take it to SL4 in 2028; SL5 arrives only as the research-required
   controls land in 2029–30, because they started in 2024.
4. **The mature catalogue holds OC5 — only just in today's world.** With low government
   and vendor cooperation the personnel and supply-chain controls run at 80%, and the
   insider, physical and served approaches each leave about 0.1; with a government
   partnership OC5 falls to 0.07.
5. **The served model is the research problem.** Without SRV-01 (the hardened serving
   interface RAND says needs R&D) the mature catalogue is SL4.86; not serving the
   model, in a favourable world, SL5 holds even without the research controls.
6. **The own model is held through 2030, with less margin each year** (0.07 → 0.16);
   without AI-control research (AI-02, AI-10) it is at the bar by 2030 (0.198).

---

## Part 12 — Where the engine departs from the reviewed probe

`tests/engine/probe-fixture.test.ts` runs the engine in the probe's conditions (a 1
read as 0.05, no AI, no detection, no floor, every block absent or fully effective,
and the two Nov 2026 rules — design-tier relief and defender AI — switched off) on
**the vector map the probe ran on**, frozen in `tests/engine/fixtures/approved-map.json`
(vectors, approaches, and each block's defense type and counters as reviewed), and
compares against the probe's own output (`tests/engine/fixtures/probe-results.json`).
It pins the engine's rules, not today's data:

| Row | Agreement |
|---|---|
| Full proposed catalogue, no erosion (both serving settings) | exact (1e-6), campaign OC1–5 and own model AC1–5 |
| Undefended | exact except OC5 (departure 1) |
| Every vector strongly countered (×0.3) | exact |
| Full proposed catalogue, eroded | campaign: engine ≤ probe, within 0.015 (departure 2), binding paths at OC4/OC5 identical; own model AC1–5: exact |
| Sensitivity of OC1/OC2 to the reading of a RAND 1 | exact (to the probe's 3 decimals) |

1. **Residual vectors are always candidates** (Part 3). Undefended, V-PHYS-4 (RAND 5
   at OC5) now sets the physical approach at OC5 (0.9 instead of 0.7).
2. **Stacking order.** The probe put extra strong counters ahead of partials on the
   ladder. With fractional effectiveness that is not monotone (a barely-started strong
   counter took the 0.8 rung and pushed a mature partial down — the property test
   caught it), so the ladder is ordered by reach.
3. **Sabotage (V-SELF-5) left the AI-insider approach** for the integrity meter. It
   never bound the probe's AI insider, so those numbers are unchanged.
4. **App-only mechanics** layered on top, none of them in the probe: a 1 read as 0.02,
   block state and slider effects, the AI uplift, detection q, the residual floor,
   government relief and propensity, and (Nov 2026) design-tier relief and defender AI.

### The recalibration's map changes (for review)

Against the approved map, 31 links changed and three vector records. Each new or
upgraded link carries its reason (`why`) and a `note` in the data. **These go to the
user for review**, as the original map did.

| Block | Vector | Was → now | Reason in one line |
|---|---|---|---|
| SRV-01 | V-ML-4 model extraction | — → strong | the serving interface returns tokens only and enforces query budgets (RAND's ML HSM) |
| SRV-01 | V-X-1 standing insider access | partial → strong | weights reached only through the interface; no person reads raw weights |
| SRV-01 | V-X-5 API output | — → partial | query budgets cap the total |
| AI-07 | V-ML-4 | strong → partial | its strong effect moved to the volume stage it meters |
| AI-07 | V-X-5 API output | — → strong | outbound volume limits and coordinated-account detection |
| AI-08 | V-ML-4 | — → partial | detects extraction query patterns |
| DET-01 | V-X-5 | — → partial | anomalous sustained query volume |
| KEY-01 | V-X-1 | partial → strong | keys released only to attested workloads, never to people |
| KEY-01 | V-ACS-4 secret material | partial → strong | key material in HSM-backed KMS, released on attestation |
| PER-03 | V-HUM-1 bribery | partial → strong | the insider-threat programme is the standing counter to a paid employee |
| PER-06 | V-HUM-5 approved access | partial → strong | releasing weights needs more than one authoriser |
| PER-02 | V-X-4 carry-out | partial → strong | nobody alone with media; paired exits |
| PER-02 | V-PHYS-4 PACS evasion | — → partial | an intruder alone in the red zone is out of place |
| PER-08 | V-SUP-3 vendors | partial → strong | no remote access, no out-of-facility maintenance |
| SC-08 | V-SUP-1 equipment | partial → strong | provenance and authenticity checks against interdiction |
| PHY-01 | V-PHYS-4 PACS evasion | — → strong | mechanical ICD 705 barriers the electronics don't control |
| PHY-01 | V-PHYS-6 armed break-in | partial → strong | forced-entry delay until the response force arrives |
| PHY-04 | V-PHYS-4 | partial → strong | ICD 705 IDS is independent of the systems spoofed |
| PHY-04 | V-PHYS-5 hardware penetration | — → partial | denies time on target |
| PHY-06 | V-PHYS-4 | — → partial | independent zone boundaries |
| HW-04 | V-X-2 hardware in hand | partial → strong | tamper response zeroises keys and plaintext |
| HW-04 | V-PHYS-5 | — → strong | FIPS 140-3 L4 at chip scale is beyond what RAND scored against |
| HW-05 | V-PHYS-5 | — → partial | tamper-evident enclosures |
| HW-06 | V-ML-2 ML supply chain | partial → strong | only signed code executes on accelerators |
| HW-06 | V-SELF-6 rogue workloads | partial → strong | no unsanctioned jobs run |
| NET-05 | V-NET-1 air-gap bridging | partial → strong | the only crossing is a one-way, inspected diode |
| NET-05 | V-X-3 bulk egress | partial → strong | a diode passes data inward only |
| END-01 | V-PHYS-2 planted devices | — → partial | device control and allowlisting |
| AI-10 | V-SELF-7 operator manipulation | partial → strong | trusted monitor plus human approval gate |
| AI-02 | V-SELF-4 covert channels | partial → strong | decorrelated review catches steganography |
| AI-02 | V-SELF-8 self-distilled data | partial → strong | decorrelated review of what leaves |

Vector records: **V-X-5** added (served exit); **V-ML-4** no longer skips the exit
stage; **V-PHYS-5** no longer assumes HW-04 (`residual_note` says why). Three blocks
moved column in the stage matrix as a result (AI-02 and AI-07 to *get out*, HW-04 to
*reach*; NET-05 stays at *get out* because it is now strong at both entry and exit).

---

## Part 13 — Invariants under test

- **Probe reproduction** (`probe-fixture.test.ts`) — above.
- **Monotonicity** (`monotonicity.test.ts`) — from random postures (random states,
  years, sliders, served toggle): advancing any block never raises any
  tier's campaign, the own-model insider, any approach, scenario or meter, and never
  lowers the SL; raising the tier never lowers campaign success; a later year never
  lowers any success number; stacking never gets worse when a counter strengthens or
  is added; and all of it through the full budget pipeline under random budgets.
- **Determinism** — the same input gives byte-identical output, with no NaN anywhere.
- **Mechanics** (`breach.test.ts`) — score bins, interpolation and cap; AI shift;
  stacking rungs and the partial/strong rule; type overrides; erosion bands;
  design-tier relief; defender AI (bounded by the uplift, never lowering a later year,
  flagged blocks only, q); the campaign formula and q; the floor's state-independence;
  serving and government toggles; propensity; integrity and capability kept out of SL.
- **Calibration** (`calibration.test.ts`, `scripts.test.ts`) — the targets above, the
  bar presets, SL semantics, word bands, `limitedBy` and `blockRelevance`.
- **Data integrity** (`data-integrity.test.ts`) — 38/8/5 vectors with monotone scores;
  every authored or structural vector labelled as an assumption; every RAND vector
  with an AI shift and a reason; every block counters something; every vector is
  countered or flagged; residual vectors are not countered by what they assume;
  merged ids are gone; no FUT blocks remain; the seven research-required blocks carry a
  note and a long lead time; defender-AI blocks are not hard stops and carry a note;
  every `deployed` baseline cites its evidence; scenario gaps and stoppers counter the
  scenario's vectors.
- **One pipeline** (`posture.test.ts`) — the verdict rail, the Race view's SL strip
  and the next-defense ranking agree exactly, and none of the chain-era fields
  (`overallSl`, `breachProbabilities`, `residualFloors`, `bestChain`, `breach`) is
  left on the result.
- **No percentages** (`tests/ui/catalogue.test.tsx`) — no percentage appears in the
  main UI, its drawers or its hover text; the tiers and the own model are stated in band
  words, and the level's decimal appears only in its tooltip.
- **The budget game** (`tests/intro/posture-game.test.ts`) — Part 14.
- **Stories** (`scripts.test.ts`) — affordable at their own budgets, nothing
  unfunded, nothing stuck, Proactive's half-year curve never rises and its monthly
  curve never loses ground over a year.
- **Migration** (`tests/store/persistence-migration.test.ts`) — old ids map onto their
  successors (the more advanced state wins; AI-03 lifts both AI-07 and AI-08), the
  retired FUT ids and future toggle are dropped, the funding order keeps first
  positions, new sliders get defaults, idempotent.

---

## Part 14 — The introduction's budget game

The *Budget* slide of the introduction (`src/intro/posture-game.ts`) is a playable
slice of the instrument. The reader starts from today's researched baseline **two years
on, in 2028**, with nothing added — AI has lifted the attackers and the lab has slipped
from SL2 to SL1 — model not served, neutral sliders (0.5) and the standard bar, and has
**$150M** for the year. (Until the Nov 2026 recalibration the game was set in 2026 and
started at SL1; today's baseline is SL2, and no $150M year buys SL3 from there.) Ten
present-day defenses are on offer (PER-03, PER-09, HW-05, AI-11, NET-01, PER-01, PER-06,
PER-02, CUS-01, PHY-03), spanning all three defense types, with four prerequisite links
on the list (PER-06, PER-02, PER-03 and PER-09 on PER-01). Each pick is set to deployed
and the reader's pick order is the funding order, so a pick past the budget line stays
at the lab's baseline and a pick whose prerequisite isn't running is capped at
implementing, exactly as in the app. Every number is `scorePosture`. The headline is
which tiers the posture now usually stops, in words, and what still gets through.
`tests/intro/posture-game.test.ts` asserts that the right picks within budget get back to
SL2 and take OC3 off *usually succeeds* while most affordable picks don't, that no year
gets back to SL2 without the air gap ($100M of the $150M) but the air gap alone doesn't
either, that no pick makes anything worse, and that nothing on the list reaches SL5.

---

## Authored assumptions

Everything RAND does not supply is ours. Read these as wide error bars:

- **The own-model vectors' scores** (V-SELF-1…8, AC1–AC5) and the AC band mapping
  `AC = 1 + 4 × aiCapability`.
- **`ai_propensity`** (default 0.5).
- **The structural stage placeholders** (V-X-1…5, p = 1.0).
- **Every `ai_shift` value** (Part 2) and the 1.0 cap.
- **Defender AI**: the share won back (`DEFENDER_AI_SHARE` 0.5) and which eleven blocks
  carry it.
- **Design-tier relief** (`DESIGN_TIER_RELIEF` 0.75), calibrated so the mature catalogue
  holds OC5 (Part 3).
- **Which controls are research-required**, and their lengthened lead times (Part 7).
- **Detection**: q's weights (0.4 DET-01, 0.1 DEC-01) and its AI erosion (0.4).
- **The residual floor share** (0.03) and **government relief** (0.5).
- **The 1 → 0.02 reading** of a RAND score of 1, and the bin midpoints for 2–5.
- **The stacking constants** (0.3, 0.8, 0.9, 0.95) and the erosion bands, from the
  review and the chain model respectively.
- **The new blocks' costs, lead times and baselines** (Part 9), which links of the
  reviewed map are strong, and the recalibration's 31 map changes (Part 12).
- **The bar τ** and its presets: RAND defines SL-n as "likely thwarts OC-n"; 0.20 is
  our reading of "likely".

## Known limitations

- **Cross-approach compounds** (an external prompt injection steering the lab's own
  model) are not scored; the union misses them. Scenarios are where to tell them.
- **One campaign, this year.** The campaign is per year against this year's posture,
  not cumulative to 2030 (approved). Only the capability-leakage meter accumulates.
- **SL5 is marginal in the default world.** The mature catalogue holds OC5 at 0.17–0.19
  against a bar of 0.20: the insider, physical and served approaches each leave about
  0.1, and with low government and vendor cooperation the personnel and supply-chain
  controls run at 80%. A stricter bar loses it; a government partnership makes it clear.
- **Attacker AI stops at OC5.** The tier cap means OC5 gains nothing from AI, so the
  mature catalogue's OC5 number moves only through detection between 2026 and 2030.
- **Scenarios are illustrations.** A scenario's number is the product over its own
  vectors, at the adversary tier (the own-model scenario at this year's AC band, times
  propensity); it never enters the SL or the campaign.
