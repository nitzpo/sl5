import type { BlockState, Category, DefenseType, Stage } from "../engine/types";

/**
 * Plain names for the reader. The data's `name` fields are the standards'
 * names ("ICD 705 SCIF-Grade Construction"); the catalogue leads with what a
 * defender would call the thing, and keeps the code and the full name
 * secondary. A "|" marks where a two-line label (the clusters' hexagons)
 * breaks; elsewhere it reads as a space.
 *
 * `tests/ui/names.test.ts` checks every block and vector in the data has one,
 * so a new block cannot ship with a blank tile.
 */
export const BLOCK_NAMES: Readonly<Record<string, string>> = {
  "NET-01": "Air|gap",
  "NET-02": "Weight|enclave",
  "NET-03": "Dual|encryptors",
  "NET-04": "Bandwidth|cap",
  "NET-05": "Data|diodes",
  "NET-06": "Protected|cabling",
  "NET-07": "Encrypted|site links",
  "IAM-01": "Phishing-proof|identity",
  "DET-01": "Security ops|& response",
  "DEC-01": "Deception|& decoys",
  "END-01": "Patching &|endpoints",
  "CFG-01": "Config|integrity",
  "HW-01": "Root of|trust",
  "HW-02": "Memory|isolation",
  "HW-03": "Interconnect|encryption",
  "HW-04": "Chip tamper|protection",
  "HW-05": "Tamper-evident|racks",
  "HW-06": "Execution|integrity",
  "HW-07": "Trusted|execution",
  "HW-09": "Verified|boot",
  "KEY-01": "Weight|encryption",
  "CUS-01": "Weight|custody",
  "ACA-01": "Verified|access control",
  "SRV-01": "Hardened|weight API",
  "PHY-01": "SCIF|construction",
  "PHY-02": "TEMPEST|shielding",
  "PHY-03": "Mantraps",
  "PHY-04": "Intrusion|detection",
  "PHY-06": "Red/black|zones",
  "PHY-07": "Hardware|inspection",
  "PHY-08": "No devices|or ports",
  "PER-01": "Sensitivity|levels",
  "PER-02": "Two-person|rule",
  "PER-03": "Behavior|monitoring",
  "PER-04": "SF-86|vetting",
  "PER-06": "Dual|authorization",
  "PER-08": "No remote|access",
  "PER-09": "Duress|protection",
  "GOV-01": "Governance|vetting",
  "SC-01": "Supplier|diversity",
  "SC-03": "Training-data|screening",
  "SC-04": "Sub-tier|flow-down",
  "SC-07": "Custom|components",
  "SC-08": "Hardware|provenance",
  "SW-01": "ML software|supply chain",
  "AI-01": "AI-insider|controls",
  "AI-02": "Decorrelated|review",
  "AI-04": "Agent|quotas",
  "AI-05": "Containment|drills",
  "AI-06": "Kill|switch",
  "AI-07": "Outbound|API defense",
  "AI-08": "Inbound|API defense",
  "AI-09": "Confined|sandboxes",
  "AI-10": "AI-control|protocols",
  "AI-11": "No self|weight access",
  "AI-12": "Training|attestation",
  "FUT-01": "Verified|accelerators",
  "FUT-02": "Cleared|workforce",
  "FUT-03": "Verified|weight stack",
  "FUT-04": "Sovereign|facility",
  "FUT-05": "Trustworthy|AI monitors",
};

/** The block's plain name on one line. Falls back to the data's name. */
export function blockName(id: string, fallback?: string): string {
  const n = BLOCK_NAMES[id];
  return n ? n.replace("|", " ") : fallback ?? id;
}

/** The plain name as one or two lines (hexagon labels). */
export function blockLines(id: string, fallback?: string): string[] {
  const n = BLOCK_NAMES[id];
  return n ? n.split("|") : [fallback ?? id];
}

/** Attack vectors, in the defender's words. RAND's own phrasing is the
 * vector's `name`, shown in the block drawer's hover. */
export const VECTOR_NAMES: Readonly<Record<string, string>> = {
  "V-CODE-1": "Unpatched software",
  "V-CODE-2": "Known, unfixed flaws",
  "V-CODE-3": "A zero-day",
  "V-CODE-4": "Zero-days at scale",
  "V-CRED-1": "Social engineering",
  "V-CRED-2": "Password cracking",
  "V-CRED-3": "Exposed credentials",
  "V-CRED-4": "Privilege escalation",
  "V-ACS-1": "Access-control crypto flaws",
  "V-ACS-2": "Backdoored access control",
  "V-ACS-3": "Access-control code flaws",
  "V-ACS-4": "Stolen key material",
  "V-BYP-1": "Misconfiguration",
  "V-BYP-2": "A less-guarded copy",
  "V-BYP-3": "A weaker login path",
  "V-ML-1": "ML-stack flaws",
  "V-ML-2": "Poisoned ML supply chain",
  "V-ML-3": "Prompt-triggered code execution",
  "V-ML-4": "Model extraction",
  "V-ML-5": "Distillation through the API",
  "V-NET-1": "Bridging the air gap",
  "V-NET-2": "Side channels",
  "V-NET-3": "Wiretaps",
  "V-PHYS-1": "Hands on the systems",
  "V-PHYS-2": "Planted devices",
  "V-PHYS-3": "Devices in other locations",
  "V-PHYS-4": "Beating physical access control",
  "V-PHYS-5": "Breaking hardware security",
  "V-PHYS-6": "Armed break-in",
  "V-PHYS-7": "Military takeover",
  "V-SUP-1": "Compromised equipment",
  "V-SUP-2": "Compromised code",
  "V-SUP-3": "Vendors with access",
  "V-HUM-1": "A bribed insider",
  "V-HUM-2": "Extortion",
  "V-HUM-3": "A planted hire",
  "V-HUM-4": "Leverage over the organisation",
  "V-HUM-5": "Access the organisation approves",
  "V-SELF-1": "Copying its own weights out",
  "V-SELF-2": "Abusing its own access",
  "V-SELF-3": "Escaping its sandbox",
  "V-SELF-4": "Covert channels",
  "V-SELF-5": "Subverting oversight",
  "V-SELF-6": "Hidden workloads",
  "V-SELF-7": "Manipulating its operators",
  "V-SELF-8": "Distilling itself out",
  "V-X-1": "Standing access to the weights",
  "V-X-2": "Reading weights off hardware",
  "V-X-3": "Bulk network egress",
  "V-X-4": "Carrying media out",
};

export function vectorName(id: string, fallback?: string): string {
  return VECTOR_NAMES[id] ?? fallback ?? id;
}

/** Approaches (broad ways in). Never "route". */
export const APPROACH_NAMES: Readonly<Record<string, string>> = {
  remote: "Remote intrusion",
  insider: "Insider",
  physical: "Physical",
  supply_chain: "Supply chain",
  served: "Served model",
  ai_insider: "Own model (AI insider)",
  capability_copy: "Distillation",
  integrity: "Sabotage",
};

export function approachName(id: string | null | undefined, fallback?: string): string {
  if (!id) return fallback ?? "—";
  return APPROACH_NAMES[id] ?? fallback ?? id;
}

/** Short tier names for the ladder; the full definitions live in world-state. */
export const OC_NAMES: Readonly<Record<number, string>> = {
  1: "Hobbyist",
  2: "Professional",
  3: "Syndicate, insider",
  4: "Nation-state",
  5: "Top state priority",
};

export const OC_LONG: Readonly<Record<number, string>> = {
  1: "Hobbyists and opportunists",
  2: "Professional opportunists",
  3: "Criminal syndicates and insiders",
  4: "Leading cyber nation-states",
  5: "Top-priority state operations",
};

export const STAGE_LABELS: Readonly<Record<Stage, string>> = {
  entry: "Get in",
  reach: "Reach the weights",
  exfil: "Get them out",
};

export const STAGE_SHORT: Readonly<Record<Stage, string>> = {
  entry: "Get in",
  reach: "Reach",
  exfil: "Get out",
};

export const CATEGORY_NAMES: Readonly<Record<Category, string>> = {
  network: "Network",
  machine: "Machine",
  physical: "Physical",
  personnel: "Personnel",
  supply_chain: "Supply chain",
  ai_specific: "AI-specific",
};

export const CATEGORY_ORDER: readonly Category[] = [
  "network",
  "personnel",
  "machine",
  "physical",
  "supply_chain",
  "ai_specific",
];

export const STATES: readonly BlockState[] = ["not_started", "investing", "implementing", "deployed", "mature"];

export const STATE_WORDS: Readonly<Record<BlockState, string>> = {
  not_started: "Not started",
  investing: "Investing",
  implementing: "Implementing",
  deployed: "Deployed",
  mature: "Mature",
};

export const TYPE_WORDS: Readonly<Record<DefenseType, string>> = {
  hard_stop: "Hard stop",
  probabilistic: "Probabilistic",
  hybrid: "Hybrid",
};

export const TYPE_NOTES: Readonly<Record<DefenseType, string>> = {
  hard_stop: "holds as AI rises",
  probabilistic: "erodes against stronger attackers",
  hybrid: "part hard, part porous",
};

export function isOperational(state: BlockState | undefined): boolean {
  return state === "deployed" || state === "mature";
}
