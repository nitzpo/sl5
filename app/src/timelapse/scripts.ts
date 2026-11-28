import type { TimeLapseScript } from "./types";

export const SCRIPTS: TimeLapseScript[] = [
  {
    id: "proactive-program",
    name: "Proactive Program",
    description: "Start early. Hard-stops first. Ahead of the AI curve.",
    type: "scripted",
    // A well-funded program that plans within its means — the point of this
    // story is a serious attempt, not a solved problem.
    //
    // The plan is SIZED to the budget: 46 programmes cost ~$2,990M at the shared
    // risk_tolerance 0.65 basis (`min + (1 - rt) * (max - min)`), against the
    // $3,000M cap. Nothing is left unfunded, so what it leaves on the table at
    // 2030 is what a fully-delivered programme leaves — not an artifact of a
    // plan the org could never pay for. More than half of it ($1,395M) is
    // PHY-01, the building, priced as the classified-grade premium on a
    // 50-100MW secure enclave.
    //
    // What it buys, measured by the threat-relative SL (Phase 2): SL2 by 2026,
    // SL3 by 2029 — it holds OC3 against 2030's AI-lifted attackers, with the
    // model served only just (flagged marginal) — and OC4 still contested. What
    // is left is what no catalogue block stops at OC4: model extraction through
    // the served API, and a recruited insider who copies a checkpoint and walks
    // it out. SL4 needs more than money; SL5 needs capabilities that don't exist
    // yet (the future-capability toggle).
    //
    // The schedule is staged so every half-year step holds the line against
    // OC4 (asserted by scripts.test.ts): AI-07 starts in 2024.5 and ACA-01 in
    // 2026 so their completions land in steps where nothing else would.
    //
    // gov_cooperation is set high: a program this well-resourced assumes
    // government partnership, so personnel/supply-chain controls aren't
    // govMult-penalized.
    sliderOverrides: { budget_millions: 3000, org_transformation: 0.7, vendor_cooperation: 0.6, gov_cooperation: 0.7, risk_tolerance: 0.65 },
    deployments: [
      // 2024 — the long-lead foundations plus every cheap quick win.
      { blockId: "HW-01", startYear: 2024 },
      { blockId: "HW-03", startYear: 2024 },
      { blockId: "PER-01", startYear: 2024 },
      { blockId: "IAM-01", startYear: 2024 },
      { blockId: "END-01", startYear: 2024 },
      { blockId: "CFG-01", startYear: 2024 },
      { blockId: "DET-01", startYear: 2024 },
      { blockId: "SW-01", startYear: 2024 },
      { blockId: "CUS-01", startYear: 2024 },
      { blockId: "GOV-01", startYear: 2024 },
      { blockId: "PER-08", startYear: 2024 },
      { blockId: "PHY-03", startYear: 2024 },
      { blockId: "PER-06", startYear: 2024 },
      { blockId: "PER-02", startYear: 2024 },
      // 2024.5 — the air gap, the weight keys and the remaining 48-month items.
      { blockId: "NET-01", startYear: 2024.5 },
      { blockId: "NET-02", startYear: 2024.5 },
      { blockId: "AI-07", startYear: 2024.5 },
      { blockId: "NET-04", startYear: 2024.5 },
      { blockId: "KEY-01", startYear: 2024.5 },
      { blockId: "HW-07", startYear: 2024.5 },
      { blockId: "AI-01", startYear: 2024.5 },
      { blockId: "PER-03", startYear: 2024.5 },
      { blockId: "NET-07", startYear: 2024.5 },
      { blockId: "DEC-01", startYear: 2024.5 },
      { blockId: "AI-11", startYear: 2024.5 },
      // 2025 — the physical perimeter and the 24-month tier.
      { blockId: "PHY-01", startYear: 2025 },
      { blockId: "PHY-02", startYear: 2025 },
      { blockId: "PHY-04", startYear: 2025 },
      { blockId: "HW-05", startYear: 2025 },
      { blockId: "PHY-07", startYear: 2025 },
      { blockId: "SC-08", startYear: 2025 },
      { blockId: "AI-09", startYear: 2025 },
      { blockId: "PER-04", startYear: 2025 },
      { blockId: "PER-09", startYear: 2025 },
      { blockId: "SC-04", startYear: 2025.5 },
      { blockId: "AI-06", startYear: 2025.5 },
      { blockId: "AI-10", startYear: 2025.5 },
      // 2026 — 18-month tier, still comfortably inside the 2030 horizon.
      { blockId: "PHY-06", startYear: 2026 },
      { blockId: "NET-05", startYear: 2026 },
      { blockId: "NET-03", startYear: 2026 },
      { blockId: "SRV-01", startYear: 2026 },
      { blockId: "ACA-01", startYear: 2026 },
      { blockId: "HW-09", startYear: 2026.5 },
      { blockId: "NET-06", startYear: 2026.5 },
      { blockId: "AI-04", startYear: 2027 },
      { blockId: "PHY-08", startYear: 2027.5 },
    ],
    annotations: [
      { atYear: 2024, message: "2024: long-lead foundations and every cheap quick win start together — nothing waits for concrete." },
      { atYear: 2025, message: "The quick wins land first — identity, patching, custody, dual authorization — before a single mega-project finishes" },
      { atYear: 2026, message: "The air gap reaches deployed and the network family lands with it: SL2, OC2 now usually fails", highlight: { type: "block", id: "NET-01" } },
      { atYear: 2027, message: "The curve flattens. Concrete and silicon are still curing — and a recruited insider is what OC3 still gets through.", highlight: { type: "chain", id: "long-game" } },
      // The biggest steps: the 48-month hardware root of trust completes in 2028
      // and unlocks the weight keys; the physical perimeter completes in 2029.
      { atYear: 2028, message: "The hardware root of trust lands and unlocks the weight keys: stolen disks and stray copies now yield ciphertext", highlight: { type: "block", id: "KEY-01" } },
      { atYear: 2029, message: "The physical perimeter completes. SL3: OC3 now usually fails — with the model served, only just.", highlight: { type: "block", id: "PHY-01" } },
      // Why it doesn't reach SL4: fully funded and matured, OC4 still has ways
      // in no catalogue block closes.
      { atYear: 2030, message: "$3.0B, 46 programmes, SL3 — and OC4 is still contested: the served model's API and a recruited insider are the ways left", highlight: { type: "chain", id: "long-game" } },
    ],
  },
  {
    id: "reactive-ciso",
    name: "Reactive CISO",
    description: "Deploy defenses only after threats materialize. Always a step behind.",
    type: "scripted",
    // Every story plans at the same risk_tolerance (0.65) so the cost basis is
    // one rule, not per-story special pleading. This budget covers the ~$1,800M
    // the panic deployments below cost at that basis, so nothing caps: the
    // reactive failure mode is lateness, and the story has to isolate it from
    // underfunding to make that point. It ends at SL1, close to SL2: the
    // controls it bought land in 2028–2030, a step behind an attacker AI has
    // been lifting since 2025.
    //
    // The figure moved from $700M with the 2026 PHY-01 repricing, and that
    // exposed something the old numbers hid. At $700M this story ran with 12 of
    // its 16 blocks frozen by the funding queue, so its breach number was really
    // measuring "late AND broke" — two failure modes at once, only one of which
    // this story is about. Funded to what its own plan costs, lateness is the
    // only thing left, which is the point.
    sliderOverrides: { budget_millions: 1850, org_transformation: 0.3, risk_tolerance: 0.65 },
    deployments: [
      // After the first network probe, ~mid-2025: patching, identity and the
      // network controls that can be bought off the shelf.
      { blockId: "END-01", startYear: 2025.5 },
      { blockId: "IAM-01", startYear: 2025.5 },
      { blockId: "NET-02", startYear: 2025.5 },
      { blockId: "NET-03", startYear: 2025.5 },
      { blockId: "NET-04", startYear: 2025.5 },
      // Physical after an insider scare in 2026. PER-01 (foundational personnel
      // baseline) is finally started here too — it gates PER-02/03/04/06.
      { blockId: "PHY-01", startYear: 2026 },
      { blockId: "PHY-08", startYear: 2026 },
      { blockId: "PER-01", startYear: 2026 },
      { blockId: "PER-02", startYear: 2026 },
      // Network air gap and a real SOC after a breach attempt
      { blockId: "NET-01", startYear: 2026.5 },
      { blockId: "DET-01", startYear: 2026.5 },
      // Personnel program after an insider event mid-2027
      { blockId: "PER-03", startYear: 2027 },
      { blockId: "PER-04", startYear: 2027 },
      { blockId: "PER-08", startYear: 2027 },
      { blockId: "CUS-01", startYear: 2027 },
      // AI-specific very late — after distillation is detected. PER-06 gates
      // AI-01 and AI-06, so it has to come first.
      { blockId: "PER-06", startYear: 2028 },
      { blockId: "AI-04", startYear: 2028 },
      { blockId: "AI-06", startYear: 2028 },
      { blockId: "AI-01", startYear: 2028.5 },
      // Hardware even later. HW-05 needs no prerequisite; HW-09 and KEY-01
      // (which require the HW-01 foundation this budget never funds) are left
      // out rather than shipped as blocks permanently capped to implementing.
      { blockId: "HW-05", startYear: 2029 },
    ],
    annotations: [
      { atYear: 2024, message: "2024: no defenses yet — we deploy only after each threat lands." },
      // Was three silent steps waiting for the first incident. The waiting IS
      // the story here, so it should be said out loud.
      { atYear: 2025, message: "Nothing has happened yet, so nothing gets funded. The budget is intact and so is the exposure." },
      { atYear: 2025.5, message: "Network probe detected — scrambling to deploy firewall controls" },
      { atYear: 2026.5, message: "Breach attempt. Starting air-gap project — won't deploy until 2028.5", highlight: { type: "block", id: "NET-01" } },
      { atYear: 2027, message: "Insider incident. Personnel controls start, but AI capability is already strong" },
      { atYear: 2028.5, message: "AI-specific controls started too late — won't mature before 2030", highlight: { type: "block", id: "AI-01" } },
    ],
  },
  {
    id: "budget-constrained",
    name: "Budget-Constrained",
    description: "$200M limit. Pick the highest-impact blocks only.",
    type: "scripted",
    // Plans at the shared risk_tolerance 0.65 like every other story: 15 cheap
    // blocks for ~$199M of a $200M cap. It holds OC1 to the end — cheap
    // identity, patching and personnel controls are real — but never OC2, and
    // the score slips every year after 2027 as AI lifts the attackers past
    // controls it cannot add to.
    sliderOverrides: { budget_millions: 200, org_transformation: 0.4, risk_tolerance: 0.65 },
    deployments: [
      // Highest-impact blocks that fit $200M of upfront capital at rt 0.65
      // (running total in comments). Every deployed block's prerequisites are
      // funded so nothing ships permanently capped. No structural control:
      // the air gap ($85M) plus the enclave it needs ($41M) would be two thirds
      // of the budget, so this programme buys cheap breadth instead.
      { blockId: "IAM-01", startYear: 2024.5 },    // $20M  → $20M
      { blockId: "END-01", startYear: 2024.5 },    // $10M  → $31M
      { blockId: "PER-01", startYear: 2024.5 },    // $21M  → $51M
      { blockId: "PER-06", startYear: 2024.5 },    // $6M   → $57M
      { blockId: "CFG-01", startYear: 2025 },      // $10M  → $67M
      { blockId: "PER-02", startYear: 2025 },      // $7M   → $75M
      { blockId: "CUS-01", startYear: 2025 },      // $10M  → $85M
      { blockId: "DET-01", startYear: 2025.5 },    // $34M  → $119M
      { blockId: "DEC-01", startYear: 2026 },      // $5M   → $124M
      { blockId: "PER-03", startYear: 2026 },      // $21M  → $145M
      { blockId: "AI-11", startYear: 2026 },       // $20M  → $166M
      { blockId: "SW-01", startYear: 2026.5 },     // $12M  → $178M
      { blockId: "PER-04", startYear: 2027 },      // $10M  → $188M
      { blockId: "PER-08", startYear: 2027 },      // $9M   → $196M
      { blockId: "GOV-01", startYear: 2027 },      // $2M   → $199M
    ],
    annotations: [
      { atYear: 2024, message: "2024: a $200M cap — only the highest-impact blocks make the cut." },
      { atYear: 2025.5, message: "Cheap identity, patching and personnel controls land first: OC1 now usually fails" },
      // The reversal is this story's real lesson: after 2027 the score slips
      // every year as AI lifts the attackers past controls it can't add to.
      { atYear: 2026, message: "From here AI lifts the attackers faster than the budget can add controls" },
      { atYear: 2027, message: "No air gap, no physical perimeter, no hardware encryption — every structural control is unaffordable.", highlight: { type: "chain", id: "zero-day-cascade" } },
      { atYear: 2028.5, message: "Hardware supply chain unprotected — the Poisoned Chip is wide open", highlight: { type: "chain", id: "poisoned-chip" } },
    ],
  },
  {
    id: "do-nothing",
    name: "Do Nothing",
    description: "No defenses deployed. Watch AI erode everything.",
    type: "scripted",
    initialBlockStates: {},
    deployments: [],
    annotations: [
      { atYear: 2024, message: "2024: no defenses, and no plan to build any. We just watch." },
      { atYear: 2025.5, message: "AI capability emerging — the attackers start climbing the tiers" },
      { atYear: 2027, message: "AI capability strong — probabilistic defenses would be deeply eroded by now", highlight: { type: "chain", id: "patient-distillation" } },
      { atYear: 2028.5, message: "AI capability very strong — even OC3 attackers get through on several approaches" },
      { atYear: 2030, message: "Full AI capability. Even OC1 gets through more than one time in five: SL0." },
    ],
  },
  {
    id: "current-state",
    name: "Your Current Config",
    description: "Advance time on your existing defense posture.",
    type: "passthrough",
    annotations: [
      { atYear: 2024, message: "2024: your current posture, held fixed while time advances." },
      { atYear: 2026, message: "AI capability modest — check which probabilistic defenses are eroding" },
      { atYear: 2028, message: "AI capability very strong — are your hard stops in place?" },
    ],
  },
];
