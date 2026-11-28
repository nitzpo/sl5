# SL5 Explorable — Scoring Model

This describes the model **as implemented** (Phase 2: the vector backbone and the
threat-relative security level). It is the reference for `app/src/engine/`:

| File | What it does |
|---|---|
| `vector-model.ts` | Attack vectors → counters → paths → approaches → campaign, per tier |
| `threat-sl.ts` | Threat-relative SL: held tiers, level, progress, word bands |
| `posture.ts` | `scorePosture`, the one pipeline every number in the UI goes through |
| `breach.ts` | The counter-erosion bands (hard stop / probabilistic / hybrid) |
| `scoring.ts` | Block effectiveness (state, sliders, enablement) and programme completeness |
| `budget.ts`, `dependencies.ts`, `baseline.ts` | What a programme can pay for, prerequisite caps, the starting posture |
| `ai-curve.ts`, `distillation.ts` | The AI capability curve; the cumulative extraction meter |
| `catalogue.ts` | Merged block ids (saved-state migration) and the chain-shaped view of scenarios the pre-vector UI still reads |

`scorePosture` runs budget → prerequisites → the vector model at every tier →
the SL, the approaches, the own-model insider, two meters, per-block relevance
and programme completeness. The Score card, the timeline, the Policy and CISO
analyses and the introduction's mini-game all call it, and
`tests/engine/posture.test.ts` asserts they agree exactly.

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

**Vectors** (50):
- **38 RAND vectors**, with RAND Table 5.2's 1–5 feasibility per OC tier against an
  SL1-grade victim. Transcription checked twice against the PDF.
- **8 authored vectors for the lab's own model as an insider (V-SELF-1…8)**, scored
  1–5 per AI-capability band AC1–AC5 **(authored)**. They are P(this step succeeds |
  a misaligned instance at this band attempts it) at a lab with no AI-specific
  controls; the chance it tries at all is the separate `ai_propensity`.
- **4 structural stage placeholders (V-X-1…4)**: standing insider access, reading
  weights from hardware in hand, bulk network egress, physical carry-out. p = 1.0 at
  every tier **(authored)**: they stand for "nothing stops this stage at an SL1
  victim", so stage controls have something to act on. RAND scores entry and reach
  steps; its Box 5.1 treats getting weights out of an SL1 victim as given.

Some vectors skip stages (`stages_skipped`): armed break-in and military takeover
carry the hardware out; model extraction works through the API; unsanctioned
workloads (V-SELF-6) need nothing to leave. A **residual** vector
(`assumes_defense`) was scored by RAND as if the defense it defeats exists (V-NET-1
air-gap bridging assumes NET-01).

**Counters** live on the blocks (`counters` in `blocks-*.json`): 56 blocks today and
285 links, 48 of them strong, from the reviewed vector × control map. Every block
counters at least one vector; every vector has a counter or a flag (residual,
needs-government, or an off-headline lane). Nineteen links carry a `type_override`
where a block's declared type is wrong for that vector (a kill-switch is a response,
not a hard stop, against an escaping model).

**Catalogue changes in Phase 2** (all approved): ten Phase-2 blocks (SW-01, IAM-01,
KEY-01, CUS-01, DET-01, DEC-01, AI-09…AI-12); five new blocks (END-01, CFG-01,
GOV-01, ACA-01, SRV-01); six merges (AI-03 → AI-07/AI-08, HW-10 → HW-06, PER-07 →
PER-02, PER-05 → PER-03, SC-02/05/06 → SC-08, PHY-05 → PHY-08); five
reclassifications to hybrid (AI-06, HW-07, SC-07, HW-05, AI-04); rescopes of IAM-01,
AI-05 and AI-01; and five future-capability blocks (FUT-01…05, Part 7). Old ids in
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
  feasibility. Against OC5 with hard stops it is ~0.29; with probabilistic counters
  ~0.67. That is why OC5 is hard to hold with anything but structural controls.

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
q = (0.4 × e(DET-01) + 0.1 × e(DEC-01)) × (1 − 0.4 × aiCapability)
```

**(authored)** Security operations carry most of it, deception the rest: both
mature, q = 0.5 — about half of failed attempts are caught and stop the campaign. AI-
assisted evasion takes 40% of it at full capability (q = 0.3 in 2030). q does not
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

## Part 7 — Future capabilities (authored)

SL5 is unreachable with today's catalogue, as RAND says it currently is. The world
toggle **future capabilities** (default off) adds five clearly labelled R&D blocks
(`future: true`, `blocks-future.json`). Their costs, lead times and effects are
illustrative; each carries a `future_note` saying so. They are mapped to the vectors
that block SL5 once everything else is mature:

| Block | Type | Strong on | Partial on |
|---|---|---|---|
| FUT-01 Verified Accelerator Hardware at Scale | hybrid | V-SUP-1, V-PHYS-5 | V-ML-2, V-NET-2, V-X-2 |
| FUT-02 Government-Cleared Workforce with State Counter-Intelligence | probabilistic | V-HUM-1, V-HUM-5, V-SUP-3 | V-HUM-2/3/4, V-X-1 |
| FUT-03 Formally Verified Weight-Access Stack | hard stop | V-NET-1, V-X-1 | V-ACS-1/3, V-ML-1, V-BYP-1, V-CRED-4, V-SELF-3 |
| FUT-04 Sovereign Protected Facility | hybrid | V-PHYS-7, V-PHYS-4, V-PHYS-6 | V-PHYS-1, V-NET-3, V-NET-1 |
| FUT-05 Trustworthy AI Monitors | probabilistic | V-SELF-7, V-SELF-8, V-SELF-4, V-SELF-5 | V-SELF-1/2/3/6 |

With all of them and a favourable world (model not served, full cooperation), SL5 is
reached in 2024–2027 — marginally — and lost to SL4 by 2028 as AI lifts the
attackers. Leaving out any of FUT-01…04 breaks it; FUT-05 is what keeps the own
model held as it climbs to AC5. Serving the model breaks it (model extraction).
Future blocks never count toward programme completeness, never spend money while the
toggle is off, and are never a prerequisite of a block that exists today.

---

## Part 8 — Programme completeness (the old coverage SL)

Unchanged formula, kept as a secondary readout:

```
categoryScore = 1 + (Σ wᵢ · effᵢ / Σ wᵢ) × 4        effᵢ with defender-side AI erosion
overall       = 0.3 × min(categories) + 0.7 × mean(categories)
```

Relevance now comes from the vector map instead of chain names: a block that is a
strong counter on at least one vector weighs 1, a partial-only block 0.34 (the old
supporting weight). Future blocks are excluded. A full catalogue reaches about 3.9
(the app's sliders, 2030) to 5.0 (perfect sliders, before the AI curve leaves zero);
an undefended lab is 1.0. It measures breadth, not whether any tier holds: the full
catalogue's completeness of 3.9 in 2030 sits next to a threat-relative SL3.

---

## Part 9 — Budget and prerequisites

Unchanged from Phase 1. `costBasis = min + (1 − risk_tolerance) × (max − min)`;
active blocks consume the budget in advancement order; an unfunded block falls back
to its baseline (it is not built); blocks at or below their baseline are sunk cost.
A block claiming deployed while a `requires` prerequisite is not operational is
capped at implementing, to fixpoint. Future blocks are outside the catalogue while
the toggle is off, so they never enter the funding queue.

The starting posture is each block's researched `baseline_state`
(`partially_deployed` → implementing). New blocks start `not_started` unless the
practice is demonstrably widespread: IAM-01 (hardware keys), END-01 (patching),
CFG-01 (infrastructure as code), DET-01 (security operations), SW-01 (pinned,
mirrored dependencies), KEY-01 (encryption at rest with KMS keys — the
attestation-gated half is not deployed) and AI-09 (agent sandboxes) start partially
deployed; SC-08 inherits SC-06's partial deployment.

## Part 10 — CISO recommendations

Each candidate move (a block plus any missing prerequisites, as a bundle) is scored
through `scorePosture` and ranked by

```
( Δcampaign(adversary OC) + 0.25 × Δcampaign(adversary OC + 1) ) / max($M, 1)
```

— the cut against today's adversary, plus a small term for the next tier so that,
between moves that do the same now, the one that also prepares for the next wins.
Cost is the budget model's own. Future blocks are offered only in a future world.

---

## Part 11 — Calibration

Generated from the code (`npm run calibrate`, i.e. `node scripts/run-ts.mjs
scripts/calibration.ts`). Cells are campaign success against each tier; **bold** =
held (below τ = 0.20). "Own model" is the AI-insider number at that year's AC band.
SL is level + progress. Stories play at neutral sliders plus their own overrides, as
in `tests/engine/scripts.test.ts`.

#### A. The app's default world (model served; app sliders; stories at neutral sliders + their own overrides)

| Posture | Year | OC1 | OC2 | OC3 | OC4 | OC5 | Own model | SL | Limited by |
|---|---|---|---|---|---|---|---|---|---|
| Undefended lab | 2026 | 0.37 | 0.80 | 1.00 | 1.00 | 1.00 | 0.29 (AC2.4) | 0 + 0.61 | OC1 remote |
|  | 2028 | 0.54 | 0.95 | 1.00 | 1.00 | 1.00 | 0.45 (AC4.3) | 0 + 0.38 | OC1 remote |
|  | 2030 | 0.60 | 0.98 | 1.00 | 1.00 | 1.00 | 0.45 (AC5.0) | 0 + 0.31 | OC1 remote |
| 2026 baseline | 2026 | **0.16** | 0.44 | 0.83 | 0.89 | 0.95 | 0.22 (AC2.4) | 1 + 0.51 (marginal) | OC2 remote |
|  | 2028 | 0.26 | 0.66 | 0.86 | 0.92 | 0.96 | 0.36 (AC4.3) | 0 + 0.84 | OC1 remote |
|  | 2030 | 0.30 | 0.73 | 0.87 | 0.94 | 0.96 | 0.37 (AC5.0) | 0 + 0.75 | OC1 remote |
| Do Nothing | 2026 | **0.16** | 0.43 | 0.82 | 0.88 | 0.94 | 0.22 (AC2.4) | 1 + 0.51 (marginal) | OC2 remote |
|  | 2028 | 0.25 | 0.65 | 0.85 | 0.92 | 0.96 | 0.36 (AC4.3) | 0 + 0.85 | OC1 remote |
|  | 2030 | 0.29 | 0.73 | 0.87 | 0.94 | 0.96 | 0.36 (AC5.0) | 0 + 0.76 | OC1 remote |
| Budget-Constrained | 2026 | **0.09** | 0.32 | 0.78 | 0.85 | 0.94 | 0.22 (AC2.4) | 1 + 0.71 | OC2 served |
|  | 2028 | **0.08** | 0.35 | 0.56 | 0.72 | 0.85 | 0.34 (AC4.3) | 1 + 0.65 | OC2 served |
|  | 2030 | **0.10** | 0.40 | 0.56 | 0.74 | 0.84 | 0.34 (AC5.0) | 1 + 0.56 | OC2 remote |
| Reactive CISO | 2026 | **0.13** | 0.38 | 0.79 | 0.86 | 0.94 | 0.22 (AC2.4) | 1 + 0.60 | OC2 remote |
|  | 2028 | **0.11** | 0.45 | 0.71 | 0.83 | 0.90 | 0.36 (AC4.3) | 1 + 0.50 | OC2 served |
|  | 2030 | **0.05** | 0.23 | 0.35 | 0.58 | 0.74 | 0.26 (AC5.0) | 1 + 0.92 | OC2 served |
| Proactive Program | 2026 | **0.04** | **0.16** | 0.43 | 0.57 | 0.79 | 0.21 (AC2.4) | 2 + 0.51 (marginal) | OC3 insider |
|  | 2028 | **0.02** | **0.09** | 0.25 | 0.43 | 0.59 | 0.28 (AC4.3) | 2 + 0.86 | OC3 insider |
|  | 2030 | **0.02** | **0.06** | **0.18** | 0.38 | 0.51 | 0.22 (AC5.0) | 3 + 0.60 (marginal) | OC4 served |
| Full catalogue (future off) | 2026 | **0.01** | **0.03** | **0.16** | 0.29 | 0.45 | **0.09** (AC2.4) | 3 + 0.77 (marginal) | OC4 served |
|  | 2028 | **0.02** | **0.06** | **0.19** | 0.35 | 0.49 | **0.18** (AC4.3) | 3 + 0.65 (marginal) | OC4 served |
|  | 2030 | **0.02** | **0.08** | 0.21 | 0.38 | 0.51 | 0.22 (AC5.0) | 2 + 0.96 | OC3 insider |
| Full catalogue + future | 2026 | **0.01** | **0.03** | **0.10** | 0.24 | 0.40 | **0.09** (AC2.4) | 3 + 0.87 | OC4 served |
|  | 2028 | **0.02** | **0.05** | **0.13** | 0.30 | 0.43 | **0.18** (AC4.3) | 3 + 0.74 | OC4 served |
|  | 2030 | **0.02** | **0.07** | **0.15** | 0.33 | 0.44 | **0.19** (AC5.0) | 3 + 0.69 (marginal) | OC4 served |

#### B. The app's default world, model not served

| Posture | Year | OC1 | OC2 | OC3 | OC4 | OC5 | Own model | SL | Limited by |
|---|---|---|---|---|---|---|---|---|---|
| Undefended lab | 2026 | 0.28 | 0.69 | 0.99 | 1.00 | 1.00 | 0.29 (AC2.4) | 0 + 0.80 | OC1 remote |
|  | 2028 | 0.41 | 0.90 | 0.99 | 1.00 | 1.00 | 0.45 (AC4.3) | 0 + 0.55 | OC1 remote |
|  | 2030 | 0.47 | 0.95 | 0.99 | 1.00 | 1.00 | 0.45 (AC5.0) | 0 + 0.46 | OC1 remote |
| 2026 baseline | 2026 | **0.12** | 0.37 | 0.80 | 0.87 | 0.94 | 0.22 (AC2.4) | 1 + 0.62 | OC2 remote |
|  | 2028 | **0.20** | 0.56 | 0.83 | 0.91 | 0.95 | 0.36 (AC4.3) | 1 + 0.35 (marginal) | OC2 remote |
|  | 2030 | 0.23 | 0.64 | 0.85 | 0.92 | 0.96 | 0.37 (AC5.0) | 0 + 0.91 | OC1 remote |
| Do Nothing | 2026 | **0.12** | 0.36 | 0.79 | 0.87 | 0.94 | 0.22 (AC2.4) | 1 + 0.63 | OC2 remote |
|  | 2028 | **0.19** | 0.56 | 0.83 | 0.90 | 0.95 | 0.36 (AC4.3) | 1 + 0.36 (marginal) | OC2 remote |
|  | 2030 | 0.23 | 0.63 | 0.84 | 0.92 | 0.95 | 0.36 (AC5.0) | 0 + 0.92 | OC1 remote |
| Budget-Constrained | 2026 | **0.07** | 0.25 | 0.75 | 0.83 | 0.93 | 0.22 (AC2.4) | 1 + 0.86 | OC2 remote |
|  | 2028 | **0.06** | 0.29 | 0.54 | 0.71 | 0.84 | 0.34 (AC4.3) | 1 + 0.77 | OC2 remote |
|  | 2030 | **0.06** | 0.33 | 0.54 | 0.72 | 0.84 | 0.34 (AC5.0) | 1 + 0.67 | OC2 remote |
| Reactive CISO | 2026 | **0.10** | 0.31 | 0.77 | 0.84 | 0.94 | 0.22 (AC2.4) | 1 + 0.72 | OC2 remote |
|  | 2028 | **0.07** | 0.35 | 0.67 | 0.80 | 0.89 | 0.36 (AC4.3) | 1 + 0.64 | OC2 supply_chain |
|  | 2030 | **0.04** | **0.17** | 0.32 | 0.48 | 0.70 | 0.26 (AC5.0) | 2 + 0.71 (marginal) | OC3 supply_chain |
| Proactive Program | 2026 | **0.03** | **0.13** | 0.42 | 0.56 | 0.79 | 0.21 (AC2.4) | 2 + 0.53 | OC3 insider |
|  | 2028 | **0.01** | **0.07** | 0.23 | 0.37 | 0.56 | 0.28 (AC4.3) | 2 + 0.90 | OC3 insider |
|  | 2030 | **0.01** | **0.05** | **0.14** | 0.26 | 0.41 | 0.22 (AC5.0) | 3 + 0.83 | OC4 insider |
| Full catalogue (future off) | 2026 | **0.01** | **0.03** | **0.16** | 0.24 | 0.40 | **0.09** (AC2.4) | 3 + 0.88 (marginal) | OC4 insider |
|  | 2028 | **0.01** | **0.05** | **0.18** | 0.28 | 0.44 | **0.18** (AC4.3) | 3 + 0.79 (marginal) | OC4 insider |
|  | 2030 | **0.01** | **0.07** | **0.19** | 0.30 | 0.45 | 0.22 (AC5.0) | 3 + 0.74 (marginal) | OC4 insider |
| Full catalogue + future | 2026 | **0.01** | **0.02** | **0.09** | **0.16** | 0.28 | **0.09** (AC2.4) | 4 + 0.78 (marginal) | OC5 physical |
|  | 2028 | **0.01** | **0.05** | **0.11** | **0.19** | 0.31 | **0.18** (AC4.3) | 4 + 0.73 (marginal) | OC5 physical |
|  | 2030 | **0.01** | **0.06** | **0.12** | 0.21 | 0.32 | **0.19** (AC5.0) | 3 + 0.97 | OC4 insider |

#### C. Favourable world (model not served; full government, vendor and organisational cooperation; stories keep their own overrides)

| Posture | Year | OC1 | OC2 | OC3 | OC4 | OC5 | Own model | SL | Limited by |
|---|---|---|---|---|---|---|---|---|---|
| Undefended lab | 2026 | 0.28 | 0.69 | 0.99 | 1.00 | 1.00 | 0.29 (AC2.4) | 0 + 0.80 | OC1 remote |
|  | 2028 | 0.41 | 0.90 | 0.99 | 1.00 | 1.00 | 0.45 (AC4.3) | 0 + 0.55 | OC1 remote |
|  | 2030 | 0.47 | 0.95 | 0.99 | 1.00 | 1.00 | 0.45 (AC5.0) | 0 + 0.46 | OC1 remote |
| 2026 baseline | 2026 | **0.12** | 0.35 | 0.78 | 0.86 | 0.93 | 0.22 (AC2.4) | 1 + 0.64 | OC2 remote |
|  | 2028 | **0.19** | 0.54 | 0.81 | 0.89 | 0.94 | 0.35 (AC4.3) | 1 + 0.38 (marginal) | OC2 remote |
|  | 2030 | 0.22 | 0.61 | 0.83 | 0.91 | 0.95 | 0.36 (AC5.0) | 0 + 0.94 | OC1 remote |
| Do Nothing | 2026 | **0.12** | 0.35 | 0.78 | 0.86 | 0.93 | 0.22 (AC2.4) | 1 + 0.64 | OC2 remote |
|  | 2028 | **0.19** | 0.54 | 0.81 | 0.89 | 0.94 | 0.35 (AC4.3) | 1 + 0.38 (marginal) | OC2 remote |
|  | 2030 | 0.22 | 0.61 | 0.83 | 0.91 | 0.95 | 0.36 (AC5.0) | 0 + 0.94 | OC1 remote |
| Budget-Constrained | 2026 | **0.07** | 0.24 | 0.74 | 0.82 | 0.92 | 0.22 (AC2.4) | 1 + 0.87 | OC2 remote |
|  | 2028 | **0.05** | 0.28 | 0.53 | 0.70 | 0.83 | 0.34 (AC4.3) | 1 + 0.78 | OC2 remote |
|  | 2030 | **0.06** | 0.33 | 0.53 | 0.71 | 0.82 | 0.33 (AC5.0) | 1 + 0.69 | OC2 remote |
| Reactive CISO | 2026 | **0.10** | 0.31 | 0.76 | 0.83 | 0.93 | 0.22 (AC2.4) | 1 + 0.73 | OC2 remote |
|  | 2028 | **0.07** | 0.34 | 0.65 | 0.79 | 0.88 | 0.36 (AC4.3) | 1 + 0.66 | OC2 supply_chain |
|  | 2030 | **0.04** | **0.17** | 0.30 | 0.47 | 0.69 | 0.26 (AC5.0) | 2 + 0.74 (marginal) | OC3 supply_chain |
| Proactive Program | 2026 | **0.03** | **0.13** | 0.42 | 0.56 | 0.79 | 0.21 (AC2.4) | 2 + 0.53 | OC3 insider |
|  | 2028 | **0.01** | **0.07** | 0.23 | 0.37 | 0.56 | 0.28 (AC4.3) | 2 + 0.90 | OC3 insider |
|  | 2030 | **0.01** | **0.05** | **0.14** | 0.26 | 0.41 | 0.22 (AC5.0) | 3 + 0.83 | OC4 insider |
| Full catalogue (future off) | 2026 | **0.01** | **0.02** | **0.09** | **0.17** | 0.33 | **0.08** (AC2.4) | 4 + 0.67 (marginal) | OC5 physical |
|  | 2028 | **0.01** | **0.03** | **0.10** | 0.21 | 0.36 | **0.17** (AC4.3) | 3 + 0.97 | OC4 insider |
|  | 2030 | **0.01** | **0.04** | **0.11** | 0.23 | 0.38 | 0.22 (AC5.0) | 3 + 0.92 | OC4 physical |
| Full catalogue + future | 2026 | **0.01** | **0.02** | **0.04** | **0.09** | **0.19** | **0.08** (AC2.4) | 5 + 1.00 (marginal) | — |
|  | 2028 | **0.01** | **0.03** | **0.05** | **0.11** | 0.20 | **0.17** (AC4.3) | 4 + 0.99 | OC5 physical |
|  | 2030 | **0.01** | **0.03** | **0.06** | **0.12** | 0.21 | **0.18** (AC5.0) | 4 + 0.97 | OC5 physical |

Stories at 2030 (SL value, served): Do Nothing 0.76 < Budget-Constrained 1.56 < Reactive CISO 1.92 < Proactive Program 3.60

### Targets (asserted in `tests/engine/calibration.test.ts` and `scripts.test.ts`)

| Target | Result |
|---|---|
| Undefended: OC1 held (SL1, with a 1 read as 0.02), OC2 not | Holds with no AI and the model not served (2024: OC1 0.19, OC2 0.47). Serving the model (0.26) or 2026's AI (0.28) drops it to SL0. |
| Today's 2026 baseline: SL1–2 | SL1 (marginal when served: OC1 0.16) |
| Stories at 2030 vs OC4: Do Nothing ≤ Budget ≤ Reactive ≤ Proactive; Proactive ≥ SL3 | 0.76 < 1.56 < 1.92 < 3.60 (served). Proactive is SL3, marginal when served |
| Full catalogue, future off: SL3–4, never SL5 | SL3–4 in 2026 in every world; never SL5 in any year or world. Served with the app's sliders it slips to SL2.96 by 2030 |
| Full catalogue + future, favourable: SL5 reachable | SL5 in 2024–2027 (marginal), SL4 from 2028 |
| Monotone in blocks, tier and year; deterministic; no NaN | Property tests (`monotonicity.test.ts`) |

### What the numbers say

1. **An undefended lab barely holds OC1, and only without serving and AI.** Remote
   intrusion alone is 0.15 against OC1; serving adds prompt-triggered code execution.
2. **The researched baseline holds OC1 in 2026 and loses it by 2028–2030** as AI
   lifts attackers past today's controls. Doing nothing is a decline, not a plateau.
3. **SL3 costs about $3B and holds only just with the model served.** Against OC3 in
   2030 the served approach (model extraction, one counter: AI-07) and the insider
   approach (recruitment → standing access → carry-out) are what is left.
4. **SL4 needs more than money.** With every block mature, OC4 holds only in a
   favourable world (full cooperation, model not served) and only until AI catches up
   (2026, marginal). Otherwise it is contested: recruited insiders (V-HUM-1 has no
   strong counter in today's catalogue), evasion of physical access control (V-PHYS-4,
   residual), the hardware supply chain (V-SUP-1) and, when served, model extraction.
5. **The own-model insider gets out of reach of today's catalogue as models improve:**
   held through ~2028 (AC4), contested by 2030 (operator manipulation V-SELF-7 then
   self-distilled data V-SELF-8, both without a strong counter today).

---

## Part 12 — Where the engine departs from the reviewed probe

`tests/engine/probe-fixture.test.ts` runs the engine in the probe's conditions (a 1
read as 0.05, no AI, no detection, no floor, every block absent or fully effective)
on the shipped data and compares against the probe's own output
(`tests/engine/fixtures/probe-results.json`):

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
   government relief and propensity.

---

## Part 13 — Invariants under test

- **Probe reproduction** (`probe-fixture.test.ts`) — above.
- **Monotonicity** (`monotonicity.test.ts`) — from random postures (random states,
  years, sliders, served and future toggles): advancing any block never raises any
  tier's campaign, the own-model insider, any approach, scenario or meter, and never
  lowers the SL; raising the tier never lowers campaign success; a later year never
  lowers any success number; stacking never gets worse when a counter strengthens or
  is added; and all of it through the full budget pipeline under random budgets.
- **Determinism** — the same input gives byte-identical output, with no NaN anywhere.
- **Mechanics** (`breach.test.ts`) — score bins, interpolation and cap; AI shift;
  stacking rungs and the partial/strong rule; type overrides; erosion bands; the
  campaign formula and q; the floor's state-independence; serving, future and
  government toggles; propensity; integrity and capability kept out of SL.
- **Calibration** (`calibration.test.ts`, `scripts.test.ts`) — the targets above, the
  bar presets, SL semantics, word bands, `limitedBy` and `blockRelevance`.
- **Data integrity** (`data-integrity.test.ts`) — 38/8/4 vectors with monotone scores;
  every authored or structural vector labelled as an assumption; every RAND vector
  with an AI shift and a reason; every block counters something; every vector is
  countered or flagged; residual vectors are not countered by what they assume;
  merged ids are gone; future blocks are flagged, labelled and never prerequisites;
  scenario gaps and stoppers counter the scenario's vectors.
- **One pipeline** (`posture.test.ts`) — Score card, timeline, Policy and CISO views
  agree exactly, and the compatibility fields are views of the new numbers.
- **Stories** (`scripts.test.ts`) — affordable at their own budgets, nothing
  unfunded, nothing stuck, Proactive's half-year curve never rises and its monthly
  curve never loses ground over a year.
- **Migration** (`tests/store/persistence-migration.test.ts`) — old ids map onto their
  successors (the more advanced state wins; AI-03 lifts both AI-07 and AI-08), the
  funding order keeps first positions, new sliders get defaults, idempotent.

---

## Authored assumptions

Everything RAND does not supply is ours. Read these as wide error bars:

- **The own-model vectors' scores** (V-SELF-1…8, AC1–AC5) and the AC band mapping
  `AC = 1 + 4 × aiCapability`.
- **`ai_propensity`** (default 0.5).
- **The structural stage placeholders** (V-X-1…4, p = 1.0).
- **Every `ai_shift` value** (Part 2) and the 1.0 cap.
- **The future-capability blocks** (FUT-01…05): existence, costs, lead times, counters.
- **Detection**: q's weights (0.4 DET-01, 0.1 DEC-01) and its AI erosion (0.4).
- **The residual floor share** (0.03) and **government relief** (0.5).
- **The 1 → 0.02 reading** of a RAND score of 1, and the bin midpoints for 2–5.
- **The stacking constants** (0.3, 0.8, 0.9, 0.95) and the erosion bands, from the
  review and the chain model respectively.
- **The new blocks' costs, lead times and baselines** (Part 9), and which links of the
  reviewed map are strong.
- **The bar τ** and its presets: RAND defines SL-n as "likely thwarts OC-n"; 0.20 is
  our reading of "likely".

## Known limitations

- **Cross-approach compounds** (an external prompt injection steering the lab's own
  model) are not scored; the union misses them. Scenarios are where to tell them.
- **One campaign, this year.** The campaign is per year against this year's posture,
  not cumulative to 2030 (approved). Only the capability-leakage meter accumulates.
- **V-HUM-1, V-SUP-1, V-PHYS-4 and the own model's V-SELF-7/8** have no strong counter
  in today's catalogue; they are what binds OC4–OC5 and the own model, by design of the
  reviewed map rather than by calibration.
- **The intro mini-game** builds from nothing at OC4, where the campaign sits near
  certain success for any $150M posture; its copy still describes the chain-era
  "worst route" headline (Phase 2B).
- **The chain-shaped compatibility view** (`scenarioAsChain`, `breachProbabilities`,
  `bestChain`, `residualFloors`, `overallSl`, `breach`) exists only so the pre-vector
  UI keeps working until Phase 2B; nothing in the engine scores chains.
