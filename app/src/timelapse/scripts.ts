import type { TimeLapseScript } from "./types";

export const SCRIPTS: TimeLapseScript[] = [
  {
    id: "do-nothing",
    name: "Do Nothing",
    description: "No defenses deployed. Watch AI erode everything.",
    type: "scripted",
    initialBlockStates: {},
    deployments: [],
    annotations: [
      { atYear: 2025.5, message: "AI at 15% — first attack chains becoming viable" },
      { atYear: 2027, message: "AI at 65% — probabilistic defenses would be deeply eroded by now", highlight: { type: "chain", id: "patient-distillation" } },
      { atYear: 2028.5, message: "AI at 88% — even OC3 adversaries succeed on multiple paths" },
      { atYear: 2030, message: "Full AI capability. All chains wide open." },
    ],
  },
  {
    id: "reactive-ciso",
    name: "Reactive CISO",
    description: "Deploy defenses only after threats materialize. Always a step behind.",
    type: "scripted",
    // High enough to fund the ~$346M of panic deployments below — the
    // reactive failure mode here is lateness, not underfunding.
    // risk_tolerance 1.0: story deployments are authored at optimistic costs
    sliderOverrides: { budget_millions: 400, org_transformation: 0.3, risk_tolerance: 1.0 },
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
      { atYear: 2025.5, message: "Network probe detected — scrambling to deploy firewall controls" },
      { atYear: 2026.5, message: "Breach attempt. Starting air-gap project — won't deploy until 2028.5", highlight: { type: "block", id: "NET-01" } },
      { atYear: 2027, message: "Insider incident. Personnel controls start but AI already at 65%" },
      { atYear: 2028.5, message: "AI-specific controls started too late — won't mature before 2030", highlight: { type: "block", id: "AI-01" } },
    ],
  },
  {
    id: "proactive-program",
    name: "Proactive Program",
    description: "Start early. Hard-stops first. Ahead of the AI curve.",
    type: "scripted",
    // Budget covers the full program: the deployments below sum to ~$791M
    // at optimistic upfront costs (a multi-hundred-million-dollar program is
    // the point of this story — see the README's framing). gov_cooperation is
    // set high: a program this well-resourced assumes government partnership,
    // so personnel/supply-chain controls aren't govMult-penalized.
    sliderOverrides: { budget_millions: 800, org_transformation: 0.7, vendor_cooperation: 0.6, gov_cooperation: 0.7, risk_tolerance: 1.0 },
    deployments: [
      // Foundations first (2024) — zero-prereq blocks that everything else
      // requires. PER-01 gates PER-02/03/04/05 and PER-06; PER-06 gates
      // AI-01/AI-06; HW-01 gates HW-05/06/07/09 and SC-06. Deploying these up
      // front is what makes the later blocks actually reach mature (not capped).
      { blockId: "PER-01", startYear: 2024 },
      { blockId: "PER-06", startYear: 2024 },
      { blockId: "HW-01", startYear: 2024 },
      // Immediate hard-stops (2024)
      { blockId: "NET-01", startYear: 2024 },
      { blockId: "NET-02", startYear: 2024 },
      { blockId: "PHY-01", startYear: 2024 },
      { blockId: "HW-09", startYear: 2024 },
      { blockId: "PER-02", startYear: 2024 },
      { blockId: "NET-04", startYear: 2024 },
      // Second wave early 2025
      { blockId: "PHY-02", startYear: 2024.5 },
      { blockId: "NET-03", startYear: 2024.5 },
      { blockId: "HW-05", startYear: 2024.5 },
      { blockId: "PER-08", startYear: 2024.5 },
      { blockId: "AI-06", startYear: 2024.5 },
      { blockId: "AI-04", startYear: 2024.5 },
      // AI + supply chain 2025
      { blockId: "AI-01", startYear: 2025 },
      { blockId: "AI-03", startYear: 2025 },
      { blockId: "SC-02", startYear: 2025 },
      { blockId: "SC-04", startYear: 2025 },
      { blockId: "SC-05", startYear: 2025 },
      { blockId: "PER-03", startYear: 2025 },
      { blockId: "PER-04", startYear: 2025 },
      // Hardware and remaining coverage 2025.5
      { blockId: "HW-03", startYear: 2025.5 },
      { blockId: "HW-06", startYear: 2025.5 },
      { blockId: "HW-07", startYear: 2025.5 },
      { blockId: "PHY-06", startYear: 2025.5 },
      { blockId: "NET-05", startYear: 2025.5 },
      // Long-lead items
      { blockId: "AI-02", startYear: 2025 },
      { blockId: "SC-06", startYear: 2026 },
      { blockId: "PER-05", startYear: 2026 },
      { blockId: "PHY-03", startYear: 2026 },
    ],
    annotations: [
      { atYear: 2025, message: "Foundations + hard-stops in place — prerequisite chains satisfied, many attack paths already blocked" },
      { atYear: 2026, message: "First blocks reaching deployed. AI still at 35%." },
      { atYear: 2027.5, message: "Core defenses mature. Resilient even as AI passes 70%." },
      { atYear: 2029, message: "Full program mature — hard-stops hold regardless of AI capability" },
    ],
  },
  {
    id: "budget-constrained",
    name: "Budget-Constrained",
    description: "$100M limit. Pick the highest-impact blocks only.",
    type: "scripted",
    sliderOverrides: { budget_millions: 100, org_transformation: 0.4, risk_tolerance: 1.0 },
    deployments: [
      // Highest-impact blocks that fit ~$100M of upfront capital
      // (optimistic costs; running total in comments). Every deployed block's
      // prerequisites are funded so nothing ships permanently capped:
      //  - PER-01 unlocks PER-02/03/04; PER-06 unlocks the AI containment blocks.
      //  - NET-04/05 (need the $20M NET-02 enclave) and HW/PHY hard-stops (need
      //    the $100M+ HW-01 / $200M PHY-01 foundations) are deliberately left
      //    out — the honest gaps this budget can't close. NET-03 stands alone.
      { blockId: "PER-01", startYear: 2024.5 },   // $10M  → $10M
      { blockId: "PER-06", startYear: 2024.5 },   // $3M   → $13M
      { blockId: "PER-02", startYear: 2025 },      // $2M   → $15M
      { blockId: "NET-03", startYear: 2025 },      // $5M   → $20M
      { blockId: "PER-07", startYear: 2025.5 },    // $1M   → $21M
      { blockId: "AI-04", startYear: 2025.5 },     // $5M   → $26M
      { blockId: "PER-03", startYear: 2026 },      // $10M  → $36M
      { blockId: "AI-06", startYear: 2026 },       // $5M   → $41M
      { blockId: "PHY-06", startYear: 2026.5 },    // $20M  → $61M
      { blockId: "AI-01", startYear: 2026.5 },     // $20M  → $81M
      { blockId: "PER-08", startYear: 2027 },      // $5M   → $86M
      { blockId: "PER-04", startYear: 2027 },      // $5M   → $91M
    ],
    annotations: [
      { atYear: 2025.5, message: "Budget nearly exhausted at ~$100M — major gaps remain" },
      { atYear: 2027, message: "No air gap, no physical perimeter, no hardware encryption. Multiple chains viable.", highlight: { type: "chain", id: "quiet-tap" } },
      { atYear: 2028.5, message: "Supply chain completely unprotected — Poisoned Chip exploitable", highlight: { type: "chain", id: "poisoned-chip" } },
    ],
  },
  {
    id: "current-state",
    name: "Your Current Config",
    description: "Advance time on your existing defense posture.",
    type: "passthrough",
    annotations: [
      { atYear: 2026, message: "AI at 35% — check which probabilistic defenses are eroding" },
      { atYear: 2028, message: "AI at 82% — are your hard-stops in place?" },
    ],
  },
];
