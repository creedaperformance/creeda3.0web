export { allExerciseLibraryItems, findExerciseBySlug } from '@/lib/product/exercises/catalog'
export { buildExecutionSession, resolveSubstitutionName } from '@/lib/product/session-builder'
export { hydrateExecutionSessionExerciseMedia } from '@/lib/product/session-media'
export { queryExercises, recommendExercises } from '@/lib/product/recommendation-engine'
export { buildSkillIntelligenceSnapshot } from '@/lib/product/skill-intelligence'
export {
  INTEGRATION_CONNECTORS,
  createMockHealthSamples,
  getConnector,
} from '@/lib/product/operating-system/integrations'
export {
  buildDailyReadinessOperatingScore,
} from '@/lib/product/operating-system/readiness'
export {
  buildGoalEventPlan,
} from '@/lib/product/operating-system/goals'
export {
  buildRetentionSnapshot,
} from '@/lib/product/operating-system/retention'
export type {
  ExecutionMode,
  ExecutionSession,
  ExecutionSessionBlock,
  CoachSessionFeedback,
  ExerciseCategory,
  ExerciseCompletionStatus,
  ExerciseLibraryItem,
  ExerciseRecommendation,
  ExerciseRecommendationContext,
  ExerciseRecommendationContext as ProductRecommendationContext,
  SessionBlockType,
  SessionCompletionLog,
  SessionExerciseCompletionLog,
  TrainingCalendarPlanEntry,
  TrainingSessionStatus,
} from '@/lib/product/types'
export type {
  SkillIntelligenceGap,
  SkillIntelligenceSnapshot,
} from '@/lib/product/skill-intelligence'
export type {
  CoachOperatingSnapshot,
  DailyAction,
  DailyOperatingSnapshot,
  DailyReadinessOperatingScore,
  DataProvenanceType,
  GoalEventPlan,
  HealthProvider,
  HealthSourceConnection,
  IntegrationConnectorDefinition,
  NormalizedHealthSample,
  RetentionSnapshot,
} from '@/lib/product/operating-system/types'
