# SL5 Explorable — Scoring Model

This describes the model **as implemented**. It is the reference for `app/src/engine/`:
`scoring.ts` (SL scores), `breach.ts` (adversary success), `supporting.ts` (which
blocks count toward a chain), `budget.ts` (what a program can pay for),
`ai-curve.ts` (the capability curve both channels read), and `posture.ts` — the one
pipeline (`scorePosture`: budget → prerequisites → category scores, SL, per-chain
breach and residual floors) that every number in the UI goes through. The Score
card, the timeline, the Policy and CISO analyses and the introduction's mini-game
all call it, and `tests/engine/posture.test.ts` asserts they agree exactly; before
it existed the same posture read SL 2.02 / 2.12 / 2.46 depending on the panel.

The tool computes two numbers from the same posture, and they are *not* two views
of one quantity:

| Number | Question | Where |
|---|---|---|
| **SL equivalent** (0–5) | How complete is the defensive posture? | `scoring.ts` |
| **Breach probability** (0–1) | Would *this* adversary get the weights, *this* year? | `breach.ts` |

A posture can score respectably and still be breached, because breach is decided
by the single weakest attack path, not by average coverage.

---

## Part 1 — Block effectiveness (the shared primitive)

Both numbers are built from `blockEffectiveness(block, state, year, sliders)`,
which answers "how much defense is this block actually delivering?"

```
effectiveness = stateEffectiveness(state)
              × (1 − aiDegradation)     // defender-side AI erosion
              × orgMult × vendorMult × govMult
              × enablementFactor        // companions this control needs to be whole
```

**State** is the deployment ladder — a block is not binary:

| state | effectiveness |
|---|---|
| `not_started` | 0.00 |
| `investing` | 0.10 |
| `implementing` | 0.40 |
| `deployed` | 0.85 |
| `mature` | 1.00 |

Those five are the whole `BlockState` union (`engine/types.ts`) and the whole
advancement cycle the UI can reach. `STATE_EFFECTIVENESS` carries one extra key,
`partially_deployed` → 0.60, which is **not** a `BlockState`: it survives because
21 blocks in `public/data/blocks-*.json` declare it as their `baseline_state`, and
`getStateEffectiveness` accepts a bare `string`. The app maps it onto
`implementing` when it builds the starting posture (`engine/baseline.ts`), so the
running app never scores a block at 0.60 — only direct-from-data callers such as
`scoring.test.ts` do.

**AI degradation** = `ai_oc_shift × aiCapability(year) × 0.1`, and is **zero for
hard stops**. A probabilistic block with `ai_oc_shift: 3` loses 30% of its
effectiveness at full AI capability. An air gap does not care how clever the
adversary is.

**Slider multipliers** each cap at a 25–30% penalty, and each applies only where
it is meaningful:

- `orgMult` — blocks with `organizational_readiness < 50` are penalized when
  `org_transformation` is low. Some controls need the org to change, not just buy.
- `vendorMult` — blocks with `vendor_dependency > 50` are penalized when
  `vendor_cooperation` is low. You cannot deploy confidential computing a vendor
  will not ship.
- `govMult` — `supply_chain` and `personnel` blocks only, penalized when
  `gov_cooperation` is low. Clearances and fab provenance are not unilateral.

### Enablement — no control is the whole thing its name implies alone

20 of 47 blocks declare `dependencies.completed_by`: a list of companion blocks, a
`standalone_share`, and a reader-facing `why`. Absent all its companions the block
counts for `standalone_share` of its effectiveness; each *operational*
(`deployed`/`mature`) companion closes an equal part of the remainder.

```
enablementFactor = share + (1 − share) × (operational_companions / total_companions)
```

An air gap is the type specimen. `NET-01` alone is 0.55 of `NET-01`, because with
no controlled way to move data across the gap transfers happen on hand-carried
drives, with no bandwidth cap one breach exfiltrates the weights at line rate, and
with remote management still live the BMC is a route in that bypasses the
perimeter entirely. Its companions are `NET-05` (diodes), `NET-04` (bandwidth
limits) and `PER-08` (no remote management); operational, they take it to 1.0.

**Why this is soft rather than another `requires` gate.** `requires` says the
control *cannot function*, and caps it at `implementing` to fixpoint. An air gap
without a diode functions fine — it is simply less than the standard means by "air
gap", so a cap would be a lie in the other direction. Nothing here caps anything;
the block is just not priced as more than it is.

**Why it is linear in the count** rather than a product of per-companion factors:
then "each companion closes an equal part of the gap" is literally the arithmetic,
and the floor is exactly `standalone_share` instead of something that depends on
how many companions happened to be authored.

**Why it is not derived from `enhances`/`enabled_by`.** Those are a loose,
near-symmetric narrative relation — `SC-01` enhances `SC-02` *and* `SC-02`
enhances `SC-01` — with 95 edges having no recorded inverse. Read as requirements
they would gate nearly every block on nearly every other. `completed_by` is
hand-authored per block, with its reasoning in `why`.

**Monotonicity is preserved by construction:** the factor rises with the count of
operational companions and never falls, so bringing a companion online can only
raise a block's effectiveness. `tests/engine/monotonicity.test.ts` advances one
block at a time from seeded-random postures and would catch a violation.

**Scope.** `blockEffectiveness` applies it only when passed `opts.blockStates`, so
single-block UI readouts ("what is this worth once it's built") are unaffected,
and the ceiling is untouched: in a complete posture every companion is operational
and every factor is 1. It moves *partial* postures only — which is why the
`Category and Overall Scores` calibration pins for baseline/all-implementing/
partial-coverage moved down when it landed, while all-deployed did not.

**Why it exists.** The introduction's mini-game exposed the alternative: on a
$150M budget, one click on the air gap was the single best purchase available and
dropped four of seven chains by ~60 points, teaching exactly the lesson the deck
spends two slides arguing against — that one structural purchase is most of
security. After the change NET-01's solo leverage on its worst chain falls from
64pp to 35pp and it is no longer the top single buy, while *completing* it still
pays at every step.

### The two AI channels (counted once each)

This is the subtlest invariant in the engine. `ai_oc_shift` appears in two
places and must never be applied twice to one number:

- **Defender channel** (`scoring.ts`): AI erodes probabilistic defenses → SL falls.
- **Attacker channel** (`breach.ts`): AI lifts the adversary's effective OC → the
  capability gate opens and probabilistic resist drops.

Breach therefore calls `blockEffectiveness(..., { aiErosion: false })`. The AI
lift is already inside `effectiveOc`; erosion would double-count it.

---

## Part 2 — SL equivalent score

### Threat-relevant scoping

`relevantBlockIds(chains, allBlocks)` returns a **weight per block**, not a flat
set: the blocks any chain exploits or is stopped by at weight **1**, plus the
supporting defenses around them (Part 3) at weight **`SUPPORTING_WEIGHT` = 0.34**.
A block both named on one chain and supporting on another keeps the named weight.
45 of 47 blocks land in the map (19 named, 26 supporting).

Two things this buys:

- **Scoping** — scoring over the full 47-block catalog would divide a category's
  real coverage by exotic controls no modelled threat exercises, so a
  well-defended category read as a D.
- **Agreement with breach** — supporting blocks lower breach at 0.34, so they must
  count toward SL *at the same weight*. A flat set gave a supporting block the
  same influence over a category mean that breach gives it a third of, so the two
  numbers disagreed about what deploying it was worth. The constant lives in
  `supporting.ts` and is imported by both.

### Per category

```text
categoryScore = floor + (Σ wᵢ · effᵢ / Σ wᵢ) × (5 − floor)
```

a **weighted** mean over the category's relevant blocks, with
`baseline_floor = 1.0` — an org with nothing deployed is at SL1, not SL0. Callers
with no chain context (`relevantIds` omitted) score the full category at equal
weight.

Two distinct empty cases: no chain context at all → score over the whole
category (back-compat); chain context but no relevant block in this category →
return the floor. Never fall back to the full catalog (that re-introduces the
dilution) and never fabricate a 5.0.

### Overall

```
overall = 0.3 × min(categoryScores) + 0.7 × mean(categoryScores)
```

The weakest-link term encodes the RAND insight that one open vector can
compromise everything; the mean lets broad coverage move the number, so a
program is not permanently pinned to its single most expensive category. Pure
`min()` — the original sketch — made every other investment invisible.

---

## Part 3 — Breach probability

Per chain:

```
P(chain) = 0                                       if precondition unmet
P(chain) = max( gate × ∏ getPast × depthDiscount,  gate × RESIDUAL_RISK )
```

The final number shown is `max` over all chains: the adversary picks the
easiest path, not the average one.

### Preconditions

`requires_external_serving` chains (API distillation) are **exactly zero** when
the model is not served externally. An air-gapped model has no extraction
channel. The residual floor does not resurrect these — there is no attack
surface to leave a residual on.

### Effective OC and the capability gate

```
effectiveOc = adversaryOc + mean(ai_oc_shift over blocks_exploited) × aiCapability(year)
gate        = sigmoid(effectiveOc − (min_oc − 0.45), steepness = 4.0)
```

The lift averages over `blocks_exploited` (an attack-side property), not over
everything that might stop the chain. The gate is deliberately steep because OC
tiers are qualitative jumps: solving `gate(min_oc) ≈ 0.85` and
`gate(min_oc − 1) ≈ 0.10` gives steepness ≈ 3.9, offset ≈ 0.44, rounded to
4.0 / 0.45. An adversary a full tier below a chain's minimum is largely locked
out **until AI lifts them into range** — which is the thesis the whole tool
exists to show.

Separating the gate from defense bypass is what makes the model behave: with no
defenses at all, breach scales with adversary capability, and adding a defense
can only ever lower it.

### Getting past one block

```
getPast = 1 − effectiveness × resist
bypass  = sigmoid(effectiveOc − oc_threshold_to_exploit)     // steepness 1.5

resist  = clamp(0.98 − 0.12 × bypass, 0.86, 0.98)   if hard_stop
        = clamp(1.00 − 0.60 × bypass, 0.35, 0.95)   otherwise
```

`bypass` is a sigmoid, so it is open on (0, 1) and never reaches either end. The
*reachable* bands are therefore set by the expressions, not the clamps:
hard stops run **0.98 → 0.86** (the clamp binds, since `0.98 − 0.12` = 0.86) and
probabilistic controls run **0.95 → 0.40** (the ceiling clamp binds, the floor
does not — `1.00 − 0.60 × bypass` asymptotes at 0.40). `PROB_RESIST_FLOOR = 0.35`
is unreachable under the current constants and steepness: no retuning of
`PROB_BYPASS_SCALE` alone can pull the resist below the floor, because `bypass`
stays inside (0, 1). It is a guard against *future* changes — raising the
erosion coefficient past 0.65, or relaxing the contract that `bypass` is
sigmoid-bounded — either of which could otherwise drive resist to zero or
negative.

Monotonic by construction: an absent block returns 1 (no obstacle), and as
effectiveness rises the term falls toward `1 − resist`. Improving a defense can
never raise breach.

**Both types erode; hard stops just erode far less** — a narrow 0.98→0.86 band
against the probabilistic 0.95→0.40. Hard stops were previously OC-independent,
which meant NET-01 presented an identical wall to OC3 and OC6, and made "buy the
hard stops" a complete answer to arbitrarily capable adversaries. A top-tier
adversary bribes someone to carry a drive across the air gap. The narrow band is
what keeps hard stops the best buy without making them absolute.

Note `resist` caps at **0.95 for probabilistic defenses even against a much
weaker adversary**. Nothing is perfect.

### Which blocks count

Three tiers:

1. **Named steps** — the union of `blocks_exploited` and `stoppers`. Full weight.
   Everything the data says stops this chain is mechanically real, not
   narrative decoration.
2. **Supporting defenses** — same `summary_group` as a named step (see
   `supporting.ts`). Weight `SUPPORTING_WEIGHT = 0.34`, applied as
   `pass *= 1 − 0.34 × (1 − getPast)`, so a mature supporting block removes about
   a third of what a named one would. The SL score uses the same weight (Part 2).
3. **Everything else** — no effect on this chain.

Supporting defenses exist because chains name only 3–5 steps (longer chains stop
being readable in the UI, which is a hard product constraint). Before this tier
existed, **28 of 47 blocks were inert** — deploying them moved no number at all —
and a chain could be shut down by maturing three blocks. Membership is *derived*
from `summary_group` rather than hand-authored per chain, so a newly added block
wires itself in and there is no parallel mapping to drift.

`EXTRA_GROUP_CHAINS` attaches a family with no chain-named block of its own to
the chain it plainly bears on: `supply_chain_integrity` → `poisoned-chip`.
`ai_defense_testing` is intentionally left unattached; it hardens defenses
generally rather than any one path.

### Defense-in-depth discount

```
depthDiscount = 0.85^(depth − 1)      for depth > 1
```

`depth` sums per-layer credit over the chain's named blocks:

- each block credits **at most its primary layer** (resolved through
  `LAYER_ALIAS_MAP`), so one block can never earn multi-layer credit by itself;
- a layer's credit is its best contributing block's state weight —
  deployed/mature = 1, implementing = 0.5, else 0;
- a block sharing a `shared_dependencies` entry with another block on the same
  chain earns **half credit** (correlated failure modes are not independent
  layers).

The correlation census is computed over the chain's full block list and is
therefore state-independent — deploying one more block can never re-weight an
already-counted layer downward. That is what preserves monotonicity.

**0.85, not 0.6.** The `∏ getPast` product *already* rewards having more layers.
This factor is only a small extra credit for those layers being *independent*,
not a second helping of depth. At 0.6 a chain collapsed to near-zero once a
handful of blocks matured.

### Residual risk floor

```
floor = gate × 0.03
```

No live chain reaches zero. A fully mature program still faces the insider who
is never caught, the zero-day nobody has found, and the failure mode nobody
modelled — and the premise of this tool is explicitly that full SL5 may not be
achievable at all. Without a floor, maturing a chain's named blocks drove it to
~0.1%, which reads as "solved" and makes near-perfect defense look cheap.

Two properties matter:

- **Gate-scaled**, so it is a floor only on chains this adversary could actually
  attempt. An OC2 actor gets no free 3% shot at an OC4 chain.
- **State-independent**, so monotonicity survives: the floor depends only on the
  adversary and the chain, never on what is deployed.

The floor is not doing the calibration work — it binds on the *secondary* chains
of a mature posture (they'd otherwise sit at 0.3–1.9%), while the headline number
is set by real defense math on the worst path.

`chainResidualFloor(chain, …)` exposes the floor on its own (and `scorePosture`
returns it per chain as `residualFloors`), because the UI needs it: against OC4 an
OC4 chain's floor is ≈2.6–3.0%, so the Attacker view's old "blocked below 2%" bucket
was unreachable for every chain the adversary could attempt. A chain is now filed as
**held at the residual floor** when it is within half a point of its own floor
(`isHeldAtResidualFloor`) — as low as any posture can push it.

---

## Part 4 — Budget

```
costBasis(block, riskTolerance) = min + (1 − rt) × (max − min)
```

Risk tolerance selects **where in a block's authored cost range you plan**:
conservative (0) budgets the worst case, aggressive (1) bets on the optimistic
estimate. Active blocks — those advanced past their real-world baseline; blocks at
or below it are sunk cost — consume the budget in advancement order. A block past
the budget line is **not funded, so it is not built**: it falls back to its
baseline (`baselineStateFor`), which for most of the catalogue is `not_started`.

It used to be capped at `implementing` instead — 0.4 effectiveness plus half a
layer of depth credit for money nobody spent — so the budget barely bound: at the
default 2026 posture with a **$0** budget, clicking every block to mature still cut
breach from 65.3% to ~44%. It now leaves breach at 65.3% and SL at 1.38, exactly the
starting posture (`monotonicity.test.ts` pins this). The floor is the *undated*
baseline, the same one the sunk-cost rule reads, so the most an unfunded block can
be is exactly what it is for free; a year-dated floor would let deploying a block
before its `baseline_since` drop it below the `implementing` it held free. (The
introduction's mini-game builds from nothing, so it passes an all-`not_started`
floor.)

Funding is **order-stable**: blocks advanced earlier are funded first, so turning
on one more block can only cap *that* block. It never evicts an earlier
commitment. Because baseline blocks are already in the advancement order, the store
moves a block to the end of the order at the moment it first crosses its baseline
(the moment it starts costing money); the CISO and Policy what-ifs use the same rule
(`orderAfterActivating`), and a property test advances random blocks through the
full pipeline under random budgets and asserts no chain's breach ever rises.

`rt = 1.0` is the trap. It plans every program at its best case, and since cost
ranges are 4–5× wide (`HW-04`: $200M–$1,000M), an "$800M program" buys a $3.2B
wishlist. That single value was the largest cause of security being too cheap.

---

## Part 5 — Calibration

Measured at **2030 against an OC4 adversary**, worst chain, all four narrative
stories, through `scorePosture` (budget, then prerequisites, then scores), at the
sliders `tests/engine/scripts.test.ts` uses — neutral 0.5 plus each story's own
overrides. Regenerated from the code with a tsx script for this revision:

| Scenario | Breach | SL | Spend at 2030 vs budget | Unfunded | Worst chain |
|---|---|---|---|---|---|
| Do Nothing | 68.1% | 1.40 | $0M | — | long-game |
| Budget-Constrained | 50.8% | 1.84 | $148M / $200M | 0 | patient-distillation |
| Reactive CISO | 18.9% | 2.07 | $1,662M / $1,800M | 0 | poisoned-chip |
| Proactive Program | 16.1% | 3.53 | $2,590M / $2,800M | 0 | long-game |

Playback in the app layers the story overrides on the reader's own sliders, which
default to gov 0.2 / vendor 0.3 / org 0.3. There a first-time reader sees Do Nothing
at 71.7% / SL 1.37, Budget-Constrained 51.6% / 1.79, Reactive 20.8% / 2.02 and
Proactive 16.1% / 3.53 (Proactive overrides all three).

Both numbers order the stories the same way, which is the point of weighting SL
and breach identically (Part 2).

All four plan at the **same** `risk_tolerance: 0.65` (asserted by a test), so the
cost basis is one rule rather than per-story special pleading, and **every story
plans inside its own budget** (also asserted) — nothing is left unfunded anywhere.
"Spend at 2030" is what the budget line charges then; it is below each plan's
summed cost basis because a story block that hasn't yet passed its baseline by
2030 is still sunk cost. Raising a budget changes no outcome (measured: Reactive is
identical from $1,710M up, Proactive from $2,610M up, and Budget-Constrained reads
50.8% at every combination from $100M/rt 1.0 to $400M/0.65). Cutting one now does,
because an unfunded block is simply not built: Reactive at $1,500M leaves 8 blocks
unfunded and reads 47.2% / SL 1.69, and Proactive at $2,400M leaves 15 unfunded at
30.7% / SL 2.44.

Proactive's trajectory never rises over the 13 playback steps:
`76.5 → 54.7 → 47.9 → 45.9 → 33.1 → 31.6 → 29.2 → 29.2 → 28.2 → 19.0 → 18.2 →
16.2 → 16.1%`. (It starts at 76.5%, not 100%, because every story opens on the
researched baseline posture rather than a bare field.)

When `enablementFactor` landed, the three incomplete stories got slightly worse —
the mechanic working: a posture that buys `NET-01` and no way to move data across
it is priced as the partial control it bought. Proactive was amended in response
(adding `PHY-02`, the companion of both `PHY-01` and `PHY-05`), which is what makes
the physical family count for what it claims.

### SL is a breadth measure, and that sets the price of SL 3.5

The single most counter-intuitive property of the model, and the one worth
stating plainly: **cutting breach does not buy SL.** They answer different
questions (see the table at the top), and they scale differently with money.

45 of 47 blocks are threat-relevant, and `categoryScore` is a weighted *mean*
over them. So a category's score is coverage, not quality — a plan can slash the
worst attack path with a handful of well-chosen hard stops while leaving most of
its categories half-empty. Measured, all mature at 2030:

| Posture | Cost | SL | Breach |
|---|---|---|---|
| first 23 of the Proactive plan | $2,462M | 2.60 | 39.3% |
| first 28 | $2,557M | 3.02 | 37.2% |
| all 33 (**the Proactive plan**) | $2,590M | **3.47** | **16.1%** |
| all 47 blocks | $4,461M | 4.41 | 4.0% |

The prefixes are the plan's own blocks in start-year order, all matured and with
nothing else in place (no baseline), so the rows differ only in *how many* of them
the org got to — which is exactly the question a reader has. The story itself reads
SL 3.53, not 3.47, because it also keeps the lab's existing baseline controls.

Three consequences:

1. **A 23-block plan structurally caps near SL 2.6**, whichever 23 it buys.
   Reaching 3.5 takes the whole 33-block plan on top of the lab's baseline. This is
   why Proactive's budget is $2.8B: ~$2.6B is what SL 3.5 costs in this model, and
   that *is* the finding — more than half of it ($1,395M) is `PHY-01`, the building,
   since the 2026 value audit priced it as a classified-grade AI datacenter rather
   than a SCIF-sized room.
2. **The ceiling is 4.41, not 5.0.** Even with the entire catalog matured, slider
   penalties (org 0.7 / vendor 0.6 / gov 0.7) and AI erosion never fully clear.
   At perfect sliders and no erosion (2024, before the AI curve leaves zero) it
   reaches exactly 5.00, so the gap is entirely those two channels, not a bug in the
   mean.
3. **`sl_requirement` is authored but unscored.** Every block declares
   `{first_recommended, first_required}` (21× `{3,4}`, 19× `{4,5}`, 3× `{3,3}`,
   3× `{4,4}`, 1× `{5,5}`), and `scoring.ts` never reads it — only `PolicyView`
   and `BlockDetail` display it. A prototype that scored coverage tier-by-tier
   (prefix-min over `first_required`, normalised over tiers present) moved
   Proactive 2.51 → 2.65 and left the ordering unchanged, so the flat mean is not
   what was holding the score down. Buying by tier is *worse* than buying by
   threat relevance: `first_required <= 4` is 27 blocks for $1,770M and scores
   only 2.23, because the tiers cut across categories and leave the weakest-link
   term exposed.

### Why the residual is 16% and not 5%

SL 3.5 and a double-digit breach are in direct tension, and the plan resolves it
with exactly one deliberate gap. `long-game` is an all-personnel chain
(PER-02/03/04/05); Proactive buys PER-03 and PER-05 and skips **PER-02**
(two-person control, $5M) and **PER-04** (continuous vetting, $10M).

That $15M omission is load-bearing, and it is a *choice*, not an affordability
constraint — buying both costs $2,605M of the same $2,800M budget, and lands at
**4.7% breach and SL 3.78**. Breach is a `max` over chains, and with breadth this
wide the other six are already on the residual floor (`long-game` 4.7%, everything
else 2.6–3.0%), so $15M of personnel controls buys 0.25 of SL and cuts the headline
number by more than two-thirds. A $2.6B program that reads as
"solved" is the exact failure mode the recalibration removed, so the story leaves
one chain meaningfully open and says so in its own captions.

Enumerating the alternatives (full catalog minus each candidate omission set, all
matured, ~$4.5B, so plan cost is not the binding constraint) shows how narrow the
band is:

| Omitted | SL | Breach |
|---|---|---|
| PER-04 only | 4.22 | 7.4% |
| PER-04, PER-02 | 3.94 | 14.1% |
| PER-04, PER-03 | 4.00 | 14.4% |
| PER-04, PER-03, PER-05 | 3.78 | 26.9% |
| all four | 3.50 | 47.2% |

Two further constraints shaped the schedule:

- **Monotonicity is a scheduling property.** A half-year step where nothing
  completes is a step where AI advances unopposed and breach ticks up. Ten blocks
  start in 2024 — including the cheap 12–18-month items (PHY-03/04, NET-04/07,
  SC-05, PER-08) — specifically so the curve falls through 2024.5–2025 instead of
  sitting at the baseline's ~77% waiting for 48-month hardware. The 2027–2028.25 tail (AI-04,
  PER-05, PHY-05, PER-07) lands completions in the steps that would otherwise be
  flat. A local search over start years found this schedule; the seed ordering,
  which front-loaded the mega-projects, had two rising steps.
- **The mega-projects pay off late and all at once.** HW-01, HW-03 and HW-07 are
  48-month builds and PHY-01 is 36, so the largest late drop in the story
  (28% → 19%, 2028 → 2028.5) is those four completing.

Budget-Constrained buys no structural control at all: at the 0.65 basis $200M
funds none of the hard stops on `zero-day-cascade` (NET-01 $85M, HW-07 $138M plus
its $240M HW-01 prerequisite, HW-09 $10M on top of HW-01), and none of the AI-07 /
AI-08 extraction defenses. Its personnel spend does cut `long-game` to 11.7% and
`alignment-researcher` to 6.3% — but breach is a max, so the open path sets the
number: `patient-distillation` at 50.8%, with `zero-day-cascade` (30.6%) and
`poisoned-chip` (26.4%) behind it. That is the intended lesson, not a calibration
failure: a budget too small to buy any structural control buys little breach
reduction.

### Invariants under test

- **Monotonicity** (`monotonicity.test.ts`) — a property test over random
  postures: advancing or adding any block never raises breach. Every term above
  is built to preserve this.
- **One pipeline** (`posture.test.ts`) — the Score card, the timeline sampler, the
  Policy view and the CISO view report the identical SL, headline breach and
  per-chain breach for a posture with budget caps, a dependency cap and non-unit
  slider multipliers all in play.
- **Ordering** (`scripts.test.ts`) — Do Nothing > Budget-Constrained > Reactive >
  Proactive, with Do Nothing above 60% and Proactive inside 10–25%. The floor
  matters as much as the ceiling: single digits would read as "solved".
- **Proactive SL band** (`scripts.test.ts`) — Proactive must land at SL 3.5–4.0
  at 2030. Pinning breach alone let the story drift to SL 2.5, which reads as a
  failing grade on a program that cut its worst path by 85%; the two numbers have
  to be asserted separately because they scale differently with money.
- **Affordability** (`scripts.test.ts`) — every story must plan *inside* its own
  budget, checked twice: by summing `blockCostBasis` at the story's own
  `risk_tolerance`, and through the engine by asserting `applyBudgetConstraint`
  leaves nothing unfunded. A story that overruns has decorative start years past
  its budget line.
- **The budget binds** (`monotonicity.test.ts`) — an over-budget block falls back
  to its baseline from every state; a $0 budget with everything clicked reproduces
  the starting posture's numbers exactly; and advancing any block through the full
  pipeline, under any budget, never raises any chain's breach.
- **Proactive monotonicity** (`scripts.test.ts`) — breach never rises across the
  13 playback steps. Distinct from the engine-level invariant below: this one
  catches a *schedule* with a gap in it, not a formula that misbehaves.
- **Shared cost basis** (`scripts.test.ts`) — every scripted story plans at
  `risk_tolerance: 0.65`.
- **No stuck deployments** (`scripts.test.ts`) — a block a story starts by 2026
  must actually reach `deployed` by 2030, catching lead-time/prerequisite
  authoring errors.
- **Enablement is a discount, never a cap** (`breach.test.ts`,
  `scoring.test.ts`) — bringing each of `NET-01`'s companions online strictly
  lowers `zero-day-cascade`; the factor floors at exactly `standalone_share` and
  reaches exactly 1.0 when all companions are operational; a block with no
  `completed_by` is bit-identical with and without the surrounding posture; and
  the all-deployed calibration scenario is unchanged, which is what pins the
  mechanic to *partial* postures only.
- **`completed_by` authoring** (`data-integrity.test.ts`) — every companion is a
  real, distinct, non-self block, and every `standalone_share` is a strict
  fraction with a `why` long enough to be a reason. A soft factor can't crash,
  so a bad entry would silently misprice a block forever.

### Known limitation: Do Nothing doesn't rise the way its captions say

The app defaults to OC4. Do Nothing opens on the researched baseline posture, so
its worst chain starts at 77% in 2024, *drops* to 63% in 2026 as the dated baseline
controls arrive (`baseline_since`: ASL-3 egress controls and two-party weight
authorization in 2025, the LLM supervisor and production classifiers in 2026),
and only then climbs back to 68% by 2030 as AI erodes them. Its captions narrate
a steadily rising threat, which describes only the second half. The undefended
rise is real, just steeper at lower tiers. Fixing it properly needs either a
per-script `adversaryOc` override (scripts currently cannot set one) or captions
rewritten to describe what OC4 actually shows.

---

## Notes on honesty

- This is a MODEL, not ground truth. Every constant above is a judgement call.
- The specific numbers (0.85, 0.34, 0.03, the gate's 4.0/0.45) were chosen to
  make the *relationships* behave — hard stops beat probabilistic controls,
  depth beats a single wall, near-perfect defense is expensive, AI erodes the
  defender's position over time — not because any of them is measured.
- Blocks carry `open_questions` with an `uncertainty_level`; `fundamental`
  entries should be read as wide error bars on anything downstream of them.
- Experts disagree on whether full SL5 (5.0) is achievable at all. The residual
  floor is the model's way of not pretending otherwise.

## Distillation exposure

The **distillation exposure accumulator** is built (`engine/distillation.ts`): for
an externally served model, `distillationProgress` integrates a monthly extraction
rate from 2026 to the current year — a 0.5%/month base, multiplied by
`1 + 4 × aiCapability` and by `1 − reduction`, where operational AI-07 (outbound
channel defense, −60%) and NET-04 (rate limiting, −40%) compose multiplicatively —
capped at 100%. The Score card shows it as the "Extraction … distilled" meter, and
it reads 0 when the model is not served externally.

What it does *not* do is feed either headline number. Breach still handles
distillation through the `patient-distillation` chain — the binary
`requires_external_serving` precondition plus the AI-07 / AI-08 blocks — and the
accumulator's `isModelCompromised` threshold (80%) is not wired to anything. Making
the chain read the accumulator, so a threat that is cumulative rather than
event-driven is scored as one, is still open.
