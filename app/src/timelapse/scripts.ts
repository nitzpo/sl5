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
    // The plan is SIZED to the budget: 33 programs cost ~$2,590M at the shared
    // risk_tolerance 0.65 basis (`min + (1 - rt) * (max - min)`), against the
    // $2,800M cap. Nothing is capped at `implementing` and every block reaches
    // `mature` by 2030, so the residual vs OC4 is what a fully-delivered
    // program actually leaves on the table — not an artifact of a plan the org
    // could never pay for.
    //
    // ~$2.6B of spend, planned under a $2.8B cap, is what SL 3.5 costs, and
    // that is the headline finding rather than a budget the story was handed. The number was ~$1.4B until the 2026 value
    // audit found PHY-01 priced as a conventional SCIF — a room — while its own
    // feasibility note assumed AI-datacenter scale. It is now priced as the
    // classified-grade PREMIUM on a 50-100MW secure enclave (~$20M/MW, the delta
    // between commercial and classified build rates), which lands it at ~$1,395M,
    // 53% of this program. Pricing the whole campus to that grade instead would
    // put the program near $8B and make the other 31 controls a rounding error,
    // which models construction rather than security. The lesson survives either
    // way: the single largest line item in an SL5 program is the building, and
    // it was the one nobody had costed.
    //
    // SL measures coverage across the whole threat model: 44 of 46 blocks are
    // threat-relevant, so the score is a BREADTH measure and a 23-block plan
    // structurally caps out near 2.5 whatever it buys. Reaching 3.5 takes 33
    // blocks; the full catalog matured ($4,474M) reaches only ~4.4, because
    // slider penalties and AI erosion mean even a maxed posture is not a 5.
    //
    // The two omissions are deliberate and they are the whole reason the number
    // isn't single digits. `long-game` is an all-personnel chain (PER-02/03/04/
    // 05); this plan buys PER-03 and PER-05 and skips PER-02 (two-person
    // control) and PER-04 (SF-86-style background vetting). Every plan measured that closes
    // all four collapses breach to ~4.7%, because breach is a max over chains
    // and the other six are then all sitting on the residual floor. SL 3.5 with
    // a real residual requires leaving exactly one chain meaningfully open.
    //
    // gov_cooperation is set high: a program this well-resourced assumes
    // government partnership, so personnel/supply-chain controls aren't
    // govMult-penalized.
    sliderOverrides: { budget_millions: 2800, org_transformation: 0.7, vendor_cooperation: 0.6, gov_cooperation: 0.7, risk_tolerance: 0.65 },
    deployments: [
      // 2024 — the long-lead foundations plus every cheap quick win. HW-01 and
      // HW-03 are 48-month builds and HW-01 gates HW-05/07/09 and SC-06;
      // PER-01 gates PER-03/05/06. The 12–18mo items (PHY-03/04, NET-04/07,
      // SC-05, PER-08) start here too because they are what makes the curve
      // fall in 2024.5–2025 instead of sitting at 100% waiting for concrete.
      { blockId: "HW-01", startYear: 2024 },
      { blockId: "HW-03", startYear: 2024 },
      { blockId: "PER-01", startYear: 2024 },
      { blockId: "NET-02", startYear: 2024 },
      { blockId: "AI-07", startYear: 2024 },
      { blockId: "SC-05", startYear: 2024 },
      { blockId: "PER-08", startYear: 2024 },
      { blockId: "PHY-04", startYear: 2024 },
      { blockId: "NET-04", startYear: 2024 },
      { blockId: "PHY-03", startYear: 2024 },
      // 2024.5 — the air gap and the remaining 48-month items.
      { blockId: "NET-01", startYear: 2024.5 },
      { blockId: "HW-07", startYear: 2024.5 },
      { blockId: "AI-01", startYear: 2024.5 },
      { blockId: "PER-03", startYear: 2024.5 },
      { blockId: "NET-07", startYear: 2024.5 },
      // 2025 — the physical perimeter ($1,395M, 18–48mo) and the 24-month tier.
      { blockId: "PER-06", startYear: 2025 },
      { blockId: "PHY-01", startYear: 2025 },
      // Bundled with PHY-01 because the data says it must be: TEMPEST
      // countermeasures cannot deploy faster than the facility they line. It is
      // also PHY-01's and PHY-05's `completed_by` companion — shielding assumes
      // the emitters are the ones you shielded — so buying all three is what
      // makes the physical family count for what it claims rather than for
      // `standalone_share` of it. $218M, and it is the difference between this
      // story landing near SL 3.4 and at 3.5.
      { blockId: "PHY-02", startYear: 2025 },
      { blockId: "HW-05", startYear: 2025 },
      { blockId: "SC-02", startYear: 2025 },
      { blockId: "PHY-07", startYear: 2025 },
      { blockId: "SC-04", startYear: 2025.5 },
      { blockId: "AI-06", startYear: 2025.5 },
      // 2026 — 18-month tier, still comfortably inside the 2030 horizon.
      { blockId: "PHY-06", startYear: 2026 },
      { blockId: "SC-06", startYear: 2026 },
      { blockId: "NET-05", startYear: 2026 },
      { blockId: "NET-03", startYear: 2026 },
      { blockId: "HW-09", startYear: 2026.5 },
      { blockId: "NET-06", startYear: 2026.5 },
      // The tail is staged so every remaining half-year step lands at least one
      // completion. A step where nothing completes is a step where AI advances
      // unopposed and breach ticks back UP; these four are what keep the
      // decline monotonic through 2030.
      { blockId: "AI-04", startYear: 2027 },
      { blockId: "PER-05", startYear: 2027.5 },
      { blockId: "PHY-05", startYear: 2028.25 },
      { blockId: "PER-07", startYear: 2028.25 },
    ],
    annotations: [
      { atYear: 2024, message: "2024: long-lead foundations and every cheap quick win start together — nothing waits for concrete." },
      { atYear: 2025, message: "The quick wins land first: 100% → 64% before a single mega-project finishes" },
      { atYear: 2026, message: "The air gap reaches deployed and the network family lands with it", highlight: { type: "block", id: "NET-01" } },
      { atYear: 2027, message: "The curve flattens around 34%. Concrete and silicon are still curing — and what's left after that is people.", highlight: { type: "chain", id: "long-game" } },
      // The biggest step in the story: the two 48-month hardware builds and the
      // physical perimeter all complete across 2028–2028.5.
      { atYear: 2028, message: "The mega-projects complete: hardware root of trust, encrypted interconnect, physical perimeter — 34% → 18%", highlight: { type: "block", id: "PHY-01" } },
      { atYear: 2029, message: "SL passes 3.4. Everything cheap is bought, everything expensive is matured.", highlight: { type: "chain", id: "long-game" } },
      // Why it doesn't reach zero: the plan is fully funded and fully matured,
      // and it still leaves an all-personnel chain open.
      { atYear: 2030, message: "$2.59B of $2.8B, all 33 programs matured, SL 3.5 — and an insider chain still gets through 16% of the time", highlight: { type: "chain", id: "long-game" } },
    ],
  },
  {
    id: "reactive-ciso",
    name: "Reactive CISO",
    description: "Deploy defenses only after threats materialize. Always a step behind.",
    type: "scripted",
    // Every story plans at the same risk_tolerance (0.65) so the cost basis is
    // one rule, not per-story special pleading. This budget covers the ~$1,710M
    // the panic deployments below cost at that basis, so nothing caps: the
    // reactive failure mode is lateness, and the story has to isolate it from
    // underfunding to make that point.
    //
    // The figure moved from $700M with the 2026 PHY-01 repricing, and that
    // exposed something the old numbers hid. At $700M this story ran with 12 of
    // its 16 blocks frozen by the funding queue, so its breach number was really
    // measuring "late AND broke" — two failure modes at once, only one of which
    // this story is about. Funded to what its own plan costs, lateness is the
    // only thing left, which is the point.
    sliderOverrides: { budget_millions: 1800, org_transformation: 0.3, risk_tolerance: 0.65 },
    deployments: [
      // After first network probe detected ~mid-2025
      { blockId: "NET-02", startYear: 2025.5 },
      { blockId: "NET-03", startYear: 2025.5 },
      { blockId: "NET-04", startYear: 2025.5 },
      // Physical after insider scare 2026. PER-01 (foundational personnel
      // baseline) is finally started here too — it gates PER-02/03/04.
      { blockId: "PHY-01", startYear: 2026 },
      { blockId: "PHY-05", startYear: 2026 },
      { blockId: "PER-01", startYear: 2026 },
      { blockId: "PER-02", startYear: 2026 },
      // Network air gap after breach attempt
      { blockId: "NET-01", startYear: 2026.5 },
      // Personnel program after insider event mid-2027
      { blockId: "PER-03", startYear: 2027 },
      { blockId: "PER-04", startYear: 2027 },
      { blockId: "PER-08", startYear: 2027 },
      // AI-specific very late — after distillation detected. PER-06 gates
      // AI-06, so it has to come first (still far too late to mature by 2030).
      { blockId: "PER-06", startYear: 2028 },
      { blockId: "AI-04", startYear: 2028 },
      { blockId: "AI-06", startYear: 2028 },
      { blockId: "AI-01", startYear: 2028.5 },
      // Hardware even later. HW-05 needs no prerequisite; HW-09 (requires the
      // $100M HW-01 foundation this budget never funds) is left out rather than
      // shipped as a block permanently capped to implementing.
      { blockId: "HW-05", startYear: 2029 },
    ],
    annotations: [
      { atYear: 2024, message: "2024: no defenses yet — we deploy only after each threat lands." },
      // Was three silent steps waiting for the first incident. The waiting IS
      // the story here, so it should be said out loud.
      { atYear: 2025, message: "Nothing has happened yet, so nothing gets funded. The budget is intact and so is the exposure." },
      { atYear: 2025.5, message: "Network probe detected — scrambling to deploy firewall controls" },
      { atYear: 2026.5, message: "Breach attempt. Starting air-gap project — won't deploy until 2028.5", highlight: { type: "block", id: "NET-01" } },
      { atYear: 2027, message: "Insider incident. Personnel controls start but AI already at 65%" },
      { atYear: 2028.5, message: "AI-specific controls started too late — won't mature before 2030", highlight: { type: "block", id: "AI-01" } },
    ],
  },
  {
    id: "budget-constrained",
    name: "Budget-Constrained",
    description: "$200M limit. Pick the highest-impact blocks only.",
    type: "scripted",
    // Plans at the shared risk_tolerance 0.65 like every other story. The same
    // 12 blocks cost ~$196M at that basis (they were ~$91M at optimistic
    // minimums), so the cap moves to $200M for the identical program — the
    // constraint is which blocks you can afford at all, not the cost basis.
    // Outcome is unchanged either way (measured: identical at both).
    sliderOverrides: { budget_millions: 200, org_transformation: 0.4, risk_tolerance: 0.65 },
    deployments: [
      // Highest-impact blocks that fit ~$196M of upfront capital at rt 0.65
      // (running total in comments). Every deployed block's prerequisites are
      // funded so nothing ships permanently capped:
      //  - PER-01 unlocks PER-02/03/04; PER-06 unlocks the AI containment blocks.
      //  - NET-04/05 (need the $20M NET-02 enclave) and HW/PHY hard-stops (need
      //    the $100M+ HW-01 / $200M PHY-01 foundations) are deliberately left
      //    out — the honest gaps this budget can't close. NET-03 stands alone.
      { blockId: "PER-01", startYear: 2024.5 },    // $21M  → $21M
      { blockId: "PER-06", startYear: 2024.5 },    // $6M   → $27M
      { blockId: "PER-02", startYear: 2025 },      // $5M   → $31M
      { blockId: "NET-03", startYear: 2025 },      // $14M  → $45M
      { blockId: "PER-07", startYear: 2025.5 },    // $2M   → $48M
      { blockId: "AI-04", startYear: 2025.5 },     // $10M  → $58M
      { blockId: "PER-03", startYear: 2026 },      // $17M  → $75M
      { blockId: "AI-06", startYear: 2026 },       // $14M  → $89M
      { blockId: "PHY-06", startYear: 2026.5 },    // $41M  → $130M
      { blockId: "AI-01", startYear: 2026.5 },     // $48M  → $178M
      { blockId: "PER-08", startYear: 2027 },      // $9M   → $186M
      { blockId: "PER-04", startYear: 2027 },      // $10M  → $196M
    ],
    annotations: [
      { atYear: 2024, message: "2024: a $200M cap — only the highest-impact blocks make the cut." },
      { atYear: 2025.5, message: "Cheap personnel controls land first — the one dip this story gets" },
      // The reversal is this story's real lesson and it was previously
      // unnarrated: breach bottoms out just above 50% then creeps back up.
      { atYear: 2026, message: "And now it rises again: AI erodes these probabilistic controls faster than the budget can add more" },
      { atYear: 2027, message: "No air gap, no physical perimeter, no hardware encryption — every structural control is unaffordable.", highlight: { type: "chain", id: "zero-day-cascade" } },
      { atYear: 2028.5, message: "Supply chain completely unprotected — Poisoned Chip exploitable", highlight: { type: "chain", id: "poisoned-chip" } },
    ],
  },
  {
    id: "do-nothing",
    name: "Do Nothing",
    description: "Nothing new deployed. Watch AI erode today's posture.",
    type: "scripted",
    initialBlockStates: {},
    deployments: [],
    annotations: [
      { atYear: 2024, message: "2024: today's posture, frozen — nothing new gets started. We just watch." },
      { atYear: 2025.5, message: "Controls the labs had already begun keep landing — exposure improves without any new decisions" },
      { atYear: 2027, message: "The last baseline control arrived in 2026. From here AI erodes what exists and nothing replaces it", highlight: { type: "chain", id: "patient-distillation" } },
      { atYear: 2028.5, message: "AI at 88% — the probabilistic controls in the baseline are deeply eroded" },
      { atYear: 2030, message: "Full AI capability. About half of what the posture gained by 2026 has eroded away." },
    ],
  },
  {
    id: "current-state",
    name: "Your Current Config",
    description: "Advance time on your existing defense posture.",
    type: "passthrough",
    annotations: [
      { atYear: 2024, message: "2024: your current posture, held fixed while time advances." },
      { atYear: 2026, message: "AI at 35% — check which probabilistic defenses are eroding" },
      { atYear: 2028, message: "AI at 82% — are your hard-stops in place?" },
    ],
  },
];
