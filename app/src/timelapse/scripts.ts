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
    // The plan is SIZED to the budget: 23 programs cost ~$759M at the shared
    // risk_tolerance 0.65 basis (`min + (1 - rt) * (max - min)`), against the
    // $800M cap. Nothing is capped at `implementing` and every block reaches
    // `mature` by 2030, so the residual ~17% vs OC4 is what a fully-delivered
    // $800M program actually leaves on the table — not an artifact of a plan
    // the org could never pay for.
    //
    // That sizing is why the mega-items are absent. PHY-01 ($305M) + its
    // dependent PHY-02, AI-02 ($240M) + AI-01, HW-03, HW-06 and AI-03 together
    // consumed the whole 2024 tranche in the earlier version of this plan,
    // which left 20 of 31 deployments frozen at `implementing` for six years
    // and made the staggered start years decorative. Cheap structural controls
    // bought earlier beat expensive ones the queue never funds.
    //
    // The tail (PER-04 continuous vetting, PER-07) is deliberately late and
    // deliberately partial: `long-game` is an all-personnel chain, so leaving
    // some of it uncovered is what keeps that chain dominant instead of the
    // board collapsing to the residual floor.
    //
    // gov_cooperation is set high: a program this well-resourced assumes
    // government partnership, so personnel/supply-chain controls aren't
    // govMult-penalized.
    sliderOverrides: { budget_millions: 800, org_transformation: 0.7, vendor_cooperation: 0.6, gov_cooperation: 0.7, risk_tolerance: 0.65 },
    deployments: [
      // Foundations first (2024) — zero-prereq blocks that everything else
      // requires. PER-01 gates PER-02/04 and PER-06; HW-01 gates HW-05/07/09
      // and SC-06. Deploying these up front is what makes the later blocks
      // actually reach mature.
      { blockId: "HW-01", startYear: 2024 },
      { blockId: "PER-01", startYear: 2024 },
      { blockId: "PER-06", startYear: 2024 },
      // Immediate hard-stops (2024) — the air gap and its network siblings.
      { blockId: "NET-01", startYear: 2024 },
      { blockId: "PER-02", startYear: 2024 },
      // Second wave, still cheap and still structural (2024.5)
      { blockId: "NET-02", startYear: 2024.5 },
      { blockId: "NET-04", startYear: 2024.5 },
      { blockId: "PER-08", startYear: 2024.5 },
      { blockId: "HW-05", startYear: 2024.5 },
      // Machine + supply chain 2025
      { blockId: "HW-07", startYear: 2025 },
      { blockId: "SC-02", startYear: 2025 },
      { blockId: "HW-09", startYear: 2025.5 },
      { blockId: "NET-03", startYear: 2025.5 },
      { blockId: "AI-04", startYear: 2025.5 },
      // Physical + AI defenses 2026
      { blockId: "PHY-06", startYear: 2026 },
      { blockId: "AI-06", startYear: 2026 },
      { blockId: "SC-06", startYear: 2026.5 },
      { blockId: "PHY-03", startYear: 2026.5 },
      { blockId: "SC-04", startYear: 2026.5 },
      // Remaining coverage 2027
      { blockId: "NET-05", startYear: 2027 },
      { blockId: "SC-05", startYear: 2027.5 },
      // The personnel tail — started late on purpose, and each one lands in a
      // half-year step that would otherwise be flat. A step where nothing
      // completes is a step where AI advances unopposed and the curve ticks
      // back up; staging these two here is what keeps the decline monotonic
      // all the way to 2030.
      { blockId: "PER-04", startYear: 2027 },
      { blockId: "PER-07", startYear: 2027.5 },
    ],
    annotations: [
      { atYear: 2024, message: "2024: hard-stops go in first, ahead of the AI curve." },
      { atYear: 2025, message: "Foundations in place — prerequisite chains satisfied, so everything started later can actually finish" },
      // The biggest single step in the story (−18 points) is NET-01 reaching
      // deployed here, with the rest of the network family landing alongside it.
      { atYear: 2026, message: "The air gap reaches deployed, network controls right behind it — the biggest drop this program gets", highlight: { type: "block", id: "NET-01" } },
      { atYear: 2027, message: "Hard-stops maturing and the curve flattens. What's left is people.", highlight: { type: "chain", id: "long-game" } },
      { atYear: 2028, message: "Continuous vetting starts late on purpose — by now it's the only thing left to buy", highlight: { type: "chain", id: "long-game" } },
      { atYear: 2029, message: "Personnel controls reach deployed — the last real move on the number", highlight: { type: "chain", id: "long-game" } },
      // Why it doesn't reach zero: the plan is fully funded and fully matured,
      // and it still leaves an all-personnel chain open.
      { atYear: 2030, message: "$759M of the $800M, all 23 programs matured — and ~17% still gets through", highlight: { type: "chain", id: "long-game" } },
    ],
  },
  {
    id: "reactive-ciso",
    name: "Reactive CISO",
    description: "Deploy defenses only after threats materialize. Always a step behind.",
    type: "scripted",
    // Every story plans at the same risk_tolerance (0.65) so the cost basis is
    // one rule, not per-story special pleading. This budget then covers the
    // ~$620M the panic deployments below actually cost at that basis: the
    // reactive failure mode is lateness, NOT underfunding, so nothing here
    // should cap. Raising it further changes no outcome (measured).
    sliderOverrides: { budget_millions: 700, org_transformation: 0.3, risk_tolerance: 0.65 },
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
    // Outcome is unchanged either way (measured: 99.4% at both).
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
      // unnarrated: breach bottoms out ~93% then climbs back toward 99%.
      { atYear: 2026, message: "And now it rises again: AI erodes these probabilistic controls faster than the budget can add more" },
      { atYear: 2027, message: "No air gap, no physical perimeter, no hardware encryption — every structural control is unaffordable.", highlight: { type: "chain", id: "zero-day-cascade" } },
      { atYear: 2028.5, message: "Supply chain completely unprotected — Poisoned Chip exploitable", highlight: { type: "chain", id: "poisoned-chip" } },
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
      { atYear: 2025.5, message: "AI at 15% — first attack chains becoming viable" },
      { atYear: 2027, message: "AI at 65% — probabilistic defenses would be deeply eroded by now", highlight: { type: "chain", id: "patient-distillation" } },
      { atYear: 2028.5, message: "AI at 88% — even OC3 adversaries succeed on multiple paths" },
      { atYear: 2030, message: "Full AI capability. All chains wide open." },
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
