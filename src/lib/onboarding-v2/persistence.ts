import { computeACWR, computeConfidence, computeReadiness } from '@creeda/engine'
import {
  calcChronicLoadFromSnapshot,
  isAnyParqYes,
  type OnboardingV2Event,
  type OnboardingV2MovementBaselineSubmission,
  type OnboardingV2Phase1Submission,
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
      priority: 'A',
      sport,
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

  const { data: loadRows } = await supabase
    .from('training_load_history')
    .select('date,total_duration_minutes,average_rpe')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(28)

  const loadEntries = trainingLoadEntriesFromRows(loadRows)
  const acwr = loadEntries.length > 0 ? computeACWR(loadEntries) : undefined
  const readiness = computeReadiness({
    subjective: {
      energy: 3,
      body_feel: payload.movement_quality_score >= 70 ? 3 : 2,
      mental_load: 3,
    },
    acwr,
    movementQualityLatest: payload.movement_quality_score,
    confidence,
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
