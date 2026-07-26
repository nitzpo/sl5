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
| `partially_deployed` | 0.60 |
| `deployed` | 0.85 |
| `mature` | 1.00 |

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

Category scores are computed over `relevantBlockIds(chains, allBlocks)` — the
blocks any chain exploits or is stopped by, **plus** the supporting defenses
around them (Part 3). Scoring over the full 47-block catalog would divide a
category's real coverage by exotic controls no modelled threat exercises, so a
well-defended category read as a D.

Passing `allBlocks` matters for consistency: supporting blocks lower breach, so
they must also count toward SL. Otherwise deploying a block could improve the
attacker-facing number while leaving the defender-facing one flat.

### Per category

```
categoryScore = floor + mean(effectiveness over relevant blocks in cat) × (5 − floor)
```

with `baseline_floor = 1.0` — an org with nothing deployed is at SL1, not SL0.

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

Monotonic by construction: an absent block returns 1 (no obstacle), and as
effectiveness rises the term falls toward `1 − resist`. Improving a defense can
never raise breach.

**Both types erode; hard stops just erode far less** — a narrow 0.98→0.86 band
against the probabilistic 0.95→0.35. Hard stops were previously OC-independent,
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
   `supporting.ts`). Weight `0.34`, applied as
   `pass *= 1 − 0.34 × (1 − getPast)`, so a mature supporting block removes about
   a third of what a named one would.
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

| Scenario | Breach | Spend vs budget | Capped | Worst chain |
|---|---|---|---|---|
| Do Nothing | 100.0% | $0M | — | patient-distillation |
| Budget-Constrained | 99.4% | $196M / $200M | 0 | zero-day-cascade |
| Reactive CISO | 43.9% | $620M / $700M | 0 | poisoned-chip |
| Proactive Program | 22.1% | $1,624M / $800M | 20 | long-game |

All four plan at the **same** `risk_tolerance: 0.65` (asserted by a test), so the
cost basis is one rule rather than per-story special pleading. Only Proactive
overruns, and that is deliberate. Budget-Constrained's and Reactive's budgets are
sized to cover their own plans at that basis — raising either changes no outcome
(measured: Reactive is identical from $600M to $800M; Budget-Constrained is 99.4%
at every combination from $100M/1.0 to $200M/0.65, because its number comes from
hard stops it cannot afford *at all*, not from the cost basis).

Proactive's trajectory is a decline, not a cliff: `100 → 59 → 28 → 20%` by 2027,
then a slow *rise* to 22.1% as AI erodes the probabilistic controls faster than
the remaining program can compensate.

Three things make Proactive's 22% honest rather than an artifact:

1. It plans at `risk_tolerance: 0.65`, so its ~$1.6B plan overruns its $800M
   budget and 20 blocks are capped at `implementing`. Those are real gaps.
2. The dominant chain is `long-game` — all four named blocks are personnel
   controls, three of them capped. It is not sitting on the residual floor.
3. 16 blocks are never funded at all.

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
  15–32%.
- **Affordability** (`scripts.test.ts`) — no story may plan more than 2.5× its
  budget, or the posture it narrates bears no relation to what it can pay for.
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
