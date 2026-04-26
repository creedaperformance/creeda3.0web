import {
  computeACWR,
  computeConfidence,
  computeEnvironmentalModifier,
  computeProteinAdequacyRatio,
  computeReadiness,
  computeRedSRisk,
  cooperVO2max,
  restingHrVO2max,
  scoreApsq10,
  vdotEstimate,
} from '@creeda/engine'
import {
  calcChronicLoadFromSnapshot,
  isAnyParqYes,
  type OnboardingV2DailyRitualSubmission,
  type OnboardingV2Event,
  type OnboardingV2MovementBaselineSubmission,
  type OnboardingV2Phase1Submission,
  type OnboardingV2Phase2Day,
  type OnboardingV2Phase2Submission,
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

export const ONBOARDING_V2_PHASE1_DESTINATIONS: Record<Persona, string> = {
  athlete: '/athlete/dashboard',
  individual: '/individual/dashboard',
  coach: '/coach/dashboard',
}

const ONBOARDING_V2_PHASE2_COMPLETE_DESTINATIONS: Record<
  OnboardingV2Phase2Submission['persona'],
  string
> = {
  athlete: '/athlete/dashboard',
  individual: '/individual/dashboard',
}

const ONBOARDING_V2_DAILY_RITUAL_DESTINATIONS: Record<
  OnboardingV2DailyRitualSubmission['persona'],
  string
> = {
  athlete: '/athlete/dashboard',
  individual: '/individual/dashboard',
}

const PHASE2_DAY_LABELS: Record<OnboardingV2Phase2Day, string> = {
  day1_aerobic: 'Aerobic baseline',
  day2_strength_power: 'Strength and power',
  day3_movement_quality: 'Movement quality',
  day4_anaerobic_recovery: 'Anaerobic and recovery',
  day5_nutrition: 'Nutrition and RED-S screen',
  day6_psych_sleep: 'APSQ and sleep',
  day7_environment: 'Environment context',
}

const PHASE2_DAY_CALIBRATION: Record<OnboardingV2Phase2Day, number> = {
  day1_aerobic: 50,
  day2_strength_power: 55,
  day3_movement_quality: 60,
  day4_anaerobic_recovery: 64,
  day5_nutrition: 68,
  day6_psych_sleep: 72,
  day7_environment: 78,
}

function completionBucket(seconds?: number) {
  if (seconds === undefined) return 'unknown'
  if (seconds <= 30) return '0_30'
  if (seconds <= 60) return '31_60'
  if (seconds <= 90) return '61_90'
  if (seconds <= 110) return '91_110'
  return 'over_110'
}

function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10)
}

function daysAgo(days: number) {
  const next = new Date()
  next.setDate(next.getDate() - days)
  return isoDate(next)
}

function cleanOptionalText(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function confidenceLevelForAdaptiveForms(tier: string) {
  return tier === 'locked' ? 'high' : tier
}

function buildTrainingLoadRows(
  userId: string,
  payload: OnboardingV2Phase1Submission
) {
  if (!payload.training_load) return []

  const snapshot = payload.training_load
  const baseLoad =
    snapshot.weekly_sessions * snapshot.avg_session_minutes * snapshot.typical_rpe
  const patternFactors: Record<typeof snapshot.pattern_4_weeks, number[]> = {
    same: [1, 1, 1, 1],
    more_now: [1, 0.85, 0.72, 0.65],
    less_now: [1, 1.12, 1.24, 1.32],
    returning_from_break: [1, 0.4, 0.15, 0],
  }
  const weekOffsets = [0, 8, 15, 22]

  return patternFactors[snapshot.pattern_4_weeks].map((factor, index) => {
    const weeklyLoad = Math.round(baseLoad * factor)
    const totalMinutes =
      snapshot.typical_rpe > 0 ? Math.round(weeklyLoad / snapshot.typical_rpe) : 0

    return {
      user_id: userId,
      source: 'onboarding_self_report',
      date: daysAgo(weekOffsets[index] ?? 0),
      sessions_count: index === 0 ? snapshot.weekly_sessions : Math.round(snapshot.weekly_sessions * factor),
      total_duration_minutes: totalMinutes,
      average_rpe: snapshot.typical_rpe,
      notes: `onboarding_v2:pattern=${snapshot.pattern_4_weeks}`,
    }
  })
}

function computePhase1Confidence(payload: OnboardingV2Phase1Submission) {
  const hasWearable =
    payload.wearable.preference === 'connect_now' && payload.wearable.provider !== 'none'
  const dataPointsCollected =
    14 +
    (payload.training_load ? 4 : 0) +
    payload.orthopedic_history.length +
    (payload.squad ? 4 : 0)

  return computeConfidence({
    daysSinceOnboarding: 0,
    dataPointsCollected,
    hasWearable,
    movementScansCount: 0,
    capacityTestsCompleted: 0,
    daysOfChronicLoad: payload.training_load ? 4 : 0,
    daysOfCheckIns: 0,
  })
}

function profileCalibrationForPhase1(payload: OnboardingV2Phase1Submission) {
  const confidence = computePhase1Confidence(payload)
  const base = payload.persona === 'coach' ? 28 : payload.persona === 'athlete' ? 24 : 22

  return Math.min(45, Math.max(base, confidence.pct))
}

function computePhase1Readiness(payload: OnboardingV2Phase1Submission) {
  if (payload.persona === 'coach' || !payload.training_load) return null

  const confidence = computePhase1Confidence(payload)
  const trainingRows = buildTrainingLoadRows('preview', payload)
  const acwr = computeACWR(
    trainingRows.map((entry) => ({
      date: entry.date,
      load_au: entry.total_duration_minutes * Number(entry.average_rpe ?? 0),
    }))
  )

  return computeReadiness({
    subjective: {
      energy: 3,
      body_feel: payload.orthopedic_history.some((entry) => entry.currently_symptomatic) ? 2 : 3,
      mental_load: 3,
    },
    acwr,
    confidence,
    // Phase 1 doesn't yet know the medical_screenings flag, but a
    // currently-symptomatic injury is a sufficient trigger for modified mode.
    modifiedMode: payload.orthopedic_history.some(
      (entry) => entry.currently_symptomatic && entry.severity !== 'annoying'
    ),
  })
}

function trainingLoadEntriesFromRows(rows: unknown) {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const record = row as Record<string, unknown>
      const date = typeof record.date === 'string' ? record.date : null
      const minutes = Number(record.total_duration_minutes ?? 0)
      const rpe = Number(record.average_rpe ?? 0)
      if (!date || !Number.isFinite(minutes) || !Number.isFinite(rpe)) return null
      return { date, load_au: minutes * rpe }
    })
    .filter((row): row is { date: string; load_au: number } => Boolean(row))
}

type CapacityTestRow = {
  user_id: string
  test_type: string
  test_method: string
  raw_value: number | null
  unit: string | null
  derived_metrics: Record<string, unknown>
  quality_score: number | null
  rejection_reason: string | null
  mediapipe_landmarks: null
  performed_at: string
}

function capacityTestRow(args: {
  userId: string
  testType: string
  rawValue?: number
  unit?: string
  performedAt: string
  testMethod?: string
  derivedMetrics?: Record<string, unknown>
  qualityScore?: number
}) {
  return {
    user_id: args.userId,
    test_type: args.testType,
    test_method: args.testMethod ?? 'self_reported',
    raw_value: args.rawValue ?? null,
    unit: args.unit ?? null,
    derived_metrics: args.derivedMetrics ?? {},
    quality_score: args.qualityScore ?? 80,
    rejection_reason: null,
    mediapipe_landmarks: null,
    performed_at: args.performedAt,
  } satisfies CapacityTestRow
}

function numberFromProfile(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function ageFromDateOfBirth(value: unknown) {
  if (typeof value !== 'string') return undefined
  const birth = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(birth.getTime())) return undefined
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1
  }
  return age > 0 && age < 120 ? age : undefined
}

function hydrationAdequacyRatio(waterCupsPerDay: number | undefined, bodyMassKg: number | undefined) {
  if (!waterCupsPerDay || !bodyMassKg) return null
  const estimatedMl = waterCupsPerDay * 250
  const targetMl = bodyMassKg * 35
  if (targetMl <= 0) return null
  return Number(Math.min(2, estimatedMl / targetMl).toFixed(2))
}

function sleepFlagLevel(args: {
  avgSleepHours: number
  sleepQuality1To5?: number
  lifeStress1To5?: number
}) {
  if (args.avgSleepHours < 5.5 || (args.sleepQuality1To5 ?? 5) <= 2 || (args.lifeStress1To5 ?? 1) >= 5) {
    return 'red' as const
  }
  if (args.avgSleepHours < 7 || (args.sleepQuality1To5 ?? 5) <= 3 || (args.lifeStress1To5 ?? 1) >= 4) {
    return 'amber' as const
  }
  return 'green' as const
}

function collectPhase2CapacityRows(args: {
  userId: string
  payload: OnboardingV2Phase2Submission
  performedAt: string
  profileAge?: number
}) {
  const { userId, payload, performedAt, profileAge } = args
  const rows: CapacityTestRow[] = []

  if (payload.day === 'day1_aerobic') {
    if (payload.resting_hr_bpm !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'resting_hr',
          rawValue: payload.resting_hr_bpm,
          unit: 'bpm',
          performedAt,
          derivedMetrics: {
            estimated_vo2max:
              profileAge !== undefined
                ? restingHrVO2max(payload.resting_hr_bpm, profileAge)
                : null,
          },
        })
      )
    }
    if (payload.cooper_distance_meters !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'cooper_run_12min',
          rawValue: payload.cooper_distance_meters,
          unit: 'meters',
          performedAt,
          derivedMetrics: {
            estimated_vo2max: cooperVO2max(payload.cooper_distance_meters),
            perceived_exertion_1_to_10: payload.perceived_exertion_1_to_10 ?? null,
          },
        })
      )
    }
    ;[
      ['run_1km', payload.run_1km_seconds, 1000],
      ['run_5km', payload.run_5km_seconds, 5000],
      ['run_10km', payload.run_10km_seconds, 10000],
    ].forEach(([testType, seconds, meters]) => {
      if (typeof seconds !== 'number' || typeof meters !== 'number') return
      rows.push(
        capacityTestRow({
          userId,
          testType: String(testType),
          rawValue: seconds,
          unit: 'seconds',
          performedAt,
          derivedMetrics: {
            estimated_vdot: vdotEstimate(meters, seconds),
            perceived_exertion_1_to_10: payload.perceived_exertion_1_to_10 ?? null,
          },
        })
      )
    })
    if (payload.walk_1km_seconds !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'run_1km',
          rawValue: payload.walk_1km_seconds,
          unit: 'seconds',
          performedAt,
          derivedMetrics: {
            protocol: 'walk_1km',
            perceived_exertion_1_to_10: payload.perceived_exertion_1_to_10 ?? null,
          },
        })
      )
    }
    if (payload.stairs_flights_completed !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'step_test_3min',
          rawValue: payload.stairs_flights_completed,
          unit: 'flights',
          performedAt,
          derivedMetrics: {
            protocol: 'stair_flights_self_report',
            perceived_exertion_1_to_10: payload.perceived_exertion_1_to_10 ?? null,
          },
        })
      )
    }
  }

  if (payload.day === 'day2_strength_power') {
    ;[
      ['squat_1rm', payload.squat_1rm_kg],
      ['deadlift_1rm', payload.deadlift_1rm_kg],
      ['bench_1rm', payload.bench_1rm_kg],
      ['ohp_1rm', payload.ohp_1rm_kg],
    ].forEach(([testType, kg]) => {
      if (typeof kg !== 'number') return
      rows.push(
        capacityTestRow({
          userId,
          testType: String(testType),
          rawValue: kg,
          unit: 'kg',
          performedAt,
          derivedMetrics: {
            strength_training_past_year: payload.strength_training_past_year ?? null,
          },
        })
      )
    })
    if (payload.vertical_jump_cm !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'vertical_jump',
          rawValue: payload.vertical_jump_cm,
          unit: 'cm',
          performedAt,
        })
      )
    }
    if (payload.broad_jump_cm !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'broad_jump',
          rawValue: payload.broad_jump_cm,
          unit: 'cm',
          performedAt,
        })
      )
    }
    if (payload.pushups_60s !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'pushup_amrap',
          rawValue: payload.pushups_60s,
          unit: 'reps',
          performedAt,
          derivedMetrics: { protocol_seconds: 60 },
        })
      )
    }
    if (payload.plank_hold_seconds !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'plank_hold',
          rawValue: payload.plank_hold_seconds,
          unit: 'seconds',
          performedAt,
        })
      )
    }
  }

  if (payload.day === 'day3_movement_quality') {
    const fmsRows: Array<[string, number | undefined]> = [
      ['fms_aslr_left', payload.fms.aslr_left],
      ['fms_aslr_right', payload.fms.aslr_right],
      ['fms_shoulder_left', payload.fms.shoulder_left],
      ['fms_shoulder_right', payload.fms.shoulder_right],
      ['fms_trunk_pushup', payload.fms.trunk_pushup],
      ['fms_single_leg_squat_left', payload.fms.single_leg_squat_left],
      ['fms_single_leg_squat_right', payload.fms.single_leg_squat_right],
      ['fms_inline_lunge_left', payload.fms.inline_lunge_left],
      ['fms_inline_lunge_right', payload.fms.inline_lunge_right],
    ]
    fmsRows.forEach(([testType, score]) => {
      if (score === undefined) return
      rows.push(
        capacityTestRow({
          userId,
          testType,
          rawValue: score,
          unit: 'score_0_3',
          performedAt,
          derivedMetrics: {
            self_reported_pain_0_to_10: payload.self_reported_pain_0_to_10 ?? null,
            camera_baseline_completed: payload.camera_baseline_completed,
            notes: cleanOptionalText(payload.notes),
          },
        })
      )
    })
  }

  if (payload.day === 'day4_anaerobic_recovery') {
    if (payload.sprint_100m_seconds !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'sprint_100m',
          rawValue: payload.sprint_100m_seconds,
          unit: 'seconds',
          performedAt,
        })
      )
    }
    if (payload.rsa_6x30m_average_seconds !== undefined || payload.rsa_6x30m_best_seconds !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'rsa_6x30m',
          rawValue: payload.rsa_6x30m_average_seconds ?? payload.rsa_6x30m_best_seconds,
          unit: 'seconds',
          performedAt,
          derivedMetrics: {
            best_seconds: payload.rsa_6x30m_best_seconds ?? null,
            average_seconds: payload.rsa_6x30m_average_seconds ?? null,
          },
        })
      )
    }
    if (payload.hrv_ppg_ms !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'hrv_ppg',
          rawValue: payload.hrv_ppg_ms,
          unit: 'ms',
          performedAt,
          testMethod: 'in_app_ppg',
          derivedMetrics: {
            capture_state: 'manual_or_device_reported',
            native_camera_ppg: false,
          },
        })
      )
    }
    if (payload.recovery_hr_drop_bpm_60s !== undefined) {
      rows.push(
        capacityTestRow({
          userId,
          testType: 'step_test_3min',
          rawValue: payload.recovery_hr_drop_bpm_60s,
          unit: 'bpm_drop',
          performedAt,
          derivedMetrics: {
            protocol: '60s_recovery_heart_rate_drop',
            recovery_rating_1_to_5: payload.recovery_rating_1_to_5 ?? null,
          },
        })
      )
    }
  }

  return rows
}

function completedPhase2DaysFrom(value: unknown) {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const rawDays = record.completed_days
  if (!Array.isArray(rawDays)) return []
  return rawDays.filter((day): day is OnboardingV2Phase2Day =>
    typeof day === 'string' && day in PHASE2_DAY_LABELS
  )
}

function completedDailyRitualDatesFrom(value: unknown) {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const rawDates = record.completed_dates
  if (!Array.isArray(rawDates)) return []
  return rawDates.filter((date): date is string => /^\d{4}-\d{2}-\d{2}$/.test(String(date)))
}

function latestMovementQualityFromRows(rows: unknown) {
  if (!Array.isArray(rows)) return undefined
  const first = rows.find((row) => row && typeof row === 'object') as
    | Record<string, unknown>
    | undefined
  const score = Number(first?.movement_quality_score)
  return Number.isFinite(score) ? score : undefined
}

function sleepInputFromDailyRitual(payload: OnboardingV2DailyRitualSubmission) {
  if (payload.sleep_hours_self === undefined || payload.sleep_quality_self === undefined) {
    return undefined
  }
  return {
    hours: payload.sleep_hours_self,
    quality: payload.sleep_quality_self,
  }
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

export async function persistOnboardingV2Phase1(args: {
  supabase: SupabaseLike
  userId: string
  payload: OnboardingV2Phase1Submission
}) {
  const { supabase, userId, payload } = args
  const nowIso = new Date().toISOString()
  const today = isoDate()
  const confidence = computePhase1Confidence(payload)
  const profileCalibrationPct = profileCalibrationForPhase1(payload)
  const readiness = computePhase1Readiness(payload)
  const destination = ONBOARDING_V2_PHASE1_DESTINATIONS[payload.persona]
  const sport = payload.sport.primary_sport.trim()
  const position = cleanOptionalText(payload.sport.position)

  const sportPayload = payload.sport as typeof payload.sport & {
    primary_sport_id?: string
    position_id?: string
    competitive_level?: string
    years_in_sport?: number
    secondary_sport_id?: string
    movement_preferences?: string[]
    activity_level?: string
    years_active?: number
  }
  const goalPayload = payload.goal as typeof payload.goal & {
    time_horizon?: string
    target_event_sport?: string
    target_event_priority?: 'A' | 'B' | 'C'
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      persona: payload.persona,
      full_name: payload.identity.display_name.trim(),
      date_of_birth: payload.identity.date_of_birth,
      biological_sex: payload.identity.biological_sex,
      gender_identity: cleanOptionalText(payload.identity.gender_identity),
      height: payload.identity.height_cm,
      weight: payload.identity.weight_kg,
      dominant_hand: payload.identity.dominant_hand,
      dominant_leg: payload.identity.dominant_leg,
      primary_sport: sport,
      position,
      // v2.1 additions — persisted into new profile columns (migration v41).
      primary_sport_id: cleanOptionalText(sportPayload.primary_sport_id),
      position_id: cleanOptionalText(sportPayload.position_id),
      competitive_level: cleanOptionalText(sportPayload.competitive_level),
      years_in_sport: sportPayload.years_in_sport ?? null,
      secondary_sport_id: cleanOptionalText(sportPayload.secondary_sport_id),
      movement_preferences:
        Array.isArray(sportPayload.movement_preferences) && sportPayload.movement_preferences.length > 0
          ? sportPayload.movement_preferences
          : null,
      activity_level: cleanOptionalText(sportPayload.activity_level),
      years_active: sportPayload.years_active ?? null,
      goal_time_horizon: cleanOptionalText(goalPayload.time_horizon),
      onboarding_phase: 2,
      profile_calibration_pct: profileCalibrationPct,
    })
    .eq('id', userId)

  if (profileError) {
    return {
      success: false as const,
      error: 'Unable to save profile identity for onboarding Phase 1.',
      details: profileError.message as string,
    }
  }

  const trainingRows = buildTrainingLoadRows(userId, payload)
  if (trainingRows.length > 0) {
    const { error: deleteLoadError } = await supabase
      .from('training_load_history')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'onboarding_self_report')
      .ilike('notes', 'onboarding_v2:%')

    if (deleteLoadError) {
      return {
        success: false as const,
        error: 'Unable to refresh onboarding training load history.',
        details: deleteLoadError.message as string,
      }
    }

    const { error: loadError } = await supabase
      .from('training_load_history')
      .insert(trainingRows)

    if (loadError) {
      return {
        success: false as const,
        error: 'Unable to save the training load snapshot.',
        details: loadError.message as string,
      }
    }
  }

  const { error: deleteOrthoError } = await supabase
    .from('orthopedic_history')
    .delete()
    .eq('user_id', userId)
    .ilike('notes', 'onboarding_v2:%')

  if (deleteOrthoError) {
    return {
      success: false as const,
      error: 'Unable to refresh onboarding orthopedic history.',
      details: deleteOrthoError.message as string,
    }
  }

  if (payload.orthopedic_history.length > 0) {
    const { error: orthoError } = await supabase.from('orthopedic_history').insert(
      payload.orthopedic_history.map((entry) => ({
        user_id: userId,
        body_region: entry.body_region,
        severity: entry.severity,
        occurred_at_estimate: entry.occurred_at_estimate,
        currently_symptomatic: entry.currently_symptomatic,
        current_pain_score: entry.currently_symptomatic ? (entry.current_pain_score ?? 0) : null,
        has_seen_clinician: entry.has_seen_clinician,
        clinician_type: entry.clinician_type ?? 'none',
        notes: `onboarding_v2:${entry.notes?.trim() ?? ''}`,
      }))
    )

    if (orthoError) {
      return {
        success: false as const,
        error: 'Unable to save orthopedic history.',
        details: orthoError.message as string,
      }
    }
  }

  const { error: healthConnectionError } = await supabase
    .from('health_connections')
    .upsert(
      {
        user_id: userId,
        connection_preference: payload.wearable.preference,
        permission_state: {
          onboarding_v2_provider: payload.wearable.provider,
          pending_oauth:
            payload.wearable.preference === 'connect_now' && payload.wearable.provider !== 'none',
          captured_at: nowIso,
        },
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    )

  if (healthConnectionError) {
    console.warn('[onboarding-v2] wearable preference save failed', healthConnectionError)
  }

  if (payload.goal.target_event_name && payload.goal.target_event_date) {
    await supabase
      .from('competition_events')
      .delete()
      .eq('user_id', userId)
      .eq('event_name', payload.goal.target_event_name)
      .eq('event_date', payload.goal.target_event_date)

    const { error: eventError } = await supabase.from('competition_events').insert({
      user_id: userId,
      event_name: payload.goal.target_event_name,
      event_date: payload.goal.target_event_date,
      priority: goalPayload.target_event_priority ?? 'B',
      sport: cleanOptionalText(goalPayload.target_event_sport) ?? sport,
      taper_protocol_active: false,
    })

    if (eventError) {
      console.warn('[onboarding-v2] competition event save failed', eventError)
    }
  }

  if (payload.persona === 'coach' && payload.squad) {
    const { data: existingSquad } = await supabase
      .from('squads')
      .select('id')
      .eq('coach_id', userId)
      .eq('name', payload.squad.name)
      .maybeSingle()

    const squadPayload = {
      coach_id: userId,
      name: payload.squad.name,
      sport: payload.squad.sport,
      level: payload.squad.level,
      size_estimate: payload.squad.size_estimate ?? null,
      primary_focus: payload.squad.primary_focus ?? null,
    }

    const { error: squadError } = existingSquad?.id
      ? await supabase.from('squads').update(squadPayload).eq('id', existingSquad.id)
      : await supabase.from('squads').insert(squadPayload)

    if (squadError) {
      return {
        success: false as const,
        error: 'Unable to save coach squad setup.',
        details: squadError.message as string,
      }
    }
  }

  if (readiness) {
    const { error: readinessError } = await supabase
      .from('readiness_scores')
      .upsert(
        {
          user_id: userId,
          date: today,
          score: readiness.score,
          confidence_tier: readiness.confidence.tier,
          confidence_pct: readiness.confidence.pct,
          data_points_count: 18 + payload.orthopedic_history.length,
          drivers: readiness.drivers,
          missing_inputs: readiness.missing,
          directive: readiness.directive,
          computed_at: nowIso,
        },
        { onConflict: 'user_id,date' }
      )

    if (readinessError) {
      return {
        success: false as const,
        error: 'Unable to save the provisional readiness score.',
        details: readinessError.message as string,
      }
    }
  }

  const { error: adaptiveProfileError } = await supabase
    .from('adaptive_form_profiles')
    .upsert(
      {
        user_id: userId,
        role: payload.persona,
        flow_id: 'onboarding_v2_phase1',
        flow_version: '2026-04-26',
        core_fields: {
          identity: payload.identity,
          sport: payload.sport,
          goal: payload.goal,
          wearable: payload.wearable,
        },
        optional_fields: {
          training_load: payload.training_load ?? null,
          orthopedic_history_count: payload.orthopedic_history.length,
          squad: payload.squad ?? null,
        },
        inferred_fields: {
          readiness,
          profile_calibration_pct: profileCalibrationPct,
          chronic_load_au: payload.training_load
            ? calcChronicLoadFromSnapshot(payload.training_load)
            : null,
        },
        completion_score: payload.persona === 'coach' ? 85 : 80,
        confidence_score: confidence.pct,
        confidence_level: confidenceLevelForAdaptiveForms(confidence.tier),
        confidence_recommendations: readiness?.missing ?? [
          'Daily check-ins',
          'Movement scan',
          'Capacity baseline',
        ],
        next_question_ids:
          payload.persona === 'coach'
            ? ['athlete_invites', 'squad_load_rules']
            : ['daily_checkin', 'movement_scan', 'capacity_baseline'],
        onboarding_v2_phase: 1,
        completion_seconds: payload.completion_seconds,
        confidence_pct: confidence.pct,
      },
      { onConflict: 'user_id,role,flow_id' }
    )

  if (adaptiveProfileError) {
    return {
      success: false as const,
      error: 'Phase 1 saved, but adaptive profile calibration could not be updated.',
      details: adaptiveProfileError.message as string,
    }
  }

  await trackOnboardingV2EventForUser({
    supabase,
    userId,
    event: {
      event_name: 'onb.screen.completed',
      persona: payload.persona,
      phase: 1,
      screen: 'phase1_profile',
      source: payload.source,
      completion_seconds: payload.completion_seconds,
      metadata: {
        profile_calibration_pct: profileCalibrationPct,
        readiness_score: readiness?.score ?? null,
        wearable_preference: payload.wearable.preference,
      },
    },
  })

  return {
    success: true as const,
    profileCalibrationPct,
    confidence,
    readiness,
    destination,
  }
}

export async function persistOnboardingV2Phase2Day(args: {
  supabase: SupabaseLike
  userId: string
  payload: OnboardingV2Phase2Submission
}) {
  const { supabase, userId, payload } = args
  const nowIso = new Date().toISOString()
  const today = isoDate()

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_calibration_pct, weight, date_of_birth')
    .eq('id', userId)
    .maybeSingle()

  const profileRecord =
    profile && typeof profile === 'object' ? (profile as Record<string, unknown>) : {}
  const currentCalibration = numberFromProfile(profileRecord.profile_calibration_pct) ?? 0
  const bodyMassKg =
    payload.day === 'day5_nutrition'
      ? payload.body_mass_kg ?? numberFromProfile(profileRecord.weight)
      : numberFromProfile(profileRecord.weight)
  const profileAge = ageFromDateOfBirth(profileRecord.date_of_birth)

  const { data: adaptiveProfile } = await supabase
    .from('adaptive_form_profiles')
    .select('core_fields,optional_fields,inferred_fields')
    .eq('user_id', userId)
    .eq('role', payload.persona)
    .eq('flow_id', 'onboarding_v2_phase2')
    .maybeSingle()

  const adaptiveRecord =
    adaptiveProfile && typeof adaptiveProfile === 'object'
      ? (adaptiveProfile as Record<string, unknown>)
      : {}
  const existingOptionalFields =
    adaptiveRecord.optional_fields && typeof adaptiveRecord.optional_fields === 'object'
      ? (adaptiveRecord.optional_fields as Record<string, unknown>)
      : {}
  const existingInferredFields =
    adaptiveRecord.inferred_fields && typeof adaptiveRecord.inferred_fields === 'object'
      ? (adaptiveRecord.inferred_fields as Record<string, unknown>)
      : {}
  const completedDays = Array.from(
    new Set([...completedPhase2DaysFrom(existingOptionalFields), payload.day])
  )

  const capacityRows = collectPhase2CapacityRows({
    userId,
    payload,
    performedAt: nowIso,
    profileAge,
  })

  if (capacityRows.length > 0) {
    const { error: capacityError } = await supabase.from('capacity_tests').insert(capacityRows)

    if (capacityError) {
      return {
        success: false as const,
        error: 'Unable to save the Phase 2 capacity measurements.',
        details: capacityError.message as string,
      }
    }
  }

  let nutritionResult: Record<string, unknown> | null = null
  if (payload.day === 'day5_nutrition') {
    const proteinAdequacyRatio =
      bodyMassKg && payload.nutrition.estimated_protein_grams !== undefined
        ? computeProteinAdequacyRatio({
            bodyMassKg,
            estimatedProteinGrams: payload.nutrition.estimated_protein_grams,
            targetGramsPerKg: payload.target_protein_g_per_kg,
          })
        : null
    const redSRisk = computeRedSRisk({
      trainingHoursPerWeek: payload.training_hours_per_week,
      proteinAdequacyRatio: proteinAdequacyRatio ?? undefined,
      recentWeightLossPct: payload.recent_weight_loss_pct,
      missedPeriodsLast90Days: payload.missed_periods_last_90_days,
      fatigueScore1To5: payload.fatigue_score_1_to_5,
      knownDeficienciesCount: payload.nutrition.known_deficiencies.length,
    })
    const hydrationRatio = hydrationAdequacyRatio(payload.nutrition.water_cups_per_day, bodyMassKg)

    const { error: nutritionError } = await supabase.from('nutrition_profile').upsert(
      {
        user_id: userId,
        diet_pattern: payload.nutrition.diet_pattern,
        protein_portions_per_day: payload.nutrition.protein_portions_per_day ?? null,
        estimated_protein_grams: payload.nutrition.estimated_protein_grams ?? null,
        water_cups_per_day: payload.nutrition.water_cups_per_day ?? null,
        caffeine_mg_per_day: payload.nutrition.caffeine_mg_per_day ?? null,
        pre_workout_pattern: payload.nutrition.pre_workout_pattern ?? null,
        allergies: payload.nutrition.allergies,
        supplements: payload.nutrition.supplements,
        known_deficiencies: payload.nutrition.known_deficiencies,
        red_s_risk_score: redSRisk.riskScore,
        protein_adequacy_ratio: proteinAdequacyRatio,
        hydration_adequacy_ratio: hydrationRatio,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    )

    if (nutritionError) {
      return {
        success: false as const,
        error: 'Unable to save the Phase 2 nutrition profile.',
        details: nutritionError.message as string,
      }
    }

    nutritionResult = {
      red_s_risk_score: redSRisk.riskScore,
      red_s_flag: redSRisk.flag,
      protein_adequacy_ratio: proteinAdequacyRatio,
      hydration_adequacy_ratio: hydrationRatio,
    }
  }

  let psychologicalResult: Record<string, unknown> | null = null
  if (payload.day === 'day6_psych_sleep') {
    const psychologicalRows: Array<Record<string, unknown>> = []

    if (payload.apsq10) {
      const apsq = scoreApsq10(payload.apsq10.responses)
      psychologicalRows.push({
        user_id: userId,
        assessment_type: 'apsq_10',
        responses: { responses: payload.apsq10.responses, scale: '0_to_4' },
        total_score: apsq.totalScore,
        subscale_scores: {},
        flag_level: apsq.flagLevel,
        recommendation_shown:
          apsq.flagLevel === 'red'
            ? 'High stress load flagged. Keep training conservative and consider support if this persists.'
            : apsq.flagLevel === 'amber'
              ? 'Moderate stress load flagged. Recovery and sleep consistency should influence training.'
              : 'Stress load is not currently limiting onboarding confidence.',
        assessed_at: nowIso,
      })
      psychologicalResult = {
        apsq_total_score: apsq.totalScore,
        apsq_flag: apsq.flagLevel,
      }
    }

    if (payload.sleep_baseline) {
      const sleepFlag = sleepFlagLevel({
        avgSleepHours: payload.sleep_baseline.avg_sleep_hours,
        sleepQuality1To5: payload.sleep_baseline.sleep_quality_1_to_5,
        lifeStress1To5: payload.life_stress_1_to_5,
      })
      psychologicalRows.push({
        user_id: userId,
        assessment_type: 'sleep_baseline',
        responses: {
          ...payload.sleep_baseline,
          life_stress_1_to_5: payload.life_stress_1_to_5 ?? null,
        },
        total_score: null,
        subscale_scores: {},
        flag_level: sleepFlag,
        recommendation_shown:
          sleepFlag === 'red'
            ? 'Sleep is likely limiting adaptation. Keep intensity conservative until the pattern improves.'
            : sleepFlag === 'amber'
              ? 'Sleep is a watch item. Creeda will bias recommendations toward recoverability.'
              : 'Sleep baseline supports normal progression once other data agrees.',
        assessed_at: nowIso,
      })
      psychologicalResult = {
        ...(psychologicalResult ?? {}),
        sleep_flag: sleepFlag,
      }
    }

    if (psychologicalRows.length > 0) {
      const { error: psychError } = await supabase
        .from('psychological_assessments')
        .insert(psychologicalRows)

      if (psychError) {
        return {
          success: false as const,
          error: 'Unable to save the Phase 2 APSQ or sleep baseline.',
          details: psychError.message as string,
        }
      }
    }
  }

  let environmentalResult: Record<string, unknown> | null = null
  if (payload.day === 'day7_environment') {
    const modifier = computeEnvironmentalModifier({
      heatIndexC: payload.heat_index_c,
      aqi: payload.aqi,
      altitudeMeters: payload.environment.altitude_meters,
    })
    const { error: environmentError } = await supabase.from('environmental_context').upsert(
      {
        user_id: userId,
        primary_training_city: payload.environment.primary_training_city,
        primary_training_lat: payload.environment.primary_training_lat ?? null,
        primary_training_lng: payload.environment.primary_training_lng ?? null,
        altitude_meters: payload.environment.altitude_meters ?? null,
        indoor_outdoor_split_pct: payload.environment.indoor_outdoor_split_pct ?? null,
        sleep_environment: payload.environment.sleep_environment ?? null,
        commute_minutes: payload.environment.commute_minutes ?? null,
        commute_mode: cleanOptionalText(payload.environment.commute_mode),
        travel_frequency: payload.environment.travel_frequency ?? null,
        current_high_stress_phase: payload.environment.current_high_stress_phase,
        high_stress_reason: payload.environment.current_high_stress_phase
          ? cleanOptionalText(payload.environment.high_stress_reason)
          : null,
        caregiving_responsibilities: payload.environment.caregiving_responsibilities,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    )

    if (environmentError) {
      return {
        success: false as const,
        error: 'Unable to save the Phase 2 environment context.',
        details: environmentError.message as string,
      }
    }

    environmentalResult = {
      environmental_modifier: modifier,
      heat_index_c: payload.heat_index_c ?? null,
      aqi: payload.aqi ?? null,
      training_surface: payload.training_surface ?? null,
      heat_acclimated: payload.heat_acclimated ?? null,
    }
  }

  const confidence = computeConfidence({
    daysSinceOnboarding: completedDays.length,
    dataPointsCollected: 30 + completedDays.length * 5 + capacityRows.length,
    hasWearable: false,
    movementScansCount: completedDays.includes('day3_movement_quality') ? 1 : 0,
    capacityTestsCompleted: capacityRows.length,
    daysOfChronicLoad: 4,
    daysOfCheckIns: completedDays.length,
  })
  const profileCalibrationPct = Math.min(
    100,
    Math.max(currentCalibration, PHASE2_DAY_CALIBRATION[payload.day], confidence.pct)
  )
  const onboardingPhase = payload.day === 'day7_environment' ? 3 : 2

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      onboarding_phase: onboardingPhase,
      profile_calibration_pct: profileCalibrationPct,
    })
    .eq('id', userId)

  if (profileError) {
    return {
      success: false as const,
      error: 'Phase 2 saved, but profile calibration could not be updated.',
      details: profileError.message as string,
    }
  }

  const latestDayRecord = {
    day: payload.day,
    label: PHASE2_DAY_LABELS[payload.day],
    captured_at: nowIso,
    capacity_tests_count: capacityRows.length,
    nutrition: nutritionResult,
    psychological: psychologicalResult,
    environment: environmentalResult,
  }

  const { error: adaptiveProfileError } = await supabase.from('adaptive_form_profiles').upsert(
    {
      user_id: userId,
      role: payload.persona,
      flow_id: 'onboarding_v2_phase2',
      flow_version: '2026-04-26',
      core_fields: {
        phase: 2,
        persona: payload.persona,
      },
      optional_fields: {
        ...existingOptionalFields,
        completed_days: completedDays,
        latest_day: latestDayRecord,
        day_payloads: {
          ...(existingOptionalFields.day_payloads &&
          typeof existingOptionalFields.day_payloads === 'object'
            ? existingOptionalFields.day_payloads
            : {}),
          [payload.day]: payload,
        },
      },
      inferred_fields: {
        ...existingInferredFields,
        profile_calibration_pct: profileCalibrationPct,
        confidence,
        nutrition: nutritionResult,
        psychological: psychologicalResult,
        environment: environmentalResult,
      },
      completion_score: Math.round((completedDays.length / 7) * 100),
      confidence_score: confidence.pct,
      confidence_level: confidenceLevelForAdaptiveForms(confidence.tier),
      confidence_recommendations:
        payload.day === 'day7_environment'
          ? ['Daily check-ins', 'Training plan adherence', 'Repeat capacity baselines']
          : ['Complete the remaining Phase 2 diagnostic days'],
      next_question_ids:
        payload.day === 'day7_environment'
          ? ['daily_checkin', 'plan_feedback']
          : ['phase2_next_day'],
      onboarding_v2_phase: 2,
      completion_seconds: payload.completion_seconds ?? null,
      confidence_pct: confidence.pct,
    },
    { onConflict: 'user_id,role,flow_id' }
  )

  if (adaptiveProfileError) {
    return {
      success: false as const,
      error: 'Phase 2 saved, but adaptive calibration could not be updated.',
      details: adaptiveProfileError.message as string,
    }
  }

  await trackOnboardingV2EventForUser({
    supabase,
    userId,
    event: {
      event_name: 'onb.screen.completed',
      persona: payload.persona,
      phase: 2,
      screen: payload.day,
      source: payload.source,
      completion_seconds: payload.completion_seconds,
      metadata: {
        completed_days: completedDays,
        profile_calibration_pct: profileCalibrationPct,
        capacity_tests_count: capacityRows.length,
        nutrition: nutritionResult,
        psychological: psychologicalResult,
        environment: environmentalResult,
      },
    },
  })

  return {
    success: true as const,
    day: payload.day,
    completedDays,
    profileCalibrationPct,
    confidence,
    destination:
      payload.day === 'day7_environment'
        ? ONBOARDING_V2_PHASE2_COMPLETE_DESTINATIONS[payload.persona]
        : `/onboarding/phase-2?day=${encodeURIComponent(payload.day)}`,
    latestDay: latestDayRecord,
  }
}

export async function persistOnboardingV2DailyRitual(args: {
  supabase: SupabaseLike
  userId: string
  payload: OnboardingV2DailyRitualSubmission
}) {
  const { supabase, userId, payload } = args
  const nowIso = new Date().toISOString()
  const date = payload.date ?? isoDate()
  const branchFlags = {
    sleep_followup: payload.energy <= 2,
    pain_followup: payload.body_feel <= 2,
    stress_followup: payload.mental_load >= 4,
    recovery_requested: payload.wants_recovery_day,
  }

  const { error: checkInError } = await supabase.from('daily_check_ins').upsert(
    {
      user_id: userId,
      date,
      energy: payload.energy,
      body_feel: payload.body_feel,
      mental_load: payload.mental_load,
      sleep_hours_self: payload.sleep_hours_self ?? null,
      sleep_quality_self: payload.sleep_quality_self ?? null,
      pain_locations: payload.pain_locations,
      pain_scores: payload.pain_scores,
      completion_seconds: payload.completion_seconds ?? null,
      source: payload.source,
      completed_at: nowIso,
    },
    { onConflict: 'user_id,date' }
  )

  if (checkInError) {
    return {
      success: false as const,
      error: 'Unable to save the daily ritual check-in.',
      details: checkInError.message as string,
    }
  }

  const [
    { data: profile },
    { data: checkInRows },
    { data: loadRows },
    { data: movementRows },
    { data: adaptiveProfile },
    { data: medicalRow },
    { data: orthoRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('profile_calibration_pct')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('daily_check_ins')
      .select('date')
      .eq('user_id', userId)
      .gte('date', daysAgo(27)),
    supabase
      .from('training_load_history')
      .select('date,total_duration_minutes,average_rpe')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(28),
    supabase
      .from('movement_baselines')
      .select('movement_quality_score')
      .eq('user_id', userId)
      .eq('passed_quality_gate', true)
      .order('performed_at', { ascending: false })
      .limit(1),
    supabase
      .from('adaptive_form_profiles')
      .select('optional_fields,inferred_fields')
      .eq('user_id', userId)
      .eq('role', payload.persona)
      .eq('flow_id', 'onboarding_v2_daily_ritual')
      .maybeSingle(),
    supabase
      .from('medical_screenings')
      .select('modified_mode_active, medical_clearance_provided')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('orthopedic_history')
      .select('severity, currently_symptomatic')
      .eq('user_id', userId)
      .eq('currently_symptomatic', true),
  ])

  const checkInCount = Array.isArray(checkInRows) ? checkInRows.length : 1
  const loadEntries = trainingLoadEntriesFromRows(loadRows)
  const acwr = loadEntries.length > 0 ? computeACWR(loadEntries) : undefined
  const movementQualityLatest = latestMovementQualityFromRows(movementRows)
  const sleep = sleepInputFromDailyRitual(payload)
  const dataPointsCount =
    36 +
    checkInCount * 3 +
    payload.pain_locations.length +
    (payload.apsq3?.length ?? 0) +
    (sleep ? 2 : 0)
  const medicalModified =
    Boolean((medicalRow as { modified_mode_active?: boolean } | null)?.modified_mode_active) &&
    !Boolean(
      (medicalRow as { medical_clearance_provided?: boolean } | null)?.medical_clearance_provided
    )
  const symptomaticOrthoModified = Array.isArray(orthoRows)
    ? orthoRows.some((row) => {
        const record = row as { severity?: string; currently_symptomatic?: boolean } | null
        return (
          record?.currently_symptomatic && record?.severity && record.severity !== 'annoying'
        )
      })
    : false
  const modifiedMode = medicalModified || symptomaticOrthoModified

  const confidence = computeConfidence({
    daysSinceOnboarding: checkInCount,
    dataPointsCollected: dataPointsCount,
    hasWearable: false,
    movementScansCount: movementQualityLatest !== undefined ? 1 : 0,
    capacityTestsCompleted: movementQualityLatest !== undefined ? 1 : 0,
    daysOfChronicLoad: Math.min(28, loadEntries.length),
    daysOfCheckIns: checkInCount,
  })
  const readiness = computeReadiness({
    subjective: {
      energy: payload.wants_recovery_day ? Math.min(payload.energy, 2) : payload.energy,
      body_feel: payload.wants_recovery_day ? Math.min(payload.body_feel, 2) : payload.body_feel,
      mental_load: payload.mental_load,
    },
    sleep,
    acwr,
    movementQualityLatest,
    confidence,
    modifiedMode,
  })

  const { error: readinessError } = await supabase.from('readiness_scores').upsert(
    {
      user_id: userId,
      date,
      score: readiness.score,
      confidence_tier: readiness.confidence.tier,
      confidence_pct: readiness.confidence.pct,
      data_points_count: dataPointsCount,
      drivers: readiness.drivers,
      missing_inputs: readiness.missing,
      directive: readiness.directive,
      computed_at: nowIso,
    },
    { onConflict: 'user_id,date' }
  )

  if (readinessError) {
    return {
      success: false as const,
      error: 'Daily ritual saved, but readiness could not be recalculated.',
      details: readinessError.message as string,
    }
  }

  const profileRecord =
    profile && typeof profile === 'object' ? (profile as Record<string, unknown>) : {}
  const currentCalibration = numberFromProfile(profileRecord.profile_calibration_pct) ?? 0
  const profileCalibrationPct = Math.min(
    100,
    Math.max(currentCalibration, Math.min(95, currentCalibration + 2), confidence.pct)
  )

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      onboarding_phase: 3,
      profile_calibration_pct: profileCalibrationPct,
    })
    .eq('id', userId)

  if (profileError) {
    return {
      success: false as const,
      error: 'Daily ritual saved, but profile calibration could not be updated.',
      details: profileError.message as string,
    }
  }

  const adaptiveRecord =
    adaptiveProfile && typeof adaptiveProfile === 'object'
      ? (adaptiveProfile as Record<string, unknown>)
      : {}
  const existingOptionalFields =
    adaptiveRecord.optional_fields && typeof adaptiveRecord.optional_fields === 'object'
      ? (adaptiveRecord.optional_fields as Record<string, unknown>)
      : {}
  const existingInferredFields =
    adaptiveRecord.inferred_fields && typeof adaptiveRecord.inferred_fields === 'object'
      ? (adaptiveRecord.inferred_fields as Record<string, unknown>)
      : {}
  const completedDates = Array.from(
    new Set([...completedDailyRitualDatesFrom(existingOptionalFields), date])
  ).slice(-28)

  const { error: adaptiveProfileError } = await supabase.from('adaptive_form_profiles').upsert(
    {
      user_id: userId,
      role: payload.persona,
      flow_id: 'onboarding_v2_daily_ritual',
      flow_version: '2026-04-26',
      core_fields: {
        phase: 3,
        persona: payload.persona,
      },
      optional_fields: {
        ...existingOptionalFields,
        completed_dates: completedDates,
        latest_checkin: {
          date,
          energy: payload.energy,
          body_feel: payload.body_feel,
          mental_load: payload.mental_load,
          sleep_hours_self: payload.sleep_hours_self ?? null,
          sleep_quality_self: payload.sleep_quality_self ?? null,
          pain_locations: payload.pain_locations,
          apsq3_present: Boolean(payload.apsq3),
          branch_flags: branchFlags,
          captured_at: nowIso,
        },
      },
      inferred_fields: {
        ...existingInferredFields,
        readiness,
        profile_calibration_pct: profileCalibrationPct,
        confidence,
        movement_quality_latest: movementQualityLatest ?? null,
        acwr: acwr ?? null,
      },
      completion_score: Math.min(100, 80 + completedDates.length),
      confidence_score: confidence.pct,
      confidence_level: confidenceLevelForAdaptiveForms(confidence.tier),
      confidence_recommendations: readiness.missing,
      next_question_ids: ['tomorrow_daily_ritual', 'plan_feedback'],
      onboarding_v2_phase: 3,
      completion_seconds: payload.completion_seconds ?? null,
      confidence_pct: confidence.pct,
    },
    { onConflict: 'user_id,role,flow_id' }
  )

  if (adaptiveProfileError) {
    return {
      success: false as const,
      error: 'Daily ritual saved, but adaptive calibration could not be updated.',
      details: adaptiveProfileError.message as string,
    }
  }

  await trackOnboardingV2EventForUser({
    supabase,
    userId,
    event: {
      event_name: 'onb.screen.completed',
      persona: payload.persona,
      phase: 3,
      screen: 'daily_ritual',
      source: payload.source,
      completion_seconds: payload.completion_seconds,
      metadata: {
        date,
        branch_flags: branchFlags,
        readiness_score: readiness.score,
        profile_calibration_pct: profileCalibrationPct,
        confidence_pct: confidence.pct,
      },
    },
  })

  return {
    success: true as const,
    date,
    readiness,
    confidence,
    profileCalibrationPct,
    completedDates,
    branchFlags,
    destination: ONBOARDING_V2_DAILY_RITUAL_DESTINATIONS[payload.persona],
  }
}

export async function persistOnboardingV2MovementBaseline(args: {
  supabase: SupabaseLike
  userId: string
  payload: OnboardingV2MovementBaselineSubmission
}) {
  const { supabase, userId, payload } = args
  const nowIso = new Date().toISOString()
  const today = isoDate()

  const confidence = computeConfidence({
    daysSinceOnboarding: 0,
    dataPointsCollected: 24 + payload.weak_links.length,
    hasWearable: false,
    movementScansCount: 1,
    capacityTestsCompleted: 1,
    daysOfChronicLoad: 4,
    daysOfCheckIns: 0,
  })

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_calibration_pct')
    .eq('id', userId)
    .maybeSingle()

  const currentCalibration = Number(
    (profile && typeof profile === 'object'
      ? (profile as Record<string, unknown>).profile_calibration_pct
      : 0) ?? 0
  )
  const profileCalibrationPct = Math.min(100, Math.max(currentCalibration + 12, confidence.pct))

  const { error: movementError } = await supabase.from('movement_baselines').insert({
    user_id: userId,
    scan_type: payload.scan_type,
    full_body_coverage_pct: payload.full_body_coverage_pct,
    motion_evidence_score: payload.motion_evidence_score,
    passed_quality_gate: payload.passed_quality_gate,
    rejection_reason: payload.rejection_reason ?? null,
    knee_valgus_deg_left: payload.geometry.knee_valgus_deg_left,
    knee_valgus_deg_right: payload.geometry.knee_valgus_deg_right,
    ankle_dorsiflexion_deg_left: payload.geometry.ankle_dorsiflexion_deg_left,
    ankle_dorsiflexion_deg_right: payload.geometry.ankle_dorsiflexion_deg_right,
    thoracic_extension_deg: payload.geometry.thoracic_extension_deg,
    hip_shoulder_asymmetry_deg: payload.geometry.hip_shoulder_asymmetry_deg,
    squat_depth_ratio: payload.geometry.squat_depth_ratio,
    movement_quality_score: payload.movement_quality_score,
    weak_links: payload.weak_links,
    raw_landmarks_url: null,
    device_meta: {
      ...payload.device_meta,
      report_id: payload.report_id,
      sport_id: payload.sport_id,
      source: payload.source,
      privacy: 'no_raw_video_or_landmarks_stored',
    },
    performed_at: nowIso,
  })

  if (movementError) {
    return {
      success: false as const,
      error: 'Unable to save the movement baseline.',
      details: movementError.message as string,
    }
  }

  const { error: capacityError } = await supabase.from('capacity_tests').insert({
    user_id: userId,
    test_type: 'overhead_squat_baseline',
    test_method: 'in_app_camera',
    raw_value: payload.movement_quality_score,
    unit: 'score_0_100',
    derived_metrics: {
      report_id: payload.report_id,
      sport_id: payload.sport_id,
      geometry: payload.geometry,
      weak_links: payload.weak_links,
      full_body_coverage_pct: payload.full_body_coverage_pct,
      motion_evidence_score: payload.motion_evidence_score,
    },
    quality_score: payload.movement_quality_score,
    rejection_reason: payload.passed_quality_gate ? null : payload.rejection_reason,
    mediapipe_landmarks: null,
    performed_at: nowIso,
  })

  if (capacityError) {
    return {
      success: false as const,
      error: 'Movement baseline saved, but capacity baseline could not be saved.',
      details: capacityError.message as string,
    }
  }

  const [{ data: loadRows }, { data: medicalRow }] = await Promise.all([
    supabase
      .from('training_load_history')
      .select('date,total_duration_minutes,average_rpe')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(28),
    supabase
      .from('medical_screenings')
      .select('modified_mode_active, medical_clearance_provided')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const loadEntries = trainingLoadEntriesFromRows(loadRows)
  const acwr = loadEntries.length > 0 ? computeACWR(loadEntries) : undefined
  const modifiedMode =
    Boolean((medicalRow as { modified_mode_active?: boolean } | null)?.modified_mode_active) &&
    !Boolean(
      (medicalRow as { medical_clearance_provided?: boolean } | null)?.medical_clearance_provided
    )
  const readiness = computeReadiness({
    subjective: {
      energy: 3,
      body_feel: payload.movement_quality_score >= 70 ? 3 : 2,
      mental_load: 3,
    },
    acwr,
    movementQualityLatest: payload.movement_quality_score,
    confidence,
    modifiedMode,
  })

  const { error: readinessError } = await supabase
    .from('readiness_scores')
    .upsert(
      {
        user_id: userId,
        date: today,
        score: readiness.score,
        confidence_tier: readiness.confidence.tier,
        confidence_pct: readiness.confidence.pct,
        data_points_count: 25 + payload.weak_links.length,
        drivers: readiness.drivers,
        missing_inputs: readiness.missing,
        directive: readiness.directive,
        computed_at: nowIso,
      },
      { onConflict: 'user_id,date' }
    )

  if (readinessError) {
    return {
      success: false as const,
      error: 'Movement baseline saved, but readiness could not be recalculated.',
      details: readinessError.message as string,
    }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      onboarding_phase: 2,
      profile_calibration_pct: profileCalibrationPct,
    })
    .eq('id', userId)

  if (profileError) {
    return {
      success: false as const,
      error: 'Movement baseline saved, but profile calibration could not be updated.',
      details: profileError.message as string,
    }
  }

  const { data: adaptiveProfile } = await supabase
    .from('adaptive_form_profiles')
    .select('optional_fields,inferred_fields')
    .eq('user_id', userId)
    .eq('role', payload.persona)
    .eq('flow_id', 'onboarding_v2_phase1')
    .maybeSingle()

  const adaptiveRecord =
    adaptiveProfile && typeof adaptiveProfile === 'object'
      ? (adaptiveProfile as Record<string, unknown>)
      : {}

  await supabase
    .from('adaptive_form_profiles')
    .update({
      optional_fields: {
        ...(adaptiveRecord.optional_fields && typeof adaptiveRecord.optional_fields === 'object'
          ? adaptiveRecord.optional_fields
          : {}),
        movement_baseline: {
          report_id: payload.report_id,
          movement_quality_score: payload.movement_quality_score,
          weak_links_count: payload.weak_links.length,
          captured_at: nowIso,
        },
      },
      inferred_fields: {
        ...(adaptiveRecord.inferred_fields && typeof adaptiveRecord.inferred_fields === 'object'
          ? adaptiveRecord.inferred_fields
          : {}),
        latest_movement_baseline: {
          score: payload.movement_quality_score,
          geometry: payload.geometry,
          weak_links: payload.weak_links,
        },
        readiness,
        profile_calibration_pct: profileCalibrationPct,
      },
      confidence_score: confidence.pct,
      confidence_level: confidenceLevelForAdaptiveForms(confidence.tier),
      confidence_pct: confidence.pct,
      next_question_ids: ['daily_checkin', 'capacity_baseline'],
    })
    .eq('user_id', userId)
    .eq('role', payload.persona)
    .eq('flow_id', 'onboarding_v2_phase1')

  await trackOnboardingV2EventForUser({
    supabase,
    userId,
    event: {
      event_name: 'onb.screen.completed',
      persona: payload.persona,
      phase: 1,
      screen: 'movement_baseline',
      source: payload.source,
      completion_seconds: payload.completion_seconds,
      metadata: {
        report_id: payload.report_id,
        movement_quality_score: payload.movement_quality_score,
        weak_links_count: payload.weak_links.length,
        confidence_pct: confidence.pct,
      },
    },
  })

  return {
    success: true as const,
    profileCalibrationPct,
    confidence,
    readiness,
    movementQualityScore: payload.movement_quality_score,
    weakLinks: payload.weak_links,
  }
}
