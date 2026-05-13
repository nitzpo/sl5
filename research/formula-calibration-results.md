# Formula Calibration Results

## Summary of Findings

The scoring model produces outputs that align with the RAND framework's key insights.
Tested 5 scenarios + breach chains + distillation accumulator.

## Key Outputs

| Scenario | Overall SL | Interpretation |
|----------|-----------|----------------|
| Baseline 2026 (current labs) | 1.76 | Labs today are ~SL2 — basic professional controls, nothing SL4+ |
| All implementing 2026 | 2.54 | Even starting everything NOW, you're still only SL2.5 in 2026 |
| All deployed 2029 | 4.06 | Maximum achievable with all blocks: SL4, not SL5 — AI degrades probabilistic blocks |
| Deployed net+phys, no AI blocks | 1.41 | Weakest-link kills you — physical fortress with AI blind spot = SL1.4 |
| Realistic good lab 2028 | 2.18 | Well-funded lab, 2 years of investment: barely SL2.2 |

## What the Model Confirms

1. **SL5 may not be achievable** — Even with ALL 47 blocks deployed by 2029, score = 4.06. AI degradation of probabilistic blocks (especially AI-specific category at 3.93) prevents reaching 5.0. This matches RAND's "SL5 achievable: false."

2. **Weakest-link dominates** — Scenario 4 (perfect network+physical but no AI blocks) = SL 1.41. You cannot castle one category and ignore another.

3. **Personnel is the hardest category** — In Scenario 5 (realistic), personnel = 1.96 vs machine = 3.14. Org readiness barriers (culture, hiring, vetting) are the binding constraint, not technology.

4. **Hard stops work, probabilistic blocks erode** — NET-01 deployed drops Remote Ghost chain from 49% to 1%. But probabilistic blocks (AI-03, PER-03) lose 15-30% effectiveness by 2029 as AI amplifies attacks against them.

5. **OC4→OC5 is NOT a gradual step for well-designed chains** — "The Long Game" (personnel) shows proper differentiation: OC2=2%, OC3=7%, OC4=16%, OC5=22% at baseline. Higher-threshold blocks gate out lower adversaries as expected.

## Formula Adjustments Made

| Parameter | Original | Adjusted | Why |
|-----------|----------|----------|-----|
| Distillation base rate | 2%/month | 0.5%/month | Was reaching 86% in 1 year — unrealistic |
| Category baseline floor | 0.0 | SL 1.0 | Labs have implicit SL1-2 controls not in our blocks |
| Hard-stop deployed bypass | 0.1 | 0.02 | Hard stops should be nearly impassable |
| Probabilistic deployed bypass | 0.1 | 0.15 | Probabilistic defenses can be overcome more easily |

## Remaining Issues / Open Questions

1. **Breach chain OC spread for low-threshold blocks:** Remote Ghost (NET-01 threshold=2) shows OC3=32% → OC5=50% which is compressed. This is actually correct — the block's low threshold means most adversaries CAN exploit its absence. The spread shows up in higher-threshold chains. But may need per-chain narrative calibration.

2. **AI-01 oc_shift=3.0 produces effective OC of 6.79 by 2029:** Effective OC above 5.0 is off the scale. This is intentional — it represents "the threat exceeds our scale" which is the alignment problem. May need UI treatment (cap display at 5.0 with "exceeds scale" indicator).

3. **Block weighting within categories:** Currently equal-weighted. Some blocks are more important (NET-01 vs NET-06). Could add a `criticality_weight` field. Deferred — adds complexity without changing core insights.

4. **Defense-in-depth discount not yet integrated into SL score:** The depth score exists conceptually (8 layers) but isn't wired into the overall formula. Need to decide: does depth improve the weakest-link score, or is it a separate indicator?

## Recommended Formula Changes for Implementation

```
simulation_config.scoring.baseline_floor = 1.0
simulation_config.distillation_model.base_extraction_rate_per_month = 0.005
simulation_config.breach_probability.hard_stop_bypass_when_deployed = 0.02
simulation_config.breach_probability.probabilistic_bypass_when_deployed = 0.15
```

## Next Step

These formulas are ready for implementation. The numbers tell the right story and produce the intended "aha moments" (SL5 unachievable, weakest-link, personnel as bottleneck, AI degradation of probabilistic defenses).
