# SL5 Explorable — Building Blocks Data Model

## Each Building Block — Dimensions

| Dimension | Description |
|---|---|
| **ID / Name** | e.g., `NET-01: Air-Gapped SL5 Network` |
| **Category** | Network, Machine, Physical, Personnel, Supply Chain, AI-Specific |
| **Description** | What it is, in plain language |
| **Current State (2026)** | Does it exist? Who has it? What's the gap? |
| **Feasibility Class** | Deployed / Proven-not-deployed / Research-needed / Unsolved |
| **Cost to Research** | $ estimate or qualitative (low/med/high/unknown) |
| **Cost to Implement** | $ + effort + organizational change |
| **Time to Deploy** | From commitment to operational |
| **Resource Scarcity** | Bottlenecks: vendor lock-in, global supply, expertise pool |
| **SL Requirement** | Which SL first requires it (SL2/3/4/5) |
| **What Breaks Without It** | Attack narrative: what happens if absent |
| **OC Threshold to Exploit Absence** | Minimum adversary tier (OC1-5) to exploit |
| **AI OC Shift** | How AI capability changes the OC threshold over time |
| **Dependencies** | Other building blocks this depends on |
| **Dependents** | Other building blocks that depend on this |
| **Defense-in-Depth Role** | Which independent layer(s) this contributes to |
| **Open Questions** | Genuine expert disagreement or unknowns |
| **Uncertainty Level** | Low / Medium / High / Fundamental |

## Building Block Inventory (Draft)

### Network Architecture
- NET-01: Air-Gapped SL5 Network
- NET-02: Weight Enclave Isolation
- NET-03: Dual Inline Network Encryptors (Rule of Two)
- NET-04: Physical Bandwidth Limitation on Enclave Boundaries
- NET-05: Cross-Domain Solutions / Data Diodes
- NET-06: Protected Distribution Systems (PDS per CNSSI 7003)
- NET-07: Inter-Facility Encrypted Links (FIPS 140-3 Level 3)

### Machine / Hardware Security
- HW-01: Accelerator Hardware Root-of-Trust
- HW-02: Device-Controlled Memory Isolation
- HW-03: Accelerator Interconnect Encryption
- HW-04: Tamper Protection (chip-level)
- HW-05: Tamper-Evident Enclosures (rack/room scale)
- HW-06: Execution Integrity Verification (signed code on accelerators)
- HW-07: Confidential Computing / TEE
- HW-08: Shielded Rack Enclosures (NSA 94-106)
- HW-09: Verified/Measured Boot
- HW-10: Composition Attack Prevention (task sequence attestation / fused kernels)

### Physical Security
- PHY-01: ICD 705 SCIF-Grade Construction
- PHY-02: TEMPEST Countermeasures (RF shielding + power conditioning)
- PHY-03: Access Control Vestibules (mantraps)
- PHY-04: Intrusion Detection Systems (5/15-min response)
- PHY-05: No Wireless Devices in Red Zones
- PHY-06: Zone Architecture (Red Zone / Black Zone separation)
- PHY-07: Multi-Modal Hardware Inspection Pipeline

### Personnel Security
- PER-01: Sensitivity Levels Framework (SenL-1 through SenL-5)
- PER-02: Two-Person Integrity (TPI) for all maintenance
- PER-03: Continuous Behavioral Monitoring (tiered by SenL)
- PER-04: Private SF-86 Equivalent Vetting
- PER-05: Post-Employment Restrictions
- PER-06: Dual Authorization for Critical Operations
- PER-07: Body-Worn Cameras with Obstruction Detection
- PER-08: No Remote Access / No Out-of-Facility Maintenance

### Supply Chain
- SC-01: Supplier Diversity (min 2 per critical component)
- SC-02: Hardware Inspection Pipeline (X-ray, IR, destructive sampling)
- SC-03: Adversarial Content Screening for Training Data
- SC-04: Sub-Tier Flow-Down of Security Requirements
- SC-05: Counterfeit Detection (QBL/QML)
- SC-06: Component Provenance / Authenticity Tracking
- SC-07: Custom Development of Critical Components

### AI-Specific
- AI-01: AI-as-Insider-Threat Controls
- AI-02: Multi-Model Decorrelated Review
- AI-03: Adversarial Robustness Detection
- AI-04: AI Agent Access Agreements / Resource Quotas
- AI-05: Continuous Adversarial Injection (Security Chaos Engineering)
- AI-06: Kill-Switches (two-person cryptographic co-sign)

## Global Parameters (User-Controllable)

### Attacker Parameters
- Base adversary tier (OC1-OC5)
- AI capability available to adversary (none → frontier model access)
- Adversary time horizon
- Insider access (none / single / coordinated)

### Defender Parameters
- Annual security budget
- Time to deploy (urgency)
- Government cooperation level (none / partial / full)
- Vendor cooperation level (none / partial / full)
- Organizational risk tolerance

### World State Parameters
- Offense-defense balance (slider over time or fixed)
- AI capability timeline (optimistic → pessimistic)
- AI-as-OC-multiplier strength (how much AI compresses OC scale)
- Regulatory environment (none / voluntary / mandated)

## Perspectives

Users can view through:
1. **CISO View**: "Given my budget and timeline, which blocks matter most?"
2. **Attacker View**: "Given this posture, where do I probe?"
3. **Policymaker View**: "What incentives/regulations drive investment?"
4. **Observer View**: Toggle between all; see the full system

## Defense-in-Depth Mechanic

RAND lists a number of independent security layers as **one benchmark control
among many**, under "Other Organization Policies (ID.RM)" in Appendix B, and only
from SL3 upward (`rand_full.txt:4997`, `:5240`, `:5387`):
- SL3: 2 independent layers
- SL4: 4 independent layers
- SL5: 8 independent layers
- SL1, SL2: no layer requirement at all

This is **not** how RAND defines the levels. RAND's *headline* definition of each SL
is the attacker tier it is meant to thwart (`rand_full.txt:1660`, Figure 6.1 at
`:1701`): SL5 is "a system that could plausibly be claimed to thwart most
top-priority operations by the top cyber-capable institutions (OC5)". Each level then
comes with a benchmark set of concrete controls — the layer count among them — so the
levels are not *only* a statement about attacker tiers. What they are not is a level
*defined by* its layer count. And RAND's layer rule is a *red-team review* rule —
each layer is tested independently and a failure of one counts as a failure of the
system — not a probability model.

So the AND-gate below is this project's modelling choice, not RAND's. Don't let it
back into the product copy as the definition of a level: what separates SL4 from
SL5 is which controls are on the table, and how painful they are to build and to
work under.

Each building block contributes to one or more layers. An adversary must breach ALL layers (not just one) for weight exfiltration. The simulation should show:
- Which layers exist given current building blocks
- Where layers share common dependencies (correlated failure risk)
- How adversary capability maps to probability of breaching N layers
