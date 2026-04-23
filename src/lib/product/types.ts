import { z } from 'zod'

const mediaUrlSchema = z.string().refine((value) => {
  if (!value) return false
  if (value.startsWith('/')) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}, 'Invalid media URL')

export const EXERCISE_CATEGORIES = [
  'strength',
  'mobility',
  'conditioning',
  'recovery',
  'rehab',
  'warmup',
  'cooldown',
] as const

export const SESSION_BLOCK_TYPES = [
  'warmup',
  'main',
  'accessory',
  'conditioning',
  'cooldown',
  'recovery',
  'rehab',
] as const

export const READINESS_BANDS = ['low', 'moderate', 'high'] as const
export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export const FITNESS_LEVELS = ['deconditioned', 'recreational', 'trained', 'competitive'] as const
export const PAIN_OR_FATIGUE_LEVELS = ['low', 'moderate', 'high'] as const
export const PARTICIPATION_PROFILES = ['beginner', 'returning', 'competitive'] as const
export const ENVIRONMENTS = ['gym', 'home', 'field', 'court', 'track', 'pool'] as const
export const SUPPORTED_SPORTS = ['cricket', 'football', 'badminton', 'athletics', 'general_fitness'] as const
export const EXERCISE_MODES = ['train_hard', 'train_light', 'recovery', 'rehab'] as const

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number]
export type SessionBlockType = (typeof SESSION_BLOCK_TYPES)[number]
export type ReadinessBand = (typeof READINESS_BANDS)[number]
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]
export type CurrentFitnessLevel = (typeof FITNESS_LEVELS)[number]
export type PainOrFatigueLevel = (typeof PAIN_OR_FATIGUE_LEVELS)[number]
export type ParticipationProfile = (typeof PARTICIPATION_PROFILES)[number]
export type Environment = (typeof ENVIRONMENTS)[number]
export type SupportedSport = (typeof SUPPORTED_SPORTS)[number]
export type ExecutionMode = (typeof EXERCISE_MODES)[number]

export interface ExerciseMedia {
  imageUrls: string[]
  videoUrl: string
  slowMotionUrl?: string | null
  demoMode?: 'video' | 'image_sequence' | 'animated_image'
  source?: 'generated' | 'open_source' | 'mixed' | 'placeholder'
  license?: string | null
  attributionLabel?: string | null
  attributionUrl?: string | null
  techniqueNote?: string | null
}

export interface ExercisePrescriptionDefaults {
  sets: number
  reps?: string
  durationSeconds?: number
  restSeconds: number
  intensity?: string
  tempo?: string
  rpe?: number
  percentEffort?: number
}

export interface ExerciseLibraryItem {
  id: string
  slug: string
  name: string
  family: string
  description: string
  category: ExerciseCategory
  subcategory: string
  movementPattern: string
  trainingIntent: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
  jointsInvolved: string[]
  difficulty: ExperienceLevel
  experienceLevelSuitability: ExperienceLevel[]
  equipmentRequired: string[]
  environment: Environment[]
  unilateralOrBilateral: 'unilateral' | 'bilateral' | 'mixed'
  impactLevel: 'low' | 'moderate' | 'high'
  intensityProfile: 'low' | 'moderate' | 'high' | 'variable'
  estimatedDurationSeconds: number | null
  defaultPrescription: ExercisePrescriptionDefaults
  coachingCues: string[]
  instructions: string[]
  commonMistakes: string[]
  regressions: string[]
  progressions: string[]
  substitutions: string[]
  contraindications: string[]
  injuryConstraints: string[]
  sorenessConstraints: string[]
  fatigueConstraints: string[]
  readinessSuitability: ReadinessBand[]
  goalTags: string[]
  sportTags: SupportedSport[]
  positionTags: string[]
  fitStartTags: string[]
  recoveryTags: string[]
  rehabTags: string[]
  movementQualityTags: string[]
  suitableBlocks: SessionBlockType[]
  media: ExerciseMedia
}

export interface ExerciseRecommendationContext {
  goal: string
  sport: SupportedSport
  position?: string | null
  ageBand: 'youth' | 'adult' | 'masters'
  trainingAge: ExperienceLevel
  currentFitnessLevel: CurrentFitnessLevel
  availableEquipment: string[]
  availableEnvironment: Environment[]
  injuryHistory: string[]
  currentPainAreas: string[]
  activeInjuries: string[]
  sorenessAreas: string[]
  fatigueLevel: PainOrFatigueLevel
  readinessBand: ReadinessBand
  readinessScore: number
  sleepQuality: 'poor' | 'okay' | 'good'
  missedSessionsInLast14Days: number
  complianceScore: number
  sessionDurationPreferenceMinutes: number
  trainingDaysPerWeek: number
  preferredTrainingEnvironment: Environment
  skillConfidence: 'anxious' | 'learning' | 'confident'
  bodyRegionsToImprove: string[]
  currentLimitations: string[]
  primaryMotivation: string
  participationProfile: ParticipationProfile
  goalTags: string[]
  painFlags: string[]
  rehabFocusAreas: string[]
  skillGaps?: string[]
  videoCorrectionDrills?: string[]
  latestVideoStatus?: 'clean' | 'watch' | 'corrective' | null
  latestVideoScore?: number | null
}

export interface ExerciseRecommendation {
  exercise: ExerciseLibraryItem
  score: number
  explanation: string[]
  suppressedReasons: string[]
}

export interface SessionExercise {
  exerciseId: string
  exerciseSlug: string
  name: string
  category: ExerciseCategory
  subcategory: string
  instructions: string[]
  coachingCues: string[]
  commonMistakes: string[]
  media: ExerciseMedia
  prescribed: ExercisePrescriptionDefaults
  substitutions: string[]
  explanation: string[]
  painCaution: string[]
}

export interface ExecutionSessionBlock {
  id: string
  type: SessionBlockType
  title: string
  notes: string
  intensity: string
  exercises: SessionExercise[]
}

export interface ExecutionSessionSummary {
  focus: string
  expectedDurationMinutes: number
  difficulty: 'low' | 'moderate' | 'high'
  completionTarget: string
  skillFocus?: string[]
}

export interface ExecutionSession {
  id: string
  athleteId: string
  date: string
  mode: ExecutionMode
  source: string
  title: string
  summary: ExecutionSessionSummary
  readiness: {
    band: ReadinessBand
    score: number
  }
  explainability: {
    headline: string
    reasons: string[]
    warnings: string[]
  }
  blocks: ExecutionSessionBlock[]
}

export type ExerciseCompletionStatus = 'completed' | 'partial' | 'skipped' | 'substituted'
export type TrainingSessionStatus = 'planned' | 'in_progress' | 'completed' | 'skipped'

export interface SessionExerciseCompletionLog {
  exerciseId: string
  exerciseSlug: string
  blockType: SessionBlockType | string
  prescribed: ExercisePrescriptionDefaults | Record<string, unknown>
  actual: {
    reps?: string | number | null
    loadKg?: number | null
    durationSeconds?: number | null
    completedSets?: number | null
    [key: string]: unknown
  }
  completionStatus: ExerciseCompletionStatus
  note?: string
  substitutionExerciseSlug?: string | null
}

export interface SessionCompletionLog {
  sessionId: string | null
  session: ExecutionSession
  actualDurationMinutes: number
  compliancePct: number
  athleteNotes: string
  painFlags: string[]
  exerciseLogs: SessionExerciseCompletionLog[]
}

export interface TrainingCalendarPlanEntry {
  date: string
  title: string
  mode: ExecutionMode
  status: 'today' | 'planned' | 'completed' | 'missed'
  expectedDurationMinutes: number
  reason: string
  sessionId: string | null
  carryForwardFrom: string | null
  compliancePct: number | null
}

export interface CoachSessionFeedback {
  id: string
  sessionId: string | null
  sessionLogId?: string | null
  coachId: string
  athleteId: string
  feedbackType: 'assignment_note' | 'completion_review' | 'warning' | 'encouragement'
  message: string
  flaggedIssue?: string | null
  priority?: 'low' | 'normal' | 'high'
  createdAt: string
}

export const exercisePrescriptionDefaultsSchema = z.object({
  sets: z.number().int().min(1).max(10),
  reps: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  restSeconds: z.number().int().min(0).max(600),
  intensity: z.string().optional(),
  tempo: z.string().optional(),
  rpe: z.number().min(1).max(10).optional(),
  percentEffort: z.number().min(1).max(100).optional(),
})

export const exerciseLibraryItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  family: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(EXERCISE_CATEGORIES),
  subcategory: z.string().min(1),
  movementPattern: z.string().min(1),
  trainingIntent: z.array(z.string().min(1)).min(1),
  primaryMuscles: z.array(z.string().min(1)).min(1),
  secondaryMuscles: z.array(z.string().min(1)).default([]),
  jointsInvolved: z.array(z.string().min(1)).min(1),
  difficulty: z.enum(EXPERIENCE_LEVELS),
  experienceLevelSuitability: z.array(z.enum(EXPERIENCE_LEVELS)).min(1),
  equipmentRequired: z.array(z.string().min(1)).min(1),
  environment: z.array(z.enum(ENVIRONMENTS)).min(1),
  unilateralOrBilateral: z.enum(['unilateral', 'bilateral', 'mixed']),
  impactLevel: z.enum(['low', 'moderate', 'high']),
  intensityProfile: z.enum(['low', 'moderate', 'high', 'variable']),
  estimatedDurationSeconds: z.number().nullable(),
  defaultPrescription: exercisePrescriptionDefaultsSchema,
  coachingCues: z.array(z.string().min(1)).min(2),
  instructions: z.array(z.string().min(1)).min(3),
  commonMistakes: z.array(z.string().min(1)).min(1),
  regressions: z.array(z.string().min(1)),
  progressions: z.array(z.string().min(1)),
  substitutions: z.array(z.string().min(1)),
  contraindications: z.array(z.string().min(1)),
  injuryConstraints: z.array(z.string().min(1)),
  sorenessConstraints: z.array(z.string().min(1)),
  fatigueConstraints: z.array(z.string().min(1)),
  readinessSuitability: z.array(z.enum(READINESS_BANDS)).min(1),
  goalTags: z.array(z.string().min(1)).min(1),
  sportTags: z.array(z.enum(SUPPORTED_SPORTS)).min(1),
  positionTags: z.array(z.string().min(1)),
  fitStartTags: z.array(z.string().min(1)),
  recoveryTags: z.array(z.string().min(1)),
  rehabTags: z.array(z.string().min(1)),
  movementQualityTags: z.array(z.string().min(1)),
  suitableBlocks: z.array(z.enum(SESSION_BLOCK_TYPES)).min(1),
  media: z.object({
    imageUrls: z.array(mediaUrlSchema).min(1),
    videoUrl: mediaUrlSchema,
    slowMotionUrl: mediaUrlSchema.nullable().optional(),
    demoMode: z.enum(['video', 'image_sequence', 'animated_image']).optional(),
    source: z.enum(['generated', 'open_source', 'mixed', 'placeholder']).optional(),
    license: z.string().nullable().optional(),
    attributionLabel: z.string().nullable().optional(),
    attributionUrl: mediaUrlSchema.nullable().optional(),
    techniqueNote: z.string().nullable().optional(),
  }),
})

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))]
}
