# SL5 vector backbone: coverage review (revision 2)

This revision applies the independent review and adds stages and routes. It is for review before any engine work.

**Contents.**
- 50 vectors: the 38 in RAND Table 5.2, 8 authored vectors for the lab's own model as an insider, and 4 *structural* stage vectors.
- 57 current blocks with 278 links, 39 of them strong.
- 7 proposed block ids, whose 29 links are tagged `proposal`.
- Routes are in routes.json and proposals in proposals.json.

**How to read it.**
- A RAND score is the chance that one operation completes *this step* against an SL1-grade company (Box 5.1). 1 = up to 20%, 2 = 20–40%, 3 = 40–60%, 4 = 60–80%, 5 = over 80%.
- Every vector has a `stage`:
  - entry: getting a foothold.
  - reach: getting to the weights or their keys.
  - exfil: getting the weights out.
- A few vectors skip stages (`stages_skipped`). Seizure carries the hardware out. Model extraction and distillation work through the API. Unsanctioned workloads (V-SELF-6) need nothing to leave.
- V-X-1…4 stand for "nothing stops this stage" at an SL1 victim (p = 1.0), so stage controls have something to act on. They are not RAND vectors.
- A *residual* vector (`assumes_defense`) was scored by RAND as if the defense it defeats already exists. It only becomes a candidate once that defense is deployed, and that defense never counters it.
- **GAP** means no strong counter. A gap is **cheap** when the vector scores 3 or more at OC1–OC3.

## What changed

- **Links.** All A1–A16 corrections are applied, including the reviewer's other verdicts; the table at the end lists where I departed from them. The full audit trail is in `src/map_rev2.py` (117 entries).
- **V-SELF-1 split.** It now covers weights only; self-distilled data is the new V-SELF-8. NET-04 and AI-11 are strong only on V-SELF-1.
- **Residual consistency.** Removed HW-04/KEY-01 → V-PHYS-5, PHY-03 → V-PHYS-4, and AI-07 → V-SELF-4 (V-SELF-4 is now residual on NET-04/AI-07). PHY-04 is off V-PHYS-4's assumed defenses.
- **Stage consistency.** NET-04's egress effect moved to V-X-3. PER-06 and PER-02 moved to V-X-1.
- **AI scores.** V-SELF-6 is now 2 3 4 5 5 and V-SELF-7 is 2 2 3 4 5. V-SELF-1 was re-judged to 1 2 4 5 5: from AC3 on, unmetered research egress is little obstacle. V-SELF-5 keeps its ramp, because sabotage skill and a model of what reviewers miss grow together. The Novel Recommendations lines L198, L440–447, L878–881, L1951–1952 and L2088–2093 are now cited.
- **Transcription.** The reviewer checked the PDF and confirmed nine vectors at 1/1/1; RAND's "eight" is a slip in its prose. The note is updated.

## Calibration probe (`src/probe.py`)

**Rule.**
- Scores map to 1 → 0.05, 2 → 0.3, 3 → 0.5, 4 → 0.7, 5 → 0.9.
- A route takes the best vector at each stage it needs, and route success is the product over stages.
- A campaign is the union over every headline route, with no breadth limit.
- Stacking (the reviewer's rule): the best strong counter ×0.3. The remaining counters, extra strong ones first, ×0.8, then ×0.9, then ×0.95. Partials alone are never worth more than one strong counter.
- "Eroded" applies the README bands to each counter: hard stops keep 0.98 → 0.86 of their effect from OC1 to OC5, probabilistic controls 0.95 → 0.40, hybrids halfway.
- "Full catalogue" means every block deployed and mature.

| Scenario | Served | OC1 | OC2 | OC3 | OC4 | OC5 | AI insider AC1–5 |
|---|---|---|---|---|---|---|---|
| undefended (SL1 victim) | yes | 0.31 | 0.63 | 1.00 | 1.00 | 1.00 | 0.30 0.50 0.70 0.90 0.90 |
| undefended (SL1 victim) | no | 0.24 | 0.50 | 0.99 | 0.99 | 1.00 | 0.30 0.50 0.70 0.90 0.90 |
| every vector strongly countered (x0.3) | yes | 0.03 | 0.03 | 0.09 | 0.17 | 0.26 | 0.09 0.15 0.21 0.27 0.27 |
| every vector strongly countered (x0.3) | no | 0.01 | 0.02 | 0.07 | 0.09 | 0.13 | 0.09 0.15 0.21 0.27 0.27 |
| full current catalogue (57), no erosion | yes | 0.03 | 0.04 | 0.20 | 0.29 | 0.61 | 0.06 0.10 0.14 0.18 0.29 |
| full current catalogue (57), no erosion | no | 0.02 | 0.03 | 0.17 | 0.23 | 0.56 | 0.06 0.10 0.14 0.18 0.29 |
| full current catalogue (57), eroded | yes | 0.04 | 0.06 | 0.32 | 0.48 | 0.78 | 0.07 0.13 0.22 0.32 0.41 |
| full current catalogue (57), eroded | no | 0.03 | 0.04 | 0.27 | 0.39 | 0.70 | 0.07 0.13 0.22 0.32 0.41 |
| full proposed catalogue, no erosion | yes | 0.03 | 0.03 | 0.07 | 0.19 | 0.39 | 0.06 0.10 0.14 0.18 0.29 |
| full proposed catalogue, no erosion | no | 0.01 | 0.02 | 0.05 | 0.11 | 0.28 | 0.06 0.10 0.14 0.18 0.29 |
| full proposed catalogue, eroded | yes | 0.03 | 0.04 | 0.14 | 0.37 | 0.65 | 0.07 0.13 0.22 0.32 0.43 |
| full proposed catalogue, eroded | no | 0.01 | 0.02 | 0.12 | 0.25 | 0.51 | 0.07 0.13 0.22 0.32 0.43 |

1. **Staging fixes the main error.** An undefended lab now loses to OC1 in 0.31 of cases with the model served (the app's default) and 0.24 without serving. The reviewer's probe gave 0.96. OC2 succeeds 0.50–0.63, so SL1 rightly fails against OC2.
2. **OC1 is still above the 1-in-5 bar.** The remote route alone gives 0.15. The rest comes from the 0.05 floors on routes OC1 can barely run: insider, physical and served. That fits RAND's "SL1 *likely* thwarts OC1" only if "likely" allows up to about 45% success (ICD 203). Reading a RAND 1 as 0.02 brings OC1 without serving to 0.19 (table below). This is a calibration decision for the user.
3. **Union with no breadth limit is demanding at the top.** For five routes to stay under 20% together, each must be held to about 4%. Even with every vector strongly countered once, OC5 is 0.26 with serving.
4. **The full catalogue at maturity, eroded, reaches SL2 today and SL3 with the proposals.** With the proposals, OC3 is 0.14 and OC4 is 0.37. Without erosion, the proposals reach SL4, served or not. Nothing reaches SL5, which agrees with RAND ("currently not possible").
5. **The AI-insider route fails from AC3 (eroded) or AC5 (no erosion) even with every block.** Eroded, it reaches 0.22 at AC3 and 0.43 at AC5, held up by operator manipulation (V-SELF-7) followed by self-distilled data (V-SELF-8). Both are gaps.

| A RAND '1' read as | OC1 served | OC2 served | OC1 not served | OC2 not served |
|---|---|---|---|---|
| 0.10 | 0.40 | 0.66 | 0.33 | 0.55 |
| 0.05 | 0.31 | 0.63 | 0.24 | 0.50 |
| 0.02 | 0.26 | 0.60 | 0.19 | 0.47 |
| 0.00 | 0.23 | 0.59 | 0.15 | 0.45 |

**What binds once everything is deployed** (proposed catalogue, eroded, model served):

| Route | OC1 | OC2 | OC3 | OC4 | OC5 | Binding path at OC4 | Binding path at OC5 |
|---|---|---|---|---|---|---|---|
| remote | 0.00 | 0.01 | 0.02 | 0.04 | 0.11 | V-CRED-1 → V-BYP-2 → V-X-3 | V-NET-1 → V-BYP-2 → V-NET-1 |
| insider | 0.00 | 0.00 | 0.07 | 0.10 | 0.18 | V-HUM-1 → V-X-1 → V-X-4 | V-HUM-1 → V-X-1 → V-X-4 |
| physical | 0.01 | 0.01 | 0.01 | 0.08 | 0.21 | V-PHYS-4 → V-NET-3 | V-PHYS-4 → V-NET-3 |
| supply_chain | 0.00 | 0.01 | 0.03 | 0.06 | 0.14 | V-SUP-1 → V-BYP-2 → V-X-3 | V-SUP-1 → V-BYP-2 → V-NET-1 |
| served | 0.02 | 0.02 | 0.02 | 0.15 | 0.28 | V-ML-4 | V-ML-4 |
| ai_insider (AC) | 0.07 | 0.13 | 0.22 | 0.32 | 0.43 | | V-SELF-7 → V-SELF-8 |
| capability meter (V-ML-5) | 0.04 | 0.04 | 0.25 | 0.26 | 0.44 | V-ML-5 | V-ML-5 |

## Routes

| Route | Entry | Reach | Exfil | Headline |
|---|---|---|---|---|
| remote Remote network intrusion | V-CODE-1, V-CODE-2, V-CODE-3, V-CODE-4, V-CRED-1, V-CRED-2, V-CRED-3, V-BYP-3, V-PHYS-2, V-PHYS-3, V-SUP-3, V-NET-1 | V-CRED-4, V-ACS-1, V-ACS-2, V-ACS-3, V-ACS-4, V-BYP-1, V-BYP-2, V-ML-1, V-NET-2 | V-X-3, V-NET-1 | yes |
| insider Human insider | V-HUM-1, V-HUM-2, V-HUM-3, V-HUM-4, V-HUM-5, V-SUP-3 | V-X-1, V-BYP-2, V-CRED-4, V-ACS-4 | V-X-3, V-X-4 | yes |
| physical Physical intrusion and seizure | V-PHYS-1, V-PHYS-4, V-PHYS-6, V-PHYS-7 | V-X-2, V-PHYS-5, V-NET-3, V-NET-2, V-BYP-2 | V-X-4, V-X-3 | yes |
| supply_chain Supply chain | V-SUP-1, V-SUP-2, V-ML-2 | V-CRED-4, V-ML-1, V-BYP-1, V-BYP-2, V-ACS-2, V-ACS-3 | V-X-3, V-NET-1 | yes |
| served Served model | V-ML-3, V-ML-1, V-ML-4 | V-CRED-4, V-ML-1, V-BYP-1 | V-X-3 | yes (served only) |
| ai_insider The lab's own model as insider | — (already inside) | V-SELF-2, V-SELF-3, V-SELF-5, V-SELF-7, V-SELF-6 | V-SELF-1, V-SELF-8, V-SELF-4 | yes |
| capability_copy API distillation (capability copy) | V-ML-5 | — | — | own meter (served only) |

## (a) Vector table

`*` marks RAND's "could change very rapidly". `(+X)` is a strong counter that exists only under a proposal.

| Category | ID | Vector | Stage | OC1–5 | Strong | Partial | Flag (now → with proposals) |
|---|---|---|---|---|---|---|---|
| Running Unauthorized Code | V-CODE-1 | Exploiting vulnerabilities for which a patch exists (atta… | entry | 3 4 4 5 5 | NET-01 (+END-01) | HW-06, NET-02, PER-08 |  |
| Running Unauthorized Code | V-CODE-2 | Exploiting reported but not (fully) patched vulnerabiliti… | entry | 2 2 3 4 5 | NET-01 (+END-01) | HW-06, NET-02, PER-08 |  |
| Running Unauthorized Code | V-CODE-3 | Finding and exploiting individual zero-days | entry | 1 2 4 5 5 | NET-01 | DET-01, HW-02, HW-06, HW-07, HW-09, NET-02 |  |
| Running Unauthorized Code | V-CODE-4 | Direct access to zero-days at scale | entry | 1 1 2 4 5 | NET-01 | DET-01, HW-02, HW-06, HW-07, HW-09, HW-10, NET-02 |  |
| Compromising Existing Credentials | V-CRED-1 | Social engineering* | entry | 3 4 5 5 5 | IAM-01 | NET-01 |  |
| Compromising Existing Credentials | V-CRED-2 | Password brute-forcing and cracking* | entry | 2 2 3 3 4 | IAM-01 | NET-01 |  |
| Compromising Existing Credentials | V-CRED-3 | Exploitation of exposed credentials | entry | 3 3 4 5 5 | IAM-01 | DEC-01, DET-01, KEY-01, NET-01, PER-03, PER-08 |  |
| Compromising Existing Credentials | V-CRED-4 | Expanding illegitimate access (e.g., escalating privilege… | reach | 2 3 5 5 5 | IAM-01, NET-02 | DEC-01, DET-01, HW-02, HW-07, KEY-01, PER-03, PER-06 |  |
| Undermining the Access Control System Itself | V-ACS-1 | Encryption/authentication vulnerabilities (in the access… | reach | 1 1 2 3 3 | — (+ACA-01) | KEY-01, NET-03, NET-07, SC-07 | GAP → covered |
| Undermining the Access Control System Itself | V-ACS-2 | Intentional backdoors in algorithms, protocols, or produc… | reach | 1 1 1 2 2 | SC-07 | NET-03, SC-01 |  |
| Undermining the Access Control System Itself | V-ACS-3 | Code vulnerabilities (in the access control system) | reach | 1 1 2 3 4 | — (+ACA-01) | KEY-01, PER-06, SC-07 | GAP → covered |
| Undermining the Access Control System Itself | V-ACS-4 | Access to secret material undermining a protocol | reach | 1 1 2 2 3 | — | IAM-01, KEY-01, NET-03, SC-07 | GAP |
| Bypassing Primary Security System Altogether | V-BYP-1 | Incorrect configuration or security policy implementation | reach | 2 2 3 3 3 | — (+CFG-01) | CUS-01, DET-01, KEY-01 | GAP (cheap) → covered |
| Bypassing Primary Security System Altogether | V-BYP-2 | Additional (less secure) copies of sensitive data | reach | 2 2 3 5 5 | CUS-01, KEY-01 | AI-12, DEC-01, NET-02, PHY-06 |  |
| Bypassing Primary Security System Altogether | V-BYP-3 | Alternative (less secure) authentication or access schemes | entry | 1 1 2 3 4 | IAM-01 | KEY-01, NET-01, PER-06, PER-08 |  |
| AI-Specific Attack Vectors | V-ML-1 | Discovering existing vulnerabilities in the ML stack* | entry | 1 2 4 4 5 | — (+SRV-01) | AI-08, AI-09, HW-02, HW-06, NET-02, SW-01 | GAP (cheap) → covered |
| AI-Specific Attack Vectors | V-ML-2 | Intentional ML supply chain compromise* | entry | 1 2 4 5 5 | SW-01 | AI-12, HW-01, HW-06, HW-09, PHY-07, SC-01, SC-02, SC-03, SC-06 |  |
| AI-Specific Attack Vectors | V-ML-3 | Prompt-triggered code execution* | entry | 2 3 4 4 4 | AI-09 | AI-01, AI-03, AI-04, AI-08, AI-10, NET-01, NET-05, SC-03 |  |
| AI-Specific Attack Vectors | V-ML-4 | Model extraction* | entry (skips reach+exfil) | 1 1 1 2 3 | AI-07 | AI-03 |  |
| AI-Specific Attack Vectors | V-ML-5 | Model distillation* | entry (skips reach+exfil), own meter | 1 1 2 2 3 | — | AI-03, AI-07 | GAP |
| Nontrivial Access to Data or Networks | V-NET-1 | Digital access to air-gapped networks | entry, residual | 1 1 2 2 4 | — | DET-01, HW-05, NET-05, PHY-02, PHY-05, PHY-06 | GAP (residual) |
| Nontrivial Access to Data or Networks | V-NET-2 | Side-channel attacks (including through leaked emanations… | reach | 1 1 1 2 3 | HW-05, PHY-02 | NET-02, PHY-01 |  |
| Nontrivial Access to Data or Networks | V-NET-3 | Eavesdropping and wiretaps | reach (skips exfil) | 1 1 2 4 5 | NET-03, NET-06, NET-07 | HW-03, PHY-01, PHY-05 |  |
| Unauthorized Physical Access to Systems | V-PHYS-1 | Direct physical access to sensitive systems | entry | 1 1 3 3 4 | PER-02, PHY-01 | CUS-01, HW-03, HW-04, HW-05, HW-09, KEY-01, NET-06, PER-07, PHY-03, PHY-04, PHY-06, PHY-07 |  |
| Unauthorized Physical Access to Systems | V-PHYS-2 | Malicious placement of portable devices | entry | 2 2 4 4 4 | — (+PHY-08) | HW-05, NET-05, PER-02, PER-07, PHY-01, PHY-05, PHY-07 | GAP (cheap) → covered |
| Unauthorized Physical Access to Systems | V-PHYS-3 | Physical access to devices in other locations | entry | 1 1 3 4 5 | NET-01 | IAM-01, NET-02, PER-08, PER-09 |  |
| Unauthorized Physical Access to Systems | V-PHYS-4 | Evasion of physical access control systems | entry, residual | 1 1 1 3 5 | — | PHY-04 | GAP (residual) |
| Unauthorized Physical Access to Systems | V-PHYS-5 | Penetration of physical hardware security | reach, residual | 1 1 1 2 3 | — | — | GAP (residual) |
| Unauthorized Physical Access to Systems | V-PHYS-6 | Armed break-in | entry (skips exfil) | 1 1 1 2 4 | PHY-04 | HW-04, KEY-01, PHY-01 |  |
| Unauthorized Physical Access to Systems | V-PHYS-7 | Military takeover | entry (skips exfil) | 1 1 1 1 2 | — | HW-04, KEY-01 | GAP |
| Supply Chain Attacks | V-SUP-1 | Services and equipment the organization uses | entry | 1 2 4 5 5 | — | DET-01, HW-01, HW-09, NET-01, PHY-07, SC-01, SC-02, SC-04, SC-05, SC-06, SC-07, SW-01 | GAP (cheap) |
| Supply Chain Attacks | V-SUP-2 | Code and infrastructure incorporated into the codebase | entry | 1 2 4 5 5 | SW-01 | AI-09, SC-06, SC-07 |  |
| Supply Chain Attacks | V-SUP-3 | Vendors with access to information | entry | 1 1 2 3 4 | — | CUS-01, HW-07, KEY-01, NET-01, PER-02, PER-04, PER-07, PER-08, SC-04 | GAP |
| Human Intelligence | V-HUM-1 | Bribes and cooperation | entry | 1 1 4 4 5 | — | DEC-01, PER-01, PER-03, PER-04, PER-05, PER-09 | GAP (cheap) |
| Human Intelligence | V-HUM-2 | Extortion | entry | 1 1 4 4 5 | PER-09 | PER-03, PER-04 |  |
| Human Intelligence | V-HUM-3 | Candidate placement | entry | 1 1 1 3 5 | PER-04 | DET-01, PER-01, PER-03 |  |
| Human Intelligence | V-HUM-4 | Organizational leverage attacks | entry | 1 1 1 3 5 | — (+GOV-01) | DET-01 | GAP → covered |
| Human Intelligence | V-HUM-5 | Organizationally approved access | entry | 1 1 2 3 5 | — | KEY-01, PER-06 | GAP |
| The Lab's Own AI Model as Insider | V-SELF-1 | Self-exfiltration of its weights via permitted channels | exfil | AC 1 2 4 5 5 | AI-11, NET-04 | AI-01, AI-02, AI-04, AI-05, AI-06, AI-07, AI-09, AI-10, CUS-01, DEC-01, KEY-01, NET-01, NET-05 |  |
| The Lab's Own AI Model as Insider | V-SELF-8 | Self-distilled data out via permitted channels | exfil | AC 1 1 2 3 4 | — | AI-02, AI-04, AI-07, AI-09, AI-10, NET-01, NET-05 | GAP |
| The Lab's Own AI Model as Insider | V-SELF-2 | Abuse of its own credentials or tooling | reach | AC 2 3 4 5 5 | AI-01, AI-10 | AI-04, AI-11, HW-10, IAM-01, NET-02, PER-03, PER-06 |  |
| The Lab's Own AI Model as Insider | V-SELF-3 | Sandbox escape via permitted egress | reach | AC 1 3 4 5 5 | AI-09 | AI-01, AI-04, AI-05, AI-06, AI-10, NET-01, NET-02, NET-05 |  |
| The Lab's Own AI Model as Insider | V-SELF-4 | Covert and side channels | exfil, residual | AC 1 1 2 3 4 | — | AI-02, AI-10, HW-05, PHY-02, PHY-05 | GAP (residual) |
| The Lab's Own AI Model as Insider | V-SELF-5 | Subverting oversight it helped build | reach | AC 1 2 3 4 5 | AI-02 | AI-01, AI-10, AI-12 |  |
| The Lab's Own AI Model as Insider | V-SELF-6 | Unsanctioned workloads on lab compute | reach (skips exfil) | AC 2 3 4 5 5 | AI-04 | AI-01, AI-06, AI-09, AI-10, AI-11, AI-12, HW-06, HW-10, NET-02 |  |
| The Lab's Own AI Model as Insider | V-SELF-7 | Manipulating its operators | reach | AC 2 2 3 4 5 | — | AI-01, AI-02, AI-10, PER-06 | GAP (cheap) |
| Structural stage | V-X-1 | Standing insider access to weights | reach | p = 1.0 | PER-06 | CUS-01, DEC-01, IAM-01, KEY-01, NET-02, PER-01, PER-02, PER-03 |  |
| Structural stage | V-X-2 | Reading weights from hardware in hand | reach | p = 1.0 | KEY-01 | CUS-01, HW-03, HW-04, HW-05 |  |
| Structural stage | V-X-3 | Bulk network egress | exfil | p = 1.0 | NET-01, NET-04 | DEC-01, DET-01, NET-02, NET-05 |  |
| Structural stage | V-X-4 | Physical carry-out of media or devices | exfil | p = 1.0 | — (+PHY-08) | PER-02, PER-07, PHY-01, PHY-03, PHY-05 | GAP (cheap) → covered |

## (b) Weak blocks, proposals, defense types

31 of the 57 current blocks have only partial links.

| Block | Links now (strong/partial) | Recommendation |
|---|---|---|
| AI-03 Adversarial Robustness Detection | 0/3 | **Merge** into AI-07/AI-08 (P-MERGE-AI03). Its links are already held there. |
| AI-05 Continuous Adversarial Injection (Security Chaos Engineering) | 0/2 | **Rescope** to AI containment exercises. Its configuration-drift role moves to CFG-01, and its honeypots move to DEC-01. |
| AI-06 Kill-Switches (Two-Person Cryptographic Co-Sign) | 0/3 | **Reclassify** as a hybrid response control. It multiplies AI-10/AI-01 detections and counters nothing alone. |
| AI-08 Inference Channel Inbound Defense | 0/2 | **Keep partial.** Injection filters can be bypassed; AI-09 confinement now carries V-ML-3. |
| AI-12 Training/Eval/Result Integrity Attestation | 0/4 | **Keep partial.** Lineage proves where something came from, not that it is sound. Mostly an integrity-lane control. |
| DET-01 Security Operations & Incident Response; DEC-01 Deception & Attribution | 0/10, 0/7 | **Keep partial.** They detect and attribute at every stage; a candidate for a cross-cutting multiplier (e2). |
| HW-01 Accelerator Hardware Root-of-Trust; PER-01 Sensitivity Levels Framework (SenL-1 through SenL-5) | 0/2, 0/3 | **Enablers.** Keep them as `requires` prerequisites. |
| HW-02 Device-Controlled Memory Isolation; HW-03 Accelerator Interconnect Encryption; HW-04 Tamper Protection (Chip-Level); HW-09 Verified/Measured Boot | 0/4, 0/3, 0/4, 0/5 | **Keep partial.** Each protects one place the weights live. |
| HW-06 Execution Integrity Verification | 0/7 | **Keep partial**; effective type hybrid. Absorbs HW-10 (P-MERGE-HW10). |
| HW-07 Confidential Computing / TEE | 0/4 | **Keep partial; reclassify** hybrid. It does nothing against physical interposers (TEE.fail). |
| HW-10 Composition Attack Prevention | 0/3 | **Merge** into HW-06 as an advanced tier. |
| NET-05 Cross-Domain Solutions / Data Diodes | 0/7 | **Keep partial.** It is strong on V-NET-1 only alongside PHY-08 and DET-01. |
| PER-03 Continuous Behavioral Monitoring | 0/7 | **Keep partial.** Absorbs PER-05 as departure-window monitoring (P-MERGE-PER05). |
| PER-05 Post-Employment Restrictions | 0/1 | **Merge** into PER-03. |
| PER-07 Body-Worn Cameras with Obstruction Detection | 0/4 | **Merge** into PER-02 as its evidence mechanism. |
| PER-08 No Remote Access / No Out-of-Facility Maintenance | 0/6 | **Keep partial.** Removes remote-management and vendor paths; identity fallbacks sit with IAM-01. |
| PHY-03 Access Control Vestibules (Mantraps); PHY-06 Zone Architecture (Red Zone / Black Zone) | 0/2, 0/3 | **Keep partial.** They make PHY-01's boundary real. |
| PHY-05 No Wireless Devices in Red Zones | 0/5 | **Extend** to PHY-08, covering all unapproved devices and ports. That closes V-PHYS-2 and V-X-4. |
| PHY-07 Multi-Modal Hardware Inspection Pipeline | 0/4 | **Keep.** It covers the hardware half of V-SUP-1. |
| SC-01 Supplier Diversity (Min 2 Per Critical Component); SC-04 Sub-Tier Flow-Down of Security Requirements | 0/3, 0/2 | **Keep partial.** |
| SC-02 Upstream Hardware Inspection (Pre-Facility); SC-05 Counterfeit Detection (QBL/QML); SC-06 Component Provenance / Authenticity Tracking | 0/2, 0/1, 0/3 | **Merge** into SC-08 (hardware provenance). The SBOM part goes to SW-01. |
| SC-03 Adversarial Content Screening for Training Data | 0/2 | **Rescope** to inbound content screening, or move it to the integrity lane. |

**Proposed blocks** (new ids in control_map.json, every link tagged `proposal`):

| Proposed block | Type | Links (strong/partial) | Strong for |
|---|---|---|---|
| ACA-01 Access-Control Assurance & Formal Verification | hybrid | 2/1 | V-ACS-1, V-ACS-3 |
| CFG-01 Configuration Integrity & Gold Image | hybrid | 1/3 | V-BYP-1 |
| END-01 Patch & Endpoint Management | hybrid | 2/3 | V-CODE-1, V-CODE-2 |
| GOV-01 Governance & Investor Vetting | probabilistic | 1/2 | V-HUM-4 |
| PHY-08 No Unapproved Devices or Ports | hybrid | 2/3 | V-PHYS-2, V-X-4 |
| SC-08 Hardware Provenance & Authenticity | probabilistic | 0/2 | — |
| SRV-01 Hardened Weight-Access & Serving Interface | hybrid | 1/4 | V-ML-1 |

| Proposal | Kind | Blocks | Why |
|---|---|---|---|
| P-MERGE-AI03 | merge | AI-03 → AI-07, AI-08 | Probing detection belongs with outbound inference defence (AI-07), adversarial-input detection with inbound (AI-08); red-teaming becomes part of control assurance. AI-03's three links are already held by AI-07/AI-08. |
| P-MERGE-HW10 | merge | HW-10 → HW-06 | Composition-attack prevention is an advanced tier of execution integrity; research-stage, no deployments. |
| P-MERGE-PER07 | merge | PER-07 → PER-02 | Body-worn cameras are the evidence mechanism of two-person integrity (already its completed_by). |
| P-MERGE-PER05 | merge | PER-05 → PER-03 | Post-employment restrictions act after the weights have left; their useful part is monitoring around departures. |
| P-MERGE-SC | merge | SC-02, SC-05, SC-06 → SC-08 | Upstream inspection, counterfeit detection and chain of custody are one programme; SBOMs move to SW-01. |
| P-EXTEND-PHY05 | merge | PHY-05 → PHY-08 | Extends the wireless ban to all unapproved devices, media and ports, with interfaces disabled in hardware (RAND SL3 sweeps, SL4 device ban, SL5 hardware-disabled communication). Closes cheap gap V-PHYS-2. |
| reclassify | hard_stop → hybrid | AI-06 | A kill-switch acts only on a detection trigger; score it as a response multiplier on AI-10/AI-01. |
| reclassify | hard_stop → hybrid | HW-07 | Defends against host software only; physical interposers (TEE.fail) and TEE bugs are in scope at OC4-5. |
| reclassify | hard_stop → hybrid | SC-07 | In-house development relocates supply-chain risk to internal developers rather than removing it. |
| reclassify | hard_stop → hybrid | HW-05 | Hard stop for EM shielding, detection-only for tampering. |
| reclassify | hard_stop → hybrid | AI-04 | Quotas are software set by humans; the July 2026 agent worked around throttling. |
| rescope | scope | IAM-01 | Needed for its strong links to V-CRED-1 (Uber 2022 help-desk social engineering) and V-CRED-3. |
| rescope | scope | AI-05 | Keeps AI containment exercises only. |
| rescope | scope | AI-01 | Removes overlap with AI-10. |

**Defense type wrong for the vector** (`type_override` in control_map.json):

| Block (declared type) | Vector | Effective type | Why |
|---|---|---|---|
| AI-04 (hard_stop) | V-SELF-6 | hybrid | Quota accounting is software; the July 2026 agent worked around throttling. |
| AI-04 (hard_stop) | V-SELF-2 | hybrid | Quotas are software set by humans; misuse inside the quota passes, so not a hard stop here. |
| AI-04 (hard_stop) | V-SELF-3 | hybrid | Enforced by the same software stack the agent may exploit. |
| AI-06 (hard_stop) | V-SELF-6 | probabilistic | A kill-switch is a response: its value depends entirely on a detection trigger (AI-10, AI-01). |
| AI-06 (hard_stop) | V-SELF-3 | probabilistic | Same: no trigger, no effect. |
| AI-06 (hard_stop) | V-SELF-1 | probabilistic | Same: no trigger, no effect. |
| HW-05 (hard_stop) | V-PHYS-1 | probabilistic | Tamper-evident is detection, not prevention: a hard stop only for EM shielding. |
| HW-05 (hard_stop) | V-PHYS-2 | probabilistic | A device planted inside a sealed rack leaves evidence |
| HW-05 (hard_stop) | V-X-2 | probabilistic | Tamper evidence shows an opened rack |
| HW-06 (hard_stop) | V-CODE-1 | hybrid | Signing stops payload loading, not exploitation of signed code (ROP, living off the land). |
| HW-06 (hard_stop) | V-CODE-2 | hybrid | Unsigned payloads cannot run on accelerators |
| HW-06 (hard_stop) | V-CODE-3 | hybrid | Zero-day must work inside signed code paths |
| HW-06 (hard_stop) | V-CODE-4 | hybrid | Raises cost; many zero-days include signed-code bugs |
| HW-07 (hard_stop) | V-CODE-4 | probabilistic | Against a large zero-day pool, TEE bugs are in scope; erodes like a probabilistic control. |
| NET-01 (hard_stop) | V-SELF-1 | hybrid | A hard stop for network paths only; permitted transfers cross the gap by design. |
| NET-01 (hard_stop) | V-SELF-8 | hybrid | No direct external path, but permitted outputs cross by design |
| SC-07 (hard_stop) | V-SUP-2 | hybrid | Relocates supply-chain risk to internal developers (insiders, AI coders) rather than removing it. |
| SC-07 (hard_stop) | V-ACS-2 | hybrid | Pair with NET-03: in-house code implementing a subverted standard keeps the backdoor (Dual_EC). |
| SC-07 (hard_stop) | V-SUP-1 | hybrid | Custom firmware and boards replace vendor parts where feasible |

**Explicit non-counters:**

| Block | Vector(s) | Why it is not a counter |
|---|---|---|
| HW-07 | V-PHYS-1, V-X-2 | Confidential computing defends against host software, not physical access (TEE.fail, 2025: a sub-$1,000 DDR5 interposer). |
| HW-04, KEY-01, PHY-03, AI-07 | V-PHYS-5, V-PHYS-4, V-SELF-4 | These vectors are residual: RAND scored them assuming that defense already exists. |
| HW-04 | V-SUP-1, V-ML-2 | Chip tamper protection detects attack after manufacture, not an implant added at the fab. |
| NET-04, AI-11 | V-SELF-8, V-ML-5 | Distillation needs gigabytes, not terabytes, and no access to the weights. |
| NET-01 | V-ML-4, V-ML-5 | Whether to serve the model is a deployment choice; RAND exempts production serving from isolation. |

## (c) Choke points (current catalogue)

| Block | Type | Strong | Strongly countered vectors | Partial |
|---|---|---|---|---|
| NET-01 Air-Gapped SL5 Network | hard_stop | 6 | V-CODE-1, V-CODE-2, V-CODE-3, V-CODE-4, V-PHYS-3, V-X-3 | 10 |
| IAM-01 Phishing-Resistant Identity & Privileged Access (Phase 2) | hybrid | 5 | V-CRED-1, V-CRED-2, V-CRED-3, V-CRED-4, V-BYP-3 | 4 |
| KEY-01 Weight Encryption at Rest, Attestation-Gated Key Release (Phase 2) | hybrid | 2 | V-BYP-2, V-X-2 | 14 |
| AI-09 Confined R&D Execution Environments (Phase 2) | hybrid | 2 | V-SELF-3, V-ML-3 | 5 |
| SW-01 ML Software Supply-Chain Integrity (Phase 2) | hybrid | 2 | V-SUP-2, V-ML-2 | 2 |
| NET-04 Physical Bandwidth Limitation on Enclave Boundaries | hard_stop | 2 | V-SELF-1, V-X-3 | 0 |

- **NET-01 carries the code category and bulk egress.** Behind it, V-NET-1 is the residual route, and V-NET-1 now has only partial counters (NET-05, PHY-05/PHY-08, DET-01). It binds the remote and supply-chain routes at OC5.
- **IAM-01 holds all five identity vectors alone**, so one identity-platform flaw reopens the whole category. PER-06 at the reach stage is the backstop.
- **KEY-01 is the broadest block** (16 links). It is strong where an attacker holds hardware or a stray copy (V-X-2, V-BYP-2).

## (d) Cheap gaps (score ≥3 at OC1–OC3, no strong counter)

| Vector | Stage | OC1–3 (AC1–3) | Partial counters now | With proposals |
|---|---|---|---|---|
| V-BYP-1 Incorrect configuration or security policy implementation | reach | 2 2 3 | CUS-01, DET-01, KEY-01 | CFG-01 (configuration integrity / gold image) becomes strong. |
| V-ML-1 Discovering existing vulnerabilities in the ML stack | entry | 1 2 4 | AI-08, AI-09, HW-02, HW-06, NET-02, SW-01 | SRV-01 (hardened weight-access and serving interface) becomes strong. |
| V-PHYS-2 Malicious placement of portable devices | entry | 2 2 4 | HW-05, NET-05, PER-02, PER-07, PHY-01, PHY-05, PHY-07 | PHY-08 (PHY-05 extended to all devices and ports) becomes strong. |
| V-SUP-1 Services and equipment the organization uses | entry | 1 2 4 | DET-01, HW-01, HW-09, NET-01, PHY-07, SC-01, SC-02, SC-04, SC-05, SC-06, SC-07, SW-01 | Still open with the proposals. SC-08 + PHY-07 + SW-01 + DET-01 are all partial; the reviewer agrees it stays partial at OC4–5 (SolarWinds, Okta). Candidate: broaden SW-01 to all software admitted to the isolated network (SLSA L3). |
| V-HUM-1 Bribes and cooperation | entry | 1 1 4 | DEC-01, PER-01, PER-03, PER-04, PER-05, PER-09 | Open by design. Recruitment cannot be prevented structurally, only detected (PER-03, PER-04). The insider route is held at the reach stage by PER-06 on V-X-1. |
| V-SELF-7 Manipulating its operators | reach | AC 2 2 3 | AI-01, AI-02, AI-10, PER-06 | Still open. Extend PER-06 so that a security change an AI requested needs two humans who did not receive the request, with AI-10 logging every AI-to-staff request. |
| V-X-4 Physical carry-out of media or devices | exfil | p = 1.0 | PER-02, PER-07, PHY-01, PHY-03, PHY-05 | PHY-08 becomes strong. |

**Gaps that bind SL5** (score ≥4 at OC5 or AC5, no strong counter):
- Now: V-ACS-3, V-ML-1, V-NET-1, V-PHYS-2, V-PHYS-4, V-SUP-1, V-SUP-3, V-HUM-1, V-HUM-4, V-HUM-5, V-SELF-8, V-SELF-4, V-SELF-7, V-X-4.
- With the proposals: V-NET-1, V-PHYS-4, V-SUP-1, V-SUP-3, V-HUM-1, V-HUM-5, V-SELF-8, V-SELF-4, V-SELF-7.

The 47-block catalogue lacked a strong counter for 30 vectors. Phase 2 closes 10 of them: V-CRED-1, V-CRED-2, V-CRED-3, V-BYP-2, V-BYP-3, V-ML-2, V-ML-3, V-SUP-2, V-SELF-3, V-X-2.

## (e) Assumptions and open questions

1. **Bar and the reading of a RAND 1.** OC1 against an undefended lab is 0.24–0.31. Options: keep the 1-in-5 bar and read a RAND 1 as about 0.02; or keep 0.05 and judge SL1 at RAND's "likely" (≤45%).
2. **Stacking and erosion constants** decide SL3 versus SL4 for the full catalogue. Should DET-01 and DEC-01 act as stage-wide multipliers instead of per-vector partials?
3. **Is model extraction (V-ML-4) a whole route?** RAND scores steps that *contribute*, and its examples recover only part of the weights. As a complete route, V-ML-4 binds the served route at OC4–OC5.
4. **Structural p = 1.0.** RAND's SL1 already includes best-effort weight encryption. Should V-X-2 start below 1?
5. **Baseline.** Blocks at their researched starting state should earn credit only above an SL1 foundation.
6. **Needs government.** Should V-PHYS-7 and V-HUM-5 carry a badge, which an explicit state-partnership assumption could lift?
7. **AI bands.** AC1–AC5 are authored. They are suggested to map onto `ai_capability_curve` as <0.2 / 0.2–0.45 / 0.45–0.7 / 0.7–0.9 / ≥0.9 (2026 ≈ AC2). Propensity to try needs its own input. Should SL5 hold against the year's band, or against a stress band one above it?
8. **Cross-route compounds**, e.g. an external prompt injection (V-ML-3) that steers the lab's own model. The union misses these; the stories are where to show them.
9. **Integrity lane.** AI-12, SC-03 and V-SELF-5 are mostly about sabotage. Should they get a separate view?

## Story check

| Story | Route | Vectors | Stoppers that counter none of its vectors | Fit note |
|---|---|---|---|---|
| The Quiet Tap | physical | V-HUM-1 → V-PHYS-1 → V-NET-3 → V-X-4 | — | RAND has no vector for an interposer on the accelerator fabric; it straddles physical access and wiretaps, whose RAND scores describe network links, not in-rack fabrics. |
| The Poisoned Chip | supply_chain | V-ML-2 → V-SUP-1 → V-NET-1 | HW-04 | HW-04 is a misfit stopper: chip tamper protection detects physical attack in operation, not fab-time implants. The covert RF exfiltration is V-NET-1, so shielding (PHY-02, HW-05) carries it. |
| The Alignment Researcher | ai_insider | V-SELF-2 → V-SELF-5 → V-SELF-8 → V-SELF-4 | AI-06 | Distilled data (V-SELF-8), not terabytes of weights, is the realistic payload; stego (V-SELF-4) is residual. NET-01 is a misfit (permitted outputs cross the gap); AI-06 responds but counters no step. |
| The Zero-Day Cascade | remote | V-CODE-3 → V-CRED-4 → V-ML-1 → V-X-3 | — | Good fit. The internet-facing gateway exists because the model is served; RAND exempts production serving from full isolation, so NET-01 removes it only if serving is split from training. |
| The Long Game | insider | V-HUM-1 → V-X-1 → V-BYP-2 → V-X-4 | — | Blends recruiting a current employee (V-HUM-1) with passing hiring vetting (V-HUM-3). PER-05 acts after the weights have left; PER-06, KEY-01 and CUS-01 at the reach stage are the stoppers. |
| The Remote Ghost | remote | V-BYP-3 → V-CODE-2 → V-CRED-4 | — | Good fit (RAND also files AMT-style management firmware under V-SUP-1). HW-07 is overstated: a BMC can reflash firmware and control power, so PER-08 and HW-09 are the robust stoppers. |
| The Patient Distillation | capability_copy | V-ML-5 | NET-04, NET-01 | Now on its own capability meter. RAND scores V-ML-5 at 1 for OC2, the chain's min_oc. NET-04 is a misfit (distillation needs gigabytes); NET-01 here is a serving decision, not a control. |

## Reviewer verdicts not applied as written

| Reviewer verdict | What I did | Why |
|---|---|---|
| PER-06 → V-HUM-1/2/3: keep strong | **Modified.** Moved to V-X-1 (the insider's standing access, reach stage). PER-02's HUM partials and PER-06's V-CRED-1/3 partials were moved the same way. | Dual authorisation limits what an insider can do, not whether one is recruited. Keeping it on both stages would count it twice on the insider route. |
| NET-01 → V-CODE-*: keep + floor at V-NET-1 | **Implemented through structure.** No floor on the vector is needed. | V-NET-1 sits in the same entry and exfil lists, so with NET-01 deployed the stage can never fall below it. |
| Top-k route breadth | **Not applied.** | User rule: every attacker tries every route it can afford. |
| (my change) V-HUM-5 complete on its own | **Reverted to a staged entry.** | Treated as complete, it dominated OC3–OC5 (0.74 at OC5) and ignored RAND SL5's irrecoverable-key policy, which exists for exactly this case. |

## Transcription confidence

Confidence is high. A re-extraction from the text and the reviewer's check against the PDF both match all 38 rows: names, scores and asterisks. The social engineering / password pairing is confirmed by the PDF layout. Nine vectors score 1 at OC1–OC3 and more than 1 above, and RAND's "eight" is its own slip. The authored and structural scores are assumptions (`assumption: true`).
