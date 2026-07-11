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
      // Physical after insider scare 2026
      { blockId: "PHY-01", startYear: 2026 },
      { blockId: "PHY-05", startYear: 2026 },
      { blockId: "PER-02", startYear: 2026 },
      // Network air gap after breach attempt
      { blockId: "NET-01", startYear: 2026.5 },
      // Personnel program after insider event mid-2027
      { blockId: "PER-03", startYear: 2027 },
      { blockId: "PER-04", startYear: 2027 },
      { blockId: "PER-08", startYear: 2027 },
      // AI-specific very late — after distillation detected
      { blockId: "AI-04", startYear: 2028 },
      { blockId: "AI-06", startYear: 2028 },
      { blockId: "AI-01", startYear: 2028.5 },
      // Hardware even later
      { blockId: "HW-09", startYear: 2028.5 },
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
    // Budget covers the full program: the 29 deployments below sum to ~$778M
    // at optimistic upfront costs (a multi-hundred-million-dollar program is
    // the point of this story — see the README's framing).
    sliderOverrides: { budget_millions: 800, org_transformation: 0.7, vendor_cooperation: 0.6, risk_tolerance: 1.0 },
    deployments: [
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
      { blockId: "HW-01", startYear: 2025 },
      { blockId: "SC-06", startYear: 2026 },
      { blockId: "PER-05", startYear: 2026 },
      { blockId: "PHY-03", startYear: 2026 },
    ],
    annotations: [
      { atYear: 2025, message: "Hard-stop foundation in place — many chains already blocked" },
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
      // (optimistic costs; running total in comments)
      { blockId: "NET-04", startYear: 2024.5 },   // $2M   → $2M
      { blockId: "HW-09", startYear: 2024.5 },    // $5M   → $7M
      { blockId: "PER-02", startYear: 2025 },      // $2M   → $9M
      { blockId: "PHY-05", startYear: 2025 },      // $2M   → $11M
      { blockId: "NET-03", startYear: 2025 },      // $5M   → $16M
      { blockId: "PER-07", startYear: 2025.5 },    // $1M   → $17M
      { blockId: "AI-04", startYear: 2025.5 },     // $5M   → $22M
      { blockId: "PER-03", startYear: 2026 },      // $10M  → $32M
      { blockId: "AI-06", startYear: 2026 },       // $5M   → $37M
      { blockId: "NET-05", startYear: 2026 },      // $10M  → $47M
      { blockId: "PHY-06", startYear: 2026.5 },    // $20M  → $67M
      { blockId: "AI-01", startYear: 2026.5 },     // $20M  → $87M
      { blockId: "PER-08", startYear: 2027 },      // $5M   → $92M
      { blockId: "PER-04", startYear: 2027 },      // $5M   → $97M
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
