import * as z from 'zod'

import { upsertHealthConnectionPreference } from '@/lib/health/storage'
import {
  computeFitStartJourney,
  formatIndividualOccupationLabel,
  recommendPathwaysForIndividual,
  type IndividualPathRecommendation,
  type NormalIndividualFitStartInput,
} from '@/lib/individual_performance_engine'

const activityLevelSchema = z.enum(['sedentary', 'moderate', 'active'])
const injuryHistorySchema = z.enum(['none', 'minor', 'moderate', 'major', 'chronic'])
const mobilityLimitationsSchema = z.enum(['none', 'mild', 'moderate', 'severe'])
const trainingExperienceSchema = z.enum(['beginner', 'novice', 'intermediate', 'advanced', 'experienced'])
const nutritionHabitsSchema = z.enum(['poor', 'basic', 'good', 'structured'])
const primaryGoalSchema = z.enum(['fat_loss', 'muscle_gain', 'endurance', 'general_fitness', 'sport_specific'])
const timeHorizonSchema = z.enum(['4_weeks', '8_weeks', '12_weeks', 'long_term'])
const intensityPreferenceSchema = z.enum(['low', 'moderate', 'high'])
const recommendationTypeSchema = z.enum(['sport', 'training', 'lifestyle'])
const healthConnectionPreferenceSchema = z.enum(['connect_now', 'later'])

const physiologyDomainSchema = z.number().min(1).max(4)

export const fitStartRecommendationSchema = z.object({
  basic: z.object({
    age: z.number().min(13).max(90),
    gender: z.string().min(1),
    heightCm: z.number().min(120).max(230),
    weightKg: z.number().min(30).max(220),
    occupation: z.string().min(1),
    activityLevel: activityLevelSchema,
  }),
  physiology: z.object({
    sleepQuality: z.number().min(1).max(5),
    energyLevels: z.number().min(1).max(5),
    stressLevels: z.number().min(1).max(5),
    recoveryRate: z.number().min(1).max(5),
    injuryHistory: injuryHistorySchema,
    mobilityLimitations: mobilityLimitationsSchema,
    trainingExperience: trainingExperienceSchema,
    endurance_capacity: physiologyDomainSchema,
    strength_capacity: physiologyDomainSchema,
    explosive_power: physiologyDomainSchema,
    agility_control: physiologyDomainSchema,
    reaction_self_perception: physiologyDomainSchema,
    recovery_efficiency: physiologyDomainSchema,
    fatigue_resistance: physiologyDomainSchema,
    load_tolerance: physiologyDomainSchema,
    movement_robustness: physiologyDomainSchema,
    coordination_control: physiologyDomainSchema,
    reaction_time_ms: z.number().positive().optional(),
  }),
  lifestyle: z.object({
    scheduleConstraints: z.array(z.string().min(1)).min(1),
    equipmentAccess: z.array(z.string().min(1)).min(1),
    nutritionHabits: nutritionHabitsSchema,
    sedentaryHours: z.number().min(0).max(24),
  }),
  goals: z.object({
    primaryGoal: primaryGoalSchema,
    timeHorizon: timeHorizonSchema,
    intensityPreference: intensityPreferenceSchema,
  }),
})

const fitStartSportSelectionSchema = z.object({
  selectedSport: z.string().min(1),
  selectedPathwayId: z.string().optional().default(''),
  selectedPathwayType: recommendationTypeSchema.optional().default('sport'),
  selectedRecommendationTitle: z.string().optional().default(''),
  selectionRationale: z.string().optional().default(''),
})

export const fitStartSaveSchema = fitStartRecommendationSchema.extend({
  sport: fitStartSportSelectionSchema,
  timeTakenMs: z.number().min(0),
  health_connection_preference: healthConnectionPreferenceSchema.optional().default('later'),
})

export type FitStartRecommendationInput = z.infer<typeof fitStartRecommendationSchema>
export type SaveFitStartPayload = z.infer<typeof fitStartSaveSchema>

export type FitStartRecommendationResult =
  | { success: true; recommendations: IndividualPathRecommendation[] }
  | { success: false; error: string }

export type SaveFitStartResult =
  | {
      success: true
      destination: '/individual/dashboard'
      summary: {
        readinessScore: number
        primaryGap: string
        projectedPeakDate: string
      }
    }
  | {
      success: false
      error: string
    }

type SupabaseLike = {
  from: (table: string) => any
}

function getTodayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

function mapLegacyFitnessLevel(experience: NormalIndividualFitStartInput['physiology']['trainingExperience']) {
  if (experience === 'beginner') return 1
  if (experience === 'novice') return 2
  if (experience === 'intermediate') return 3
  if (experience === 'advanced') return 4
  return 5
}

function validateRecommendationInput(payload: FitStartRecommendationInput) {
  if (!payload.basic.occupation.trim()) return 'Please choose the option that best matches your normal day.'
  if (payload.lifestyle.scheduleConstraints.length === 0) return 'Please choose at least one time window that usually works for you.'
  if (payload.lifestyle.equipmentAccess.length === 0) return 'Please select at least one equipment option.'

  return null
}

function validateSavePayload(payload: SaveFitStartPayload) {
  const baseError = validateRecommendationInput(payload)
  if (baseError) return baseError
  if (!payload.sport.selectedSport.trim()) return 'Please select one CREEDA recommendation to continue.'
  return null
}

export function getFitStartRecommendations(
  payload: FitStartRecommendationInput
): FitStartRecommendationResult {
  const validationError = validateRecommendationInput(payload)
  if (validationError) {
    return { success: false, error: validationError }
  }

  return {
    success: true,
    recommendations: recommendPathwaysForIndividual({
      ...payload,
      sport: {
        selectedSport: '',
        selectedPathwayId: '',
        selectedPathwayType: 'sport',
        selectedRecommendationTitle: '',
        selectionRationale: '',
      },
    }),
  }
}

export async function saveFitStartProfileForUser(args: {
  supabase: SupabaseLike
  userId: string
  payload: SaveFitStartPayload
}): Promise<SaveFitStartResult> {
  const { supabase, userId, payload } = args
  const validationError = validateSavePayload(payload)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const computed = computeFitStartJourney(payload)
  const nowIso = new Date().toISOString()
  const todayIndia = getTodayInIndia()
  const legacyFitnessLevel = mapLegacyFitnessLevel(payload.physiology.trainingExperience)

  const profileUpdatePayload: Record<string, unknown> = {
    fitstart_goal: payload.goals.primaryGoal,
    fitstart_fitness_level: legacyFitnessLevel,
    fitstart_injuries: [payload.physiology.injuryHistory],
    fitstart_preferences: payload.sport.selectedRecommendationTitle || payload.sport.selectedSport,
    fitstart_time_available: computed.planEngine.trainingPlan.trainingDaysPerWeek,
    fitstart_time_taken: payload.timeTakenMs,
    fitstart_completed: true,
    onboarding_completed: true,
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdatePayload)
    .eq('id', userId)

  if (profileError) {
    return {
      success: false,
      error: profileError.message,
    }
  }

  const individualProfilePayload = {
    id: userId,
    work_schedule: formatIndividualOccupationLabel(payload.basic.occupation),
    fitness_level: payload.physiology.trainingExperience,
    lifestyle_constraints: {
      activity_level: payload.basic.activityLevel,
      schedule_constraints: payload.lifestyle.scheduleConstraints,
      sedentary_hours: payload.lifestyle.sedentaryHours,
    },
    current_journey_id:
      payload.sport.selectedPathwayId || `fitstart_${payload.sport.selectedSport.toLowerCase().replace(/\s+/g, '_')}`,
    journey_start_date: todayIndia,
    habit_goals: computed.planEngine.lifestylePlan.habitGoals,
    onboarding_version: 'fitstart_v5',
    basic_profile: payload.basic,
    physiology_profile: payload.physiology,
    lifestyle_profile: payload.lifestyle,
    goal_profile: payload.goals,
    sport_profile: {
      ...payload.sport,
      recommendations: computed.recommendations,
    },
    current_state: computed.currentState,
    peak_state: computed.peakState,
    gap_analysis: computed.gapAnalysis,
    plan_engine: computed.planEngine,
    journey_state: computed.journeyState,
    latest_guidance: {
      daily: computed.dailyGuidance,
      weekly: computed.weeklyFeedback,
      peak: computed.peakProjection,
      generated_at: nowIso,
    },
    fitstart_completed_at: nowIso,
    updated_at: nowIso,
  }

  const { error: individualError } = await supabase
    .from('individual_profiles')
    .upsert(individualProfilePayload, { onConflict: 'id' })

  if (individualError) {
    return {
      success: false,
      error: individualError.message,
    }
  }

  const { error: guidanceError } = await supabase
    .from('individual_guidance_snapshots')
    .upsert(
      {
        user_id: userId,
        log_date: todayIndia,
        readiness_score: computed.currentState.readinessScore,
        daily_guidance: computed.dailyGuidance,
        weekly_feedback: computed.weeklyFeedback,
        peak_projection: computed.peakProjection,
        adaptation_flags: {
          risk_areas: computed.gapAnalysis.riskAreas,
          primary_gap: computed.gapAnalysis.primaryGap,
        },
      },
      { onConflict: 'user_id,log_date' }
    )

  if (guidanceError) {
    return {
      success: false,
      error: guidanceError.message,
    }
  }

  const { error: connectionPrefError } = await upsertHealthConnectionPreference(supabase, {
    userId,
    connectionPreference: payload.health_connection_preference || 'later',
    updatedAt: nowIso,
  })

  if (connectionPrefError) {
    console.error('Connection preference save failed:', connectionPrefError.message)
  }

  return {
    success: true,
    destination: '/individual/dashboard',
    summary: {
      readinessScore: computed.currentState.readinessScore,
      primaryGap: computed.gapAnalysis.primaryGap.pillar,
      projectedPeakDate: computed.peakProjection.projectedPeakDate,
    },
  }
}
