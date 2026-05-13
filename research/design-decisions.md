# SL5 Explorable — Design Decisions Log

## Confirmed Decisions

### Data Architecture
- All building block definitions, capabilities, relations → configurable JSON files
- Easy to add/modify blocks, change parameters, adjust relations locally
- Separation: data model (JSON) vs. simulation logic vs. presentation

### Audience
- Policymakers, AI lab security managers, technical public, AI security community
- Need both tradeoffs and attack surface
- Apolitical (abstract adversary tiers, no named nations)

### Perspectives
- CISO, Attacker, Policymaker, Observer — all available

### Quantification
- All dimensions quantitative, use probabilities where needed
- Labeled as estimates
- "Feasible" in theory may not be feasible given politics/timeline/resources

### Timeline
- Aware of capability evolution timeline (~2024-2030)
- Critical: research lead times — decisions that must start NOW to be ready by 2028/2029
- Show milestones, how things play out
- Both "current state" and "timeline" views
- Visual ideas: radar chart, strategy/RPG stat display — explore but not committed

### Building Block Granularity
- ~40 blocks in data model
- UI: summary mode (~10 grouped) + expert mode (all ~40)
- Detail toggle

### Attack Narratives
- Brief to medium
- Not full chain walk-through — TBD exact level after seeing examples

### Defense-in-Depth
- Core to the model
- Undecided whether to make it an explicit interactive mechanic

### What's At Stake
- Include but light treatment — not deep

### Legitimate Channel Attacks (updated)
- Inference channel is TWO-WAY attack surface (not just distillation)
- Outbound: distillation, training data extraction, steganographic exfil
- Inbound: prompt injection, jailbreaking, C2 channel, poisoning via feedback
- SL5 answer remains: don't serve the model externally
- For SL3-4: bound both directions via rate limiting, monitoring, capability restriction

### Work Order (confirmed)
1. JSON Schema (data backbone) ← DONE
2. Complete Block Inventory (fill all ~45 blocks)
3. Formula Refinement + Scenario Testing
4. Visual/Layout Concept
5. Implementation Planning

### Core "Aha" Moments
1. SL5 is very hard; even SL4
2. OC4→OC5 is qualitative jump
3. AI compresses OC scale (sliding, not phase transition)
4. Insider threat is distinct and hard
5. Experts genuinely disagree on feasibility of key blocks
6. Defense-in-depth is necessary — single-layer failure cascades
