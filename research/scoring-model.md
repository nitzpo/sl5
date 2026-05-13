# SL5 Explorable — Scoring Model

## SL Equivalent Score

The tool outputs a composite "SL equivalent" score (e.g., SL3.7) for quick calibration.
This is explicitly labeled as a simplification — the detail view shows the full gap analysis.

## How It's Calculated

### Per-Category Score

Each category (Network, Machine, Physical, Personnel, Supply Chain, AI-Specific) gets a sub-score:

```
category_score(cat, year) = 
    weighted_average over blocks_in_cat:
        block_effectiveness(block, year) × block_weight(block)
```

Where:
```
block_effectiveness(block, year) = 
    if block.state == DEPLOYED:
        block.defense_quality × (1 - degradation_from_AI_shift(block, year))
    elif block.state == IMPLEMENTING:
        0.3 × progress_fraction  // partial credit during implementation
    else:
        0.0
```

### AI Degradation Factor
```
degradation_from_AI_shift(block, year) =
    block.ai_oc_shift × AI_capability(year) × 0.1
    // A block with ai_oc_shift +2 at AI_capability 1.0 loses 20% effectiveness
    // Only applies to probabilistic blocks; hard stops have ai_oc_shift 0
```

### Overall SL Score
```
overall_SL(year) = min(category_scores)  // weakest link determines posture
    // Alternative: weighted by attack chain coverage
```

The min() function captures the RAND insight: "vulnerability in ONE vector can compromise everything."
But we may want a softer version that accounts for defense-in-depth:

```
overall_SL(year) = 
    0.6 × min(category_scores) +     // weakest link dominates
    0.4 × harmonic_mean(category_scores)  // but depth matters
```

### Mapping Score to SL Level
```
0.0 - 1.0: Below SL1 (no meaningful security)
1.0 - 2.0: SL1 range (basic controls)
2.0 - 3.0: SL2 range (professional best practices)
3.0 - 4.0: SL3 range (aggressive attack surface reduction)
4.0 - 4.5: SL4 range (state-actor defenses)
4.5 - 5.0: SL5 range (top-priority state operations)
5.0: Full SL5 (may not be achievable — see open questions)
```

## Adversary Breach Probability

For the attacker perspective:
```
P(breach | adversary_OC, year, posture) =
    max over viable_chains:
        P(chain_success | adversary_effective_OC, blocks_present)
```

Where:
```
adversary_effective_OC(base_OC, year) = 
    base_OC + AI_capability(year) × average_AI_shift_for_target_blocks

P(chain_success | effective_OC, blocks) =
    product over required_absent_blocks:
        (1 - block_defense_probability(block, effective_OC))
    // If ALL blocks in the chain are deployed and effective,
    // product approaches 0 → chain fails
    // If ANY block is absent, that term is 1.0 → chain might succeed
```

## Defense-in-Depth Score

```
depth_score = f(
    num_independent_layers,
    per_layer_strength,
    cross_layer_correlation  // shared dependencies = correlated failure
)

// RAND benchmarks:
// SL3: 2 independent layers
// SL4: 4 independent layers  
// SL5: 8 independent layers

// A layer is "independent" if its failure is uncorrelated with other layers
// Shared personnel, shared vendors, shared software = correlation
```

## Distillation Exposure Accumulator

Separate from the main SL score (because it's continuous, not binary):
```
extraction_progress(year) = 
    if model_served_externally:
        integral from deployment_date to year of:
            daily_query_volume × info_per_query × AI_efficiency(year)
            × (1 - detection_and_response_effectiveness)
    else:
        0.0  // air-gapped model has no extraction channel

// Display as percentage: "Estimated adversary model fidelity: 45%"
// Threshold: >80% = model effectively compromised via distillation
```

## Display

### Quick View
```
┌─────────────────────────────────────┐
│  Security Posture: SL 3.7           │
│  ███████████████████░░░░░░  (74%)   │
│                                     │
│  vs OC4 (2027): 34% breach prob     │
│  vs OC5 (2027): 78% breach prob     │
│                                     │
│  Extraction progress: 23% (served)  │
│  Defense depth: 3/8 layers          │
└─────────────────────────────────────┘
```

### Detail View (per category)
```
Network:    ████████░░  4.1
Machine:    ██████░░░░  3.2  ← weakest
Physical:   ████████░░  4.0
Personnel:  ███████░░░  3.7
Supply:     ██████░░░░  3.4
AI-Spec:    █████░░░░░  2.8  ← also weak
```

## Notes on Honesty

- The score is a MODEL, not ground truth
- All formulas visible and editable (click to inspect)
- Uncertainty bands should be displayed (not just point estimates)
- The tool should say: "Experts disagree on whether SL5 = 5.0 is achievable at all"
- Blocks with "Fundamental" uncertainty level add wider error bars to the category score
