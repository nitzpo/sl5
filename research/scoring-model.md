# SL5 Explorable — Scoring Model

This describes the model **as implemented**. It is the reference for `app/src/engine/`:
`scoring.ts` (SL scores), `breach.ts` (adversary success), `supporting.ts` (which
blocks count toward a chain), `budget.ts` (what a program can pay for), and
`ai-curve.ts` (the capability curve both channels read).

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
19 blocks in `public/data/blocks-*.json` still declare it as their
`baseline_state`, and `getStateEffectiveness` accepts a bare `string`. The store
coerces any baseline outside the cycle to `not_started`
(`store/simulation.ts:baselineStatesFor`), so the running app never scores a
block at 0.60 — only direct-from-data callers such as `scoring.test.ts` do.

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

```
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
is a guard kept under the asymptote so retuning `PROB_BYPASS_SCALE` cannot
silently yield a negative resist.

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

---

## Part 4 — Budget

```
costBasis(block, riskTolerance) = min + (1 − rt) × (max − min)
```

Risk tolerance selects **where in a block's authored cost range you plan**:
conservative (0) budgets the worst case, aggressive (1) bets on the optimistic
estimate. Active blocks consume the budget in advancement order; blocks past the
budget line are capped at `implementing` — a `mature` state the org cannot pay
for is not real.

Funding is **order-stable**: blocks advanced earlier are funded first, so turning
on one more block can only cap *that* block. It never evicts an earlier
commitment.

`rt = 1.0` is the trap. It plans every program at its best case, and since cost
ranges are 4–5× wide (`HW-04`: $200M–$1,000M), an "$800M program" buys a $3.2B
wishlist. That single value was the largest cause of security being too cheap.

---

## Part 5 — Calibration

Measured at **2030 against an OC4 adversary**, worst chain, all four narrative
stories (pinned by `tests/engine/scripts.test.ts`):

| Scenario | Breach | SL | Spend vs budget | Capped | Worst chain |
|---|---|---|---|---|---|
| Do Nothing | 100.0% | 1.00 | $0M | — | patient-distillation |
| Budget-Constrained | 99.4% | 1.51 | $196M / $200M | 0 | zero-day-cascade |
| Reactive CISO | 43.9% | 1.80 | $620M / $700M | 0 | poisoned-chip |
| Proactive Program | 15.2% | 3.51 | $1,330M / $1,400M | 0 | long-game |

Both numbers order the stories the same way, which is the point of weighting SL
and breach identically (Part 2).

All four plan at the **same** `risk_tolerance: 0.65` (asserted by a test), so the
cost basis is one rule rather than per-story special pleading, and **every story
plans inside its own budget** (also asserted) — nothing is capped at
`implementing` anywhere. Raising any budget changes no outcome (measured:
Reactive is identical from $600M to $800M; Budget-Constrained is 99.4% at every
combination from $100M/1.0 to $200M/0.65, because its number comes from hard
stops it cannot afford *at all*, not from the cost basis).

Proactive's trajectory is a steady decline over all 13 playback steps:
`100 → 78.5 → 63.8 → 54.2 → 40.4 → 37.3 → 34.2 → 33.9 → 26.6 → 18.0 → 17.1 →
15.3 → 15.2%`.

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
| 23 blocks (previous Proactive plan) | $759M | 2.51 | 16.7% |
| 30 blocks | $710M | 2.88 | 5.1% |
| 33 blocks (**current Proactive plan**) | $1,330M | **3.51** | **15.2%** |
| 37 blocks | $1,344M | 3.62 | 4.9% |
| all 47 blocks | $3,668M | 4.39 | 4.7% |

Three consequences:

1. **A 23-block plan structurally caps near SL 2.5**, whichever 23 it buys.
   Reaching 3.5 takes 33. This is why Proactive's budget is $1.4B and not $800M:
   ~$1.3B is what SL 3.5 costs in this model, and that *is* the finding.
2. **The ceiling is 4.39, not 5.0.** Even with the entire catalog matured, slider
   penalties (org 0.7 / vendor 0.6 / gov 0.7) and AI erosion never fully clear.
   At perfect sliders and no erosion it reaches exactly 5.00, so the gap is
   entirely those two channels, not a bug in the mean.
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

### Why the residual is 15% and not 5%

SL 3.5 and a double-digit breach are in direct tension, and the plan resolves it
with exactly one deliberate gap. `long-game` is an all-personnel chain
(PER-02/03/04/05); Proactive buys PER-03 and PER-05 and skips **PER-02**
(two-person control, $5M) and **PER-04** (continuous vetting, $10M).

That $15M omission is load-bearing. Every plan measured that also closes those
two collapses breach to **~4.7%** — because breach is a `max` over chains, and
with breadth this wide the other six chains are all sitting on the residual
floor (`long-game` 4.7%, everything else 2.6–3.0%). Adding $15M of personnel
controls would raise SL by 0.03 and cut the headline number by two thirds, which
would read as "solved" and is the exact failure mode the recalibration removed.

Enumerating the alternatives (full catalog minus each candidate omission set,
$3.6B, so plan cost is not the binding constraint) shows how narrow the band is:

| Omitted | SL | Breach |
|---|---|---|
| PER-04 only | 4.19 | 8.7% |
| PER-04, PER-02 | 3.96 | 15.2% |
| PER-04, PER-03 | 3.98 | 16.5% |
| PER-04, PER-03, PER-05 | 3.75 | 30.7% |
| all four | 3.51 | 49.2% |

Two further constraints shaped the schedule:

- **Monotonicity is a scheduling property.** A half-year step where nothing
  completes is a step where AI advances unopposed and breach ticks up. Ten blocks
  start in 2024 — including the cheap 12–18-month items (PHY-03/04, NET-04/07,
  SC-05, PER-08) — specifically so the curve falls through 2024.5–2025 instead of
  sitting at 100% waiting for 48-month hardware. The 2027–2028.25 tail (AI-04,
  PER-05, PHY-05, PER-07) lands completions in the steps that would otherwise be
  flat. A local search over start years found this schedule; the seed ordering,
  which front-loaded the mega-projects, had two rising steps.
- **The mega-projects pay off late and all at once.** HW-01, HW-03 and HW-07 are
  48-month builds and PHY-01 is 36, so the biggest single drop in the story
  (34% → 18%) is those four completing across 2028–2028.5.

Budget-Constrained lands next to Do Nothing because $200M funds none of the
three hard stops on `zero-day-cascade` (NET-01 $50M, HW-07 $50M + its $100M
HW-01 prerequisite, HW-09). Its personnel spend does cut `long-game` to 12% and
`alignment-researcher` to 4% — but breach is a max, so the one open path sets
the number. That is the intended lesson, not a calibration failure: a budget too
small to buy any structural control buys very little breach reduction.

### Invariants under test

- **Monotonicity** (`monotonicity.test.ts`) — a property test over random
  postures: advancing or adding any block never raises breach. Every term above
  is built to preserve this.
- **Ordering** (`scripts.test.ts`) — Do Nothing > Budget-Constrained > Reactive
  ≫ Proactive, with Reactive at least 1.5× Proactive and Proactive inside
  10–20%. The floor matters as much as the ceiling: single digits would read as
  "solved".
- **Proactive SL band** (`scripts.test.ts`) — Proactive must land at SL 3.5–4.0
  at 2030. Pinning breach alone let the story drift to SL 2.5, which reads as a
  failing grade on a program that cut its worst path by 85%; the two numbers have
  to be asserted separately because they scale differently with money.
- **Affordability** (`scripts.test.ts`) — every story must plan *inside* its own
  budget, checked twice: by summing `blockCostBasis` at the story's own
  `risk_tolerance`, and through the engine by asserting `applyBudgetConstraint`
  caps nothing. A story that overruns has decorative start years past its budget
  line.
- **Proactive monotonicity** (`scripts.test.ts`) — breach never rises across the
  13 playback steps. Distinct from the engine-level invariant below: this one
  catches a *schedule* with a gap in it, not a formula that misbehaves.
- **Shared cost basis** (`scripts.test.ts`) — every scripted story plans at
  `risk_tolerance: 0.65`.
- **No stuck deployments** (`scripts.test.ts`) — a block a story starts by 2026
  must actually reach `deployed` by 2030, catching lead-time/prerequisite
  authoring errors.

### Known limitation: Do Nothing is flat at the default adversary

The app defaults to OC4. Undefended against OC4, the worst chain is already 100%
in 2024 and stays there for all 13 playback steps, so the Do Nothing story plays
as a flat line while its captions narrate a rising threat. The rise is real, just
not at that tier — undefended goes 10% → 94% at OC1, and 10% → 76% at OC2 with
the model air-gapped. Fixing it properly needs either a per-script `adversaryOc`
override (scripts currently cannot set one) or captions rewritten to describe
what OC4 actually shows: everything is open from the start, and AI only widens
the margin.

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

## Not implemented

The **distillation exposure accumulator** (a continuous "adversary model
fidelity %" integrating query volume × info-per-query × AI efficiency over
serving time) was designed but never built. Today the model handles distillation
as the binary `requires_external_serving` precondition on `patient-distillation`
plus the AI-07 / AI-08 blocks. A continuous accumulator would be a better
representation of a threat that is cumulative rather than event-driven.
