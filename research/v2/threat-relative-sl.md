# The threat-relative security level

How v2's SL went from v1's coverage score to "the highest attacker tier you usually stop". It took four steps:

1. a deep design;
2. an independent review that cut it in half;
3. the user's rejection of the reviewer's breadth rule;
4. probes of the rule that was finally adopted.

Every number in §1–§4 comes from probes that ran a variant engine on **v1's chain model** (snapshot of `ec5d9bd`), not on the shipped vector engine. They justify the *rules*; the shipped numbers are in [`../scoring-model.md`](../scoring-model.md). The probe sources are in [`probes/`](probes/).

## 0. The problem

- v1's "SL" was a coverage index: 0.3·min + 0.7·mean of category scores. It made no reference to any attacker.
- RAND defines the levels by the attacker they stop (*Securing AI Model Weights*, Fig. 6.1):
  - "SL1 A system that can likely thwart amateur attempts (OC1)."
  - "SL4 … can likely thwart most standard operations by leading cyber-capable institutions (OC4)."
  - "SL5 A system that could plausibly be claimed to thwart most top-priority operations by the top cyber-capable institutions (OC5)."
- The review found that coverage and breach could rank two postures in opposite orders, and that there was no real OC4 → OC5 jump: P(OC5)/P(OC4) was about 1.18 ([`2026-11-review.md`](2026-11-review.md#high-sl-is-a-coverage-score-not-rands-sl)).

## 1. The design (26 Nov), condensed

> **SL = max n ∈ {1..5} such that P_campaign(OC-k, year, posture) ≤ τ for every k ≤ n**, with τ = 20%. 0 means "below SL1".

### Why 20%

- RAND Box 5.1 scores each vector as "the likelihood that a single operation … can successfully execute the attack", in bands: 1 = up to 20%, 2 = 20–40%, and so on.
- RAND places a measure in the lowest SL whose OC can feasibly use the vector, where feasible means "a feasibility score above 1".
- So 20% is RAND's own score-1 boundary. It is also the ICD 203 "very unlikely | unlikely" edge.
- A literal "likely thwart" (≤45%) was rejected as too lenient.

### Engine changes proposed

| Id | Change | Purpose |
|---|---|---|
| E1 | Campaign = ordered attempts across *routes*, best first, with persistence ρₙ = 1 − exp(−Hₙ/12 mo) taken from the OC time horizons (OC1..5 ≈ 0.02 / 0.08 / 0.39 / 0.63 / 0.99); max within a route | Make OC5's patience matter; robust to catalogue growth |
| E2 | Residual floor 3% applied once per campaign, not per chain | Per-chain floors added up to 23% for the full catalogue |
| E3 | Attacker AI lift per block for bypass | Keep hard stops AI-robust |
| E4 | OC-dependent hard-stop band: 0.98 − 0.45·σ(2.5·(eOC − thr)) | Make hard stops fall at high tiers |
| D1 | Hard-stop thresholds re-anchored to RAND Table 5.2 | Ground E4 in RAND |
| D2 | At least 3 OC5-gated chains (fab implant, sleeper, gap bridge) | OC5-only risk |
| E5 | Campaign-level AI uplift U = 1.0 OC at full AI capability | Time decay |

Distillation leaves the SL. Rogue AI gets its own AC1–5 axis and a **Containment** meter.

### What the design measured (2030, P for OC1..5 in %)

| Posture | Coverage SL | v1 engine (distillation out) | Proposed |
|---|---|---|---|
| Baseline 2026 | 1.38 | 0/11/51/65/74 → SL2 | 0/16/58/88/98 → SL2 · at risk |
| Do Nothing | 1.40 | 2/30/53/68/72 → SL1 | 5/48/72/96/98 → SL1 |
| Reactive | 2.07 | 0/2/6/19/25 → SL4 | 0/3/23/52/70 → SL2 · close to SL3 |
| Proactive | 3.53 | 0/2/6/16/20 → SL5 | 0/3/6/17/28 → SL4 · at risk |
| Proactive + PER-02/04 | 3.78 | 0/2/3/5/7 → SL5 | 0/3/3/6/14 → SL5 |
| Cheap 27 blocks ($559M) | 2.83 | 0/2/3/5/7 → SL5 | 0/3/3/16/31 → SL4 · at risk |
| Full catalogue | 4.41 | 0/2/3/4/6 → SL5 | 0/3/3/4/9 → SL5 |

**The SL4 → SL5 gap became real in the probes:**
- P(SL5 | SL ≥ 4) fell from 89% to 54% over 600 random strong postures.
- The greedy price of each level changed:

  | Model | SL3 | SL4 | SL5 |
  |---|---|---|---|
  | v1 engine | $48M | $213M | $223M |
  | Proposed | $180M | $481M | $999M |

### Other parts of the design

- **Display.** A discrete level plus a stateless qualifier ("at risk", "close to SL n+1"), a holds / contested / loses ladder per tier, ICD 203 words in the hover, and no percentages.
- **Hysteresis rejected.** Entering at 15% and leaving at 25% removes flicker but makes SL path-dependent: playback would disagree with the static view.
- **Per-path "breaking tier".** Shown next to the verdict, never as the SL. The campaign is not the minimum over paths: Cheap27 has every path at tier 5 yet is only SL4.
- **Properties.** Monotone in posture, in OC and in year: 0 violations over 400 postures × 7 OC values.
- **Coverage kept** as "Program completeness".
- **Open issue the design flagged itself:** SL5 cost about $1B without a SCIF (PHY-01), which is too cheap.

## 2. The independent review: "adopt with changes"

A separate agent, briefed as a skeptical quantitative risk modeller, re-implemented the campaign from the design's prose. It matched `model.ts` exactly: Proactive OC4/OC5 = 17.5/28.3%. Its verdict:

> Keep the core of the design: the threat-relative ladder, τ around 20%, distillation out of SL, the residual applied once per campaign, and the 3-state ladder. Cut about half the engine machinery. My probes show it does little, and the SL4→SL5 gap actually rests on one constant with no source.

### Ranked issues

1. **The SL4/SL5 gap comes from one unsourced constant.**
   - With the combination rule fixed and only the hard-stop band varied, P(SL5 | SL ≥ 4) was 77% with v1's band and 78% with the RAND-anchored thresholds alone. With an E4 scale of 0.30 / 0.45 / 0.60 it was 66% / 55% / 34%.
   - E4 also breaks its own anchor: at the threshold, bypass is 25%, not "score 3 ≈ 50%".
   - *Fix:* take hard-stop bypass from a per-block Table 5.2 lookup.
2. **The AI uplift U = 1 merges OC4 into OC5 by 2030.**
   - Both get ρ = 0.993, and the "OC5-gated" chains open to OC4 (gate 0.86 vs 0.10 at U = 0).
   - Today's baseline shows OC2 at 51% by 2030: a lone professional gets a coin flip at frontier weights.
   - *Fix:* U = 0.
3. **Much of the machinery is inert.**
   - The OC5 chains change no verdict (≤1 pp), because the max within a route absorbs them.
   - E3 moves results by ≤2 pp.
   - In 2030 the persistence campaign equals a plain union.
4. **Route tags are a hidden, high-leverage knob, and the union grows with the catalogue.**
   - Re-tagging flips Proactive from SL4 to SL3.
   - Two new route families took Cheap27 OC4 from 16% to 25%.
   - *Fix:* a closed route list, and bounded breadth.
5. **The justification for τ overclaims.**
   - Box 5.1 scores one vector against "an average tech company with only ubiquitously available security mechanisms". The "score above 1" rule places measures; it is not a pass mark for a defended system facing a whole campaign.
   - *Fix:* keep 20%, but present it as a modelling choice ("about 1 in 5"). Label SL5 "claimable".
6. **Numbers critics will attack first:** SL5 for about $999M with no SCIF; "today's labs are SL1 from 2027"; knife-edge verdicts (Proactive at 17% against a 20% bar).
7. **Minor:** "at risk" reads as "under attack"; use "marginal".

### The reviewer's simplest viable alternative

> "SL n means every attacker class up to n fails at least 4 times in 5. An amateur, professional or syndicate tries its one easiest route, a nation-state its two easiest, and a top-priority operation its three easiest."

- A route's p is its worst chain.
- P_k = 1 − ∏(1 − p) over the m_k best routes, with **m = (1, 1, 1, 2, 3)**.
- The residual is 3% × gate, applied once.
- No ρ, no U, no per-block lift, no illustrative OC5 chains.

| | Design | Alternative |
|---|---|---|
| New knobs | τ, ρ scale, U, hard-stop scale and steepness, detection D, route tags | τ, m, route tags |
| Same SL as the design (600 postures) | — | 89% |
| P(SL5 \| SL ≥ 4) | 54% | 55% |
| Story targets | Reactive misses SL3 | All met |
| Cheap27 OC4 after two new routes | 25% (SL3) | 13% (SL4) |
| Monotone | Yes | Yes (0 of 210 checks) |
| Explanation | A paragraph | One sentence |

**Rejected by the reviewer:**
- *"Worst chain plus a fixed OC5 penalty."* The penalty ignores the posture, so SL5 is either free or impossible.
- *"Count of open routes" as the rule.* It collapses to the worst chain: 83% of SL4+ postures are also SL5. It works well as display text, though ("OC5: 2 of 4 routes open").

**On rogue AI**, the reviewer recommended folding it into SL as an "own model as insider" route that SL5 must hold, rather than a parallel AC/Containment ladder. That became option A (D10).

## 3. The user rejects bounded breadth

The agent brought the reviewer's breadth rule to the user. The user replied:

> "I don't understand this. A cyber operation may try hunderds of "doors" until it finds a path. or am i misunderstanding?"

> "i definitely don't agree with you. top-priority operation DEFINITELY will try all strategies; for nation-state i'm not sure how many but could be more than 2. and for lower tier some of the strategies are not really relevant or 0% chance"

The user's point:
- capping how many approaches a tier tries invents a restraint that real attackers don't have;
- what keeps a hobbyist out of a supply-chain implant is capability, not a quota.

So the new rule to test was:
- a closed list of strategies, using RAND's attack categories;
- the chains are *variants* within a strategy;
- every tier tries every strategy, using its best variant;
- strategies combine as a union, P = 1 − ∏(1 − p_s);
- the 3% residual applies once;
- distillation is out;
- τ = 20%.

## 4. The union-across-strategies probe

These are the reviewer's follow-up probes `r6_union.ts`, `r7_fixes.ts` and `r8_lowshift.ts` (outputs in [`probes/sl-review/`](probes/sl-review/)). Setup: v1 engine and hard-stop band, 2030 unless noted.

### Scenarios under the union

| Posture | Coverage SL | New SL | OC4 | OC5 | SL with the minimal data fix |
|---|---|---|---|---|---|
| Baseline 2026 | 1.38 | SL2 | 94% usually succeeds | 97% usually succeeds | SL2 |
| Do Nothing | 1.40 | SL1 | 94% usually succeeds | 96% usually succeeds | SL1 |
| Budget-Constrained | 1.84 | SL2 | 59% usually succeeds | 67% usually succeeds | SL2 |
| Reactive | 2.07 | SL3 | 40% contested | 48% contested | SL3 |
| Proactive | 3.53 | SL4 | 17% usually fails | 21% contested | SL4 (OC5 44%) |
| Proactive + PER-02/04 | 3.78 | SL5 | 5% usually fails | 8% usually fails | SL4 (OC5 28%) |
| Cheap27 | 2.83 | SL5 | 11% usually fails | 18% usually fails | SL4 (OC5 32%) |
| Full catalogue | 4.41 | SL5 | 4% usually fails | 6% usually fails | SL5 (OC5 11%) |

Proactive's 17% is almost all one strategy: insider 16.1%, every other strategy ≤0.5%.

### Is there an SL4/SL5 gap?

Measured over 600 strong postures. The ratio is the median OC5/OC4 risk among postures at SL ≥ 4.

| Configuration | P(SL5 \| SL ≥ 4) | OC5/OC4 ratio |
|---|---|---|
| Union alone | 81% | 1.38: **no real gap** |
| + the design's illustrative OC5 variants | 80% | inert: they name more stoppers, so the max never picks them |
| + Table 5.2 lookup for 6 hard stops (NET-01, NET-05, PHY-01, HW-04, HW-05, PHY-02) | 73% | 1.45 |
| + "sharp" OC5 variants with few stoppers | 58% | they leak to OC4 by 2030 through the AI gate lift, so Proactive falls to SL3 |
| **+ sharp variants built from low-AI-shift steps** | **44%** | **2.27**; every SL4 verdict unchanged |
| + low-AI-shift variants + lookup | 23% | 2.44 |

A broader, more contestable lookup of all hard stops was too harsh: P(SL5 | SL ≥ 4) fell to 11% and Reactive dropped to SL2.

### Catalogue size

- **A duplicate variant inside a strategy:** 0 pp change.
- **A whole new strategy:**
  - at median strength: 0 pp for Proactive, +2 pp for Cheap27;
  - three new strategies: Cheap27 drops from SL5 to SL4;
  - one as strong as the worst existing strategy: Proactive OC4 goes from 17% to 30% (SL4 → SL3).
- So the strategy list must stay **closed**.

### Detection

The detection rule is `P = Σ_k p_k · Π_{j<k} (1 − p_j)(1 − q)`, with strategies tried in descending p.

| Posture | q = 0 | q = 0.2 | q = 0.5 |
|---|---|---|---|
| Proactive | SL4 (OC4 17%) | SL4 (16%) | SL4 (16%) |
| Cheap27, with the fixes | SL4 (OC5 25%) | SL5 (20%) | SL5 (15%) |
| Reactive | SL3 (OC4 40%) | SL3 (34%) | SL3 (27%) |

Across 300 strong postures, q = 0.2 lifts 26 by at least one SL, and q = 0.5 lifts 52. Detection is a real lever for balanced postures and does nothing when one strategy dominates: "detection does not fix your weakest route".

**Monotonicity:** about 210 random postures for each of three variants, with 0 violations for block advancement, increasing OC and increasing year.

**Reviewer's verdict:**

> "Try every strategy, union across strategies" is sound enough to adopt. Pair it with a closed strategy list, OC5-only variants authored from low-AI-shift steps, and the 6-block Table 5.2 lookup. Without that data there is no real SL4/SL5 gap.

## 5. What happened next: the rule moved onto RAND's vectors

The probe answered "how do strategies combine". It also exposed that hand-written chains were the weak point. The user then asked: "if there is a control that doesn't have an attack path through it, it will never matter to anything in our simulator. then why is it there at all?" (D13).

The "strategies" became RAND-grounded **approaches**. The "variants" became the attacker's easiest **attack path** through RAND's vectors, found by the engine instead of written by hand. The vector model has its own reviewed probe ([`vector-model/README.md`](vector-model/README.md)).

## 6. The adopted rule (shipped in Phase 2A)

The authoritative statement is [`../scoring-model.md`](../scoring-model.md), Parts 4 and 6.

1. **Approaches × stages.**
   - Six approaches: remote intrusion, insider, physical, supply chain, served model (only when the model is served), and AI insider.
   - Each approach has candidate vectors per stage: get in → reach the weights → get them out.
   - Path success is the product of the stage probabilities, using the attacker's best vector at each stage.
2. **Every attacker tries every approach** it can afford. There is no breadth cap; RAND's low feasibility scores keep low tiers out.
3. **Campaign** = at least one approach works, with detection: `P = Σ_k p_k · Π_{j<k} (1 − p_j)(1 − q)`, approaches in descending p. q comes from DET-01 and DEC-01 (up to about 0.5) and erodes with AI.
4. **Residual floor** once per campaign.
5. **Tier n holds** if P_campaign(OC-n) < τ.
   - τ is configurable: strict 1/10, standard 1/5 (default), lenient 1/3.
   - SL is the highest n with every tier up to n held.
   - **SL5 also requires the AI-insider approach to hold** against that year's AC band (option A).
6. **Display:** level + progress bar toward n+1 + `marginal` flag; decimal on hover. Per-tier words *usually fails / contested / usually succeeds*, with the ICD 203 word on hover.
7. **Coverage** survives as `programCompleteness`.

### What was dropped, and why

| Dropped | Why |
|---|---|
| Persistence ρ from OC horizons (E1) | Inert by 2030; superseded by the union |
| Campaign AI uplift U = 1 (E5) | Merged OC4 into OC5; replaced by a per-vector `ai_shift` |
| Hard-stop band 0.45/2.5 (E4) | Unsourced; RAND's own per-vector scores now carry the tier dependence |
| Illustrative OC5-gated chains (D2) | Inert, or leaked to OC4; vectors whose RAND score jumps at OC5 replace them |
| Bounded breadth m = (1,1,1,2,3) | Rejected by the user |
| AC/Containment Level axis | Replaced by option A |
| UI hysteresis | Path-dependent SL |

### Known weak points carried forward

- **The SL4/SL5 gap and the reachability of SL5 depend on data:** which controls counter which vectors, and how strongly. In the first v2 calibration the full catalogue could not reach SL5, which the user rejected (D23). The recalibration was in progress when this folder was written.
- **The bar is a modelling choice**, not a RAND number.
- **Knife-edge verdicts are possible.** The progress bar and the `marginal` flag exist to show them.
