'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifyRole } from '@/lib/auth_utils'
import {
  createDailyContextSignalRecord,
  saveDailyContextSignal,
  summarizeDailyContextSignals,
  type AQIBand,
  type FastingState,
  type HeatLevel,
  type HumidityLevel,
} from '@/lib/context-signals/storage'
import { isHealthStorageMissingError, selectRecentHealthMetrics } from '@/lib/health/storage'
import {
  computeFitStartJourney,
  normalizeIndividualOccupation,
  recomputeDailyJourney,
  type NormalIndividualFitStartInput,
  type IndividualCurrentState,
  type IndividualJourneyState,
  type IndividualPlanEngine,
  type DeviceRecoverySignal,
} from '@/lib/individual_performance_engine'

type IndividualSignalPayload = {
  sleep_quality: number | string
  energy_level: number | string
  stress_level: number | string
  recovery_feel: number | string
  soreness_level: number | string
  session_completion: 'missed' | 'partial' | 'complete' | 'crushed'
  training_minutes: number
  session_rpe: number
  steps: number
  hydration_liters: number
  heat_level?: HeatLevel | ''
  humidity_level?: HumidityLevel | ''
  aqi_band?: AQIBand | ''
  commute_minutes?: number
  exam_stress_score?: number
  fasting_state?: FastingState | ''
  shift_work?: boolean
  session_notes?: string
}

type AggregatedHealthMetric = {
  metricDate: string
  steps: number
  sleepHours: number
  heartRateAvg: number | null
  hrv: number | null
  source: 'apple' | 'android' | 'mixed' | 'unknown'
}

function getTodayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

function labelToScore(value: number | string, kind: 'positive' | 'stress' | 'soreness') {
  if (typeof value === 'number') return Math.max(1, Math.min(5, Math.round(value)))
  const normalized = value.trim().toLowerCase()
  const positiveMap: Record<string, number> = {
    poor: 1,
    drained: 1,
    low: 2,
    okay: 3,
    moderate: 3,
    good: 4,
    high: 4,
    excellent: 5,
    peak: 5,
  }
  const stressMap: Record<string, number> = {
    low: 1,
    moderate: 3,
    high: 4,
    'very high': 5,
  }
  const sorenessMap: Record<string, number> = {
    none: 1,
    low: 2,
    moderate: 3,
    high: 4,
    severe: 5,
  }

  const table = kind === 'positive' ? positiveMap : kind === 'stress' ? stressMap : sorenessMap
  return table[normalized] || 3
}

function toJourneyStatus(readiness: number) {
  if (readiness < 45) return { status: 'RECOVER', reason: 'Low readiness detected. Recovery bias activated.' }
  if (readiness < 62) return { status: 'BUILD', reason: 'Moderate readiness. Build quality with controlled load.' }
  if (readiness < 80) return { status: 'TRAIN', reason: 'Stable readiness. Execute planned progression.' }
  return { status: 'PUSH', reason: 'High readiness. Prime day for quality intensity.' }
}

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => Number.isFinite(value))
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function toUtcDayStamp(ymd: string) {
  const [year, month, day] = ymd.split('-').map((part) => Number(part))
  if (!year || !month || !day) return null
  return Date.UTC(year, month - 1, day)
}

function dayDifference(currentDate: string, pastDate: string) {
  const currentStamp = toUtcDayStamp(currentDate)
  const pastStamp = toUtcDayStamp(pastDate)
  if (currentStamp === null || pastStamp === null) return 999
  return Math.max(0, Math.round((currentStamp - pastStamp) / (24 * 60 * 60 * 1000)))
}

function aggregateHealthMetrics(rows: Array<Record<string, unknown>>): AggregatedHealthMetric[] {
  const bucket = new Map<
    string,
    {
      stepsTotal: number
      sleepTotal: number
      rowCount: number
      heartRateValues: number[]
      hrvValues: number[]
      sources: Set<'apple' | 'android'>
    }
  >()

  for (const row of rows) {
    const metricDate = String(row.metric_date || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(metricDate)) continue

    const entry =
      bucket.get(metricDate) ||
      {
        stepsTotal: 0,
        sleepTotal: 0,
        rowCount: 0,
        heartRateValues: [] as number[],
        hrvValues: [] as number[],
        sources: new Set<'apple' | 'android'>(),
      }

    const steps = toFiniteNumber(row.steps)
    const sleepHours = toFiniteNumber(row.sleep_hours)
    const heartRate = toFiniteNumber(row.heart_rate_avg)
    const hrv = toFiniteNumber(row.hrv)
    const source = String(row.source || '').toLowerCase()

    entry.stepsTotal += Math.max(0, steps ?? 0)
    entry.sleepTotal += Math.max(0, sleepHours ?? 0)
    entry.rowCount += 1

    if (heartRate !== null && heartRate > 0) entry.heartRateValues.push(heartRate)
    if (hrv !== null && hrv > 0) entry.hrvValues.push(hrv)
    if (source === 'apple' || source === 'android') entry.sources.add(source)

    bucket.set(metricDate, entry)
  }

  return [...bucket.entries()]
    .map(([metricDate, entry]) => {
      const source =
        entry.sources.size > 1 ? 'mixed' : entry.sources.has('apple') ? 'apple' : entry.sources.has('android') ? 'android' : 'unknown'
      const heartRateAvg = average(entry.heartRateValues)
      const hrvAvg = average(entry.hrvValues)

      return {
        metricDate,
        steps: Math.round(entry.stepsTotal / Math.max(1, entry.rowCount)),
        sleepHours: Number((entry.sleepTotal / Math.max(1, entry.rowCount)).toFixed(2)),
        heartRateAvg: heartRateAvg === null ? null : Number(heartRateAvg.toFixed(2)),
        hrv: hrvAvg === null ? null : Number(hrvAvg.toFixed(2)),
        source,
      } satisfies AggregatedHealthMetric
    })
    .sort((a, b) => b.metricDate.localeCompare(a.metricDate))
}

function buildDeviceRecoverySignal(args: {
  healthMetrics: AggregatedHealthMetric[]
  logDate: string
  stepTarget: number
  sleepTargetHours: number
}): DeviceRecoverySignal | null {
  if (!args.healthMetrics.length) return null

  const latest = args.healthMetrics[0]
  const baselineWindow = args.healthMetrics.slice(1, 7)
  const baselineHeartRate = average(baselineWindow.map((metric) => metric.heartRateAvg))
  const baselineHrv = average(baselineWindow.map((metric) => metric.hrv))

  const freshnessDays = dayDifference(args.logDate, latest.metricDate)
  const stepTarget = Math.max(3000, Number(args.stepTarget) || 8000)
  const sleepTarget = Math.max(6, Number(args.sleepTargetHours) || 8)

  const sleepScore = clampScore((latest.sleepHours / sleepTarget) * 100, 20, 100)
  const activityScore = clampScore((latest.steps / stepTarget) * 100, 15, 100)

  let heartRateScore = 62
  if (latest.heartRateAvg !== null) {
    if (baselineHeartRate !== null && baselineHeartRate > 0) {
      const deltaPct = ((latest.heartRateAvg - baselineHeartRate) / baselineHeartRate) * 100
      heartRateScore = clampScore(78 - (deltaPct * 2.4), 15, 100)
    } else {
      heartRateScore = clampScore(100 - Math.max(0, latest.heartRateAvg - 52) * 1.2, 20, 95)
    }
  }

  let hrvScore = 62
  if (latest.hrv !== null) {
    if (baselineHrv !== null && baselineHrv > 0) {
      const ratio = latest.hrv / baselineHrv
      hrvScore = clampScore(68 + ((ratio - 1) * 130), 15, 100)
    } else {
      hrvScore = clampScore(36 + latest.hrv * 0.85, 20, 100)
    }
  }

  const recoveryPulse = clampScore(
    sleepScore * 0.38 +
      activityScore * 0.2 +
      heartRateScore * 0.2 +
      hrvScore * 0.22,
    0,
    100
  )

  const freshnessWeight =
    freshnessDays <= 0 ? 1 : freshnessDays === 1 ? 0.82 : freshnessDays === 2 ? 0.62 : freshnessDays === 3 ? 0.4 : 0
  const metricCoverage =
    [
      latest.sleepHours > 0,
      latest.steps > 0,
      latest.heartRateAvg !== null,
      latest.hrv !== null,
    ].filter(Boolean).length / 4

  const influenceWeight = Number((0.35 * freshnessWeight * (0.65 + metricCoverage * 0.35)).toFixed(2))

  return {
    available: influenceWeight > 0,
    metricDate: latest.metricDate,
    freshnessDays,
    source: latest.source,
    influenceWeight,
    recoveryPulse: Number(recoveryPulse.toFixed(1)),
    sleepScore: Number(sleepScore.toFixed(1)),
    activityScore: Number(activityScore.toFixed(1)),
    heartRateScore: Number(heartRateScore.toFixed(1)),
    hrvScore: Number(hrvScore.toFixed(1)),
    steps: latest.steps,
    sleepHours: latest.sleepHours,
    heartRateAvg: latest.heartRateAvg,
    hrv: latest.hrv,
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readArray(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string')
  return fallback
}

function normalizeRawFitStartInput(raw: unknown): NormalIndividualFitStartInput | null {
  if (!isPlainObject(raw)) return null
  const basic = isPlainObject(raw.basic) ? raw.basic : null
  const physiology = isPlainObject(raw.physiology) ? raw.physiology : null
  const lifestyle = isPlainObject(raw.lifestyle) ? raw.lifestyle : null
  const goals = isPlainObject(raw.goals) ? raw.goals : null
  const sport = isPlainObject(raw.sport) ? raw.sport : null
  if (!basic || !physiology || !lifestyle || !goals || !sport) return null

  return {
    basic: {
      age: Number(basic.age) || 28,
      gender: String(basic.gender || 'Prefer not to say'),
      heightCm: Number(basic.heightCm) || 170,
      weightKg: Number(basic.weightKg) || 70,
      occupation: normalizeIndividualOccupation(String(basic.occupation || '')) || 'hybrid',
      activityLevel: (['sedentary', 'moderate', 'active'].includes(String(basic.activityLevel))
        ? String(basic.activityLevel)
        : 'moderate') as NormalIndividualFitStartInput['basic']['activityLevel'],
    },
    physiology: {
      sleepQuality: Number(physiology.sleepQuality) || 3,
      energyLevels: Number(physiology.energyLevels) || 3,
      stressLevels: Number(physiology.stressLevels) || 3,
      recoveryRate: Number(physiology.recoveryRate) || 3,
      injuryHistory: (['none', 'minor', 'moderate', 'major', 'chronic'].includes(String(physiology.injuryHistory))
        ? String(physiology.injuryHistory)
        : 'none') as NormalIndividualFitStartInput['physiology']['injuryHistory'],
      mobilityLimitations: (['none', 'mild', 'moderate', 'severe'].includes(String(physiology.mobilityLimitations))
        ? String(physiology.mobilityLimitations)
        : 'none') as NormalIndividualFitStartInput['physiology']['mobilityLimitations'],
      trainingExperience: (['beginner', 'novice', 'intermediate', 'advanced', 'experienced'].includes(String(physiology.trainingExperience))
        ? String(physiology.trainingExperience)
        : 'novice') as NormalIndividualFitStartInput['physiology']['trainingExperience'],
      endurance_capacity: Number(physiology.endurance_capacity) || 2,
      strength_capacity: Number(physiology.strength_capacity) || 2,
      explosive_power: Number(physiology.explosive_power) || 2,
      agility_control: Number(physiology.agility_control) || 2,
      reaction_self_perception: Number(physiology.reaction_self_perception) || 2,
      recovery_efficiency: Number(physiology.recovery_efficiency) || 2,
      fatigue_resistance: Number(physiology.fatigue_resistance) || 2,
      load_tolerance: Number(physiology.load_tolerance) || 2,
      movement_robustness: Number(physiology.movement_robustness) || 2,
      coordination_control: Number(physiology.coordination_control) || 2,
      reaction_time_ms: Number(physiology.reaction_time_ms) || undefined,
    },
    lifestyle: {
      scheduleConstraints: readArray(lifestyle.scheduleConstraints, ['after_work']),
      equipmentAccess: readArray(lifestyle.equipmentAccess, ['bodyweight']),
      nutritionHabits: (['poor', 'basic', 'good', 'structured'].includes(String(lifestyle.nutritionHabits))
        ? String(lifestyle.nutritionHabits)
        : 'basic') as NormalIndividualFitStartInput['lifestyle']['nutritionHabits'],
      sedentaryHours: Number(lifestyle.sedentaryHours) || 7,
    },
    goals: {
      primaryGoal: (['fat_loss', 'muscle_gain', 'endurance', 'general_fitness', 'sport_specific'].includes(String(goals.primaryGoal))
        ? String(goals.primaryGoal)
        : 'general_fitness') as NormalIndividualFitStartInput['goals']['primaryGoal'],
      timeHorizon: (['4_weeks', '8_weeks', '12_weeks', 'long_term'].includes(String(goals.timeHorizon))
        ? String(goals.timeHorizon)
        : '12_weeks') as NormalIndividualFitStartInput['goals']['timeHorizon'],
      intensityPreference: (['low', 'moderate', 'high'].includes(String(goals.intensityPreference))
        ? String(goals.intensityPreference)
        : 'moderate') as NormalIndividualFitStartInput['goals']['intensityPreference'],
    },
    sport: {
      selectedSport: String(sport.selectedSport || 'General Fitness'),
      selectedPathwayId: String(sport.selectedPathwayId || ''),
      selectedPathwayType: (['sport', 'training', 'lifestyle'].includes(String(sport.selectedPathwayType))
        ? String(sport.selectedPathwayType)
        : 'sport') as NormalIndividualFitStartInput['sport']['selectedPathwayType'],
      selectedRecommendationTitle: String(sport.selectedRecommendationTitle || ''),
      selectionRationale: String(sport.selectionRationale || ''),
    },
  }
}

function normalizeBaseInputFromProfile(profile: unknown): NormalIndividualFitStartInput | null {
  if (!isPlainObject(profile)) return null

  const fromColumns = normalizeRawFitStartInput({
    basic: profile.basic_profile,
    physiology: profile.physiology_profile,
    lifestyle: profile.lifestyle_profile,
    goals: profile.goal_profile,
    sport: profile.sport_profile,
  })
  if (fromColumns) return fromColumns

  const lifestyleConstraints = isPlainObject(profile.lifestyle_constraints)
    ? profile.lifestyle_constraints
    : null
  const legacyPayload = lifestyleConstraints && isPlainObject(lifestyleConstraints.fitstart_v2_payload)
    ? lifestyleConstraints.fitstart_v2_payload
    : null

  return normalizeRawFitStartInput(legacyPayload)
}

function normalizeCurrentState(raw: unknown): IndividualCurrentState | null {
  if (!isPlainObject(raw)) return null
  if (typeof raw.readinessScore !== 'number') return null
  return {
    readinessScore: Number(raw.readinessScore) || 50,
    strengthProfile: Number(raw.strengthProfile) || 50,
    enduranceLevel: Number(raw.enduranceLevel) || 50,
    mobilityStatus: Number(raw.mobilityStatus) || 50,
    recoveryCapacity: Number(raw.recoveryCapacity) || 50,
    bodyCompositionIndex: Number(raw.bodyCompositionIndex) || 50,
    fatigueIndex: Number(raw.fatigueIndex) || 50,
  }
}

function normalizeJourneyState(raw: unknown, fallback: ReturnType<typeof computeFitStartJourney>): IndividualJourneyState {
  if (!isPlainObject(raw)) return fallback.journeyState
  return {
    journeyStartDate: String(raw.journeyStartDate || fallback.journeyState.journeyStartDate),
    projectedPeakDate: String(raw.projectedPeakDate || fallback.journeyState.projectedPeakDate),
    currentWeek: Number(raw.currentWeek) || fallback.journeyState.currentWeek,
    totalWeeks: Number(raw.totalWeeks) || fallback.journeyState.totalWeeks,
    completedSessions: Number(raw.completedSessions) || 0,
    missedSessions: Number(raw.missedSessions) || 0,
    adherenceScore: Number(raw.adherenceScore) || fallback.journeyState.adherenceScore,
    streakCount: Number(raw.streakCount) || 0,
    progressToPeakPct: Number(raw.progressToPeakPct) || fallback.journeyState.progressToPeakPct,
  }
}

function normalizePlan(raw: unknown, fallback: ReturnType<typeof computeFitStartJourney>): IndividualPlanEngine {
  if (!isPlainObject(raw)) return fallback.planEngine
  if (!isPlainObject(raw.trainingPlan) || !Array.isArray(raw.trainingPlan.weeklyStructure)) {
    return fallback.planEngine
  }
  return raw as IndividualPlanEngine
}

export async function completeIndividualOnboarding() {
  return {
    error: 'Individual onboarding now runs through /fitstart. Please complete FitStart first.',
  }
}

export async function logIndividualSignal(payload: IndividualSignalPayload) {
  const { user } = await verifyRole('individual')
  const supabase = await createClient()
  const logDate = getTodayInIndia()

  const { data: individualProfile } = await supabase
    .from('individual_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!individualProfile) {
    return { error: 'FitStart profile not found. Complete onboarding first.' }
  }

  const baseInput = normalizeBaseInputFromProfile(individualProfile)
  if (!baseInput) {
    return { error: 'Your profile is missing FitStart data. Please re-run FitStart onboarding.' }
  }

  const fallback = computeFitStartJourney(baseInput)
  const currentState = normalizeCurrentState(individualProfile.current_state) || fallback.currentState
  const journeyState = normalizeJourneyState(individualProfile.journey_state, fallback)
  const planEngine = normalizePlan(individualProfile.plan_engine, fallback)

  const { data: historyRows } = await supabase
    .from('computed_intelligence')
    .select('readiness_score')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(14)

  const { data: healthRows, error: healthRowsError } = await selectRecentHealthMetrics(supabase, user.id, 14)

  if (healthRowsError && !isHealthStorageMissingError(healthRowsError)) {
    return { error: healthRowsError.message }
  }

  const readinessHistory = (historyRows || [])
    .map(row => Number(row.readiness_score))
    .filter(score => Number.isFinite(score))
  const aggregatedHealthMetrics = aggregateHealthMetrics((healthRows || []) as Array<Record<string, unknown>>)
  const deviceSignal = buildDeviceRecoverySignal({
    healthMetrics: aggregatedHealthMetrics,
    logDate,
    stepTarget: Number(planEngine?.lifestylePlan?.stepTarget) || 8000,
    sleepTargetHours: Number(planEngine?.recoveryPlan?.sleepTargetHours) || 8,
  })
  const latestHealthMetric = aggregatedHealthMetrics[0] || null

  const sleepQuality = labelToScore(payload.sleep_quality, 'positive')
  const energyLevel = labelToScore(payload.energy_level, 'positive')
  const stressLevel = labelToScore(payload.stress_level, 'stress')
  const recoveryFeel = labelToScore(payload.recovery_feel, 'positive')
  const sorenessLevel = labelToScore(payload.soreness_level, 'soreness')
  const completedSession = payload.session_completion === 'complete' || payload.session_completion === 'crushed'
  const missedSession = payload.session_completion === 'missed'
  const rawTrainingMinutes = Math.max(0, Math.min(300, Number(payload.training_minutes) || 0))
  const rawSessionRpe = Math.max(0, Math.min(10, Number(payload.session_rpe) || 0))
  const sanitizedSteps = Math.max(0, Math.min(100000, Number(payload.steps) || 0))
  const sanitizedHydration = Math.max(0, Math.min(10, Number(payload.hydration_liters) || 0))
  const effectiveTrainingMinutes = missedSession ? 0 : rawTrainingMinutes
  const effectiveSessionRpe = missedSession ? 0 : rawSessionRpe
  const sessionNotes = String(payload.session_notes || '').trim().slice(0, 300)
  const contextSignal = createDailyContextSignalRecord({
    userId: user.id,
    role: 'individual',
    logDate,
    heatLevel: payload.heat_level,
    humidityLevel: payload.humidity_level,
    aqiBand: payload.aqi_band,
    commuteMinutes: payload.commute_minutes,
    examStressScore: payload.exam_stress_score,
    fastingState: payload.fasting_state,
    shiftWork: payload.shift_work,
    contextNotes: sessionNotes,
  })
  const contextSummary = summarizeDailyContextSignals(contextSignal ? [contextSignal] : [])

  const recomputed = recomputeDailyJourney({
    baseInput,
    currentState,
    journeyState,
    planEngine,
    readinessHistory,
    deviceSignal,
    dailySignal: {
      sleepQuality,
      energyLevel,
      stressLevel,
      recoveryFeel,
      sorenessLevel,
      completedSession,
      missedSession,
      trainingMinutes: effectiveTrainingMinutes,
      sessionRpe: effectiveSessionRpe,
      steps: sanitizedSteps,
      hydrationLiters: sanitizedHydration,
      heatLevel: contextSignal?.heatLevel || null,
      humidityLevel: contextSignal?.humidityLevel || null,
      aqiBand: contextSignal?.aqiBand || null,
      commuteMinutes: contextSignal?.commuteMinutes || 0,
      examStressScore: contextSignal?.examStressScore || 0,
      fastingState: contextSignal?.fastingState || null,
      shiftWork: contextSignal?.shiftWork || false,
    },
  })

  const statusMeta = toJourneyStatus(recomputed.currentState.readinessScore)
  const dbStatus: 'TRAIN' | 'MODIFY' | 'REST' =
    recomputed.currentState.readinessScore < 45
      ? 'REST'
      : recomputed.currentState.readinessScore < 62
        ? 'MODIFY'
        : 'TRAIN'
  const riskScore = Number((recomputed.currentState.fatigueIndex / 100).toFixed(2))
  const loadTolerance = Math.max(0, Math.min(100, Math.round((effectiveSessionRpe * effectiveTrainingMinutes) / 10)))

  const guidanceBundle = {
    daily: recomputed.dailyGuidance,
    weekly: recomputed.weeklyFeedback,
    peak: recomputed.peakProjection,
    signal: {
      sleepQuality,
      energyLevel,
      stressLevel,
      recoveryFeel,
      sorenessLevel,
      sessionCompletion: payload.session_completion,
      trainingMinutes: effectiveTrainingMinutes,
      sessionRpe: effectiveSessionRpe,
      reportedTrainingMinutes: rawTrainingMinutes,
      reportedSessionRpe: rawSessionRpe,
      sessionNotes,
      steps: sanitizedSteps,
      hydrationLiters: sanitizedHydration,
      contextSummary,
    },
    healthIntegration: {
      connectedMetricDays: aggregatedHealthMetrics.length,
      latestMetricDate: latestHealthMetric?.metricDate || null,
      latestSource: latestHealthMetric?.source || null,
      usedInDecision: recomputed.adaptation.usedDeviceSignal,
      freshnessDays: deviceSignal?.freshnessDays ?? null,
      influencePct: recomputed.adaptation.deviceInfluencePct,
      manualRecoveryPulse: recomputed.adaptation.manualRecoveryPulse,
      blendedRecoveryPulse: recomputed.adaptation.blendedRecoveryPulse,
      normalizedScores: deviceSignal
        ? {
            sleep: deviceSignal.sleepScore,
            activity: deviceSignal.activityScore,
            heartRate: deviceSignal.heartRateScore,
            hrv: deviceSignal.hrvScore,
            recoveryPulse: deviceSignal.recoveryPulse,
          }
        : null,
    },
    contextSignals: contextSummary,
    generatedAt: new Date().toISOString(),
  }

  const contextError = await saveDailyContextSignal(supabase, contextSignal, {
    userId: user.id,
    role: 'individual',
    logDate,
  })

  if (contextError?.error) {
    return { error: contextError.error.message || 'Failed to save daily context.' }
  }

  const { error: intelligenceError } = await supabase
    .from('computed_intelligence')
    .upsert(
      {
        user_id: user.id,
        log_date: logDate,
        readiness_score: recomputed.currentState.readinessScore,
        recovery_capacity: recomputed.currentState.recoveryCapacity,
        load_tolerance: loadTolerance,
        risk_score: riskScore,
        status: dbStatus,
        reason: statusMeta.reason,
        action_instruction: recomputed.dailyGuidance.whatToDo[0],
        alert_priority: recomputed.currentState.readinessScore < 45 ? 'Critical' : recomputed.currentState.readinessScore < 60 ? 'Warning' : 'Informational',
        intelligence_trace: guidanceBundle,
      },
      { onConflict: 'user_id,log_date' }
    )

  if (intelligenceError) {
    return { error: intelligenceError.message }
  }

  const { error: profileUpdateError } = await supabase
    .from('individual_profiles')
    .update({
      current_state: recomputed.currentState,
      journey_state: recomputed.journeyState,
      latest_guidance: guidanceBundle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileUpdateError) {
    return { error: profileUpdateError.message }
  }

  const { error: guidanceError } = await supabase
    .from('individual_guidance_snapshots')
    .upsert(
      {
        user_id: user.id,
        log_date: logDate,
        readiness_score: recomputed.currentState.readinessScore,
        daily_guidance: recomputed.dailyGuidance,
        weekly_feedback: recomputed.weeklyFeedback,
        peak_projection: recomputed.peakProjection,
        adaptation_flags: {
          status: statusMeta.status,
          session_completion: payload.session_completion,
          device_signal_used: recomputed.adaptation.usedDeviceSignal,
          device_influence_pct: recomputed.adaptation.deviceInfluencePct,
        },
      },
      { onConflict: 'user_id,log_date' }
    )

  if (guidanceError) {
    return { error: guidanceError.message }
  }

  revalidatePath('/individual')
  revalidatePath('/individual/dashboard')
  revalidatePath('/individual/logging')

  return {
    success: true,
    result: {
      score: recomputed.currentState.readinessScore,
      status: statusMeta.status,
      reason: statusMeta.reason,
      action: recomputed.dailyGuidance.whatToDo[0],
      guidance: recomputed.dailyGuidance,
      weekly: recomputed.weeklyFeedback,
      peak: recomputed.peakProjection,
    },
  }
}
