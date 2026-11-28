// Copy for the standalone introduction.
//
// The first slides render with no requests: the small slice of reference data
// they need (five attacker tiers, five levels, a few block names) is inlined
// here. `tests/intro/content.test.ts` reads the shipped JSON off disk and
// asserts every value below still matches, so the two can't drift silently.
// Demos that run the engine fetch the real data instead (see data.ts).

/** Every term of art the introduction uses, defined once: shown inline by
 * `<Term>` and listed in full on the sources slide. */
export interface GlossaryEntry {
  label: string;
  definition: string;
}

export const GLOSSARY = {
  weights: {
    label: "Weights",
    definition:
      "The numbers a training run produces. The file is the model: load it and the capability runs, with nothing to rebuild.",
  },
  frontier: {
    label: "Frontier model",
    definition:
      "One of the handful of most capable AI models at a given moment, the ones whose weights are worth a state's attention.",
  },
  oc: {
    label: "OC — Operational Capability",
    definition:
      "RAND's five tiers of attacker, from OC1 (a lone hobbyist running public exploits) to OC5 (a top-priority state operation with a thousand people, a billion dollars and years of patience). It describes the attacker, never your defenses.",
  },
  sl: {
    label: "SL — Security Level",
    definition:
      "RAND's five levels of defense. Level n is meant to stop attacker tier n, so here you are at level 3 when tiers 1, 2 and 3 usually fail against you this year. Level 5 also requires holding your own model as an insider.",
  },
  attackVector: {
    label: "Attack vector",
    definition:
      "One technique an attacker can use, such as exploiting an unpatched server or bribing an employee. RAND lists 38, each rated for each attacker tier.",
  },
  stage: {
    label: "Stage",
    definition:
      "Where an attack vector acts: getting in, reaching the weights, or getting them out. Every theft has to get through all three.",
  },
  approach: {
    label: "Approach",
    definition:
      "A broad way of going about a theft: remote intrusion, a human insider, physical access, the supply chain, the served model, or the lab's own model.",
  },
  attackPath: {
    label: "Attack path",
    definition:
      "One attack vector per stage, chained together. Within each approach the instrument finds the attacker's easiest path, and it moves when you strengthen a stage.",
  },
  scenario: {
    label: "Scenario",
    definition:
      "A specific attack path told as a story, with a one-minute playback in the instrument. Scenarios illustrate; the security level is computed over every approach.",
  },
  bands: {
    label: "Usually fails · contested · usually succeeds",
    definition:
      "How the instrument reports an attacker's chances, on purpose without precise numbers. Below the bar a tier usually fails against you and counts as stopped; well above it, it usually succeeds; between the two it is contested.",
  },
  hardStop: {
    label: "Hard stop",
    definition:
      "A defense that removes a step rather than watching it: an air gap, a one-way data diode, hardware memory isolation. Not unbreakable, but it rests on physics, so a stronger attacker erodes it only a little.",
  },
  probabilistic: {
    label: "Probabilistic defense",
    definition:
      "A defense that lowers the odds instead of closing the step: monitoring, vetting, review. Its value depends on someone noticing, which is exactly what a stronger attacker is better at defeating.",
  },
  hybrid: {
    label: "Hybrid defense",
    definition:
      "Part hard stop, part probabilistic: a data diode enforces direction in hardware and inspects content in software. It erodes between the other two.",
  },
  airGap: {
    label: "Air gap",
    definition:
      "A network with no connection to any other. A remote attacker has nothing to reach through, so data has to be carried across by a person or a device. Stuxnet crossed one on a USB stick.",
  },
  zeroDay: {
    label: "Zero-day",
    definition:
      "A vulnerability the vendor doesn't know about, so no patch exists. Expensive to find or buy, and usually saved for a target worth it.",
  },
  insider: {
    label: "Insider",
    definition:
      "Someone with legitimate access who uses it for an attacker, whether recruited, coerced, or placed years earlier. Network defenses barely apply, because nothing is hacked.",
  },
  ownModel: {
    label: "Own model as insider",
    definition:
      "The lab's own AI model, running with credentials and tools on the lab's compute. If misaligned, it may try to reach its own weights and get them out. It starts already inside.",
  },
  futureCapabilities: {
    label: "Future capabilities",
    definition:
      "Five research-stage defenses that don't exist at scale yet, such as verified accelerator hardware and a government-cleared workforce. The instrument adds them only when you switch them on, and labels them as illustrative.",
  },
  tee: {
    label: "TEE — Trusted Execution Environment",
    definition:
      "Hardware that walls data off while it is computed on, so a compromised operating system can't read it, and proves that configuration with attestation. It stops software on the machine, not someone with physical access.",
  },
  scif: {
    label: "SCIF",
    definition:
      "A Sensitive Compartmented Information Facility: a room built to a published standard (ICD 705) so that nothing discussed or processed inside leaks out.",
  },
  nist: {
    label: "NIST SP 800-53",
    definition:
      "The US government's catalogue of security and privacy controls. Both the SL5 Standard and RAND's SL3 report are written as selections from it.",
  },
} satisfies Record<string, GlossaryEntry>;

/** OC tiers. Mirrors world-state.json `oc_definitions`. */
export interface OcTier {
  level: number;
  name: string;
  /** A plain, short name for tight labels. */
  short: string;
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
    short: "Hobbyist",
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
    short: "Professional",
    budgetMillions: 0.01,
    teamSize: 1,
    timeHorizonMonths: 1,
    description: "Single professional with broad security capabilities, personal infrastructure",
    typicalActors: ["Professional hackers", "Low-priority criminal groups"],
    keyCapabilities: ["Custom exploits", "Targeted phishing", "Personal cyber infrastructure"],
  },
  {
    level: 3,
    name: "Criminal Syndicates / Insider Threats",
    short: "Syndicate, insider",
    budgetMillions: 1,
    teamSize: 10,
    timeHorizonMonths: 6,
    description: "Well-resourced criminal groups, disgruntled employees, industrial espionage",
    typicalActors: [
      "Criminal syndicates",
      "Disgruntled employees",
      "Corporate espionage",
      "Terrorist organizations",
    ],
    keyCapabilities: ["Zero-day purchase", "Insider recruitment", "Major attack infrastructure", "Bribery"],
  },
  {
    level: 4,
    name: "Leading Cyber-Capable Nation-States",
    short: "Nation-state",
    budgetMillions: 10,
    teamSize: 100,
    timeHorizonMonths: 12,
    description: "Foreign intelligence agencies, state-sponsored groups executing 100+ operations annually",
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
    short: "Top state operation",
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

/** Security levels. Mirrors world-state.json `sl_definitions`. */
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
    description: "Centralized weight storage, encrypted transit, FIDO keys, red-teaming, bug bounty",
    achievable: true,
  },
  {
    level: 3,
    name: "Aggressive Attack Surface Reduction",
    defendsAgainst: "OC3 — Criminal Syndicates / Insiders",
    requiredIndependentLayers: 2,
    description: "Copy-resistant interfaces, multiparty auth, insider threat program, advanced red-teaming",
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
    description: "Complete isolation, formal hardware verification, supervised access",
    achievable: false,
  },
];

/** world-state.json `stakes.exfiltration_consequences`. */
export const EXFILTRATION_CONSEQUENCES = [
  "Safety guardrails removed — unrestricted dangerous capabilities released",
  "Fine-tuning for offensive cyber, biological/chemical weapon design, mass manipulation",
  "Years of R&D ($1-10B+) captured instantly by adversary",
  "Military/intelligence applications: autonomous systems, strategic planning",
  "Recursive improvement: stolen model used to accelerate stealing next model",
] as const;

/** What building a frontier model costs, read off the "Years of R&D
 * ($1-10B+)" consequence above. Drawn as a range on slide 1. */
export const BUILD_COST_MILLIONS = { min: 1000, max: 10000 } as const;

/** world-state.json `stakes.recursive_risk`. */
export const RECURSIVE_RISK =
  "If automated AI R&D is compromised, an adversary gains recursive self-improvement capability outside any safety framework — potentially the highest-stakes scenario in the threat model.";

/** How much AI lifts an attacker, by kind of attack vector: vectors.json's
 * authored `ai_shift` on RAND's 38 vectors, grouped. `count` is how many
 * vectors carry each value (asserted against the data). */
export const AI_SHIFT_GROUPS = [
  { shift: 1, label: "Code, credentials and the ML stack", count: 13 },
  { shift: 0.75, label: "Cracking, exposed keys, stray copies", count: 3 },
  { shift: 0.5, label: "Access systems, side channels, hardware supply", count: 7 },
  { shift: 0.25, label: "People and places", count: 13 },
  { shift: 0, label: "Military force; access the lab itself approves", count: 2 },
] as const;

/** The catalogue as shipped (today's blocks; future blocks counted apart). */
export const CATALOG = {
  blocks: 56,
  categories: 6,
  future: 5,
  randVectors: 38,
  ownModelVectors: 8,
  structuralVectors: 4,
  scenarios: 7,
} as const;

/** Blocks the catalogue slide draws, one of each type. Mirrors blocks-*.json. */
export interface DemoBlock {
  id: string;
  name: string;
  short: string;
  defenseType: "hard_stop" | "probabilistic" | "hybrid";
  deployMonths: { min: number; max: number };
}

export const DEMO_BLOCKS: Record<string, DemoBlock> = {
  "NET-01": {
    id: "NET-01",
    name: "Air-Gapped SL5 Network",
    short: "Air gap",
    defenseType: "hard_stop",
    deployMonths: { min: 12, max: 24 },
  },
  "PER-03": {
    id: "PER-03",
    name: "Continuous Behavioral Monitoring",
    short: "Behavior monitoring",
    defenseType: "probabilistic",
    deployMonths: { min: 9, max: 18 },
  },
  "NET-05": {
    id: "NET-05",
    name: "Cross-Domain Solutions / Data Diodes",
    short: "Data diodes",
    defenseType: "hybrid",
    deployMonths: { min: 9, max: 18 },
  },
  "HW-04": {
    id: "HW-04",
    name: "Tamper Protection (Chip-Level)",
    short: "Chip tamper protection",
    defenseType: "hard_stop",
    deployMonths: { min: 48, max: 72 },
  },
};

/** The own model's steps, by stage (vectors.json V-SELF-*, on the own-model
 * approach; sabotage is a separate meter and not listed). */
export const OWN_MODEL_STEPS = {
  reach: [
    "Abuse of its own credentials or tooling",
    "Sandbox escape via permitted egress",
    "Unsanctioned workloads on lab compute",
    "Manipulating its operators",
  ],
  exfil: [
    "Self-exfiltration of its weights via permitted channels",
    "Self-distilled data out via permitted channels",
    "Covert and side channels",
  ],
} as const;

/** The long-lead defenses the time slide races against the threat front,
 * longest first, plus the air gap for contrast. Lead times come from the
 * fetched data. */
export const RACE_BLOCKS = ["HW-04", "HW-06", "PHY-01", "HW-01", "HW-07", "NET-01"] as const;

/** What each source supplies to the instrument, for the sources figure. */
export const SUPPLIES = [
  { key: "tiers", label: "Attacker tiers" },
  { key: "vectors", label: "Attack vectors" },
  { key: "levels", label: "Security levels" },
  { key: "defenses", label: "Defenses" },
  { key: "pace", label: "AI pace" },
] as const;

export type SupplyKey = (typeof SUPPLIES)[number]["key"];

export interface SourceLink {
  title: string;
  short: string;
  href: string;
  year: string;
  gives: string;
  /** Primary source for these; informs the rest it lists. */
  primary: SupplyKey[];
  informs: SupplyKey[];
}

export const SOURCES: SourceLink[] = [
  {
    title: "RAND — Securing AI Model Weights (RRA2849-1)",
    short: "RAND 2024",
    href: "https://www.rand.org/pubs/research_reports/RRA2849-1.html",
    year: "2024",
    gives:
      "The framework: five attacker tiers, five security levels, 38 attack vectors rated for each tier, and the finding that SL5 is not currently possible.",
    primary: ["tiers", "vectors", "levels"],
    informs: ["defenses"],
  },
  {
    title: "SL5 Standard for AI Security v0.1",
    short: "SL5 Standard",
    href: "https://sl5.org/sl5-standard",
    year: "Jan 2026",
    gives:
      "A concrete SL5 architecture as a NIST SP 800-53 overlay: an air-gapped network with isolated weight enclaves, dual inline encryptors, SCIF construction, personnel tiers.",
    primary: ["defenses"],
    informs: ["levels"],
  },
  {
    title: "SL5 Novel Recommendations",
    short: "Novel Recommendations",
    href: "https://sl5.org/projects/sl5-novel-recommendations",
    year: "Nov 2025",
    gives:
      "25 recommendations across supply chain, network, machine, physical and personnel, including treating a frontier AI agent as its own class of insider.",
    primary: ["defenses"],
    informs: ["vectors"],
  },
  {
    title: "RAND — Achieving AI Model Weight Security Level 3 (RRA4704-1)",
    short: "RAND SL3",
    href: "https://www.rand.org/pubs/research_reports/RRA4704-1.html",
    year: "Aug 2026",
    gives:
      "SL3 made concrete: 262 controls adapted from NIST SP 800-53, aimed at criminal groups and insiders, designed to roll out over six to twelve months.",
    primary: [],
    informs: ["levels", "defenses"],
  },
  {
    title: "AI 2027",
    short: "AI 2027",
    href: "https://ai-2027.com",
    year: "2025",
    gives:
      "The timeline argument: how the balance between attack and defense shifts as AI capability climbs, and why weight security becomes urgent before 2030.",
    primary: ["pace"],
    informs: ["tiers"],
  },
];
