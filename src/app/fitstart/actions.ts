'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifyRole } from '@/lib/auth_utils'
import {
  computeFitStartJourney,
  type NormalIndividualFitStartInput,
} from '@/lib/individual_performance_engine'

type SaveFitStartPayload = NormalIndividualFitStartInput & {
  timeTakenMs: number
  health_connection_preference?: 'connect_now' | 'later'
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

function validatePayload(payload: SaveFitStartPayload) {
  if (!payload.sport.selectedSport.trim()) return 'Please select one CREEDA recommendation to continue.'
  if (!payload.goals.primaryGoal) return 'Please choose a primary goal.'
  if (!payload.basic.occupation.trim()) return 'Occupation is required.'
  if (payload.basic.age < 13 || payload.basic.age > 90) return 'Age must be between 13 and 90.'
  if (payload.basic.heightCm < 120 || payload.basic.heightCm > 230) return 'Height must be between 120cm and 230cm.'
  if (payload.basic.weightKg < 30 || payload.basic.weightKg > 220) return 'Weight must be between 30kg and 220kg.'
  const domainValues = [
    payload.physiology.endurance_capacity,
    payload.physiology.strength_capacity,
    payload.physiology.explosive_power,
    payload.physiology.agility_control,
    payload.physiology.reaction_self_perception,
    payload.physiology.recovery_efficiency,
    payload.physiology.fatigue_resistance,
    payload.physiology.load_tolerance,
    payload.physiology.movement_robustness,
    payload.physiology.coordination_control,
  ]
  if (domainValues.some((value) => value < 1 || value > 4)) {
    return 'Please complete all physiology domain questions.'
  }
  return null
}

export async function saveFitStartProfile(payload: SaveFitStartPayload) {
  const validationError = validatePayload(payload)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const { user } = await verifyRole('individual')
  const supabase = await createClient()

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
    .eq('id', user.id)

  if (profileError) {
    return {
      success: false,
      error: profileError.message,
    }
  }

  const individualProfilePayload = {
    id: user.id,
    work_schedule: payload.basic.occupation,
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
        user_id: user.id,
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

  const { error: connectionPrefError } = await supabase
    .from('health_connections')
    .upsert(
      {
        user_id: user.id,
        connection_preference: payload.health_connection_preference || 'later',
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    )

  if (connectionPrefError) {
    // Keep onboarding non-blocking for optional health sync preferences.
    console.error('Connection preference save failed:', connectionPrefError.message)
  }

  revalidatePath('/fitstart')
  revalidatePath('/individual')
  revalidatePath('/individual/dashboard')

  return {
    success: true,
    destination: '/individual/dashboard',
    summary: {
      readinessScore: computed.currentState.readinessScore,
      primaryGap: computed.gapAnalysis.primaryGap,
      projectedPeakDate: computed.peakProjection.projectedPeakDate,
    },
  }
}
