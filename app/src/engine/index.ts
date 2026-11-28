export { getAiCapability } from "./ai-curve";
export {
  blockEffectiveness,
  categoryScore,
  overallSlScore,
  computeCategoryScores,
  counterRelevance,
  getStateEffectiveness,
  aiDegradation,
  enablementFactor,
  SUPPORTING_WEIGHT,
} from "./scoring";
export type { RelevanceWeights } from "./scoring";
export { counterRetention } from "./breach";
export {
  SCORE_TO_P,
  STRONG_MULTIPLIER,
  LADDER,
  DETECTION_BLOCKS,
  DETECTION_AI_EROSION,
  RESIDUAL_FLOOR_SHARE,
  GOVERNMENT_RELIEF,
  DESIGN_TIER_RELIEF,
  DEFENDER_AI_SHARE,
  acBand,
  erosionTier,
  baseFeasibility,
  campaignSuccess,
  effectiveTier,
  stackCounters,
} from "./vector-model";
export type { ModelOptions } from "./vector-model";
export {
  SL_BAR_PRESETS,
  DEFAULT_SL_BAR,
  DEFAULT_AI_PROPENSITY,
  bandWord,
  icd203Word,
  progressToward,
  securityLevel,
} from "./threat-sl";
export type { BandWord, Icd203Word } from "./threat-sl";
export { applyBudgetConstraint, blockCostBasis } from "./budget";
export { applyDependencyConstraint } from "./dependencies";
export {
  scorePosture,
  effectivePosture,
  orderAfterActivating,
  threatRelevance,
  targetSl,
} from "./posture";
export type { PostureInput, PostureScore, TierResult, ApproachResult, SlResult, BlockRelevance } from "./posture";
export { LEGACY_BLOCK_IDS, migrateBlockStates, migrateBlockOrder } from "./catalogue";
export {
  distillationProgress,
  distillationDefenseReduction,
  monthlyExtractionRate,
  isModelCompromised,
} from "./distillation";
export { blockStateAtYear, nextBlockState, stateIndex } from "./maturation";
export type * from "./types";
