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

export type Perspective = "ciso" | "attacker" | "policymaker" | "observer";

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

export interface AttackChainStep {
  phase: string;
  description: string;
  block_gap_used?: string;
}

export interface AttackChain {
  id: string;
  name: string;
  adversary_profile: {
    min_oc: number;
    typical_oc: number;
  };
  blocks_exploited: string[];
  narrative: {
    brief: string;
    detailed: string;
    steps?: AttackChainStep[];
  };
  stoppers: string[];
  stopper_details?: Array<{ block_id: string; how_it_stops: string }>;
  // API-extraction chains are inert unless the model is served externally.
  requires_external_serving?: boolean;
  probability_model: {
    // Authored prior, kept for documentation; NOT used by the breach model
    // (redundant with adversary_profile.min_oc and would cap chains).
    base_probability: number;
  };
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

export interface SimulationConfig {
  scoring: {
    method: "weakest_link" | "weighted_harmonic" | "hybrid";
    hybrid_weights: {
      weakest_link_weight: number;
      harmonic_mean_weight: number;
    };
    category_weights: Record<Category, number>;
    baseline_floor: number;
  };
  breach_probability: {
    model: "chain_max" | "chain_aggregate";
    sigmoid_steepness: number;
    hard_stop_bypass_when_deployed: number;
    probabilistic_bypass_when_deployed: number;
    implementing_bypass: number;
    defense_in_depth_discount: {
      per_additional_layer_factor: number;
      correlation_penalty: number;
    };
  };
  block_maturation: {
    states: BlockState[];
    partial_effectiveness: Record<BlockState, number>;
    deployed_to_mature_months: number;
  };
  distillation_model: {
    base_extraction_rate_per_month: number;
    ai_efficiency_multiplier_at_full: number;
    defense_effectiveness: {
      rate_limiting_reduction: number;
      output_perturbation_reduction: number;
      pattern_detection_reduction: number;
      restricted_output_format_reduction: number;
    };
    compromise_threshold: number;
  };
}

export interface Sliders {
  ai_timeline: number; // 0 (pessimistic) to 1 (optimistic)
  gov_cooperation: number;
  vendor_cooperation: number;
  budget_millions: number;
  org_transformation: number;
  risk_tolerance: number;
}

export interface SimulationState {
  blocks: Block[];
  blockStates: Record<string, BlockState>;
  year: number;
  perspective: Perspective;
  adversaryOc: number;
  sliders: Sliders;
  modelServedExternally: boolean;
}

export interface SimulationResults {
  categoryScores: Record<Category, number>;
  overallSl: number;
  breachProbabilities: Record<string, number>;
  bestChain: { id: string; probability: number } | null;
  extractionProgress: number;
  defenseLayerStatus: Record<string, { active: boolean; strength: number }>;
}
