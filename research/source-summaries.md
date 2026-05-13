# SL5 Security Game — Source Summaries

## Core Documents

### 1. RAND "Securing AI Model Weights" (2024)
- Defines 5 Security Levels (SL1-SL5) mapped to Operational Capacity categories (OC1-OC5)
- OC1 ($1K, hobbyist) → OC5 ($1B, 1000 experts, state-level infra)
- Identifies ~38 distinct attack vectors across 9 domains
- SL5 currently NOT achievable — requires national security community help
- Key insight: SL5 requires 8 independent security layers, completely isolated networks, formal hardware verification
- Production models CANNOT meet SL5 while connected to internet
- Strong disagreement exists among experts on many specifics

### 2. SL5 Standard for AI Security v0.1 (Jan 2026) — SL5 Task Force
- NIST SP 800-53 overlay — structured as supplemental guidance
- Founded March 2025, 70-person technical track + executive track
- Mission: Create optionality for frontier labs to reach SL5 by 2028/2029
- Key architecture: Air-gapped SL5 Network → Weight Enclaves (further isolated)
- ICD 705 SCIF construction standards for physical security
- Five-tier Sensitivity Levels (SenL-1 to SenL-5) for personnel
- Dual inline network encryptors ("Rule of Two") from different suppliers
- Hardware root-of-trust in AI accelerators required
- Physical bandwidth limitation as hard exfiltration cap
- 3 major open questions: personnel vetting sufficiency, adversarial detection feasibility, inter-enclave network security

### 3. SL5 Novel Recommendations (Nov 2025)
- 25 recommendations across 5 domains (supply chain, network, machine, physical, personnel)
- AI-as-insider-threat: treat frontier AI agents as a distinct personnel class
- Complete remote access elimination
- Continuous adversarial injection (security chaos engineering)
- Accelerator interconnect encryption as chip design requirement
- Data diode bandwidth limits using model-size-to-code ratio
- Multi-model decorrelated review of AI outputs
- Body-worn cameras, TPI (two-person integrity) for all maintenance
- Sensitivity Levels clearance framework for private sector
- Document is draft with reviewer annotations showing genuine uncertainty

## Inspiration Sources

### 4. Explorable Explanations (explorabl.es)
- Philosophy: transform text from static info → environment for active thinking
- Three categories: Reactive Documents, Explorable Examples, Contextual Information
- Key patterns: sliders, real-time feedback, multiple representations, direct manipulation
- Core principle: "lower friction between curiosity and laziness"
- Play as learning mechanism

### 5. TensorFlow Playground
- Real-time neural network visualization with parameter controls
- Semantic grouping of controls, instant causality
- Multiple simultaneous representations of same concept
- Play before learning — experiment first, read second
- Low barrier to entry with pre-configured defaults

### 6. AI 2027 Security Forecast
- Extends RAND with WSL1-5 (weights) and SSL1-5 (secrets)
- Models offense-defense balance shifting over time (2024-2027)
- 78% of workshop participants agree state actors will steal US weights before 2030
- Key metrics: Cybench scores, hacking horizon, top-hacker-equivalents
- Self-subversion probability: 30% by Dec 2027 (OpenBrain)
- China achieves WSL5 a few months before US due to centralization advantages

### 7. Google SAIF Map
- 5 domains: Data Lifecycle, Model Development, Model Infrastructure, Application, Agent/Plugin
- 15 risk categories organized by lifecycle phase
- Three-phase model: Introduced → Exposed → Mitigated

### 8. AI Timeline (ai-timeline.org)
- Historical + predictive AI development timeline (1950-2030+)
- Interactive expandable cards, alternating layout
- Predictions: AGI by ~2027, superintelligence by ~2029
- Audio narration integration
