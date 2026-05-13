# SL5 Explorable — Ideation Log

## Session 1 — 2026-04-26

### Audience
Policymakers, AI lab security managers, technical public, AI security community.
Need both tradeoffs AND attack surface understanding.

### Core "Aha" Moments to Engineer
1. SL5 is actually very very hard. Even SL4 to some extent.
2. The OC4→OC5 jump is qualitative, not just quantitative.
3. Strong AI models for cybersecurity change the OC scale — OC4 jumps forward.
4. Insider threat is a distinct, hard-to-mitigate class.
5. Uncertainty is real — experts disagree on feasibility of key building blocks.

### Key Design Decision
**Building blocks as the atomic unit.** Each block has:
- Feasibility (does it exist? can it be built?)
- Cost / effort to research, invent, then implement
- Time to deploy
- Odds of different adversaries exploiting absence
- Dependencies on other blocks
- Open questions / uncertainty

### Format
Not necessarily a full game. Could be simulation, explorable explanation, interactive analysis tool. Keep all four initial directions alive for now.

### Nitzan's Role in Content
- Commentary/annotations from national security experience
- Framework translation (classified-world → AI context)
- Credibility signaling
- Will add perceptions and rough edges later

### Open Design Questions
- Which initial direction (Threat Sandbox, Timeline Race, SL5 Architect, Assumption Explorer)?
- How to handle temporal evolution of offense-defense?
- How to represent AI-as-OC-multiplier?

---

## Session 2 — 2026-05-05

### Key Advances
- Building block profiles drafted (6 blocks with full quantitative dimensions)
- Attack chains drafted (7 scenarios covering all categories)
- Simulation structure converging: year selector × block toggles × perspective × AI growth curve
- Time-dependent formulas sketched for block maturation, AI OC multiplier, breach probability

### Confirmed Decisions
- All block definitions → configurable JSON (for local modification)
- Time to deploy is important dimension; time to research less so (focus on concrete, not hypothetical)
- Attack narratives: brief-to-medium (Option B) with select curated chain stories (Option C)
- Block values are starting points — calibrate together with Nitzan's experience
- Values should have time-dependent formulas (not static snapshots)
- "Organizational readiness" is key aha — AI labs are culturally alien to SL5 ops
- Inference/distillation is always a channel if model is served — must be explicit
- Structure converges: year × blocks × perspective × AI curve

### Pattern: Two Simultaneous Races
1. Deployment race: can defenders deploy before threat arrives?
2. Futureproofing race: which blocks remain effective as AI amplifies adversary?

### Pattern: Hard Stops vs Probabilistic
- Hard stops (air gap, crypto, memory isolation): deterministic, AI-resistant
- Probabilistic (monitoring, vetting, review): erode over time with AI growth
- Physical hard stops are future-proof — prioritize them

### Pattern: "Decide Now" Blocks
- Blocks with 36-48 month lead times that need 2026 commitment
- If you miss the window, the block won't be ready when the threat arrives
- This is the temporal pressure the tool makes visible

### Next Steps
- Calibrate block profiles together (apply Nitzan's experience)
- Resolve visualization approach for defense-in-depth
- Decide how to show "SL5 not achievable" without despair
- Draft "what's at stake" sidebar content
- Consider: should all 4 initial directions merge into one unified tool?
