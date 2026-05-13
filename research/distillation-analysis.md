# Legitimate Channel Attacks — Full Analysis

## The Problem

The inference/API channel is a TWO-WAY attack surface:

**Outbound (information leakage):**
- Model distillation / extraction (cumulative query-response pairs)
- Training data extraction (adversarial prompts recovering memorized data)
- Architecture fingerprinting (probing behavior to infer structure)
- Steganographic exfiltration (compromised model encoding stolen data into outputs)

**Inbound (exploitation through legitimate interface):**
- Prompt injection → code execution (if model has tool/agent capabilities)
- Adversarial inputs that trigger unintended model behavior
- Jailbreaking to weaponize model's own capabilities against host org
- Using API as C2 channel (external queries triggering internal agent actions)
- Poisoning through feedback loops (if model learns from interactions)

**Key distinction from other attack vectors:**
- Uses the LEGITIMATE interface — no security failure needed for access
- Each individual interaction is innocuous
- Damage is cumulative (outbound) or latent until triggered (inbound)
- The channel exists by design for revenue/utility — eliminating it has business cost
- Defending requires understanding both directions simultaneously

## Defenses (Building Blocks That Apply)

### Hard Stops
- **NET-01 (Air gap):** Don't serve the model externally at all → 100% protection, 0% revenue
- **NET-04 (Bandwidth limitation):** Physical cap on total output volume → bounds information leakage rate

### Probabilistic / Partial Defenses
- **Rate limiting per entity:** Caps individual actor's extraction rate; defeated by Sybil (many accounts)
- **Output perturbation:** Add noise to logits/probabilities; degrades distillation quality but also degrades legitimate use
- **Query pattern detection:** Monitor for systematic extraction patterns; arms race with adversary
- **Watermarking:** Embed detectable signals in outputs; proves theft occurred but doesn't prevent it
- **Restricted output format:** Return only top-1 token, no logits/probabilities; limits information per query but degrades API utility
- **Differential privacy on outputs:** Formal guarantees on information leakage per query; emerging research

### Research-Dependent (Future Blocks)
- **Provable information-theoretic bounds:** "After N queries, adversary can extract at most X% of model capability" — active research, not yet practical
- **Cryptographic inference:** Compute inference without revealing model or input (homomorphic encryption, MPC) — theoretically possible, 1000-10000x overhead currently
- **Fingerprinting + legal enforcement:** Detect distilled models in the wild; legal deterrent, not prevention

## Time Dynamics

| Year | Attack Capability | Defense Capability |
|---|---|---|
| 2024 | Basic distillation: millions of queries → ~70% fidelity model | Rate limiting, basic monitoring |
| 2026 | AI-optimized query selection: 10x more efficient extraction | Better pattern detection; output perturbation research |
| 2028 | Near-optimal extraction: 100x efficiency gains | Possibly: formal leakage bounds, better watermarking |
| 2030 | Unknown — may approach theoretical limits | Possibly: practical cryptographic inference |

## Key Insight for the Simulation

Distillation is NOT binary (present/absent). It's a **continuous leak** with a **rate** that depends on:
1. Output richness (logits vs top-1 vs text only)
2. Query volume allowed
3. Detection sophistication
4. Adversary's optimization of queries
5. AI capability (both sides)

The simulation should model this as an **exposure accumulator**:
```
cumulative_extraction(year) = integral over time of:
    (query_rate × information_per_query × AI_efficiency_multiplier)
    - (detection_probability × response_effectiveness)
```

When cumulative_extraction crosses a threshold (~60-80% model capability), the model is effectively "stolen" even though no single exfiltration event occurred.

## Implications for SL Score

A lab serving a frontier model externally CANNOT achieve SL5 for that model. Period.
But there's a spectrum:
- SL5 for weights-at-rest (air-gapped training/research) 
- SL3-4 for the served model (bounded leakage rate)
- Accept: the served model will eventually be partially extracted

This split — different SL levels for different aspects of the same model — is important and should be visible in the tool.

## Building Block Additions

**AI-07: Inference Channel Outbound Defense (Anti-Distillation + Anti-Exfiltration)**

| Dimension | Value | Notes |
|---|---|---|
| Technical feasibility | 40-60% | Partial defenses exist; complete prevention requires cryptographic inference |
| Time to deploy | 6-18 months (partial), unknown (complete) | Rate limiting is fast; formal bounds are research |
| Cost | $5-50M | Varies enormously by approach |
| Vendor dependency | 30% | Some solutions need chip-level support (HE acceleration) |
| Supply scarcity | 60% | Few researchers at intersection of ML + crypto + security |
| Org readiness | 60% | AI labs understand this problem; solutions are partial |
| Defense type | Hybrid | Rate limiting is hard cap; detection is probabilistic |
| SL first required | SL3 (basic), SL4 (advanced), SL5 (model not served externally) |
| OC to exploit absence | OC2 (basic extraction), OC3 (sophisticated), OC4 (near-optimal) |
| AI OC shift | +1.5 | AI dramatically improves query optimization for extraction |

**AI-08: Inference Channel Inbound Defense (Anti-Exploitation)**

| Dimension | Value | Notes |
|---|---|---|
| Technical feasibility | 35-55% | Input sanitization is partial; prompt injection is unsolved |
| Time to deploy | 6-24 months | Basic filtering fast; deep defenses need architecture changes |
| Cost | $10-80M | Monitoring infra + research + ongoing operational cost |
| Vendor dependency | 20% | Mostly internal; some external security tooling |
| Supply scarcity | 70% | Very few understand intersection of LLM behavior + security |
| Org readiness | 45% | Labs understand prompt injection exists; defenses are immature |
| Defense type | Probabilistic | Arms race; no complete solution exists |
| SL first required | SL3 (basic), SL4 (layered), SL5 (model isolated from external input) |
| OC to exploit absence | OC2 (basic jailbreaks), OC3 (targeted exploitation), OC4 (weaponized C2) |
| AI OC shift | +2.0 | AI generates novel attack payloads faster than defenses adapt |

### The fundamental tension:
Serving a model externally means accepting BOTH leakage risk (outbound) and exploitation risk (inbound). The SL5 answer remains: don't serve it. But for SL3-4, the question is how much of each direction you can bound.
