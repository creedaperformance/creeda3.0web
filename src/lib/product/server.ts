import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getAthleteDashboardSnapshot,
  getIndividualDashboardSnapshot,
  type AthleteDashboardSnapshot,
  type IndividualDashboardSnapshot,
} from '@/lib/dashboard_decisions'
import { buildSkillIntelligenceSnapshot } from '@/lib/product/skill-intelligence'
import { buildExecutionSession } from '@/lib/product/session-builder'
import type {
  ExecutionMode,
  ExecutionSession,
  ExerciseRecommendationContext,
  SupportedSport,
} from '@/lib/product/types'

type SupabaseLike = SupabaseClient

interface TrainingSessionRow {
  id: string
  athlete_id: string
  session_date: string
  status: 'planned' | 'in_progress' | 'completed' | 'skipped'
  source: string | null
  plan_json: ExecutionSession
  expected_duration_minutes: number | null
  compliance_pct: number | null
  athlete_notes: string | null
  title?: string | null
  mode?: ExecutionMode | null
}

interface CoachAthleteProfileRow {
  id: string
  full_name: string | null
  primary_sport: string | null
  position: string | null
  avatar_url: string | null
}

interface CoachAthleteConnectionRow {
  athlete_id: string
  profiles: CoachAthleteProfileRow[] | null
}

interface CoachFeedbackRow {
  id: string
  session_id: string | null
  coach_id: string
  athlete_id: string
  feedback_type: string | null
  message: string | null
  created_at: string
}

export interface PersistedExecutionSession {
  id: string | null
  athleteId: string
  sessionDate: string
  status: 'planned' | 'in_progress' | 'completed' | 'skipped'
  source: string
  session: ExecutionSession
  expectedDurationMinutes: number
  compliancePct: number | null
  athleteNotes: string | null
}

export interface SessionHistoryEntry {
  id: string
  sessionDate: string
  title: string
  mode: ExecutionMode
  status: 'planned' | 'in_progress' | 'completed' | 'skipped'
  expectedDurationMinutes: number
  actualDurationMinutes: number | null
  compliancePct: number | null
  painFlags: string[]
  athleteNotes: string | null
  topExercises: string[]
}

export interface WeeklyCalendarEntry {
  date: string
  label: string
  title: string
  mode: ExecutionMode
  status: 'today' | 'planned' | 'completed' | 'missed'
  expectedDurationMinutes: number
  reason: string
  sessionId: string | null
  carryForwardFrom: string | null
  compliancePct: number | null
}

function getTodayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const base = new Date(Date.UTC(year, month - 1, day))
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(`${date}T00:00:00+05:30`))
}

function normalizeSport(value: unknown): SupportedSport {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('cricket')) return 'cricket'
  if (normalized.includes('football') || normalized.includes('soccer')) return 'football'
  if (normalized.includes('badminton')) return 'badminton'
  if (normalized.includes('athletics') || normalized.includes('track')) return 'athletics'
  return 'general_fitness'
}

function asPlainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function unique<T>(values: T[]) {
  return values.filter((value, index, array) => array.indexOf(value) === index)
}

function inferFitnessLevelFromReadiness(
  readinessScore: number
): ExerciseRecommendationContext['currentFitnessLevel'] {
  if (readinessScore < 45) return 'deconditioned'
  if (readinessScore < 65) return 'recreational'
  if (readinessScore < 80) return 'trained'
  return 'competitive'
}

function inferReadinessBand(
  readinessScore: number
): ExerciseRecommendationContext['readinessBand'] {
  return readinessScore < 45 ? 'low' : readinessScore < 70 ? 'moderate' : 'high'
}

function inferFatigueLevel(
  readinessScore: number
): ExerciseRecommendationContext['fatigueLevel'] {
  return readinessScore < 45 ? 'high' : readinessScore < 70 ? 'moderate' : 'low'
}

function inferSleepQuality(
  readinessScore: number
): ExerciseRecommendationContext['sleepQuality'] {
  return readinessScore < 45 ? 'poor' : readinessScore < 70 ? 'okay' : 'good'
}

function inferTrainingAge(snapshot: AthleteDashboardSnapshot): ExerciseRecommendationContext['trainingAge'] {
  const history = snapshot.historicalLogs.length
  if (history < 6) return 'beginner'
  if (history < 18) return 'intermediate'
  return 'advanced'
}

function inferFitnessLevel(snapshot: AthleteDashboardSnapshot): ExerciseRecommendationContext['currentFitnessLevel'] {
  const readiness = snapshot.decisionResult?.metrics.readiness.score || 65
  return inferFitnessLevelFromReadiness(readiness)
}

function inferMode(snapshot: AthleteDashboardSnapshot): ExecutionMode {
  const decision = snapshot.decisionResult?.creedaDecision
  if (!decision) return 'train_light'
  if (decision.components.rehab) return decision.decision === 'RECOVER' ? 'rehab' : 'train_light'
  if (decision.decision === 'RECOVER') return 'recovery'
  if (decision.decision === 'MODIFY') return 'train_light'
  return decision.intensity >= 80 ? 'train_hard' : 'train_light'
}

function inferPainAreas(snapshot: AthleteDashboardSnapshot) {
  const latest = snapshot.latestLog || {}
  const raw = Array.isArray(latest.pain_location) ? latest.pain_location : []
  if (raw.length > 0) return raw.map((entry) => String(entry))
  const rehabType = snapshot.decisionResult?.creedaDecision.components.rehab?.injuryContext.type
  return rehabType ? [String(rehabType).toLowerCase()] : []
}

function inferActiveInjuries(snapshot: AthleteDashboardSnapshot) {
  const rehabType = snapshot.decisionResult?.creedaDecision.components.rehab?.injuryContext.type
  const historyType = snapshot.rehabHistory[0]?.injury_type
  return [rehabType, historyType].filter(Boolean).map((value) => String(value).toLowerCase())
}

function mapSnapshotToContext(snapshot: AthleteDashboardSnapshot, equipment: string[], preferredEnvironment: ExerciseRecommendationContext['preferredTrainingEnvironment']): ExerciseRecommendationContext {
  const decision = snapshot.decisionResult?.creedaDecision
  const readinessScore = decision?.components.training.plan?.athleteFocus?.readinessState === 'fatigued'
    ? 40
    : snapshot.decisionResult?.metrics.readiness.score || 65
  const readinessBand = inferReadinessBand(readinessScore)
  const painAreas = inferPainAreas(snapshot)
  const activeInjuries = inferActiveInjuries(snapshot)
  const sport = normalizeSport(snapshot.profile?.primary_sport || decision?.scientificContext?.sportProfile?.sportName)
  const position = String(snapshot.profile?.position || decision?.scientificContext?.sportProfile?.positionName || '').trim()
  const skillIntelligence = buildSkillIntelligenceSnapshot(snapshot.latestVideoReport || null)

  return {
    goal: String(snapshot.diagnostic?.primary_goal || 'athletic_performance'),
    sport,
    position: position || undefined,
    ageBand: 'adult',
    trainingAge: inferTrainingAge(snapshot),
    currentFitnessLevel: inferFitnessLevel(snapshot),
    availableEquipment: equipment,
    availableEnvironment: [preferredEnvironment, 'home', 'gym', 'field', 'court', 'track'].filter(
      (value, index, array) => array.indexOf(value) === index
    ) as ExerciseRecommendationContext['availableEnvironment'],
    injuryHistory: snapshot.rehabHistory.map((entry) => String(entry.injury_type || '').toLowerCase()).filter(Boolean),
    currentPainAreas: painAreas,
    activeInjuries,
    sorenessAreas: painAreas,
    fatigueLevel: inferFatigueLevel(readinessScore),
    readinessBand,
    readinessScore,
    sleepQuality: inferSleepQuality(readinessScore),
    missedSessionsInLast14Days: snapshot.historicalLogs.filter((entry) => Number(entry.duration_minutes || 0) === 0).length,
    complianceScore: decision?.adherence.adherenceScore || 0.8,
    sessionDurationPreferenceMinutes: decision?.duration || 55,
    trainingDaysPerWeek: 4,
    preferredTrainingEnvironment: preferredEnvironment,
    skillConfidence: readinessScore < 45 ? 'learning' : 'confident',
    bodyRegionsToImprove: [
      ...(decision?.scientificContext?.sportProfile?.physiologyPriorities || []),
      ...(decision?.scientificContext?.sportProfile?.demandKeys || []),
      ...skillIntelligence.movementTags,
      ...(activeInjuries.length > 0 ? activeInjuries : []),
    ].slice(0, 4),
    currentLimitations: unique([
      ...(decision?.constraints.avoid || []),
      ...skillIntelligence.priorityAreas.map((area) => area.label),
    ]).slice(0, 6),
    primaryMotivation: 'performance',
    participationProfile: snapshot.historicalLogs.length < 6 ? 'returning' : 'competitive',
    goalTags: unique([
      String(snapshot.diagnostic?.primary_goal || 'athletic_performance'),
      ...(skillIntelligence.status === 'corrective' ? ['injury_reduction', 'return_to_play'] : []),
    ]),
    painFlags: unique([
      ...(decision?.constraints.flags || []),
      ...skillIntelligence.priorityAreas
        .filter((area) => area.priority === 'high')
        .map((area) => area.label),
    ]),
    rehabFocusAreas: [
      ...painAreas,
      ...skillIntelligence.movementTags.filter((tag) =>
        ['knee_control', 'landing_control', 'scapular_control', 'cuff_activation', 'foot_control', 'bracing'].includes(tag)
      ),
      ...(decision?.components.rehab?.exercises.control || []),
    ].slice(0, 4),
    skillGaps: skillIntelligence.priorityAreas.map((area) => area.label).slice(0, 4),
    videoCorrectionDrills: skillIntelligence.targetedDrills,
    latestVideoStatus: snapshot.latestVideoReport?.summary.status || null,
    latestVideoScore: snapshot.latestVideoReport?.summary.score ?? null,
  }
}

function normalizeIndividualEquipment(raw: unknown) {
  if (!Array.isArray(raw)) return []

  const mapped = new Set<string>()
  for (const entry of raw) {
    const value = String(entry || '').toLowerCase()
    if (!value) continue
    if (value === 'bodyweight') mapped.add('bodyweight')
    if (value === 'home_dumbbells') {
      mapped.add('dumbbell')
      mapped.add('bench')
    }
    if (value === 'gym') {
      mapped.add('dumbbell')
      mapped.add('barbell')
      mapped.add('rack')
      mapped.add('bench')
      mapped.add('bike')
    }
    if (value === 'cardio_machine') mapped.add('bike')
    if (value === 'pool') mapped.add('pool')
  }

  return [...mapped]
}

function inferPreferredEnvironmentFromEquipment(
  equipment: string[],
  fallback: ExerciseRecommendationContext['preferredTrainingEnvironment']
): ExerciseRecommendationContext['preferredTrainingEnvironment'] {
  if (equipment.includes('pool')) return 'pool'
  if (equipment.includes('barbell') || equipment.includes('rack')) return 'gym'
  if (equipment.includes('cones') || equipment.includes('field')) return 'field'
  return fallback
}

function inferIndividualTrainingAge(
  snapshot: IndividualDashboardSnapshot
): ExerciseRecommendationContext['trainingAge'] {
  const physiologyProfile = asPlainRecord(snapshot.individualProfile?.physiology_profile)
  const trainingExperience = String(physiologyProfile?.trainingExperience || '').toLowerCase()

  if (trainingExperience === 'advanced' || trainingExperience === 'experienced') return 'advanced'
  if (trainingExperience === 'intermediate') return 'intermediate'
  return 'beginner'
}

function inferIndividualMode(snapshot: IndividualDashboardSnapshot): ExecutionMode {
  const decision = snapshot.decision
  const readinessScore = decision?.readinessScore || snapshot.readinessScore || 60
  const physiologyProfile = asPlainRecord(snapshot.individualProfile?.physiology_profile)
  const injuryStatus = String(physiologyProfile?.injuryHistory || '').toLowerCase()
  const limitationAreas = Array.isArray(physiologyProfile?.mobilityLimitationsArea)
    ? physiologyProfile.mobilityLimitationsArea.map((value) => String(value).toLowerCase())
    : []
  const intensity = String(decision?.today.intensity || '').toLowerCase()

  if ((injuryStatus && injuryStatus !== 'none') || limitationAreas.length > 0) {
    if (readinessScore < 72) return 'rehab'
    return 'train_light'
  }
  if (readinessScore < 45) return 'recovery'
  if (intensity === 'high' || readinessScore >= 78) return 'train_hard'
  return 'train_light'
}

function mapIndividualSnapshotToContext(
  snapshot: IndividualDashboardSnapshot,
  equipment: string[],
  preferredEnvironment: ExerciseRecommendationContext['preferredTrainingEnvironment']
): ExerciseRecommendationContext {
  const decision = snapshot.decision
  const profile = snapshot.individualProfile
  const physiologyProfile = asPlainRecord(profile?.physiology_profile)
  const lifestyleProfile = asPlainRecord(profile?.lifestyle_profile)
  const goalProfile = asPlainRecord(profile?.goal_profile)
  const sportProfile = asPlainRecord(profile?.sport_profile)
  const readinessScore = decision?.readinessScore || snapshot.readinessScore || 60
  const readinessBand = inferReadinessBand(readinessScore)
  const limitationAreas = Array.isArray(physiologyProfile?.mobilityLimitationsArea)
    ? physiologyProfile.mobilityLimitationsArea.map((value) => String(value).toLowerCase())
    : []
  const injuryStatus = String(physiologyProfile?.injuryHistory || '').toLowerCase()
  const activeInjuries = injuryStatus && injuryStatus !== 'none' ? [injuryStatus] : []
  const profileEquipment = normalizeIndividualEquipment(lifestyleProfile?.equipmentAccess)
  const resolvedEquipment = profileEquipment.length > 0 ? profileEquipment : equipment
  const resolvedEnvironment = inferPreferredEnvironmentFromEquipment(
    resolvedEquipment,
    preferredEnvironment
  )
  const goal = String(goalProfile?.primaryGoal || snapshot.primaryGoal || 'general_fitness')
  const sport = normalizeSport(
    decision?.pathway.mappedSport || sportProfile?.selectedSport || snapshot.sport
  )
  const position = String(
    sportProfile?.selectedPosition || sportProfile?.position || ''
  ).trim()
  const adherencePct = decision?.weekly.adherencePct || 72
  const trainingAge = inferIndividualTrainingAge(snapshot)
  const skillIntelligence = buildSkillIntelligenceSnapshot(snapshot.latestVideoReport || null)

  return {
    goal,
    sport,
    position: position || undefined,
    ageBand: 'adult',
    trainingAge,
    currentFitnessLevel: inferFitnessLevelFromReadiness(readinessScore),
    availableEquipment: resolvedEquipment,
    availableEnvironment: unique([
      resolvedEnvironment,
      'home',
      'gym',
      sport === 'football' || sport === 'cricket' || sport === 'athletics' ? 'field' : 'court',
      sport === 'athletics' ? 'track' : 'court',
      ...(resolvedEquipment.includes('pool') ? (['pool'] as const) : []),
    ]) as ExerciseRecommendationContext['availableEnvironment'],
    injuryHistory: activeInjuries,
    currentPainAreas: limitationAreas,
    activeInjuries,
    sorenessAreas: limitationAreas,
    fatigueLevel: inferFatigueLevel(readinessScore),
    readinessBand,
    readinessScore,
    sleepQuality: inferSleepQuality(readinessScore),
    missedSessionsInLast14Days: 0,
    complianceScore: Math.max(0, Math.min(1, adherencePct / 100)),
    sessionDurationPreferenceMinutes: decision?.today.sessionDurationMinutes || 45,
    trainingDaysPerWeek: decision?.plan.trainingPlan.trainingDaysPerWeek || 4,
    preferredTrainingEnvironment: resolvedEnvironment,
    skillConfidence: trainingAge === 'beginner' || readinessBand === 'low' ? 'learning' : 'confident',
    bodyRegionsToImprove: unique([
      ...(decision?.gapAnalysis.riskAreas || []),
      ...skillIntelligence.movementTags,
      ...limitationAreas,
      decision?.pathway.mappedSport || '',
    ]).filter(Boolean).slice(0, 4),
    currentLimitations: unique([
      ...limitationAreas,
      ...(activeInjuries.length > 0 ? activeInjuries : []),
      ...skillIntelligence.priorityAreas.map((area) => area.label),
    ]),
    primaryMotivation: goal,
    participationProfile:
      activeInjuries.length > 0
        ? 'returning'
        : trainingAge === 'advanced' && sport !== 'general_fitness'
          ? 'competitive'
          : 'beginner',
    goalTags: unique([
      goal,
      ...(skillIntelligence.status === 'corrective' ? ['injury_reduction'] : []),
    ]),
    painFlags: unique([
      ...limitationAreas,
      ...skillIntelligence.priorityAreas
        .filter((area) => area.priority === 'high')
        .map((area) => area.label),
    ]),
    rehabFocusAreas: unique([
      ...limitationAreas,
      ...activeInjuries,
      ...skillIntelligence.movementTags.filter((tag) =>
        ['knee_control', 'landing_control', 'scapular_control', 'cuff_activation', 'foot_control', 'bracing'].includes(tag)
      ),
    ]).slice(0, 4),
    skillGaps: skillIntelligence.priorityAreas.map((area) => area.label).slice(0, 4),
    videoCorrectionDrills: skillIntelligence.targetedDrills,
    latestVideoStatus: snapshot.latestVideoReport?.summary.status || null,
    latestVideoScore: snapshot.latestVideoReport?.summary.score ?? null,
  }
}

type QueryResult<T> = PromiseLike<{ data: T; error: { message?: string } | null }>

function isMissingTableError(error: { code?: string | null; message?: string | null } | null) {
  const message = String(error?.message || '').toLowerCase()
  return (
    error?.code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('relation')
  )
}

async function safeMaybeSingle<T>(query: QueryResult<T>) {
  const result = await query
  if (result.error) {
    if (isMissingTableError(result.error)) {
      return { available: false, data: null }
    }
    throw result.error
  }
  return { available: true, data: result.data }
}

async function safeList<T>(query: QueryResult<T[] | null>) {
  const result = await query
  if (result.error) {
    if (isMissingTableError(result.error)) {
      return { available: false, data: [] as T[] }
    }
    throw result.error
  }
  return { available: true, data: Array.isArray(result.data) ? result.data : [] as T[] }
}

async function upsertCalendarEntry(supabase: SupabaseLike, args: {
  athleteId: string
  sessionDate: string
  sessionId: string | null
  coachId?: string | null
  status: 'planned' | 'completed' | 'missed'
  carryForward?: boolean
  summary: Record<string, unknown>
}) {
  const result = await safeMaybeSingle(
    supabase
      .from('training_calendar_entries')
      .upsert(
        {
          athlete_id: args.athleteId,
          coach_id: args.coachId || null,
          session_date: args.sessionDate,
          session_id: args.sessionId,
          status: args.status,
          carry_forward: args.carryForward || false,
          summary_json: args.summary,
        },
        {
          onConflict: 'athlete_id,session_date,session_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .maybeSingle()
  )

  return result
}

async function getUserEquipmentAndPreference(supabase: SupabaseLike, userId: string) {
  const [equipmentResult, preferenceResult] = await Promise.all([
    safeMaybeSingle(
      supabase
        .from('equipment_profiles')
        .select('available_equipment')
        .eq('user_id', userId)
        .maybeSingle()
    ),
    safeMaybeSingle(
      supabase
        .from('user_preferences')
        .select('session_duration_minutes, preferred_training_style')
        .eq('user_id', userId)
        .maybeSingle()
    ),
  ])

  const equipment = equipmentResult.available && Array.isArray(equipmentResult.data?.available_equipment)
    ? equipmentResult.data.available_equipment.map((entry: unknown) => String(entry).toLowerCase())
    : ['bodyweight', 'band', 'dumbbell', 'barbell', 'bench', 'med_ball', 'bike', 'foam_roller']

  const preferredEnvironment: ExerciseRecommendationContext['preferredTrainingEnvironment'] =
    equipment.includes('barbell') || equipment.includes('rack')
      ? 'gym'
      : equipment.includes('cones') || equipment.includes('field')
        ? 'field'
        : 'home'

  return {
    equipment,
    preferredEnvironment,
    preferredDuration: preferenceResult.available ? Number(preferenceResult.data?.session_duration_minutes || 55) : 55,
  }
}

function normalizeSessionRow(row: TrainingSessionRow): PersistedExecutionSession {
  const session = row.plan_json as ExecutionSession
  return {
    id: row.id ? String(row.id) : null,
    athleteId: String(row.athlete_id),
    sessionDate: String(row.session_date),
    status: row.status || 'planned',
    source: String(row.source || 'system'),
    session,
    expectedDurationMinutes: Number(row.expected_duration_minutes || session.summary.expectedDurationMinutes || 0),
    compliancePct: row.compliance_pct === null || row.compliance_pct === undefined ? null : Number(row.compliance_pct),
    athleteNotes: row.athlete_notes ? String(row.athlete_notes) : null,
  }
}

export async function getOrCreateTodayExecutionSession(supabase: SupabaseLike, userId: string) {
  const today = getTodayInIndia()

  const existingResult = await safeMaybeSingle(
    supabase
      .from('training_sessions')
      .select('id, athlete_id, session_date, status, source, plan_json, expected_duration_minutes, compliance_pct, athlete_notes')
      .eq('athlete_id', userId)
      .eq('session_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  )

  if (existingResult.available && existingResult.data?.plan_json) {
    return normalizeSessionRow(existingResult.data)
  }

  const snapshot = await getAthleteDashboardSnapshot(supabase, userId)
  const { equipment, preferredEnvironment, preferredDuration } = await getUserEquipmentAndPreference(supabase, userId)
  const context = mapSnapshotToContext(snapshot, equipment, preferredEnvironment)
  context.sessionDurationPreferenceMinutes = preferredDuration
  const mode = inferMode(snapshot)
  const session = buildExecutionSession({
    athleteId: userId,
    context,
    mode,
    date: today,
    source: 'creeda_execution_engine',
  })

  if (!existingResult.available) {
    return {
      id: null,
      athleteId: userId,
      sessionDate: today,
      status: 'planned' as const,
      source: 'creeda_execution_engine',
      session,
      expectedDurationMinutes: session.summary.expectedDurationMinutes,
      compliancePct: null,
      athleteNotes: null,
    }
  }

  const insertResult = await supabase
    .from('training_sessions')
    .insert({
      athlete_id: userId,
      session_date: today,
      status: 'planned',
      source: 'creeda_execution_engine',
      mode,
      title: session.title,
      sport: context.sport,
      position: context.position || null,
      goal: context.goal,
      readiness_score: context.readinessScore,
      expected_duration_minutes: session.summary.expectedDurationMinutes,
      plan_json: session,
      explainability_json: session.explainability,
    })
    .select('id, athlete_id, session_date, status, source, plan_json, expected_duration_minutes, compliance_pct, athlete_notes')
    .single()

  if (insertResult.error) {
    throw insertResult.error
  }

  await upsertCalendarEntry(supabase, {
    athleteId: userId,
    sessionDate: today,
    sessionId: String(insertResult.data.id),
    status: 'planned',
    summary: {
      title: session.title,
      mode: session.mode,
      expectedDurationMinutes: session.summary.expectedDurationMinutes,
      focus: session.summary.focus,
    },
  })

  return normalizeSessionRow(insertResult.data)
}

export async function getOrCreateTodayExecutionSessionForIndividual(
  supabase: SupabaseLike,
  userId: string
) {
  const today = getTodayInIndia()

  const existingResult = await safeMaybeSingle(
    supabase
      .from('training_sessions')
      .select('id, athlete_id, session_date, status, source, plan_json, expected_duration_minutes, compliance_pct, athlete_notes')
      .eq('athlete_id', userId)
      .eq('session_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  )

  if (existingResult.available && existingResult.data?.plan_json) {
    return normalizeSessionRow(existingResult.data)
  }

  const snapshot = await getIndividualDashboardSnapshot(supabase, userId)
  const { equipment, preferredEnvironment, preferredDuration } = await getUserEquipmentAndPreference(
    supabase,
    userId
  )
  const context = mapIndividualSnapshotToContext(snapshot, equipment, preferredEnvironment)
  context.sessionDurationPreferenceMinutes = preferredDuration || context.sessionDurationPreferenceMinutes
  const mode = inferIndividualMode(snapshot)
  const session = buildExecutionSession({
    athleteId: userId,
    context,
    mode,
    date: today,
    source: 'creeda_execution_engine',
  })

  if (!existingResult.available) {
    return {
      id: null,
      athleteId: userId,
      sessionDate: today,
      status: 'planned' as const,
      source: 'creeda_execution_engine',
      session,
      expectedDurationMinutes: session.summary.expectedDurationMinutes,
      compliancePct: null,
      athleteNotes: null,
    }
  }

  const insertResult = await supabase
    .from('training_sessions')
    .insert({
      athlete_id: userId,
      session_date: today,
      status: 'planned',
      source: 'creeda_execution_engine',
      mode,
      title: session.title,
      sport: context.sport,
      position: context.position || null,
      goal: context.goal,
      readiness_score: context.readinessScore,
      expected_duration_minutes: session.summary.expectedDurationMinutes,
      plan_json: session,
      explainability_json: session.explainability,
    })
    .select('id, athlete_id, session_date, status, source, plan_json, expected_duration_minutes, compliance_pct, athlete_notes')
    .single()

  if (insertResult.error) {
    throw insertResult.error
  }

  await upsertCalendarEntry(supabase, {
    athleteId: userId,
    sessionDate: today,
    sessionId: String(insertResult.data.id),
    status: 'planned',
    summary: {
      title: session.title,
      mode: session.mode,
      expectedDurationMinutes: session.summary.expectedDurationMinutes,
      focus: session.summary.focus,
    },
  })

  return normalizeSessionRow(insertResult.data)
}

export async function listExecutionHistory(supabase: SupabaseLike, userId: string, limit = 12) {
  const result = await safeList(
    supabase
      .from('training_sessions')
      .select('id, session_date, title, mode, status, expected_duration_minutes, compliance_pct, athlete_notes, plan_json')
      .eq('athlete_id', userId)
      .order('session_date', { ascending: false })
      .limit(limit)
  )

  return (result.data as TrainingSessionRow[]).map((row) => {
    const session = row.plan_json as ExecutionSession
    return {
      id: String(row.id),
      sessionDate: String(row.session_date),
      title: String(row.title || session.title),
      mode: row.mode as ExecutionMode,
      status: row.status || 'planned',
      expectedDurationMinutes: Number(row.expected_duration_minutes || session.summary.expectedDurationMinutes || 0),
      actualDurationMinutes: null,
      compliancePct: row.compliance_pct === null || row.compliance_pct === undefined ? null : Number(row.compliance_pct),
      painFlags: session.explainability.warnings,
      athleteNotes: row.athlete_notes ? String(row.athlete_notes) : null,
      topExercises: session.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.name)).slice(0, 4),
    } satisfies SessionHistoryEntry
  })
}

async function buildWeeklyCalendarWithTodayResolver(
  supabase: SupabaseLike,
  userId: string,
  resolveTodaySession: () => Promise<PersistedExecutionSession>
) {
  const today = getTodayInIndia()
  const sessions = await listExecutionHistory(supabase, userId, 21)
  const sessionByDate = new Map(sessions.map((entry) => [entry.sessionDate, entry]))
  const todaySession = await resolveTodaySession()

  const schedulePattern: ExecutionMode[] = [
    todaySession.session.mode,
    'train_light',
    'recovery',
    'train_hard',
    'train_light',
    'recovery',
    'train_hard',
  ]

  const entries: WeeklyCalendarEntry[] = []
  let carryForwardFrom: string | null = null

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(today, offset)
    const existing = sessionByDate.get(date)
    const mode = offset === 0 ? todaySession.session.mode : schedulePattern[offset]
    const title = existing?.title || (mode === 'recovery' ? 'Recovery Flow' : mode === 'rehab' ? 'Rehab Session' : mode === 'train_hard' ? 'Performance Session' : 'Modified Session')
    const status: WeeklyCalendarEntry['status'] =
      offset === 0
        ? 'today'
        : existing?.status === 'completed'
          ? 'completed'
          : existing?.status === 'skipped'
            ? 'missed'
            : 'planned'

    if (status === 'missed') {
      carryForwardFrom = date
    }

    entries.push({
      date,
      label: weekdayLabel(date),
      title,
      mode,
      status,
      expectedDurationMinutes: existing?.expectedDurationMinutes || todaySession.expectedDurationMinutes,
      reason:
        existing?.status === 'skipped'
          ? 'Missed session detected. The next suitable training day can absorb only a light carry-forward dose.'
          : mode === 'recovery'
            ? 'Recovery is scheduled to keep quality days expensive and believable.'
            : `Planned as a ${mode.replace(/_/g, ' ')} based on current readiness, load rhythm, and training frequency.`,
      sessionId: existing?.id || null,
      carryForwardFrom: status === 'planned' && carryForwardFrom ? carryForwardFrom : null,
      compliancePct: existing?.compliancePct || null,
    })
  }

  return entries
}

export async function buildWeeklyCalendar(supabase: SupabaseLike, userId: string) {
  return buildWeeklyCalendarWithTodayResolver(
    supabase,
    userId,
    () => getOrCreateTodayExecutionSession(supabase, userId)
  )
}

export async function buildWeeklyCalendarForIndividual(
  supabase: SupabaseLike,
  userId: string
) {
  return buildWeeklyCalendarWithTodayResolver(
    supabase,
    userId,
    () => getOrCreateTodayExecutionSessionForIndividual(supabase, userId)
  )
}

export async function saveExecutionSessionLog(supabase: SupabaseLike, args: {
  userId: string
  sessionId: string | null
  session: ExecutionSession
  actualDurationMinutes: number
  compliancePct: number
  athleteNotes: string
  painFlags: string[]
  exerciseLogs: Array<{
    exerciseId: string
    exerciseSlug: string
    blockType: string
    prescribed: Record<string, unknown>
    actual: Record<string, unknown>
    completionStatus: string
    note?: string
    substitutionExerciseSlug?: string | null
  }>
}) {
  const today = getTodayInIndia()
  let sessionId = args.sessionId

  if (!sessionId) {
    const insertSession = await supabase
      .from('training_sessions')
      .insert({
        athlete_id: args.userId,
        session_date: today,
        status: 'completed',
        source: args.session.source,
        mode: args.session.mode,
        title: args.session.title,
        goal: args.session.summary.focus,
        expected_duration_minutes: args.session.summary.expectedDurationMinutes,
        plan_json: args.session,
        compliance_pct: args.compliancePct,
        athlete_notes: args.athleteNotes,
      })
      .select('id')
      .single()

    if (insertSession.error) throw insertSession.error
    sessionId = String(insertSession.data.id)
  } else {
    const updateSession = await supabase
      .from('training_sessions')
      .update({
        status: 'completed',
        compliance_pct: args.compliancePct,
        athlete_notes: args.athleteNotes,
      })
      .eq('id', sessionId)
    if (updateSession.error) throw updateSession.error
  }

  const logInsert = await supabase
    .from('training_session_logs')
    .insert({
      session_id: sessionId,
      athlete_id: args.userId,
      actual_duration_minutes: args.actualDurationMinutes,
      compliance_pct: args.compliancePct,
      pain_flags: args.painFlags,
      athlete_notes: args.athleteNotes,
      summary_json: {
        completionTarget: args.session.summary.completionTarget,
        focus: args.session.summary.focus,
      },
    })
    .select('id')
    .single()

  if (logInsert.error) throw logInsert.error

  const sessionLogId = String(logInsert.data.id)
  if (args.exerciseLogs.length > 0) {
    const exerciseInsert = await supabase.from('training_exercise_logs').insert(
      args.exerciseLogs.map((entry, index) => ({
        session_id: sessionId,
        session_log_id: sessionLogId,
        athlete_id: args.userId,
        exercise_id: entry.exerciseId,
        exercise_slug: entry.exerciseSlug,
        block_type: entry.blockType,
        prescribed_json: entry.prescribed,
        actual_json: entry.actual,
        completion_status: entry.completionStatus,
        note: entry.note || null,
        substitution_exercise_slug: entry.substitutionExerciseSlug || null,
        sort_order: index,
      }))
    )

    if (exerciseInsert.error) throw exerciseInsert.error
  }

  await upsertCalendarEntry(supabase, {
    athleteId: args.userId,
    sessionDate: today,
    sessionId,
    status: 'completed',
    summary: {
      title: args.session.title,
      mode: args.session.mode,
      expectedDurationMinutes: args.session.summary.expectedDurationMinutes,
      compliancePct: args.compliancePct,
    },
  })

  return { sessionId, sessionLogId }
}

export async function listCoachExecutionBoard(supabase: SupabaseLike, coachId: string) {
  const athletesResult = await safeList(
    supabase
      .from('connection_requests')
      .select('athlete_id, profiles!athlete_id(id, full_name, primary_sport, position, avatar_url)')
      .eq('coach_id', coachId)
      .eq('status', 'approved')
  )

  const athleteRows = (athletesResult.data as CoachAthleteConnectionRow[])
    .map((row) => row.profiles?.[0] || null)
    .filter((row): row is CoachAthleteProfileRow => Boolean(row))
  const athleteIds = athleteRows.map((row) => row.id)
  if (athleteIds.length === 0) return []

  const sessionsResult = await safeList(
    supabase
      .from('training_sessions')
      .select('id, athlete_id, session_date, title, mode, status, compliance_pct, plan_json')
      .in('athlete_id', athleteIds)
      .order('session_date', { ascending: false })
  )

  const latestByAthlete = new Map<string, TrainingSessionRow>()
  for (const session of sessionsResult.data as TrainingSessionRow[]) {
    if (!latestByAthlete.has(session.athlete_id)) latestByAthlete.set(session.athlete_id, session)
  }

  return athleteRows.map((athlete) => {
    const latest = latestByAthlete.get(athlete.id)
    const session = latest?.plan_json as ExecutionSession | undefined
    return {
      athleteId: String(athlete.id),
      athleteName: String(athlete.full_name || 'Athlete'),
      sport: normalizeSport(athlete.primary_sport),
      position: athlete.position ? String(athlete.position) : null,
      avatarUrl: athlete.avatar_url ? String(athlete.avatar_url) : null,
      latestSessionTitle: latest?.title ? String(latest.title) : 'No assigned session yet',
      latestMode: latest?.mode ? (String(latest.mode) as ExecutionMode) : null,
      latestStatus: latest?.status ? String(latest.status) : 'unassigned',
      compliancePct: latest?.compliance_pct === null || latest?.compliance_pct === undefined ? null : Number(latest.compliance_pct),
      focus: session?.summary.focus || 'Assign a session to start the execution loop.',
      topExercises: session?.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.name)).slice(0, 3) || [],
      sessionId: latest?.id ? String(latest.id) : null,
    }
  })
}

export interface ExerciseHistorySummary {
  exerciseSlug: string
  exerciseName: string
  totalCompletions: number
  lastCompletedAt: string
  averageCompliance: number | null
  bestLoadKg: number | null
  bestRepVolume: number | null
  recentEntries: Array<{
    completedAt: string
    loadKg: number | null
    reps: number | null
    durationSeconds: number | null
    completionStatus: string
  }>
}

function readNumeric(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function listExerciseHistory(supabase: SupabaseLike, userId: string, limit = 8) {
  const result = await safeList(
    supabase
      .from('training_exercise_logs')
      .select('exercise_slug, actual_json, completion_status, completed_at')
      .eq('athlete_id', userId)
      .order('completed_at', { ascending: false })
      .limit(120)
  )

  const grouped = new Map<string, ExerciseHistorySummary>()

  for (const row of result.data as Array<{
    exercise_slug: string
    actual_json: Record<string, unknown> | null
    completion_status: string
    completed_at: string
  }>) {
    const slug = String(row.exercise_slug)
    const actual = row.actual_json || {}
    const reps =
      readNumeric(actual.reps) ??
      readNumeric(actual.completedReps) ??
      readNumeric(actual.actualReps)
    const loadKg =
      readNumeric(actual.loadKg) ??
      readNumeric(actual.weightKg) ??
      readNumeric(actual.load)
    const durationSeconds =
      readNumeric(actual.durationSeconds) ??
      readNumeric(actual.timeSeconds) ??
      readNumeric(actual.actualDurationSeconds)

    const current = grouped.get(slug) || {
      exerciseSlug: slug,
      exerciseName: slug
        .split('-')
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' '),
      totalCompletions: 0,
      lastCompletedAt: String(row.completed_at),
      averageCompliance: null,
      bestLoadKg: null,
      bestRepVolume: null,
      recentEntries: [],
    }

    current.totalCompletions += row.completion_status === 'skipped' ? 0 : 1
    current.lastCompletedAt = current.lastCompletedAt || String(row.completed_at)
    current.bestLoadKg = current.bestLoadKg === null || (loadKg !== null && loadKg > current.bestLoadKg) ? loadKg : current.bestLoadKg
    const repVolume = loadKg !== null && reps !== null ? loadKg * reps : reps
    current.bestRepVolume =
      current.bestRepVolume === null || (repVolume !== null && repVolume > current.bestRepVolume)
        ? repVolume
        : current.bestRepVolume
    if (current.recentEntries.length < 5) {
      current.recentEntries.push({
        completedAt: String(row.completed_at),
        loadKg,
        reps,
        durationSeconds,
        completionStatus: String(row.completion_status),
      })
    }

    grouped.set(slug, current)
  }

  return [...grouped.values()]
    .sort((left, right) => right.totalCompletions - left.totalCompletions || right.lastCompletedAt.localeCompare(left.lastCompletedAt))
    .slice(0, limit)
}

export interface CoachFeedbackEntry {
  id: string
  sessionId: string | null
  coachId: string
  athleteId: string
  feedbackType: string
  message: string
  createdAt: string
}

export async function listCoachFeedback(supabase: SupabaseLike, athleteId: string, sessionId?: string | null) {
  let query = supabase
    .from('coach_session_feedback')
    .select('id, session_id, coach_id, athlete_id, feedback_type, message, created_at')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(6)

  if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const result = await safeList(query)
  return (result.data as CoachFeedbackRow[]).map((row) => ({
    id: String(row.id),
    sessionId: row.session_id ? String(row.session_id) : null,
    coachId: String(row.coach_id),
    athleteId: String(row.athlete_id),
    feedbackType: String(row.feedback_type || 'feedback'),
    message: String(row.message || ''),
    createdAt: String(row.created_at),
  })) satisfies CoachFeedbackEntry[]
}

async function buildSessionForAthlete(
  supabase: SupabaseLike,
  athleteId: string,
  explicitMode?: ExecutionMode,
  date = getTodayInIndia(),
  source = 'coach_assignment'
) {
  const snapshot = await getAthleteDashboardSnapshot(supabase, athleteId)
  const { equipment, preferredEnvironment, preferredDuration } = await getUserEquipmentAndPreference(supabase, athleteId)
  const context = mapSnapshotToContext(snapshot, equipment, preferredEnvironment)
  context.sessionDurationPreferenceMinutes = preferredDuration
  const mode = explicitMode || inferMode(snapshot)

  const session = buildExecutionSession({
    athleteId,
    context,
    mode,
    date,
    source,
  })

  return { session, context }
}

export async function assignCoachExecutionSession(supabase: SupabaseLike, args: {
  coachId: string
  athleteId: string
  date?: string
  mode?: ExecutionMode
  message?: string
}) {
  const sessionDate = args.date || getTodayInIndia()
  const { session, context } = await buildSessionForAthlete(
    supabase,
    args.athleteId,
    args.mode,
    sessionDate,
    'coach_assignment'
  )

  const existingResult = await safeMaybeSingle(
    supabase
      .from('training_sessions')
      .select('id, status')
      .eq('athlete_id', args.athleteId)
      .eq('session_date', sessionDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  )

  let sessionId: string | null = existingResult.data?.id ? String(existingResult.data.id) : null

  if (sessionId && existingResult.data?.status !== 'completed') {
    const updateResult = await supabase
      .from('training_sessions')
      .update({
        coach_id: args.coachId,
        source: 'coach_assignment',
        mode: session.mode,
        title: session.title,
        sport: context.sport,
        position: context.position || null,
        goal: context.goal,
        readiness_score: context.readinessScore,
        expected_duration_minutes: session.summary.expectedDurationMinutes,
        plan_json: session,
        explainability_json: session.explainability,
      })
      .eq('id', sessionId)
      .select('id')
      .single()

    if (updateResult.error) throw updateResult.error
  } else if (!sessionId) {
    const insertResult = await supabase
      .from('training_sessions')
      .insert({
        athlete_id: args.athleteId,
        coach_id: args.coachId,
        session_date: sessionDate,
        status: 'planned',
        source: 'coach_assignment',
        mode: session.mode,
        title: session.title,
        sport: context.sport,
        position: context.position || null,
        goal: context.goal,
        readiness_score: context.readinessScore,
        expected_duration_minutes: session.summary.expectedDurationMinutes,
        plan_json: session,
        explainability_json: session.explainability,
      })
      .select('id')
      .single()

    if (insertResult.error) throw insertResult.error
    sessionId = String(insertResult.data.id)
  }

  await upsertCalendarEntry(supabase, {
    athleteId: args.athleteId,
    sessionDate,
    sessionId,
    coachId: args.coachId,
    status: 'planned',
    summary: {
      title: session.title,
      mode: session.mode,
      assignedByCoach: true,
      focus: session.summary.focus,
      expectedDurationMinutes: session.summary.expectedDurationMinutes,
    },
  })

  if (args.message?.trim()) {
    const feedbackInsert = await supabase.from('coach_session_feedback').insert({
      session_id: sessionId,
      coach_id: args.coachId,
      athlete_id: args.athleteId,
      feedback_type: 'assignment_note',
      message: args.message.trim(),
    })

    if (feedbackInsert.error) throw feedbackInsert.error
  }

  return { sessionId, session }
}

export async function saveCoachSessionFeedback(supabase: SupabaseLike, args: {
  coachId: string
  athleteId: string
  sessionId: string | null
  message: string
  feedbackType?: 'assignment_note' | 'completion_review' | 'warning' | 'encouragement'
}) {
  const result = await supabase
    .from('coach_session_feedback')
    .insert({
      session_id: args.sessionId,
      coach_id: args.coachId,
      athlete_id: args.athleteId,
      feedback_type: args.feedbackType || 'completion_review',
      message: args.message.trim(),
    })
    .select('id, session_id, coach_id, athlete_id, feedback_type, message, created_at')
    .single()

  if (result.error) throw result.error

  return {
    id: String(result.data.id),
    sessionId: result.data.session_id ? String(result.data.session_id) : null,
    coachId: String(result.data.coach_id),
    athleteId: String(result.data.athlete_id),
    feedbackType: String(result.data.feedback_type),
    message: String(result.data.message),
    createdAt: String(result.data.created_at),
  } satisfies CoachFeedbackEntry
}
