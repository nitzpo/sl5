export type Category =
  | "network"
  | "machine"
  | "physical"
  | "personnel"
  | "supply_chain"
  | "ai_specific";

export type DefenseType = "hard_stop" | "probabilistic" | "hybrid";

export type BlockState =
  | "not_started"
  | "investing"
  | "implementing"
  | "deployed"
  | "mature";

export interface Block {
  id: string;
  name: string;
  category: Category;
  summary_group: string;
  description: string;
  current_state: {
    summary: string;
    deployed_by: string[];
    baseline_state: string;
    /** Year this block became partially deployed in the real world, where that
     * can be pinned to a public disclosure. Before it, the block counts as
     * `not_started`. Absent means "long-standing practice, no useful date". */
    baseline_since?: number;
  };
  dimensions: {
    technical_feasibility: {
      value: number;
      notes: string;
      trajectory: string;
    };
    time_to_deploy_months: {
      min: number;
      max: number;
      notes: string;
    };
    cost: {
      upfront_millions: { min: number; max: number };
      annual_ongoing_millions: { min: number; max: number };
      notes: string;
    };
    vendor_dependency: {
      value: number;
      key_vendors: string[];
      notes: string;
    };
    supply_scarcity: {
      value: number;
      bottleneck: string;
      notes: string;
    };
    organizational_readiness: {
      value: number;
      barriers: string[];
      notes: string;
    };
  };
  defense_type: DefenseType;
  sl_requirement: {
    first_recommended: number;
    first_required: number;
  };
  adversary_exploitation: {
    oc_threshold_to_exploit: number;
    ai_oc_shift: number;
    exploit_narrative: string;
  };
  dependencies: {
    requires: string[];
    enhances: string[];
    enabled_by: string[];
    /** Controls without which this one is only partly real.
     *
     * Distinct from `requires`, which is a hard gate: a block whose `requires`
     * aren't operational is capped at implementing, because it cannot function at
     * all. `completed_by` is the softer and far more common case — the control
     * genuinely works on its own, but the version you get without its companions
     * is weaker than the version the standard describes. An air gap is the type
     * specimen: it stops remote exploitation the day it exists, but with no
     * controlled way to move data across it people carry drives, and with a live
     * BMC on the management VLAN there is still a route in.
     *
     * Soft because the honest answer is a fraction, not a gate. Absent all its
     * companions the block counts for `standalone_share` of its effectiveness, and
     * each operational companion closes an equal part of the remainder — see
     * `enablementFactor` in scoring.ts.
     *
     * Deliberately NOT derived from `enhances`/`enabled_by`. Those are a loose,
     * near-symmetric "helps out" relation (SC-01 enhances SC-02 and SC-02 enhances
     * SC-01), and 95 of their edges have no inverse recorded, so reading them as a
     * requirement would gate nearly every block on nearly every other. This field
     * is hand-authored per block with its reasoning in `why`. */
    completed_by?: {
      /** Block ids that must be deployed or mature for this control to count fully. */
      blocks: string[];
      /** Fraction of effectiveness the block keeps with none of them, in (0, 1). */
      standalone_share: number;
      /** Why this control is incomplete without them — shown to the reader. */
      why: string;
    };
  };
  defense_in_depth: {
    layer_contributions: string[];
    shared_dependencies: string[];
  };
  open_questions: Array<{
    question: string;
    uncertainty_level: string;
    impact_if_resolved_negatively: string;
  }>;
  real_world_parallels: Array<{
    description: string;
    source: string;
    year: number;
  }>;
  /** The attack vectors this block counters, with how strongly (see
   * `engine/vector-model.ts`). Every block counters at least one vector — a
   * block that counters nothing moves no number, so the data-integrity test
   * forbids it. */
  counters: CounterLink[];
  /** The control needs research before it can be built at the grade the SL5
   * benchmark asks for: low technical feasibility and long, uncertain lead
   * times. It is part of today's catalogue and counts like any block once
   * built; what makes SL5 unreachable today is that these cannot be deployed
   * yet. `research_note` says, in one line, what the research is. */
  research_required?: boolean;
  research_note?: string;
  /** An AI-augmented defense (detection, monitoring, review, patching): it wins
   * back a share of the attacker's AI uplift (`DEFENDER_AI_SHARE` in
   * vector-model.ts). `defender_ai_note` says how. */
  defender_ai?: boolean;
  defender_ai_note?: string;
  /** Present when Phase 2 changed the declared defense type, with why. */
  reclassified?: { from: DefenseType; why: string };
}

export type Stage = "entry" | "reach" | "exfil";
export const STAGES: readonly Stage[] = ["entry", "reach", "exfil"];

export type CounterStrength = "strong" | "partial";

/** One block → vector link: the block makes this attack vector harder. */
export interface CounterLink {
  vector_id: string;
  strength: CounterStrength;
  why: string;
  /** The block's declared type is wrong for this vector (a kill-switch is a
   * response, not a hard stop, against an escaping model). */
  type_override?: DefenseType;
  note?: string;
}

type Tiered<K extends string> = Record<K, number>;
export type OcTable = Tiered<"oc1" | "oc2" | "oc3" | "oc4" | "oc5">;
export type AcTable = Tiered<"ac1" | "ac2" | "ac3" | "ac4" | "ac5">;

/** One attack technique. RAND vectors carry Table 5.2's 1–5 feasibility per OC
 * tier; the lab's-own-model vectors (V-SELF) carry authored 1–5 scores per AI
 * capability band; structural stage placeholders (V-X) carry a probability. */
export interface AttackVector {
  id: string;
  category: string;
  category_name: string;
  name: string;
  source: "rand" | "authored" | "structural";
  rand_feasibility: OcTable | null;
  ai_feasibility?: AcTable;
  structural_p?: OcTable;
  stage: Stage;
  /** Stages a path using this vector does not need (seizure carries the
   * hardware out; extraction works through the API). */
  stages_skipped: Stage[];
  /** Residual vector: RAND scored it as if these defenses exist, and none of
   * them counters it. */
  assumes_defense?: string[];
  /** Why the residual assumes what it does, where that was revisited. */
  residual_note?: string;
  /** Nothing a lab can do alone stops this; `gov_cooperation` relieves it. */
  needs_government?: boolean;
  needs_government_note?: string;
  /** Attacker AI uplift: effective tier = OC + ai_shift × aiCapability.
   * Authored, RAND vectors only. */
  ai_shift?: number;
  ai_shift_basis?: string;
  rapidly_changing?: boolean;
  headline: boolean;
  /** Off the weights-theft headline: `integrity` (sabotage) or `capability`
   * (distillation) have their own meters. */
  lane?: "integrity" | "capability";
  description: string;
  assumption?: boolean;
  assumption_note?: string;
  ai_rationale?: string;
  stage_note?: string;
  transcription_note?: string;
  source_ref?: number | null;
  appendix_a_ref?: number;
  authored_basis?: string[];
}

/** A broad way in (remote, insider, physical, supply chain, served, the lab's
 * own model). An attack path takes one vector per stage. */
export interface Approach {
  id: string;
  name: string;
  adversary: "human" | "ai";
  /** In the campaign (human) or the AI-insider check (ai). Non-headline
   * approaches are meters. */
  headline: boolean;
  requires_external_serving?: boolean;
  meter?: "capability_leakage" | "integrity";
  stages: Record<Stage, string[]>;
  notes: string;
}

export interface ScenarioStep {
  phase: string;
  description: string;
  vector_ids: string[];
  /** The block whose absence lets this step succeed (it counters one of the
   * step's vectors). Absent: no defense applies to the step as told. */
  block_gap_used?: string;
}

/** A path told as a story — the old attack chains, now built on vectors. */
export interface Scenario {
  id: string;
  name: string;
  approach: string;
  /** The tier the story is told at. Narrative only: the engine scores the
   * scenario at whatever tier is asked. */
  adversary_profile: { min_oc: number; typical_oc: number };
  vectors: string[];
  narrative: { brief: string; detailed: string };
  steps: ScenarioStep[];
  stopper_details: Array<{ block_id: string; how_it_stops: string }>;
  fit_note: string;
  requires_external_serving?: boolean;
}

/** Everything the engine needs besides the blocks. */
export interface ThreatModel {
  vectors: AttackVector[];
  approaches: Approach[];
  scenarios: Scenario[];
}

/** Adversary operational-capability tier, loaded from world-state.json. */
export interface OcDefinition {
  level: number;
  name: string;
  budget_millions: number;
  team_size: number;
  time_horizon_months: number;
  description: string;
  typical_actors: string[];
  key_capabilities: string[];
}

export interface AiCapabilityCurve {
  default_curve: Array<{ year: number; capability: number }>;
  optimistic_multiplier: number;
  pessimistic_multiplier: number;
}

export interface DefenseLayer {
  id: string;
  name: string;
  description: string;
  independence_notes: string;
}

export interface SliderConfig {
  label: string;
  min_label?: string;
  max_label?: string;
  default_value?: number;
  min_millions?: number;
  max_millions?: number;
  default_millions?: number;
  effect: string;
  affects_blocks?: string[];
}

export interface WorldState {
  timeline: { start_year: number; end_year: number; reference_year: number };
  ai_capability_curve: AiCapabilityCurve;
  oc_definitions: Array<{
    level: number;
    name: string;
    budget_millions: number;
    team_size: number;
    time_horizon_months: number;
    description: string;
    typical_actors: string[];
    key_capabilities: string[];
  }>;
  sl_definitions: Array<{
    level: number;
    name: string;
    defends_against: string;
    /** RAND's independent-layer benchmark — one benchmark control among many
     * (Appendix B, "Other Organization Policies"), NOT what defines the level.
     * `defends_against` is that. Faithful to RAND at SL3/4/5 = 2/4/8; RAND states
     * no layer requirement at SL1 or SL2, so the 1 recorded there is filler.
     *
     * No engine code reads it — not scoring, not breach. The SL score comes from
     * category coverage (`scoring.ts`) and breach's depth discount counts each
     * block's `defense_in_depth.layer_contributions` (`breach.ts`), never this
     * number. It is mirrored into the introduction's `SL_LEVELS` and checked
     * against this file by `tests/intro/content.test.ts`, so the data contract is
     * real even though no calculation depends on it. It stays because the data
     * file and its schema record it; don't reintroduce it to reader-facing copy as
     * the definition of a level. */
    required_independent_layers: number;
    description: string;
    achievable: boolean;
  }>;
  defense_layers: DefenseLayer[];
  global_sliders: Record<string, SliderConfig>;
  stakes: {
    exfiltration_consequences: string[];
    sabotage_consequences: string[];
    recursive_risk: string;
  };
}

export interface Sliders {
  ai_timeline: number; // 0 (pessimistic) to 1 (optimistic)
  gov_cooperation: number;
  vendor_cooperation: number;
  budget_millions: number;
  org_transformation: number;
  risk_tolerance: number;
  /** τ, the bar a tier must stay under to "hold": OC-n is held when fewer than
   * τ of its campaigns succeed. Presets: strict 0.10, standard 0.20 (default),
   * lenient 0.33 — see `SL_BAR_PRESETS`. */
  sl_bar: number;
  /** The chance a misaligned model tries at all (0–1, default 0.5). Multiplies
   * the AI-insider approach and the integrity meter. */
  ai_propensity: number;
}
