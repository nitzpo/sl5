// Content for the standalone introduction at /sl5/intro/.
//
// The intro deliberately fetches nothing: inlining the small slice of copy it
// needs (5 OC tiers, 5 SL levels, 6 blocks, one chain) keeps the page instant
// with no loading state, instead of pulling ~230 KB of public/data/*.json for a
// few dozen fields. `tests/intro/content.test.ts` reads the real JSON off disk
// and asserts every value below still matches, so the two can't drift silently.

/** OC tier — the defender's vocabulary for "how capable is the attacker".
 * Mirrors world-state.json `oc_definitions`. */
export interface OcTier {
  level: number;
  name: string;
  budgetMillions: number;
  teamSize: number;
  timeHorizonMonths: number;
  description: string;
  typicalActors: string[];
  keyCapabilities: string[];
}

export const OC_TIERS: OcTier[] = [
  {
    level: 1,
    name: "Hobbyist / Opportunistic",
    budgetMillions: 0.001,
    teamSize: 1,
    timeHorizonMonths: 0.25,
    description: "Single individual with limited expertise, spray-and-pray attacks",
    typicalActors: ["Hobbyist hackers", "Script kiddies"],
    keyCapabilities: ["Public exploits", "Common passwords", "Basic social engineering"],
  },
  {
    level: 2,
    name: "Professional Opportunistic",
    budgetMillions: 0.01,
    teamSize: 1,
    timeHorizonMonths: 1,
    description:
      "Single professional with broad security capabilities, personal infrastructure",
    typicalActors: ["Professional hackers", "Low-priority criminal groups"],
    keyCapabilities: ["Custom exploits", "Targeted phishing", "Personal cyber infrastructure"],
  },
  {
    level: 3,
    name: "Criminal Syndicates / Insider Threats",
    budgetMillions: 1,
    teamSize: 10,
    timeHorizonMonths: 6,
    description:
      "Well-resourced criminal groups, disgruntled employees, industrial espionage",
    typicalActors: [
      "Criminal syndicates",
      "Disgruntled employees",
      "Corporate espionage",
      "Terrorist organizations",
    ],
    keyCapabilities: [
      "Zero-day purchase",
      "Insider recruitment",
      "Major attack infrastructure",
      "Bribery",
    ],
  },
  {
    level: 4,
    name: "Leading Cyber-Capable Nation-States",
    budgetMillions: 10,
    teamSize: 100,
    timeHorizonMonths: 12,
    description:
      "Foreign intelligence agencies, state-sponsored groups executing 100+ operations annually",
    typicalActors: ["State cyber units", "Intelligence agencies"],
    keyCapabilities: [
      "Multiple zero-days",
      "Supply chain compromise",
      "Long-term agent placement",
      "Infrastructure interception",
      "Legal cover",
    ],
  },
  {
    level: 5,
    name: "Top-Priority State Operations",
    budgetMillions: 1000,
    teamSize: 1000,
    timeHorizonMonths: 60,
    description:
      "Highest-priority operations by world's most capable nations, years-ahead-of-public expertise",
    typicalActors: ["Top state-priority operations"],
    keyCapabilities: [
      "50+ zero-days simultaneously",
      "Hardware backdoor insertion",
      "Decades-developed infrastructure",
      "Agent networks",
      "Capabilities years ahead of public",
    ],
  },
];

/** Security Level — mirrors world-state.json `sl_definitions`. */
export interface SlLevel {
  level: number;
  name: string;
  defendsAgainst: string;
  requiredIndependentLayers: number;
  description: string;
  achievable: boolean;
}

export const SL_LEVELS: SlLevel[] = [
  {
    level: 1,
    name: "Basic Controls",
    defendsAgainst: "OC1 — Hobbyist/Opportunistic",
    requiredIndependentLayers: 1,
    description: "Sensitive data internal, basic access control, cloud provider defaults",
    achievable: true,
  },
  {
    level: 2,
    name: "Professional Best Practices",
    defendsAgainst: "OC2 — Professional Opportunistic",
    requiredIndependentLayers: 1,
    description:
      "Centralized weight storage, encrypted transit, FIDO keys, red-teaming, bug bounty",
    achievable: true,
  },
  {
    level: 3,
    name: "Aggressive Attack Surface Reduction",
    defendsAgainst: "OC3 — Criminal Syndicates / Insiders",
    requiredIndependentLayers: 2,
    description:
      "Copy-resistant interfaces, multiparty auth, insider threat program, advanced red-teaming",
    achievable: true,
  },
  {
    level: 4,
    name: "Nation-State Defense",
    defendsAgainst: "OC4 — Leading Cyber-Capable Nation-States",
    requiredIndependentLayers: 4,
    description:
      "Hardware-enforced controls, confidential computing, TEMPEST isolation, zero-day search capability",
    achievable: true,
  },
  {
    level: 5,
    name: "Top-Priority State Operations Defense",
    defendsAgainst: "OC5 — Top-Priority State Operations",
    requiredIndependentLayers: 8,
    description:
      "Complete isolation, formal hardware verification, supervised access, 8 independent layers",
    achievable: false,
  },
];

/** What the app's consequence copy says the theft buys the thief.
 * Mirrors world-state.json `stakes.exfiltration_consequences`. */
export const EXFILTRATION_CONSEQUENCES = [
  "Safety guardrails removed — unrestricted dangerous capabilities released",
  "Fine-tuning for offensive cyber, biological/chemical weapon design, mass manipulation",
  "Years of R&D ($1-10B+) captured instantly by adversary",
  "Military/intelligence applications: autonomous systems, strategic planning",
  "Recursive improvement: stolen model used to accelerate stealing next model",
] as const;

/** world-state.json `stakes.recursive_risk`. */
export const RECURSIVE_RISK =
  "If automated AI R&D is compromised, an adversary gains recursive self-improvement capability outside any safety framework — potentially the highest-stakes scenario in the threat model.";

/** The subset of blocks the demos render. `shortLabel` mirrors
 * BLOCK_SHORT_LABELS in utils/geometry.ts; the rest mirrors blocks-*.json. */
export interface DemoBlock {
  id: string;
  name: string;
  shortLabel: string;
  category: string;
  defenseType: "hard_stop" | "probabilistic" | "hybrid";
  /** adversary_exploitation.ai_oc_shift — how much AI capability lifts the
   * adversary against this control. Feeds the real `aiDegradation()`. */
  aiOcShift: number;
  /** dimensions.time_to_deploy_months — feeds the real
   * `computeDecisionWindows()` on the timeline slide. */
  deployMonths: { min: number; max: number };
  blurb: string;
}

export const DEMO_BLOCKS: Record<string, DemoBlock> = {
  "NET-01": {
    id: "NET-01",
    name: "Air-Gapped SL5 Network",
    shortLabel: "Air Gap",
    category: "network",
    defenseType: "hard_stop",
    aiOcShift: 0.5,
    deployMonths: { min: 12, max: 24 },
    blurb:
      "Zero external connections — no internet, no VPN, no cloud. A remote attacker has no route in, however capable they get.",
  },
  "PER-03": {
    id: "PER-03",
    name: "Continuous Behavioral Monitoring",
    shortLabel: "Behav",
    category: "personnel",
    defenseType: "probabilistic",
    aiOcShift: 1.0,
    deployMonths: { min: 9, max: 18 },
    blurb:
      "Watches for changed access patterns and new foreign contacts. It raises the odds of catching an insider — it never guarantees it.",
  },
  "NET-05": {
    id: "NET-05",
    name: "Cross-Domain Solutions / Data Diodes",
    shortLabel: "Diodes",
    category: "network",
    defenseType: "hybrid",
    aiOcShift: 1.0,
    deployMonths: { min: 9, max: 18 },
    blurb:
      "Hardware-enforced one-way flow: a physical hard stop on direction, wrapped in probabilistic inspection of what passes.",
  },
  "PER-04": {
    id: "PER-04",
    name: "Private SF-86 Equivalent Vetting",
    shortLabel: "Vetting",
    category: "personnel",
    defenseType: "probabilistic",
    aiOcShift: 1.0,
    deployMonths: { min: 12, max: 24 },
    blurb: "SF-86-grade background disclosure: foreign contacts, finances, history.",
  },
  "PER-05": {
    id: "PER-05",
    name: "Post-Employment Restrictions",
    shortLabel: "Post-Emp",
    category: "personnel",
    defenseType: "probabilistic",
    aiOcShift: 0.5,
    deployMonths: { min: 6, max: 12 },
    blurb: "Obligations that outlive the badge — and deter recruitment upfront.",
  },
  "HW-07": {
    id: "HW-07",
    name: "Confidential Computing / TEE",
    shortLabel: "TEE",
    category: "machine",
    defenseType: "hard_stop",
    aiOcShift: 1.0,
    deployMonths: { min: 24, max: 48 },
    blurb:
      "Weights stay encrypted in accelerator memory — unreadable even to an attacker who owns the host.",
  },
};

/** The chain slide walks The Long Game. Mirrors attack-chains.json `long-game`. */
export interface DemoChainStep {
  phase: string;
  description: string;
  /** The block whose absence lets this step succeed. Undefined = no defense
   * applies; the step uses legitimate access. */
  blockGapUsed?: string;
  /** stopper_details.how_it_stops for `blockGapUsed`. */
  howItStops?: string;
}

export const LONG_GAME = {
  id: "long-game",
  name: "The Long Game",
  typicalOc: 4,
  brief:
    "Multi-year recruitment of a trusted employee. Passes basic vetting, avoids behavioral detection, extracts weights before post-employment controls activate.",
  steps: [
    {
      phase: "Recruitment",
      description:
        "An agency develops a senior researcher through an academic front over 18 months; standard employment checks never surface the foreign ties.",
      blockGapUsed: "PER-04",
      howItStops:
        "SF-86-grade vetting surfaces foreign contacts and financial pressure before hiring or rescreening.",
    },
    {
      phase: "Access",
      description:
        "The researcher returns from sabbatical with weight access unchanged; escalating access patterns and new foreign contacts go unflagged.",
      blockGapUsed: "PER-03",
      howItStops:
        "Continuous behavioral monitoring flags changed access patterns and new foreign contacts.",
    },
    {
      phase: "Extraction",
      description:
        "Using legitimate access, they copy model checkpoints during normal workflow — nothing is hacked.",
    },
    {
      phase: "Delivery",
      description:
        "They resign and hand over the weights; no post-employment restrictions create any legal or technical barrier.",
      blockGapUsed: "PER-05",
      howItStops:
        "Post-employment restrictions make delivery legally and practically costly — and deter recruitment upfront.",
    },
  ] satisfies DemoChainStep[],
} as const;

/** Total blocks and chains in the shipped data — asserted by the drift test. */
export const CATALOG = { blocks: 47, categories: 6, chains: 7 } as const;

export interface SourceLink {
  title: string;
  href: string;
  year: string;
  gives: string;
}

export const SOURCES: SourceLink[] = [
  {
    title: "RAND — Securing AI Model Weights",
    href: "https://www.rand.org/pubs/research_reports/RRA2849-1.html",
    year: "2024",
    gives:
      "The framework this whole tool is built on: five Security Levels mapped to five attacker capability tiers, ~38 attack vectors across 9 domains, and the finding that SL5 is not achievable today without help from the national-security community.",
  },
  {
    title: "SL5 Standard for AI Security v0.1",
    href: "https://sl5.org/sl5-standard",
    year: "Jan 2026",
    gives:
      "A concrete architecture, written as a NIST SP 800-53 overlay: an air-gapped SL5 network with further-isolated weight enclaves, dual inline encryptors from different suppliers (the “Rule of Two”), ICD 705 SCIF construction, and five personnel sensitivity tiers.",
  },
  {
    title: "SL5 Novel Recommendations",
    href: "https://sl5.org/projects/sl5-novel-recommendations",
    year: "Nov 2025",
    gives:
      "25 recommendations across supply chain, network, machine, physical and personnel — including treating a frontier AI agent as its own class of insider threat, eliminating remote access entirely, and continuous adversarial injection.",
  },
  {
    title: "AI 2027",
    href: "https://ai-2027.com",
    year: "2025",
    gives:
      "The timeline argument: how the offense–defense balance shifts as capabilities climb. 78% of its workshop participants expect a state actor to steal US frontier weights before 2030.",
  },
];
