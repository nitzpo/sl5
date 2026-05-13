# SL5 Explorable — Building Block Quantitative Profiles (Draft)

## Profile Template

Each block scored on:
- Technical feasibility: 0-100% (can it be built with known science?)
- Time to deploy: months from commitment to operational
- Cost: order of magnitude $ + qualitative effort
- Vendor dependency: 0-100% (how much requires external cooperation?)
- Supply scarcity: 0-100% (bottleneck severity)
- Organizational readiness (typical AI lab): 0-100%
- Defense type: Hard Stop | Probabilistic | Hybrid
- SL first required: 2/3/4/5
- OC threshold to exploit absence: 1-5 (baseline, pre-AI-multiplier)
- AI OC shift: how many "effective OC levels" AI adds by ~2028 (0, +0.5, +1, +1.5, +2)

---

## Profile 1: HW-03 — Accelerator Interconnect Encryption

| Dimension | Value | Notes |
|---|---|---|
| Technical feasibility | 90% | Proven on NVIDIA Blackwell; not yet universal |
| Time to deploy | 30-48 months | Chip design cycle from commitment to silicon |
| Cost | $50-200M (vendor R&D); $0 marginal for customer once in silicon | Customer pays via chip price premium |
| Vendor dependency | 95% | Almost entirely in vendor's hands |
| Supply scarcity | 70% | Only 1 of 3 major accelerator vendors ships this today |
| Org readiness | 80% | Easy to consume once available — just buy the right chip |
| Defense type | Hard Stop | Encrypted wire = useless to tap |
| SL first required | SL4 (recommended), SL5 (mandatory) |
| OC to exploit absence | OC3 (with insider), OC4 (without) |
| AI OC shift | +0.5 | AI helps with access planning but physical tap still needs human |

**Key insight:** This block is almost entirely vendor-gated. An AI lab cannot build it themselves. The decision that matters is whether to require it in procurement specs NOW — because the 2028 chip is being designed today.

---

## Profile 2: PER-02 — Two-Person Integrity (TPI)

| Dimension | Value | Notes |
|---|---|---|
| Technical feasibility | 99% | Well-understood, deployed in military/nuclear for decades |
| Time to deploy | 6-12 months | Policy + hiring + training + scheduling systems |
| Cost | ~$5-15M/year ongoing | Roughly doubles maintenance staffing; scheduling overhead |
| Vendor dependency | 5% | Maybe scheduling software; otherwise internal |
| Supply scarcity | 30% | Need to hire cleared/vetted maintenance staff — talent pool limited |
| Org readiness | 25% | AI labs have no culture of this; researchers resist constraints |
| Defense type | Probabilistic | Reduces single-actor insider risk; colluding pair still possible |
| SL first required | SL5 (mandatory), SL4 (recommended for critical ops) |
| OC to exploit absence | OC3 (single disgruntled employee), OC4 (recruited agent) |
| AI OC shift | +0 | AI doesn't help with physical presence requirements |

**Key insight:** Technically trivial, organizationally hard. The barrier is cultural, not technical or financial. This is a "decision" block — you either mandate it or you don't. The ongoing cost never goes away.

---

## Profile 3: AI-03 — Adversarial Robustness Detection

| Dimension | Value | Notes |
|---|---|---|
| Technical feasibility | 20-30% | Active research problem; no robust solution against sophisticated adversaries |
| Time to deploy | Unknown (research-dependent) | Could be 2 years or 10 years |
| Cost | $20-100M research investment; uncertain payoff | Multiple labs working on it; no breakthroughs yet |
| Vendor dependency | 40% | Partly internal research, partly academic/vendor solutions |
| Supply scarcity | 80% | Very few people in the world can work on this effectively |
| Org readiness | 50% | AI labs have ML research capability; but security research is different |
| Defense type | Probabilistic | Even if built, adversarial arms race continues |
| SL first required | SL5 (mandatory), SL4 (best-effort) |
| OC to exploit absence | OC3 (can poison training data), OC4 (sophisticated triggers) |
| AI OC shift | +1.5 | AI dramatically improves adversarial example generation |

**Key insight:** This is the block the SL5 Standard calls out as an open question — "breakthroughs in adversarial robustness are necessary to fully address this threat." The tool should convey that SL5 literally cannot be fully achieved until this is solved. It's one of the few genuine research barriers.

---

## Profile 4: PHY-01 — ICD 705 SCIF-Grade Construction

| Dimension | Value | Notes |
|---|---|---|
| Technical feasibility | 98% | Mature practice; government has done this for decades |
| Time to deploy | 18-36 months | Site selection, permitting, specialized construction |
| Cost | $200-500M per facility (AI-scale datacenter) | Massive but predictable; construction industry knows how |
| Vendor dependency | 60% | Specialized contractors; government cooperation for accreditation |
| Supply scarcity | 50% | Limited pool of SCIF-certified contractors; even fewer know datacenter scale |
| Org readiness | 15% | AI labs have zero experience with this; completely foreign domain |
| Defense type | Hard Stop (for physical access) | If you can't get in, you can't tap cables |
| SL first required | SL5 |
| OC to exploit absence | OC3 (break-in), OC4 (sophisticated physical intrusion) |
| AI OC shift | +0 | AI doesn't help with physical building penetration |

**Key insight:** Known how-to, massive cost, long lead time, completely alien to AI lab culture. This is the "we need to start now" poster child. An AI lab deciding in 2027 that they need SCIF-grade facilities won't have them until 2029-2030.

---

## Profile 5: NET-01 — Air-Gapped SL5 Network

| Dimension | Value | Notes |
|---|---|---|
| Technical feasibility | 95% | Proven concept; but AI R&D workflow impact is severe |
| Time to deploy | 12-24 months | Network redesign, workflow adaptation, cultural change |
| Cost | $50-150M (infrastructure) + significant productivity loss | The hidden cost is researcher velocity slowdown |
| Vendor dependency | 20% | Mostly internal network engineering |
| Supply scarcity | 20% | Air-gapped network ops is known discipline |
| Org readiness | 10% | Fundamentally conflicts with how AI labs operate today |
| Defense type | Hard Stop | No external connection = no remote exploitation |
| SL first required | SL5 |
| OC to exploit absence | OC2 (any remote attacker can attempt), OC4 (will succeed) |
| AI OC shift | +2 | AI dramatically amplifies remote exploitation capability |

**Key insight:** Air-gapping is the single most impactful block — it eliminates entire attack surface categories. It's also the most operationally disruptive. The SL5 Standard's architecture (Weight Enclaves within air-gapped network) is a compromise — air-gap the most sensitive parts, allow more freedom in the broader SL5 network. The key question: can you do frontier AI R&D inside an air gap?

---

## Profile 6: SC-01 — Supplier Diversity (min 2 per critical component)

| Dimension | Value | Notes |
|---|---|---|
| Technical feasibility | 60% | For accelerators: only NVIDIA, Google, AMD/Intel, AWS. Real diversity is limited |
| Time to deploy | 12-36 months | Qualification of second source, integration, testing |
| Cost | $100-500M | Maintaining two parallel stacks is expensive; training may not be portable |
| Vendor dependency | 90% | Entirely dependent on market offering alternatives |
| Supply scarcity | 85% | For AI accelerators specifically, very few credible options |
| Org readiness | 40% | Labs already think about multi-cloud; but true diversity is different |
| Defense type | Probabilistic | Reduces likelihood of correlated supply chain compromise |
| SL first required | SL4 (recommended), SL5 (mandatory where feasible) |
| OC to exploit absence | OC5 (supply chain attacks at this level are state-exclusive) |
| AI OC shift | +0.5 | AI helps discover supply chain vulnerabilities but compromise still needs human |

**Key insight:** Market structure makes this partially infeasible. The document acknowledges "where market constraints limit supplier diversity, apply compensating mitigations." This is an honest block — sometimes the answer is "you can't fully implement this, so what's your backup plan?"

---

## Cross-Block Patterns

### By Defense Type
| Hard Stops | Probabilistic | Hybrid |
|---|---|---|
| HW-03 (interconnect crypto) | PER-02 (TPI) | PHY-01 (SCIF — hard for physical, doesn't stop insider) |
| NET-01 (air gap) | AI-03 (adversarial detection) | SC-01 (diversity — reduces probability, doesn't eliminate) |
| NET-04 (bandwidth limit) | PER-03 (monitoring) | |
| HW-02 (memory isolation) | PER-04 (vetting) | |
| HW-07 (confidential computing) | AI-02 (multi-model review) | |

### By "Decide Now" Urgency (blocks with long lead times needing 2026 commitment)
1. PHY-01: SCIF construction (18-36 months)
2. HW-03: Accelerator interconnect encryption (30-48 months, vendor)
3. HW-01: Root-of-trust in accelerators (30-48 months, vendor)
4. PER-04: Private SF-86 framework (12-24 months to design + legal)
5. SC-01: Supplier diversity (12-36 months qualification)

### By AI OC Shift Impact (most affected by AI capability growth)
1. NET-01 absence (+2): Remote exploitation massively amplified by AI
2. AI-03 absence (+1.5): AI generates better adversarial examples
3. HW-07/HW-02 absence (+1): AI finds zero-day chains faster
4. PER-04 absence (+1): AI assists in social engineering and cover creation
5. PHY-01 absence (+0): Physical walls don't care about AI

**Key pattern:** Hard physical blocks are AI-resistant. Software/network blocks become dramatically more vulnerable as AI capability grows. This argues for prioritizing physical and hardware hard stops — they're future-proof against the AI OC multiplier.
