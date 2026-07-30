export { getAiCapability } from "./ai-curve";
export {
  blockEffectiveness,
  categoryScore,
  overallSlScore,
  computeCategoryScores,
  relevantBlockIds,
  getStateEffectiveness,
  aiDegradation,
  enablementFactor,
} from "./scoring";
export type { RelevanceWeights } from "./scoring";
export {
  sigmoidProbability,
  blockExploitProbability,
  defenseInDepthDiscount,
  chainBreachProbability,
  computeBreachProbabilities,
} from "./breach";
export { supportingBlocks, SUPPORTING_WEIGHT } from "./supporting";
export { applyBudgetConstraint, blockCostBasis } from "./budget";
export { applyDependencyConstraint } from "./dependencies";
export {
  distillationProgress,
  distillationDefenseReduction,
  monthlyExtractionRate,
  isModelCompromised,
} from "./distillation";
export { blockStateAtYear, nextBlockState, stateIndex } from "./maturation";
export type * from "./types";
