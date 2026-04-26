import { computeConfidence } from '@creeda/engine'
import {
  isAnyParqYes,
  type OnboardingV2Event,
  type OnboardingV2SafetyGateSubmission,
  type Persona,
} from '@creeda/schemas'

type SupabaseLike = {
  from: (table: string) => any
}

export const ONBOARDING_V2_DESTINATIONS: Record<Persona, string> = {
  athlete: '/athlete/onboarding',
  individual: '/fitstart',
  coach: '/coach/onboarding',
}

function completionBucket(seconds?: number) {
  if (seconds === undefined) return 'unknown'
  if (seconds <= 30) return '0_30'
  if (seconds <= 60) return '31_60'
  if (seconds <= 90) return '61_90'
  if (seconds <= 110) return '91_110'
  return 'over_110'
}

export async function trackOnboardingV2EventForUser(args: {
  supabase: SupabaseLike
  userId: string
  event: OnboardingV2Event
}) {
  const { supabase, userId, event } = args

  const { error } = await supabase.from('onboarding_v2_events').insert({
    user_id: userId,
    persona: event.persona ?? null,
    phase: event.phase,
    screen: event.screen,
    event_name: event.event_name,
    source: event.source,
    completion_seconds: event.completion_seconds ?? null,
    metadata: {
      ...event.metadata,
      completion_bucket: completionBucket(event.completion_seconds),
    },
  })

  if (error) {
    console.warn('[onboarding-v2] analytics event failed', error)
    return { success: false as const, error: error.message as string }
  }

  return { success: true as const }
}

export async function persistOnboardingV2SafetyGate(args: {
  supabase: SupabaseLike
  userId: string
  payload: OnboardingV2SafetyGateSubmission
}) {
  const { supabase, userId, payload } = args
  const modifiedModeActive = isAnyParqYes(payload.parq)
  const confidence = computeConfidence({
    daysSinceOnboarding: 0,
    dataPointsCollected: modifiedModeActive ? 9 : 8,
    hasWearable: false,
    movementScansCount: 0,
    capacityTestsCompleted: 0,
    daysOfChronicLoad: 0,
    daysOfCheckIns: 0,
  })
  const profileCalibrationPct = modifiedModeActive ? 8 : 12

  const screeningPayload = {
    user_id: userId,
    q1_heart_condition: payload.parq.q1_heart_condition,
    q2_chest_pain_activity: payload.parq.q2_chest_pain_activity,
    q3_chest_pain_rest: payload.parq.q3_chest_pain_rest,
    q4_dizziness_loc: payload.parq.q4_dizziness_loc,
    q5_bone_joint_problem: payload.parq.q5_bone_joint_problem,
    q6_bp_heart_meds: payload.parq.q6_bp_heart_meds,
    q7_other_reason: payload.parq.q7_other_reason,
    q7_other_reason_text: payload.parq.q7_other_reason
      ? (payload.parq.q7_other_reason_text ?? '').slice(0, 200)
      : null,
    pregnancy_status: payload.parq.pregnancy_status,
    cycle_tracking_optin: payload.parq.cycle_tracking_optin,
    completed_at: new Date().toISOString(),
  }

  const { error: screeningError } = await supabase
    .from('medical_screenings')
    .upsert(screeningPayload, { onConflict: 'user_id' })

  if (screeningError) {
    return {
      success: false as const,
      error: 'Unable to save the safety gate. Please try again.',
      details: screeningError.message as string,
    }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      persona: payload.persona,
      onboarding_phase: 1,
      profile_calibration_pct: profileCalibrationPct,
    })
    .eq('id', userId)

  if (profileError) {
    return {
      success: false as const,
      error: 'Safety gate saved, but profile calibration could not be updated.',
      details: profileError.message as string,
    }
  }

  await trackOnboardingV2EventForUser({
    supabase,
    userId,
    event: {
      event_name: 'onb.screen.completed',
      persona: payload.persona,
      phase: 0,
      screen: 'safety_gate',
      source: payload.source,
      completion_seconds: payload.completion_seconds,
      metadata: {
        modified_mode_active: modifiedModeActive,
        confidence_pct: confidence.pct,
      },
    },
  })

  return {
    success: true as const,
    modifiedModeActive,
    profileCalibrationPct,
    confidence,
    destination: ONBOARDING_V2_DESTINATIONS[payload.persona],
  }
}
