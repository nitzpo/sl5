// Content for the standalone introduction at /sl5/intro/.
//
// The intro deliberately fetches nothing: inlining the small slice of copy it
// needs (5 OC tiers, 5 SL levels, 6 blocks, one chain) keeps the page instant
// with no loading state, instead of pulling ~230 KB of public/data/*.json for a
// few dozen fields. `tests/intro/content.test.ts` reads the real JSON off disk
// and asserts every value below still matches, so the two can't drift silently.

/** Every abbreviation and term-of-art the introduction uses, defined once.
 *
 * Two consumers: the inline `<Term>` affordance, which pops one of these open
 * where the word first appears, and the glossary list on the sources slide,
 * which shows all of them. Plain strings, not JSX, so both can render them and
 * a test can lint them. Keys are checked by `keyof typeof GLOSSARY`, so a
 * `<Term>` pointing at an entry that doesn't exist fails `tsc`, not a reader. */
export interface GlossaryEntry {
  /** How the term is written when it's the subject, e.g. "OC — Operational Capability". */
  label: string;
  definition: string;
}

export const GLOSSARY = {
  weights: {
    label: "Weights",
    definition:
      "The numbers a training run produces. The file is the model — load it and the capability runs, with no retraining and no reconstruction step.",
  },
  frontier: {
    label: "Frontier model",
    definition:
      "One of the handful of most capable AI models in existence at a given moment — the ones whose weights are worth a nation-state's attention.",
  },
  oc: {
    label: "OC — Operational Capability",
    definition:
      "A five-tier scale for how capable an attacker is, measured in what they can spend: money, people and patience. OC1 is a lone hobbyist running public exploits; OC5 is a thousand people, a billion dollars and five years.",
  },
  sl: {
    label: "SL — Security Level",
    definition:
      "A five-tier scale for how much attack a defensive posture can survive. Each level is defined by the attacker tier it is meant to stop, and by the controls that takes — the upper tiers aren't more of the same, they bring in measures the lower tiers never ask for. SL5 is simply the level built to stop the top attacker tier.",
  },
  hardStop: {
    label: "Hard stop",
    definition:
      "A control that removes a route rather than watching it — an air gap, a one-way data diode, encrypted memory. Not unbreakable: an air gap is still crossed by a person carrying a drive. But it rests on physics rather than on someone noticing, so rising AI capability erodes it slowly instead of gutting it.",
  },
  probabilistic: {
    label: "Probabilistic control",
    definition:
      "A control that lowers the odds instead of closing the door: monitoring, vetting, human review. Its value depends on someone noticing — which is exactly what a more capable adversary is better at defeating.",
  },
  airGap: {
    label: "Air gap",
    definition:
      "A network with no physical connection to any other network. There is nothing for a remote attacker to route through — so getting data out requires a person or a device to carry it, which is a real route rather than no route. Stuxnet crossed one on a USB stick.",
  },
  zeroDay: {
    label: "Zero-day",
    definition:
      "A vulnerability the vendor doesn't know about, so no patch exists. Expensive to find or buy, and normally hoarded until it's worth spending.",
  },
  exfiltration: {
    label: "Exfiltration",
    definition:
      "Moving data out of a network it was supposed to stay inside — over a link, on a laptop, or in the pocket of someone who was allowed to be there.",
  },
  insider: {
    label: "Insider threat",
    definition:
      "Someone with legitimate access who uses it against you, whether recruited, coerced, or simply leaving. Network security barely applies, because nothing is hacked.",
  },
  attackChain: {
    label: "Attack chain",
    definition:
      "One complete route to the weights, written as ordered steps. Each step names the defensive block whose absence lets it succeed, so blocking any single step ends the whole chain.",
  },
  breachProbability: {
    label: "Breach probability",
    definition:
      "The app's headline risk number: the chance that at least one modelled attack chain succeeds in the current year, given the posture you've built.",
  },
  residualRisk: {
    label: "Residual risk",
    definition:
      "What's left after every control you can afford — the insider never caught, the zero-day nobody found. It's why no live chain in the app ever reaches zero.",
  },
  defenseInDepth: {
    label: "Defense in depth",
    definition:
      "Stacking layers that fail independently, so beating one gets the attacker no closer to beating the next. In this app it discounts breach probability — each extra layer standing between an attacker and the weights makes a chain less likely to run end to end.",
  },
  ciso: {
    label: "CISO",
    definition:
      "Chief Information Security Officer — the executive accountable for an organization's security. The role the app puts you in.",
  },
  redTeam: {
    label: "Red-teaming",
    definition:
      "Paying skilled attackers to break your own defenses, so you find the gap before someone hostile does.",
  },
  tee: {
    label: "TEE — Trusted Execution Environment",
    definition:
      "Hardware that keeps data encrypted even while it is being computed on, so an attacker who fully owns the machine still can't read it. Also called confidential computing.",
  },
  sf86: {
    label: "SF-86",
    definition:
      "The US government's security-clearance questionnaire: foreign contacts, finances, travel, personal history. “SF-86-equivalent vetting” means a private lab running the same depth of check.",
  },
  scif: {
    label: "SCIF",
    definition:
      "A Sensitive Compartmented Information Facility — a room built to a published standard (ICD 705) so that nothing discussed or processed inside it leaks out.",
  },
  tempest: {
    label: "TEMPEST",
    definition:
      "Standards for stopping equipment from leaking the data it handles through stray electromagnetic emissions: shielding, filtering, and physical separation.",
  },
  erosion: {
    label: "AI erosion",
    definition:
      "The share of a probabilistic control that a more capable adversary has effectively taken back. In the app it's the red wash creeping down a hexagon as you move the year forward.",
  },
  block: {
    label: "Block",
    definition:
      "One defensive building block — a single control you can invest in, drawn as a hexagon. The app ships 47 of them across 6 categories.",
  },
  decisionWindow: {
    label: "Decision window",
    definition:
      "The last year you can start building a control and still have it operational by the target date. Once it closes, the option is gone however much budget appears later.",
  },
} satisfies Record<string, GlossaryEntry>;

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
      "Complete isolation, formal hardware verification, supervised access",
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
      "The framework this whole tool is built on: five Security Levels mapped to five attacker capability tiers, ~38 attack vectors across 9 domains, and the assessment that SL5 is likely not achievable today without help from the national-security community.",
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
