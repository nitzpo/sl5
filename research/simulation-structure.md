# SL5 Explorable — Simulation Structure (Converging Draft)

## Core Loop

```
User selects YEAR (2026-2030)
    → World state updates (AI capability, OC multipliers, block maturation)
    
User toggles BUILDING BLOCKS (on/off/investing/researching)
    → Defense posture recalculates
    
User selects PERSPECTIVE (CISO / Attacker / Policymaker / Observer)
    → Visualization adapts framing
    
System shows:
    → Defense layers (how many independent layers? gaps?)
    → Attack surface (which chains are open? probability of breach?)
    → Effective adversary OC (base + AI multiplier at this year)
    → Cost/effort accumulated
    → Critical decisions remaining (blocks with closing deployment windows)
```

## Time-Dependent Formulas

### Block Maturation Over Time
Each block has a state trajectory:
```
State(block, year) = f(
    decision_year,          // when investment started (or null)
    time_to_deploy,         // base months to operational
    current_year,           // where we are now
    feasibility_trajectory  // does feasibility improve over time? (research blocks)
)

States: NOT_STARTED → RESEARCHING → IMPLEMENTING → DEPLOYED → MATURE
```

For research-dependent blocks (AI-03, HW-10):
```
feasibility(year) = base_feasibility + research_progress_rate * (year - 2024)
// capped at some ceiling; may have breakthrough jumps
```

For vendor-dependent blocks (HW-03, HW-01):
```
availability(year) = step_function based on chip generation timelines
// NVIDIA Blackwell: available 2025
// Next-gen with full SL5 features: ~2027-2028
// Universal across vendors: ~2029-2030
```

### AI OC Multiplier Over Time
```
effective_OC(base_OC, year) = base_OC + AI_shift(block) * AI_capability(year)

AI_capability(year): 
    2024: 0.0 (AI not yet meaningfully amplifying attacks)
    2025: 0.2
    2026: 0.4
    2027: 0.7 (AI 2027 forecast: 250 top-hacker-equivalents)
    2028: 0.85
    2029: 0.95
    2030: 1.0

// User can adjust this curve via "AI advancement optimism" slider
// Pessimistic (slower): multiply years by 1.5
// Optimistic (faster): multiply years by 0.7
```

### Breach Probability Calculation
```
P(breach given chain C at year Y) = 
    product over blocks_in_chain: P(exploit_block_absence | effective_OC, block_state)
    * (1 - defense_in_depth_factor)

defense_in_depth_factor = 
    f(number_of_independent_layers, layer_quality, correlation_between_layers)
```

### Production Exposure (Distillation/Exfiltration via Inference)
```
distillation_risk(year) = f(
    model_served_externally: bool,
    rate_limiting: present/absent,
    output_monitoring: present/absent,
    AI_capability(year),  // better AI = better distillation attacks
    time_exposed          // cumulative exposure window
)

// Key insight: even with all network blocks, serving the model
// creates an information leak channel that grows with time and AI capability
```

## What Changes Over Time (independent of user decisions)

| Factor | Direction | Rate |
|---|---|---|
| AI capability available to attackers | Increases | Accelerating |
| Adversarial example sophistication | Increases | Fast |
| Model distillation efficiency | Increases | Fast |
| Zero-day discovery (AI-assisted) | Increases | Moderate |
| Social engineering capability (AI) | Increases | Fast |
| Physical attack capability | Roughly stable | Slow |
| Available hardware security features | Increases | Slow (chip cycles) |
| Research on adversarial robustness | Uncertain | May plateau |
| Cost of compute (for defenders) | Decreases | Moderate |
| Regulatory pressure | Increases | Moderate |

## What the User Controls

### Direct Toggles (per block)
- NOT INVESTING / INVESTING / DEPLOYED
- If investing: start year (defaults to current selected year)

### Global Sliders
- Annual security budget ($50M - $2B)
- AI advancement timeline (pessimistic ↔ optimistic)
- Government cooperation (none ↔ full — affects PER-04, PHY-01, SC-05)
- Vendor cooperation (none ↔ full — affects HW-01, HW-03, HW-04)
- Organizational transformation willingness (low ↔ high — affects readiness scores)
- Risk tolerance (conservative ↔ aggressive)

### Perspective Selector
- CISO: "What should I invest in next? What's my biggest gap?"
- Attacker: "Given this posture, what's my best attack path? What OC do I need?"
- Policymaker: "What regulation/incentive would close the most gaps industry-wide?"
- Observer: Full system view with all metrics visible

## Visualization Concepts

### Main View: Block Status Dashboard
- Grid/hex layout of all building blocks, colored by state
- Grouped by category (Network, Machine, Physical, Personnel, Supply Chain, AI)
- Click to expand block detail panel
- Summary mode (10 groups) / Expert mode (40+ blocks)

### Side Panel: Timeline Track
- Horizontal timeline 2024-2030
- Shows block deployment progress bars
- Shows AI capability curve rising
- Shows "decision windows closing" (blocks where it's too late to start)

### Overlay: Attack Surface
- Active attack chains highlighted
- Probability of breach displayed
- Which blocks would close which chains

### Overlay: Defense Layers
- Visualization of N independent layers
- Which blocks contribute to which layer
- Where layers share dependencies (correlated failure risk)

### Bottom: Stakes Panel
- Brief: "Current posture: SL3.2 equivalent against OC4. With AI multiplier by 2028: effectively SL2.5."
- What's at risk: model capabilities, economic value, misuse potential

## The "What's At Stake" Sidebar

Brief framing (always visible, not deep):

**If a frontier model is exfiltrated:**
- Safety guardrails removed → unrestricted dangerous capabilities
- Fine-tuned for offensive cyber, biological/chemical design, manipulation
- Economic advantage: years of R&D ($1-10B+) captured instantly
- Military applications: autonomous systems, intelligence analysis, strategic planning
- Recursive improvement: stolen model used to steal next model faster

**If a frontier model is sabotaged:**
- Corrupted research outputs → months of wasted R&D
- Poisoned model deployed → cascading failures in downstream applications
- Trust destruction → entire AI safety ecosystem undermined

**If automated AI R&D is compromised:**
- Recursive self-improvement under adversary control
- Capability acceleration outside safety frameworks
- Potential for rapid, ungoverned capability jumps

## Open Design Questions (for next session)

1. How to visualize defense-in-depth layers without it feeling like a simple bar chart?
2. How to make the attacker perspective feel visceral without gamifying serious threats?
3. How to handle the "SL5 is not achievable" conclusion gracefully — show the gap but not despair?
4. How to present the inference/distillation channel — it's always open if you serve the model?
5. How to balance information density (40 blocks × 10 dimensions) with clarity?
