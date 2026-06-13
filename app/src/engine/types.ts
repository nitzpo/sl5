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
