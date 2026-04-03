/* eslint-disable @typescript-eslint/no-explicit-any */

import 'server-only'

import { orchestrateV5 } from '@/lib/engine/EngineOrchestrator'
import {
  buildNutritionFramework,
  buildTrainingFramework,
  mergeEvidenceReferences,
  type EvidenceReference,
  type PersonalizedNutritionFramework,
  type PersonalizedTrainingFramework,
} from '@/lib/engine/Prescription/SportsScienceKnowledge'
import {
  nutritionGenerator,
  type RecommendedMeal,
} from '@/lib/engine/Prescription/NutritionGenerator'
import {
  workoutGenerator,
  type WorkoutPlan,
} from '@/lib/engine/Prescription/WorkoutGenerator'
import type {
  AdaptationProfile,
  AthleteInput,
  CreedaDecision,
  OrchestratorOutputV5,
  PerformanceProfile,
  RehabHistoryEntry,
  TrustSignalSummary,
  TrustSummary,
  VisionFault,
} from '@/lib/engine/types'
import type {
  DailyGuidance,
  IndividualCurrentState,
  IndividualGapAnalysis,
  IndividualJourneyState,
  IndividualPathRecommendation,
  IndividualPeakState,
  IndividualPlanEngine,
  PeakProjection,
  WeeklyFeedback,
} from '@/lib/individual_performance_engine'
import { getLatestUserVideoReport } from '@/lib/video-analysis/service'
import type { VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'
import {
  DAILY_CONTEXT_SIGNALS_TABLE,
  normalizeDailyContextSignal,
  selectRecentDailyContextSignals,
  summarizeDailyContextSignals,
  type DailyContextSignalRecord,
  type DailyContextSummary,
} from '@/lib/context-signals/storage'
import { HEALTH_CONNECTIONS_TABLE, HEALTH_DAILY_METRICS_TABLE } from '@/lib/health/storage'
import {
  normalizeObjectiveTestSession,
  summarizeObjectiveSignals,
} from '@/lib/objective-tests/store'
import { computeObjectiveBaselines } from '@/lib/objective-tests/baselines'
import type { ObjectiveSignalSummary, ObjectiveTestSession, ObjectiveTestType } from '@/lib/objective-tests/types'
import {
  extractDiagnosticMedicalConditions,
  getNutritionSafetySummary,
  type NutritionSafetySummary,
} from '@/lib/nutrition-safety'
import {
  buildAthleteIdentityMetrics,
  buildIndividualIdentityMetrics,
  buildSquadIdentityMetrics,
  getIdentityMetricScore,
  type IdentityMetricSummary,
  type SquadIdentityMetricSummary,
} from '@/lib/identity-metrics'

const DEFAULT_ADAPTATION_PROFILE: AdaptationProfile = {
  fatigue_sensitivity: 0.5,
  recovery_speed: 0.5,
  load_tolerance: 0.5,
  neuromuscular_bias: 0.5,
  learning_rate: 0.05,
  ewma_readiness_avg: 70,
  ewma_fatigue_avg: 30,
  strength_progression_rate: 0,
  last_updated: new Date().toISOString(),
}

export interface AthleteHealthSummary {
  connected: boolean
  available: boolean
  source: 'apple' | 'android' | 'mixed' | 'none'
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastError: string | null
  latestMetricDate: string | null
  latestSteps: number | null
  avgSleepHours: number | null
  avgHeartRate: number | null
  avgHrv: number | null
  sampleDays: number
  latestMetrics?: {
    steps: number
    sleep_hours: number
    heart_rate_avg: number
    hrv: number
  }
}

export interface AthleteDecisionContext {
  userId: string
  profile: Record<string, unknown> | null
  diagnostic: Record<string, unknown> | null
  latestLog: Record<string, unknown> | null
  historicalLogs: Record<string, unknown>[]
  latestIntelligence: Record<string, unknown> | null
  adaptationProfile: AdaptationProfile
  performanceProfile: Record<string, unknown> | null
  visionFaults: VisionFault[]
  rehabHistory: RehabHistoryEntry[]
  healthSummary: AthleteHealthSummary | null
  contextSignals: DailyContextSignalRecord[]
  contextSummary: DailyContextSummary | null
}

export interface AthleteDashboardSnapshot extends AthleteDecisionContext {
  decisionResult: OrchestratorOutputV5 | null
  latestVideoReport: VideoAnalysisReportSummary | null
  objectiveTest: ObjectiveTestSummary | null
  nutritionSafety: NutritionSafetySummary
}

export interface IndividualDashboardSnapshot {
  individualProfile: Record<string, unknown> | null
  intelligenceRows: Array<Record<string, unknown>>
  readinessScore: number
  sport: string
  primaryGoal: string
  decision: IndividualDashboardDecision | null
  latestVideoReport: VideoAnalysisReportSummary | null
  objectiveTest: ObjectiveTestSummary | null
  contextSummary: DailyContextSummary | null
  nutritionSafety: NutritionSafetySummary
}

export interface IndividualDashboardDecision {
  readinessScore: number
  directionLabel: string
  directionSummary: string
  explanation: string
  trustSummary: TrustSummary
  today: DailyGuidance
  weekly: WeeklyFeedback
  peak: PeakProjection
  plan: IndividualPlanEngine
  pathway: {
    title: string
    mappedSport: string
    type: string
    rationale: string
  }
  currentState: IndividualCurrentState
  peakState: IndividualPeakState
  gapAnalysis: IndividualGapAnalysis
  journeyState: IndividualJourneyState
  recommendations: IndividualPathRecommendation[]
  health: {
    summary: AthleteHealthSummary | null
    usedInDecision: boolean
    influencePct: number
    latestMetricDate: string | null
    connectedMetricDays: number
    manualRecoveryPulse: number | null
    blendedRecoveryPulse: number | null
  }
  contextSummary: DailyContextSummary | null
  prescriptions: {
    workoutPlan: WorkoutPlan | null
    mealPlan: RecommendedMeal[] | null
    nutritionFramework: PersonalizedNutritionFramework
    trainingFramework: PersonalizedTrainingFramework
    sources: EvidenceReference[]
  }
}

export interface WeeklyReviewPoint {
  date: string
  label: string
  readinessScore: number
  loadMinutes?: number
}

export interface ObjectiveTestSummary {
  latestSession: ObjectiveTestSession | null
  latestValidatedScoreMs: number | null
  previousValidatedScoreMs: number | null
  deltaVsPreviousMs: number | null
  trend: 'improving' | 'stable' | 'declining' | 'missing'
  freshness: 'fresh' | 'stale' | 'missing'
  trustStatus: TrustSignalSummary['status']
  classification: string | null
  completedAt: string | null
  recentSessionCount: number
  weekSessionCount: number
  summary: string
  nextAction: string
  primaryProtocolId: ObjectiveTestType | null
  latestHeadlineMetricValue: number | null
  latestHeadlineMetricUnit: string | null
  latestHeadlineMetricLabel: string | null
  primarySignal: ObjectiveSignalSummary | null
  signals: ObjectiveSignalSummary[]
}

function hasObjectiveTestMeasurement(objectiveTest: ObjectiveTestSummary | null) {
  return Boolean(objectiveTest?.primarySignal?.headlineMetricValue !== null)
}

function getOptionalObjectiveDetail(objectiveTest: ObjectiveTestSummary | null) {
  return hasObjectiveTestMeasurement(objectiveTest)
    ? objectiveTest?.summary || 'Latest objective testing is available.'
    : 'Objective testing is optional. Add it only if you want one extra measured sharpness anchor in CREEDA.'
}

function getObjectivePrimaryLabel(objectiveTest: ObjectiveTestSummary | null) {
  return objectiveTest?.primarySignal?.displayName || 'Objective testing'
}

function getObjectiveFormattedHeadline(objectiveTest: ObjectiveTestSummary | null) {
  return objectiveTest?.primarySignal?.formattedHeadline || 'Optional'
}

function hasMeaningfulObjectiveChange(objectiveTest: ObjectiveTestSummary | null) {
  return Boolean(
    objectiveTest?.primarySignal &&
      objectiveTest.primarySignal.trend !== 'stable' &&
      objectiveTest.primarySignal.trend !== 'missing'
  )
}

function getObjectiveChangeNarrative(
  objectiveTest: ObjectiveTestSummary | null,
  tense: 'present' | 'past'
) {
  const signal = objectiveTest?.primarySignal
  if (!signal || !hasMeaningfulObjectiveChange(objectiveTest)) return ''

  const improvingVerb = tense === 'present' ? 'is improving' : 'improved'
  const decliningVerb = tense === 'present' ? 'is softening' : 'softened'
  return `${signal.displayName} ${signal.trend === 'improving' ? improvingVerb : decliningVerb} versus the previous saved session.`
}

function shouldPrioritizeObjectiveRetest(objectiveTest: ObjectiveTestSummary | null) {
  return Boolean(
    hasObjectiveTestMeasurement(objectiveTest) &&
      objectiveTest?.freshness === 'stale'
  )
}

export interface AthleteWeeklyReviewSnapshot {
  periodLabel: string
  averageReadiness: number
  adherencePct: number
  loadMinutes: number
  trainingDays: number
  readinessDelta: number
  bottleneck: string
  biggestWin: string
  nextWeekFocus: string
  trustSummary: TrustSummary | null
  decision: CreedaDecision | null
  trend: WeeklyReviewPoint[]
  objectiveTest: ObjectiveTestSummary | null
  contextSummary: DailyContextSummary | null
  identityMetrics: IdentityMetricSummary[]
}

export interface IndividualWeeklyReviewSnapshot {
  periodLabel: string
  averageReadiness: number
  adherencePct: number
  readinessDelta: number
  progressToPeakPct: number
  streakCount: number
  bottleneck: string
  biggestWin: string
  nextWeekFocus: string
  trustSummary: TrustSummary
  decision: IndividualDashboardDecision
  trend: WeeklyReviewPoint[]
  objectiveTest: ObjectiveTestSummary | null
  contextSummary: DailyContextSummary | null
  identityMetrics: IdentityMetricSummary[]
}

export interface CoachWeeklyReviewPriority {
  athleteId: string
  athleteName: string
  teamId: string
  teamName: string
  queueType: 'intervention' | 'low_data'
  priority: 'Critical' | 'Warning' | 'Informational'
  reasons: string[]
  recommendation: string
  updatedAt: string | null
}

export interface CoachGroupSuggestion {
  title: string
  detail: string
  priority: 'High' | 'Watch' | 'Build'
}

export interface CoachTeamReviewSummary {
  teamId: string
  teamName: string
  athleteCount: number
  averageReadiness: number
  compliancePct: number
  interventionCount: number
  lowDataCount: number
  highRiskCount: number
  objectiveCoveragePct: number
  consistencyScore: number | null
  reliabilityScore: number | null
}

export interface CoachWeeklyReviewSnapshot {
  periodLabel: string
  athleteCount: number
  teamCount: number
  averageReadiness: number
  readinessDelta: number
  squadCompliancePct: number
  activeInterventions: number
  lowDataCount: number
  resolvedThisWeek: number
  objectiveCoveragePct: number
  objectiveDecliningCount: number
  bottleneck: string
  biggestWin: string
  highestRiskCluster: string
  nextWeekFocus: string
  trend: WeeklyReviewPoint[]
  topPriorityAthletes: CoachWeeklyReviewPriority[]
  groupSuggestions: CoachGroupSuggestion[]
  teamSummaries: CoachTeamReviewSummary[]
  identityMetrics: SquadIdentityMetricSummary[]
}

type SupabaseLike = any
type SessionType = 'skill' | 'speed' | 'strength' | 'endurance'

export function getTodayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

export async function getAthleteDecisionContext(
  supabase: SupabaseLike,
  userId: string,
  options?: { beforeDate?: string }
): Promise<AthleteDecisionContext> {
  const logQuery = supabase
    .from('daily_load_logs')
    .select('*')
    .eq('athlete_id', userId)
    .order('log_date', { ascending: false })
    .limit(options?.beforeDate ? 28 : 29)

  const intelligenceQuery = supabase
    .from('computed_intelligence')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(options?.beforeDate ? 28 : 29)

  if (options?.beforeDate) {
    logQuery.lt('log_date', options.beforeDate)
    intelligenceQuery.lt('log_date', options.beforeDate)
  }

  const [
    profileResult,
    diagnosticResult,
    logsResult,
    intelligenceResult,
    adaptationResult,
    performanceResult,
    visionResult,
    rehabResult,
    healthSummary,
    contextResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, primary_sport, position, onboarding_completed')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('diagnostics')
      .select(
        'primary_goal, physiology_profile, reaction_profile, performance_baseline, profile_data, training_reality, sport_context, recovery_baseline, physical_status'
      )
      .eq('athlete_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    logQuery,
    intelligenceQuery,
    supabase.from('adaptation_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('performance_profiles').select('*').eq('user_id', userId).maybeSingle(),
    safeSelect(
      supabase,
      'vision_faults',
      'fault,risk_mapping,corrective_drills,severity,session_date',
      (query: any) => query.eq('user_id', userId).order('session_date', { ascending: false }).limit(6)
    ),
    safeSelect(
      supabase,
      'rehab_history',
      'date,injury_type,stage,pain_score,load_tolerance,progression_flag',
      (query: any) => query.eq('user_id', userId).order('date', { ascending: false }).limit(12)
    ),
    getHealthSummary(supabase, userId),
    safeSelect(
      supabase,
      DAILY_CONTEXT_SIGNALS_TABLE,
      'user_id, role, log_date, heat_level, humidity_level, aqi_band, commute_minutes, exam_stress_score, fasting_state, shift_work, context_notes',
      () => selectRecentDailyContextSignals(supabase, userId, options?.beforeDate ? 7 : 8, options?.beforeDate)
    ),
  ])

  const profile = profileResult.data || null
  const diagnostic = diagnosticResult.data || null
  const rawLogs = Array.isArray(logsResult.data) ? logsResult.data : []
  const rawIntelligence = Array.isArray(intelligenceResult.data) ? intelligenceResult.data : []

  const latestLog = options?.beforeDate ? null : normalizeSingleLog(rawLogs[0], rawIntelligence[0])
  const historicalRawLogs = options?.beforeDate ? rawLogs : rawLogs.slice(1)
  const historicalLogs = normalizeHistoricalLogs(historicalRawLogs, rawIntelligence)
  const latestIntelligence = options?.beforeDate ? null : rawIntelligence[0] || null
  const contextSignals = (Array.isArray(contextResult.data) ? contextResult.data : [])
    .map(normalizeDailyContextSignal)
    .filter((signal): signal is DailyContextSignalRecord => Boolean(signal))
  const contextSummary = summarizeDailyContextSignals(contextSignals)

  return {
    userId,
    profile,
    diagnostic,
    latestLog,
    historicalLogs,
    latestIntelligence,
    adaptationProfile: normalizeAdaptationProfile(adaptationResult.data),
    performanceProfile: performanceResult.data || null,
    visionFaults: normalizeVisionFaults(visionResult.data),
    rehabHistory: normalizeRehabHistory(rehabResult.data),
    healthSummary,
    contextSignals,
    contextSummary,
  }
}

export async function getAthleteDashboardSnapshot(
  supabase: SupabaseLike,
  userId: string
): Promise<AthleteDashboardSnapshot> {
  const [context, latestVideoReport, objectiveTest] = await Promise.all([
    getAthleteDecisionContext(supabase, userId),
    getLatestUserVideoReport(supabase, userId),
    getObjectiveTestSummary(supabase, userId),
  ])
  const nutritionSafety = await getNutritionSafetySummary(supabase, userId, {
    fallbackMedicalConditions: extractDiagnosticMedicalConditions(asRecord(context.diagnostic?.physical_status)),
  })
  const persisted = readPersistedDecision(context.latestIntelligence?.intelligence_trace)

  let decisionResult = persisted
  const scientificContext = decisionResult?.creedaDecision?.scientificContext
  if (
    (!decisionResult ||
      !scientificContext ||
      !scientificContext.sportProfile ||
      !scientificContext.psychology ||
      !scientificContext.recovery ||
      !scientificContext.nutrition) &&
    context.latestLog
  ) {
    decisionResult = await computeAthleteDecisionFromLog(context, context.latestLog)
  }

  if (decisionResult && context.contextSummary) {
    decisionResult = mergeContextSummaryIntoDecisionResult(decisionResult, context.contextSummary)
  }
  if (decisionResult) {
    decisionResult = mergeNutritionSafetyIntoDecisionResult(decisionResult, nutritionSafety)
  }

  return {
    ...context,
    decisionResult,
    latestVideoReport,
    objectiveTest,
    nutritionSafety,
  }
}

export async function computeAthleteDecisionFromLog(
  context: AthleteDecisionContext,
  currentLog: Record<string, unknown>,
  historyOverride?: Record<string, unknown>[]
) {
  const history = historyOverride || context.historicalLogs
  const input = buildAthleteEngineInput(context, currentLog, history)
  const adherence = buildAdherence(currentLog)
  return orchestrateV5(input, context.rehabHistory, adherence)
}

export function buildAthleteDecisionTrace(
  result: OrchestratorOutputV5,
  healthSummary: AthleteHealthSummary | null,
  source = 'athlete_daily_checkin_v1',
  contextSummary: DailyContextSummary | null = null
) {
  return {
    source,
    generatedAt: new Date().toISOString(),
    decisionBundle: result,
    healthSummary,
    contextSummary,
  }
}

export async function getIndividualDashboardSnapshot(
  supabase: SupabaseLike,
  userId: string
): Promise<IndividualDashboardSnapshot> {
  const [individualProfileResult, intelligenceResult, healthSummary, latestVideoReport, objectiveTest, contextResult] = await Promise.all([
    supabase.from('individual_profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('computed_intelligence')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(14),
    getHealthSummary(supabase, userId),
    getLatestUserVideoReport(supabase, userId),
    getObjectiveTestSummary(supabase, userId),
    safeSelect(
      supabase,
      DAILY_CONTEXT_SIGNALS_TABLE,
      'user_id, role, log_date, heat_level, humidity_level, aqi_band, commute_minutes, exam_stress_score, fasting_state, shift_work, context_notes',
      () => selectRecentDailyContextSignals(supabase, userId, 8)
    ),
  ])

  const individualProfile = individualProfileResult.data || null
  const intelligenceRows = Array.isArray(intelligenceResult.data) ? intelligenceResult.data : []
  const latestIntel = intelligenceRows[0] || null
  const contextSignals = (Array.isArray(contextResult.data) ? contextResult.data : [])
    .map(normalizeDailyContextSignal)
    .filter((signal): signal is DailyContextSignalRecord => Boolean(signal))
  const contextSummary = summarizeDailyContextSignals(contextSignals)

  const sportProfile = asRecord(individualProfile?.sport_profile)
  const goalProfile = asRecord(individualProfile?.goal_profile)
  const currentState = normalizeIndividualCurrentState(asRecord(individualProfile?.current_state), latestIntel)
  const nutritionSafety = await getNutritionSafetySummary(supabase, userId)

  return {
    individualProfile,
    intelligenceRows,
    readinessScore: currentState.readinessScore,
    sport: String(sportProfile?.selectedSport || 'General Fitness'),
    primaryGoal: String(goalProfile?.primaryGoal || ''),
    decision: individualProfile
      ? await buildIndividualDashboardDecision(
          userId,
          individualProfile,
          latestIntel,
          healthSummary,
          objectiveTest,
          contextSummary,
          nutritionSafety
        )
      : null,
    latestVideoReport,
    objectiveTest,
    contextSummary,
    nutritionSafety,
  }
}

export async function getAthleteWeeklyReviewSnapshot(
  supabase: SupabaseLike,
  userId: string
): Promise<AthleteWeeklyReviewSnapshot> {
  const snapshot = await getAthleteDashboardSnapshot(supabase, userId)
  const review = buildAthleteWeeklyReview(snapshot)
  await persistWeeklyReviewSnapshot(supabase, {
    userId,
    role: 'athlete',
    weekStart: resolveReviewWeekStart(review.trend),
    focus: review.nextWeekFocus,
    summary: serializeAthleteWeeklyReview(review),
  })
  return review
}

export async function getIndividualWeeklyReviewSnapshot(
  supabase: SupabaseLike,
  userId: string
): Promise<IndividualWeeklyReviewSnapshot | null> {
  const snapshot = await getIndividualDashboardSnapshot(supabase, userId)
  if (!snapshot.decision) return null
  const review = buildIndividualWeeklyReview(snapshot)
  await persistWeeklyReviewSnapshot(supabase, {
    userId,
    role: 'individual',
    weekStart: resolveReviewWeekStart(review.trend),
    focus: review.nextWeekFocus,
    summary: serializeIndividualWeeklyReview(review),
  })
  return review
}

export async function getCoachWeeklyReviewSnapshot(
  supabase: SupabaseLike,
  coachId: string
): Promise<CoachWeeklyReviewSnapshot> {
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('id, team_name')
    .eq('coach_id', coachId)

  if (teamsError) {
    console.warn('[dashboard_decisions] coach teams query failed', teamsError)
    return createEmptyCoachWeeklyReviewSnapshot()
  }

  const teams = Array.isArray(teamsData)
    ? teamsData
        .map((row) => ({
          id: String((row as Record<string, unknown>).id || ''),
          teamName: String((row as Record<string, unknown>).team_name || 'Team'),
        }))
        .filter((row) => row.id)
    : []

  if (!teams.length) {
    return createEmptyCoachWeeklyReviewSnapshot()
  }

  const teamIds = teams.map((team) => team.id)
  const teamNameById = new Map(teams.map((team) => [team.id, team.teamName]))

  const memberResult = await safeSelect(
    supabase,
    'team_members',
    'team_id,athlete_id,profiles:athlete_id (id, full_name, avatar_url)',
    (query: any) => query.in('team_id', teamIds).eq('status', 'Active')
  )

  const athleteMembers = (Array.isArray(memberResult.data) ? memberResult.data : [])
    .map((row) => {
      const record = row as Record<string, unknown>
      const rawProfile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles
      const profile = asRecord(rawProfile)
      const teamId = String(record.team_id || '')
      const athleteId = String(record.athlete_id || profile?.id || '')

      if (!teamId || !athleteId) return null

      return {
        teamId,
        teamName: teamNameById.get(teamId) || 'Team',
        athleteId,
        athleteName: String(profile?.full_name || 'Athlete'),
      }
    })
    .filter((member): member is { teamId: string; teamName: string; athleteId: string; athleteName: string } => Boolean(member))

  const athleteIds = Array.from(new Set(athleteMembers.map((member) => member.athleteId)))
  if (!athleteIds.length) {
    return createEmptyCoachWeeklyReviewSnapshot(teams.length)
  }

  const currentWeekStart = getRecentDateIso(6)
  const trendWindowStart = getRecentDateIso(13)

  const [logResult, intelligenceResult, interventionResult, objectiveResult, rehabResult] = await Promise.all([
    safeSelect(
      supabase,
      'daily_load_logs',
      'athlete_id,log_date,readiness_score,duration_minutes,session_rpe,current_pain_level,stress_level,sleep_quality',
      (query: any) =>
        query
          .in('athlete_id', athleteIds)
          .gte('log_date', trendWindowStart)
          .order('log_date', { ascending: false })
    ),
    safeSelect(
      supabase,
      'computed_intelligence',
      'user_id,readiness_score,risk_score,log_date,created_at,intelligence_trace',
      (query: any) =>
        query
          .in('user_id', athleteIds)
          .order('created_at', { ascending: false })
    ),
    safeSelect(
      supabase,
      'coach_interventions',
      'id,athlete_id,team_id,queue_type,status,priority,reason_codes,recommendation,updated_at',
      (query: any) =>
        query
          .eq('coach_id', coachId)
          .in('athlete_id', athleteIds)
          .order('updated_at', { ascending: false })
    ),
    safeSelect(
      supabase,
      'objective_test_sessions',
      '*',
      (query: any) =>
        query
          .in('user_id', athleteIds)
          .order('completed_at', { ascending: false })
    ),
    safeSelect(
      supabase,
      'rehab_history',
      'user_id,date,injury_type,stage,pain_score,load_tolerance,progression_flag',
      (query: any) =>
        query
          .in('user_id', athleteIds)
          .order('date', { ascending: false })
    ),
  ])

  const logs = Array.isArray(logResult.data) ? logResult.data : []
  const intelligenceRows = Array.isArray(intelligenceResult.data) ? intelligenceResult.data : []
  const interventionRows = Array.isArray(interventionResult.data) ? interventionResult.data : []
  const objectiveRows = Array.isArray(objectiveResult.data) ? objectiveResult.data : []
  const rehabRows = Array.isArray(rehabResult.data) ? rehabResult.data : []

  const logsByAthlete = new Map<string, Array<Record<string, unknown>>>()
  logs.forEach((row) => {
    const record = row as Record<string, unknown>
    const athleteId = String(record.athlete_id || '')
    if (!athleteId) return
    const existing = logsByAthlete.get(athleteId) || []
    existing.push(record)
    logsByAthlete.set(athleteId, existing)
  })

  const weeklyLogsByAthlete = new Map<string, Array<Record<string, unknown>>>()
  athleteIds.forEach((athleteId) => {
    weeklyLogsByAthlete.set(
      athleteId,
      (logsByAthlete.get(athleteId) || []).filter((row) => String(row.log_date || '').slice(0, 10) >= currentWeekStart)
    )
  })

  const latestIntelligenceByAthlete = new Map<string, Record<string, unknown>>()
  intelligenceRows.forEach((row) => {
    const record = row as Record<string, unknown>
    const athleteId = String(record.user_id || '')
    if (!athleteId || latestIntelligenceByAthlete.has(athleteId)) return
    latestIntelligenceByAthlete.set(athleteId, record)
  })

  const objectiveSessionsByAthlete = new Map<string, ObjectiveTestSession[]>()
  objectiveRows
    .map(normalizeObjectiveTestSession)
    .filter((session): session is ObjectiveTestSession => Boolean(session))
    .forEach((session) => {
      const existing = objectiveSessionsByAthlete.get(session.userId) || []
      existing.push(session)
      objectiveSessionsByAthlete.set(session.userId, existing)
    })

  const objectiveStatsByAthlete = new Map<string, ReturnType<typeof summarizeCoachObjectiveSessions>>()
  athleteIds.forEach((athleteId) => {
    objectiveStatsByAthlete.set(athleteId, summarizeCoachObjectiveSessions(objectiveSessionsByAthlete.get(athleteId) || []))
  })

  const rehabRowsByAthlete = new Map<string, Array<Record<string, unknown>>>()
  rehabRows.forEach((row) => {
    const record = row as Record<string, unknown>
    const athleteId = String(record.user_id || '')
    if (!athleteId) return
    const existing = rehabRowsByAthlete.get(athleteId) || []
    existing.push(record)
    rehabRowsByAthlete.set(athleteId, existing)
  })

  const rehabHistoryByAthlete = new Map<string, RehabHistoryEntry[]>()
  athleteIds.forEach((athleteId) => {
    rehabHistoryByAthlete.set(athleteId, normalizeRehabHistory(rehabRowsByAthlete.get(athleteId)))
  })

  const complianceByAthlete = new Map<string, number>()
  athleteIds.forEach((athleteId) => {
    const weeklyLogs = weeklyLogsByAthlete.get(athleteId) || []
    complianceByAthlete.set(
      athleteId,
      clampTo100(Math.round((weeklyLogs.length / 7) * 100))
    )
  })

  const athleteIdentityMetricsByAthlete = new Map<string, IdentityMetricSummary[]>()
  athleteIds.forEach((athleteId) => {
    const objectiveStats = objectiveStatsByAthlete.get(athleteId)
    const latestIntelligence = latestIntelligenceByAthlete.get(athleteId) || null

    athleteIdentityMetricsByAthlete.set(
      athleteId,
      buildAthleteIdentityMetrics({
        logs: weeklyLogsByAthlete.get(athleteId) || [],
        trustSummary: readPersistedTrustSummary(latestIntelligence?.intelligence_trace) || null,
        objectiveSignal: objectiveStats
          ? {
              trend: objectiveStats.primarySignal?.trend || 'missing',
              freshness: objectiveStats.freshness,
            }
          : null,
        rehabHistory: rehabHistoryByAthlete.get(athleteId) || [],
        adherencePct: complianceByAthlete.get(athleteId) || 0,
      })
    )
  })

  const squadIdentityMetrics = buildSquadIdentityMetrics(Array.from(athleteIdentityMetricsByAthlete.values()))

  const unresolvedInterventions = interventionRows.filter(
    (row) => String((row as Record<string, unknown>).status || '') !== 'resolved'
  )
  const activeInterventionRows = unresolvedInterventions.filter(
    (row) => String((row as Record<string, unknown>).queue_type || '') === 'intervention'
  )
  const lowDataRows = unresolvedInterventions.filter(
    (row) => String((row as Record<string, unknown>).queue_type || '') === 'low_data'
  )
  const resolvedThisWeek = interventionRows.filter((row) => {
    const record = row as Record<string, unknown>
    return String(record.status || '') === 'resolved' && String(record.updated_at || '').slice(0, 10) >= currentWeekStart
  }).length

  const atRiskAthleteIds = new Set<string>()
  athleteIds.forEach((athleteId) => {
    const latestIntelligence = latestIntelligenceByAthlete.get(athleteId)
    const readiness = numberOr(latestIntelligence?.readiness_score, 0)
    const risk = numberOr(latestIntelligence?.risk_score, 0)
    if (risk >= 45 || readiness < 45) {
      atRiskAthleteIds.add(athleteId)
    }
  })
  activeInterventionRows.forEach((row) => {
    const athleteId = String((row as Record<string, unknown>).athlete_id || '')
    if (athleteId) atRiskAthleteIds.add(athleteId)
  })

  const averageReadiness = Math.round(
    average(
      athleteIds
        .map((athleteId) => numberOr(latestIntelligenceByAthlete.get(athleteId)?.readiness_score, 0))
        .filter((value) => value > 0)
    ) ?? 0
  )

  const trendDates = Array.from({ length: 7 }, (_, index) => getRecentDateIso(6 - index))
  let lastKnownReadiness = averageReadiness
  const trend = trendDates.map((date) => {
    const dayLogs = logs.filter((row) => String((row as Record<string, unknown>).log_date || '').slice(0, 10) === date)
    const readinessValues = dayLogs
      .map((row) => toFiniteNumber((row as Record<string, unknown>).readiness_score))
      .filter(isFiniteNumber)
    const readinessScore = readinessValues.length
      ? Math.round(average(readinessValues) ?? lastKnownReadiness)
      : lastKnownReadiness

    lastKnownReadiness = readinessScore

    return {
      date,
      label: formatReviewDayLabel(date),
      readinessScore,
      loadMinutes: dayLogs.reduce((total, row) => total + numberOr((row as Record<string, unknown>).duration_minutes, 0), 0),
    }
  })

  const readinessDelta =
    trend.length >= 2 ? trend[trend.length - 1].readinessScore - trend[0].readinessScore : 0
  const squadCompliancePct = Math.round(
    average(athleteIds.map((athleteId) => complianceByAthlete.get(athleteId) || 0)) ?? 0
  )

  const teamSummaries = teams
    .map((team) => {
      const teamMembers = athleteMembers.filter((member) => member.teamId === team.id)
      const memberIds = teamMembers.map((member) => member.athleteId)
      const teamInterventionCount = activeInterventionRows.filter((row) => String((row as Record<string, unknown>).team_id || '') === team.id).length
      const teamLowDataCount = lowDataRows.filter((row) => String((row as Record<string, unknown>).team_id || '') === team.id).length
      const objectiveCoverageCount = memberIds.filter((athleteId) => objectiveStatsByAthlete.get(athleteId)?.hasMeasurement).length
      const highRiskCount = memberIds.filter((athleteId) => atRiskAthleteIds.has(athleteId)).length
      const teamIdentityMetrics = buildSquadIdentityMetrics(
        memberIds
          .map((athleteId) => athleteIdentityMetricsByAthlete.get(athleteId) || [])
          .filter((metrics) => metrics.length > 0)
      )

      return {
        teamId: team.id,
        teamName: team.teamName,
        athleteCount: memberIds.length,
        averageReadiness: Math.round(
          average(
            memberIds
              .map((athleteId) => numberOr(latestIntelligenceByAthlete.get(athleteId)?.readiness_score, 0))
              .filter((value) => value > 0)
          ) ?? 0
        ),
        compliancePct: Math.round(
          average(memberIds.map((athleteId) => complianceByAthlete.get(athleteId) || 0)) ?? 0
        ),
        interventionCount: teamInterventionCount,
        lowDataCount: teamLowDataCount,
        highRiskCount,
        objectiveCoveragePct: clampTo100(
          Math.round((objectiveCoverageCount / Math.max(memberIds.length, 1)) * 100)
        ),
        consistencyScore: getIdentityMetricScore(teamIdentityMetrics, 'training_consistency'),
        reliabilityScore: getIdentityMetricScore(teamIdentityMetrics, 'readiness_reliability'),
      }
    })
    .sort((left, right) => {
      if (right.highRiskCount !== left.highRiskCount) return right.highRiskCount - left.highRiskCount
      if (right.interventionCount !== left.interventionCount) return right.interventionCount - left.interventionCount
      return left.averageReadiness - right.averageReadiness
    })

  const highestRiskTeam = teamSummaries.find((team) => team.highRiskCount > 0) || null
  const highestRiskCluster =
    highestRiskTeam
      ? `${highestRiskTeam.teamName} has the tightest risk cluster right now with ${highestRiskTeam.highRiskCount} athletes needing controlled loading or close review.`
      : activeInterventionRows.length > 0
        ? `${activeInterventionRows.length} athletes are still sitting in the active intervention lane this week.`
        : 'No concentrated high-risk cluster is standing out across the squad right now.'

  const objectiveCoveragePct = clampTo100(
    Math.round(
      (athleteIds.filter((athleteId) => objectiveStatsByAthlete.get(athleteId)?.hasMeasurement).length / Math.max(athleteIds.length, 1)) * 100
    )
  )
  const objectiveDecliningCount = athleteIds.filter((athleteId) => objectiveStatsByAthlete.get(athleteId)?.declining).length

  const biggestWin =
    resolvedThisWeek >= 3
      ? `Coach follow-up closed ${resolvedThisWeek} queue items this week, which reduced live intervention pressure.`
      : readinessDelta >= 4
        ? `Squad readiness improved by ${readinessDelta} points across the last seven days.`
        : squadCompliancePct >= 75
          ? `Squad compliance held at ${squadCompliancePct}%, which keeps coaching decisions believable.`
          : objectiveDecliningCount === 0 && objectiveCoveragePct >= 25
            ? 'Athletes using optional objective testing stayed stable enough to trust sharpness signals this week.'
            : 'Signal quality stayed alive across enough of the squad to support meaningful weekly adjustments.'

  const bottleneck =
    lowDataRows.length >= Math.max(3, activeInterventionRows.length) && lowDataRows.length > 0
      ? `Low-data pressure is still the main bottleneck: ${lowDataRows.length} athletes are limiting decision confidence.`
      : highestRiskTeam
        ? highestRiskCluster
        : readinessDelta <= -4
          ? `Squad readiness dropped by ${Math.abs(readinessDelta)} points, so the current microcycle may be outrunning recovery.`
          : squadCompliancePct < 55
            ? 'Logging compliance is still too soft, so progression calls are leaning on partial signal quality.'
            : 'No single bottleneck dominates, but signal quality and recovery discipline still need protecting.'

  const groupSuggestions = buildCoachGroupSuggestions({
    athleteCount: athleteIds.length,
    activeInterventions: activeInterventionRows.length,
    lowDataCount: lowDataRows.length,
    readinessDelta,
    highestRiskTeam,
    objectiveDecliningCount,
    objectiveCoveragePct,
    identityMetrics: squadIdentityMetrics,
  })

  const topPriorityAthletes = unresolvedInterventions
    .map((row) => {
      const record = row as Record<string, unknown>
      const athleteId = String(record.athlete_id || '')
      const teamId = String(record.team_id || '')
      const member = athleteMembers.find((item) => item.athleteId === athleteId && item.teamId === teamId)
      const queueType: CoachWeeklyReviewPriority['queueType'] =
        String(record.queue_type || '') === 'low_data' ? 'low_data' : 'intervention'
      const priority =
        String(record.priority || '') === 'Critical' ||
        String(record.priority || '') === 'Warning' ||
        String(record.priority || '') === 'Informational'
          ? (String(record.priority) as CoachWeeklyReviewPriority['priority'])
          : 'Informational'

      return {
        athleteId,
        athleteName: member?.athleteName || 'Athlete',
        teamId,
        teamName: member?.teamName || teamNameById.get(teamId) || 'Team',
        queueType,
        priority,
        reasons: Array.isArray(record.reason_codes)
          ? record.reason_codes.map((reason) => String(reason || '').trim()).filter(Boolean)
          : [],
        recommendation: String(record.recommendation || 'Review athlete context and adjust the plan.'),
        updatedAt: record.updated_at ? String(record.updated_at) : null,
      }
    })
    .sort((left, right) => {
      const priorityDelta = getCoachPriorityWeight(right.priority) - getCoachPriorityWeight(left.priority)
      if (priorityDelta !== 0) return priorityDelta
      if (left.queueType !== right.queueType) return left.queueType === 'intervention' ? -1 : 1
      return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime()
    })
    .slice(0, 5)

  const review = {
    periodLabel: buildReviewPeriodLabel(trend.map((entry) => entry.date)),
    athleteCount: athleteIds.length,
    teamCount: teams.length,
    averageReadiness,
    readinessDelta,
    squadCompliancePct,
    activeInterventions: activeInterventionRows.length,
    lowDataCount: lowDataRows.length,
    resolvedThisWeek,
    objectiveCoveragePct,
    objectiveDecliningCount,
    bottleneck,
    biggestWin,
    highestRiskCluster,
    nextWeekFocus: groupSuggestions[0]?.detail || 'Use this week’s squad pressure to shape the next microcycle, not just tomorrow’s session.',
    trend,
    topPriorityAthletes,
    groupSuggestions,
    teamSummaries,
    identityMetrics: squadIdentityMetrics,
  }
  await persistWeeklyReviewSnapshot(supabase, {
    userId: coachId,
    role: 'coach',
    weekStart: resolveReviewWeekStart(review.trend),
    focus: review.nextWeekFocus,
    summary: serializeCoachWeeklyReview(review),
  })
  return review
}

function buildAthleteEngineInput(
  context: AthleteDecisionContext,
  currentLog: Record<string, unknown>,
  history: Record<string, unknown>[]
): AthleteInput {
  const profileData = asRecord(context.diagnostic?.profile_data) || {}
  const trainingReality = asRecord(context.diagnostic?.training_reality) || {}
  const reactionProfile = asRecord(context.diagnostic?.reaction_profile) || {}
  const sportContext = asRecord(context.diagnostic?.sport_context) || {}
  const physicalStatus = asRecord(context.diagnostic?.physical_status) || {}
  const recoveryBaseline = asRecord(context.diagnostic?.recovery_baseline) || {}

  const sessionRpe = numberOr(currentLog.session_rpe, 0)
  const durationMinutes = numberOr(currentLog.duration_minutes, 0)
  const motivation = normalizeMotivation(readLogField(currentLog, ['motivation', 'mental_readiness']))
  const stressNumeric = normalizeStressScore(readLogField(currentLog, ['stress', 'stress_level', 'life_stress']))
  const healthMetrics = context.healthSummary?.latestMetrics
  const sleepInput = readLogField(currentLog, ['sleep_quality', 'sleep'])
  const energyInput = readLogField(currentLog, ['energy_level', 'energy'])
  const sorenessInput = readLogField(currentLog, ['muscle_soreness', 'soreness'])
  const stressInput = readLogField(currentLog, ['stress_level', 'stress', 'life_stress'])
  const sleepLatencyInput = readLogField(currentLog, ['sleep_latency'])
  const painLocation = Array.isArray(currentLog.pain_location)
    ? currentLog.pain_location.map((item) => String(item))
    : []
  const latestContextSignal =
    context.contextSummary?.latestSignal?.logDate === getLogDate(currentLog)
      ? context.contextSummary.latestSignal
      : null

  return {
    userId: context.userId,
    wellness: {
      sleep_quality: typeof sleepInput === 'string' || typeof sleepInput === 'number' ? sleepInput : 3,
      sleep_latency:
        typeof sleepLatencyInput === 'string' || typeof sleepLatencyInput === 'number'
          ? sleepLatencyInput
          : undefined,
      energy_level: normalizeEnergyLevel(energyInput),
      muscle_soreness: typeof sorenessInput === 'string' || typeof sorenessInput === 'number' ? sorenessInput : 2,
      stress_level: normalizeStressScore(stressInput),
      motivation,
      current_pain_level: numberOr(currentLog.current_pain_level, 0),
      pain_location: painLocation,
      reaction_time_ms: numberOr(reactionProfile.reaction_time_ms, 0) || undefined,
    },
    session:
      sessionRpe > 0 || durationMinutes > 0
      ? {
          rpe: sessionRpe,
          duration_minutes: durationMinutes,
          type: mapSessionType(readLogField(currentLog, ['session_type', 'day_type', 'session_importance'])),
        }
      : undefined,
    health_metrics: healthMetrics,
    profile: {
      age: numberOr(profileData.age, 0) || undefined,
      biologicalSex: String(profileData.biologicalSex || profileData.gender || ''),
      gender: String(profileData.gender || profileData.biologicalSex || ''),
      heightCm: numberOr(profileData.heightCm, 0) || undefined,
      weightKg: numberOr(profileData.weightKg, 0) || undefined,
      primaryGoal: String(context.diagnostic?.primary_goal || ''),
      activityLevel: inferActivityLevel(
        trainingReality.trainingFrequency || trainingReality.training_frequency,
        trainingReality.avgIntensity || trainingReality.avg_intensity,
        sportContext.playingLevel || sportContext.playing_level
      ),
      wakeTime: String(recoveryBaseline.usualWakeUpTime || recoveryBaseline.usual_wake_up_time || ''),
    },
    baseline_injuries: normalizeAthleteBaselineInjuries(physicalStatus),
    context: {
      sport: String(sportContext.primarySport || context.profile?.primary_sport || 'General'),
      position: String(sportContext.position || context.profile?.position || ''),
      is_match_day: Boolean(currentLog.is_match_day || currentLog.competition_today),
      travel_day: String(currentLog.day_type || '').toLowerCase() === 'travel',
      heat_level: latestContextSignal?.heatLevel || null,
      humidity_level: latestContextSignal?.humidityLevel || null,
      aqi_band: latestContextSignal?.aqiBand || null,
      commute_minutes: latestContextSignal?.commuteMinutes || 0,
      exam_stress_score: latestContextSignal?.examStressScore || 0,
      fasting_state: latestContextSignal?.fastingState || null,
      shift_work: latestContextSignal?.shiftWork || false,
    },
    history,
    adaptation_profile: context.adaptationProfile,
    performance_profile: normalizePerformanceProfile(context.performanceProfile, context.diagnostic),
    calibration: {
      active: !Boolean(context.performanceProfile?.is_calibrated),
      sessionCount: numberOr(context.performanceProfile?.session_count, 0),
      completionThreshold: 5,
    },
    psychology: {
      motivation,
      stress: Math.round((stressNumeric / 10) * 100),
      burnoutRisk: 0,
      cognitiveLoad: Math.round(30 + stressNumeric * 5),
    },
    cns_baseline: reactionProfile.reaction_time_ms
      ? {
          mean: numberOr(reactionProfile.reaction_time_ms, 250),
          std_dev: 20,
          rolling_window: [],
        }
      : undefined,
    visionFaults: context.visionFaults,
    rehabHistory: context.rehabHistory,
  }
}

function normalizeAthleteBaselineInjuries(physicalStatus: Record<string, unknown>) {
  const currentIssue = String(physicalStatus.currentIssue || '').toLowerCase()
  if (currentIssue !== 'yes') return []

  const activeInjuries = Array.isArray(physicalStatus.activeInjuries) ? physicalStatus.activeInjuries : []
  return activeInjuries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const region = String((entry as Record<string, unknown>).region || '').trim()
      return region || null
    })
    .filter((region): region is string => Boolean(region))
}

async function buildIndividualDashboardDecision(
  userId: string,
  individualProfile: Record<string, unknown>,
  latestIntel: Record<string, unknown> | null,
  healthSummary: AthleteHealthSummary | null,
  objectiveTest: ObjectiveTestSummary | null,
  contextSummary: DailyContextSummary | null,
  nutritionSafety: NutritionSafetySummary
): Promise<IndividualDashboardDecision> {
  const basicProfile = asRecord(individualProfile.basic_profile) || {}
  const physiologyProfile = asRecord(individualProfile.physiology_profile) || {}
  const lifestyleProfile = asRecord(individualProfile.lifestyle_profile) || {}
  const goalProfile = asRecord(individualProfile.goal_profile) || {}
  const sportProfile = asRecord(individualProfile.sport_profile) || {}
  const latestGuidance = asRecord(individualProfile.latest_guidance) || {}
  const healthIntegration = asRecord(latestGuidance.healthIntegration) || {}

  const currentState = normalizeIndividualCurrentState(asRecord(individualProfile.current_state), latestIntel)
  const peakState = normalizeIndividualPeakState(asRecord(individualProfile.peak_state), currentState)
  const gapAnalysis = normalizeIndividualGapAnalysis(asRecord(individualProfile.gap_analysis), currentState, peakState)
  const plan = normalizeIndividualPlan(asRecord(individualProfile.plan_engine))
  const journeyState = normalizeIndividualJourneyState(asRecord(individualProfile.journey_state))
  const today = normalizeIndividualDailyGuidance(asRecord(latestGuidance.daily), currentState, plan)
  const weekly = normalizeIndividualWeeklyFeedback(asRecord(latestGuidance.weekly), currentState, journeyState, plan)
  const peak = normalizeIndividualPeakProjection(asRecord(latestGuidance.peak), currentState, peakState, journeyState)
  const recommendations = normalizeIndividualRecommendations(sportProfile.recommendations)
  const primaryGap = gapAnalysis.primaryGap
  const pathwayType = normalizeIndividualPathwayType(sportProfile.selectedPathwayType)
  const activityLevel = normalizeIndividualActivityLevel(basicProfile.activityLevel)
  const goal = normalizeIndividualGoal(goalProfile.primaryGoal)
  const trainingExperience = normalizeIndividualTrainingExperience(physiologyProfile.trainingExperience)
  const nutritionFramework = buildNutritionFramework({
    goal,
    activityLevel,
    weightKg: numberOr(basicProfile.weightKg, 70),
    heightCm: numberOr(basicProfile.heightCm, 170),
    age: numberOr(basicProfile.age, 28),
    biologicalSex: String(basicProfile.gender || 'unknown'),
    pathwayType,
  })
  const trainingFramework = buildTrainingFramework({
    goal,
    activityLevel,
    pathwayType,
    readinessScore: currentState.readinessScore,
    trainingExperience,
    sedentaryHours: numberOr(lifestyleProfile.sedentaryHours, 7),
  })
  const workoutPlan = await workoutGenerator.generateDailyWorkout({
    userId,
    sessionType: inferIndividualWorkoutSessionType(currentState.readinessScore),
    readinessScore: currentState.readinessScore,
    injuryRiskScore: inferIndividualInjuryRisk(currentState, physiologyProfile),
    activeInjuries: [],
    experienceLevel: mapIndividualExperienceScore(trainingExperience),
    sport: pathwayType === 'lifestyle' ? 'general fitness' : String(sportProfile.selectedSport || 'general fitness'),
    goal,
    pathwayType,
    calibration: {
      active: !individualProfile.current_state,
      sessionCount: Math.max(0, numberOr(individualProfile.updated_at ? 1 : 0, 0)),
    },
  })
  const mealPlan = nutritionSafety.blocksDetailedAdvice
    ? null
    : await nutritionGenerator.buildDailyNutrition(
        userId,
        goal,
        numberOr(basicProfile.weightKg, 70),
        numberOr(basicProfile.heightCm, 170),
        numberOr(basicProfile.age, 28),
        inferTimingPreference(lifestyleProfile.scheduleConstraints),
        activityLevel,
        String(basicProfile.gender || 'unknown'),
        pathwayType
      )
  const prescriptionSources = mergeEvidenceReferences(
    nutritionFramework.references,
    trainingFramework.references
  )
  const trustSummary = mergeNutritionSafetyIntoTrustSummary(
    buildIndividualTrustSummary({
      individualProfile,
      latestIntel,
      healthSummary,
      objectiveTest,
      contextSummary,
      healthIntegration,
      currentState,
      weekly,
      journeyState,
      pathwayTitle: String(sportProfile.selectedRecommendationTitle || sportProfile.selectedSport || 'Recommended path'),
      primaryGap,
    }),
    nutritionSafety
  )

  const direction = getIndividualDirection(currentState.readinessScore)
  const explanationBits = [
    primaryGap.gap > 0 ? `Your biggest opportunity right now is ${primaryGap.pillar.toLowerCase()}.` : '',
    today.adaptationNote,
    healthIntegration.usedInDecision
      ? `Device data influenced today's guidance by ${numberOr(healthIntegration.influencePct, 0)}%.`
      : '',
    objectiveTest?.freshness === 'fresh' && objectiveTest.primarySignal
      ? `Latest measured signal is ${getObjectiveFormattedHeadline(objectiveTest)} from ${getObjectivePrimaryLabel(objectiveTest)}.`
      : '',
    contextSummary?.highContextLoad
      ? contextSummary.summary
      : '',
  ].filter(Boolean)

  return {
    readinessScore: currentState.readinessScore,
    directionLabel: direction.label,
    directionSummary: direction.summary,
    explanation: explanationBits.join(' '),
    trustSummary,
    today,
    weekly,
    peak,
    plan,
    pathway: {
      title: String(sportProfile.selectedRecommendationTitle || sportProfile.selectedSport || 'Recommended path'),
      mappedSport: String(sportProfile.selectedSport || 'General Fitness'),
      type: String(sportProfile.selectedPathwayType || 'sport'),
      rationale: String(
        sportProfile.selectionRationale ||
          gapAnalysis.riskAreas[0] ||
          'CREEDA matched this path to your current physiology, routine, and goal.'
      ),
    },
    currentState,
    peakState,
    gapAnalysis,
    journeyState,
    recommendations,
    health: {
      summary: healthSummary,
      usedInDecision: Boolean(healthIntegration.usedInDecision),
      influencePct: numberOr(healthIntegration.influencePct, 0),
      latestMetricDate: healthIntegration.latestMetricDate ? String(healthIntegration.latestMetricDate) : healthSummary?.latestMetricDate || null,
      connectedMetricDays: numberOr(healthIntegration.connectedMetricDays, healthSummary?.sampleDays || 0),
      manualRecoveryPulse: toFiniteNumber(healthIntegration.manualRecoveryPulse),
      blendedRecoveryPulse: toFiniteNumber(healthIntegration.blendedRecoveryPulse),
    },
    contextSummary,
    prescriptions: {
      workoutPlan,
      mealPlan,
      nutritionFramework,
      trainingFramework,
      sources: prescriptionSources,
    },
  }
}

function buildAthleteWeeklyReview(snapshot: AthleteDashboardSnapshot): AthleteWeeklyReviewSnapshot {
  const logs = getRecentAthleteLogs(snapshot.latestLog, snapshot.historicalLogs)
  const trend = logs.map((log) => ({
    date: getLogDate(log),
    label: formatReviewDayLabel(getLogDate(log)),
    readinessScore: numberOr(log.readinessScore, numberOr(log.readiness_score, 0)),
    loadMinutes: numberOr(log.duration_minutes, 0),
  }))
  const readinessValues = trend.map((entry) => entry.readinessScore).filter((value) => Number.isFinite(value))
  const averageReadiness = average(readinessValues) ?? numberOr(snapshot.decisionResult?.creedaDecision?.intensity, 0)
  const adherencePct = average(
    logs.map((log) => clampTo100(Math.round(numberOr(log.adherenceScore, 0) * 100)))
  ) ?? clampTo100(Math.round(numberOr(snapshot.decisionResult?.creedaDecision?.adherence?.adherenceScore, 0.8) * 100))
  const loadMinutes = logs.reduce((total, log) => total + numberOr(log.duration_minutes, 0), 0)
  const trainingDays = logs.filter((log) => numberOr(log.duration_minutes, 0) > 0 || numberOr(log.session_rpe, 0) > 0).length
  const readinessDelta =
    trend.length >= 2 ? trend[trend.length - 1].readinessScore - trend[0].readinessScore : 0
  const trustSummary = snapshot.decisionResult?.creedaDecision?.trustSummary || null
  const sleepAverage = average(logs.map((log) => mapSleepValueToScore(log.sleep_quality)).filter(isFiniteNumber)) ?? 0
  const stressAverage = average(logs.map((log) => mapStressValueToScore(log.stress_level)).filter(isFiniteNumber)) ?? 0
  const painAverage = average(logs.map((log) => toFiniteNumber(log.current_pain_level, 0)).filter(isFiniteNumber)) ?? 0

  let bottleneck = 'Consistency is building, but the biggest unlock is still a steadier recovery rhythm.'
  if (logs.length < 4) {
    bottleneck = 'This week has too few trusted check-ins. More daily logs will make next week’s decision much stronger.'
  } else if (snapshot.contextSummary?.highLoadDays && snapshot.contextSummary.highLoadDays >= 3) {
    bottleneck = snapshot.contextSummary.summary
  } else if (snapshot.objectiveTest?.trend === 'declining' && hasMeaningfulObjectiveChange(snapshot.objectiveTest)) {
    bottleneck = `${getObjectivePrimaryLabel(snapshot.objectiveTest)} softened enough this week to justify more caution before pushing load.`
  } else if (painAverage >= 4) {
    bottleneck = 'Pain stayed elevated enough this week to limit how aggressively load should progress.'
  } else if (stressAverage >= 65) {
    bottleneck = 'Life and mental stress looked high enough to blunt adaptation this week.'
  } else if (sleepAverage > 0 && sleepAverage < 3.2) {
    bottleneck = 'Sleep quality was the main recovery bottleneck this week.'
  } else if (adherencePct < 70) {
    bottleneck = 'Execution drifted enough this week that plan adherence became the main limiter.'
  }

  let biggestWin = 'You kept the loop alive, which protects decision quality and lets CREEDA adapt faster.'
  if (snapshot.objectiveTest?.trend === 'improving' && hasMeaningfulObjectiveChange(snapshot.objectiveTest)) {
    biggestWin = `${getObjectivePrimaryLabel(snapshot.objectiveTest)} improved across recent testing, which adds confidence to the current progression.`
  } else if (readinessDelta >= 8) {
    biggestWin = `Readiness climbed by ${readinessDelta} points across the week.`
  } else if (adherencePct >= 85) {
    biggestWin = `Adherence stayed high at ${Math.round(adherencePct)}%, which is exactly what compounds progress.`
  } else if (trainingDays >= 4) {
    biggestWin = `You stacked ${trainingDays} meaningful training days this week.`
  } else if ((trustSummary?.confidenceScore || 0) >= 80) {
    biggestWin = 'You gave CREEDA enough signal quality this week to make higher-confidence calls.'
  }

  const nextWeekFocus =
    ((snapshot.contextSummary?.highContextLoad || snapshot.contextSummary?.freshness === 'stale') ? snapshot.contextSummary?.nextAction : '') ||
    (shouldPrioritizeObjectiveRetest(snapshot.objectiveTest) ? snapshot.objectiveTest?.nextAction : '') ||
    trustSummary?.nextBestInputs[0] ||
    snapshot.decisionResult?.creedaDecision?.components.recovery.priority ||
    snapshot.decisionResult?.creedaDecision?.explanation.primaryDrivers[0]?.reason ||
    'Protect recovery first, then build load only after trusted check-ins stay stable.'
  const identityMetrics = buildAthleteIdentityMetrics({
    logs,
    trustSummary,
    objectiveSignal: snapshot.objectiveTest
      ? {
          trend: snapshot.objectiveTest.primarySignal?.trend || snapshot.objectiveTest.trend,
          freshness: snapshot.objectiveTest.freshness,
        }
      : null,
    rehabHistory: snapshot.rehabHistory,
    adherencePct: Math.round(adherencePct ?? 0),
  })

  return {
    periodLabel: buildReviewPeriodLabel(trend.map((entry) => entry.date)),
    averageReadiness: Math.round(averageReadiness ?? 0),
    adherencePct: Math.round(adherencePct ?? 0),
    loadMinutes,
    trainingDays,
    readinessDelta,
    bottleneck,
    biggestWin,
    nextWeekFocus,
    trustSummary,
    decision: snapshot.decisionResult?.creedaDecision || null,
    trend,
    objectiveTest: snapshot.objectiveTest,
    contextSummary: snapshot.contextSummary,
    identityMetrics,
  }
}

function buildIndividualWeeklyReview(snapshot: IndividualDashboardSnapshot): IndividualWeeklyReviewSnapshot {
  const decision = snapshot.decision as IndividualDashboardDecision
  const trend = getRecentIndividualTrend(snapshot.intelligenceRows, decision)
  const readinessValues = trend.map((entry) => entry.readinessScore).filter((value) => Number.isFinite(value))
  const averageReadiness = average(readinessValues) ?? decision.weekly.averageReadiness
  const readinessDelta =
    trend.length >= 2 ? trend[trend.length - 1].readinessScore - trend[0].readinessScore : 0

  let bottleneck = `${decision.gapAnalysis.primaryGap.pillar} is still the primary gap to close.`
  if (decision.trustSummary.dataQuality === 'WEAK') {
    bottleneck = 'Decision trust is still weak because CREEDA needs more recent inputs from your daily loop.'
  } else if (snapshot.contextSummary?.highLoadDays && snapshot.contextSummary.highLoadDays >= 3) {
    bottleneck = snapshot.contextSummary.summary
  } else if (snapshot.objectiveTest?.trend === 'declining' && hasMeaningfulObjectiveChange(snapshot.objectiveTest)) {
    bottleneck = `${getObjectivePrimaryLabel(snapshot.objectiveTest)} softened recently, so recovery deserves extra attention.`
  } else if (decision.weekly.trend === 'declining') {
    bottleneck = 'The weekly trend softened, so recovery and consistency should lead before harder progression.'
  } else if (decision.health.usedInDecision === false && !decision.health.summary?.connected) {
    bottleneck = 'Recovery guidance is still running without device support, so daily self-report quality matters more.'
  }

  let biggestWin = `You are ${Math.round(decision.journeyState.progressToPeakPct)}% of the way to your current peak plan.`
  if (snapshot.objectiveTest?.trend === 'improving' && hasMeaningfulObjectiveChange(snapshot.objectiveTest)) {
    biggestWin = `${getObjectivePrimaryLabel(snapshot.objectiveTest)} improved across recent sessions.`
  } else if (readinessDelta >= 6) {
    biggestWin = `Readiness improved by ${readinessDelta} points over the week.`
  } else if (decision.weekly.adherencePct >= 85) {
    biggestWin = `Consistency stayed strong at ${Math.round(decision.weekly.adherencePct)}% adherence.`
  } else if (decision.journeyState.streakCount >= 5) {
    biggestWin = `You built a ${decision.journeyState.streakCount}-day momentum streak.`
  }
  const identityMetrics = buildIndividualIdentityMetrics({
    readinessValues,
    trustSummary: decision.trustSummary,
    objectiveSignal: snapshot.objectiveTest
      ? {
          trend: snapshot.objectiveTest.primarySignal?.trend || snapshot.objectiveTest.trend,
          freshness: snapshot.objectiveTest.freshness,
        }
      : null,
    adherencePct: Math.round(decision.weekly.adherencePct),
    streakCount: decision.journeyState.streakCount,
    progressToPeakPct: Math.round(decision.journeyState.progressToPeakPct),
  })

  return {
    periodLabel: buildReviewPeriodLabel(trend.map((entry) => entry.date)),
    averageReadiness: Math.round(averageReadiness ?? 0),
    adherencePct: Math.round(decision.weekly.adherencePct),
    readinessDelta,
    progressToPeakPct: Math.round(decision.journeyState.progressToPeakPct),
    streakCount: decision.journeyState.streakCount,
    bottleneck,
    biggestWin,
    nextWeekFocus:
      ((snapshot.contextSummary?.highContextLoad || snapshot.contextSummary?.freshness === 'stale') ? snapshot.contextSummary?.nextAction : '') ||
      (shouldPrioritizeObjectiveRetest(snapshot.objectiveTest) ? snapshot.objectiveTest?.nextAction : '') ||
      decision.weekly.adjustments[0] ||
      decision.trustSummary.nextBestInputs[0] ||
      decision.today.whatToDo[0],
    trustSummary: decision.trustSummary,
    decision,
    trend,
    objectiveTest: snapshot.objectiveTest,
    contextSummary: snapshot.contextSummary,
    identityMetrics,
  }
}

function createEmptyCoachWeeklyReviewSnapshot(teamCount = 0): CoachWeeklyReviewSnapshot {
  return {
    periodLabel: buildReviewPeriodLabel([]),
    athleteCount: 0,
    teamCount,
    averageReadiness: 0,
    readinessDelta: 0,
    squadCompliancePct: 0,
    activeInterventions: 0,
    lowDataCount: 0,
    resolvedThisWeek: 0,
    objectiveCoveragePct: 0,
    objectiveDecliningCount: 0,
    bottleneck: 'No squad trend is available yet because there are no active athletes linked to this coach.',
    biggestWin: 'Invite athletes to the squad so CREEDA can begin building weekly coaching intelligence.',
    highestRiskCluster: 'No risk cluster is available until the first athletes begin logging and syncing.',
    nextWeekFocus: 'Start by linking athletes, collecting daily signals, and creating the first believable trend line.',
    trend: Array.from({ length: 7 }, (_, index) => {
      const date = getRecentDateIso(6 - index)
      return {
        date,
        label: formatReviewDayLabel(date),
        readinessScore: 0,
        loadMinutes: 0,
      }
    }),
    topPriorityAthletes: [],
    groupSuggestions: [
      {
        title: 'Start the squad loop',
        detail: 'Invite athletes, collect daily check-ins, and let CREEDA build the first reliable squad trend.',
        priority: 'Build',
      },
    ],
    teamSummaries: [],
    identityMetrics: buildSquadIdentityMetrics([]),
  }
}

function resolveReviewWeekStart(trend: WeeklyReviewPoint[]) {
  return trend[0]?.date || getTodayInIndia()
}

function serializeAthleteWeeklyReview(review: AthleteWeeklyReviewSnapshot) {
  return {
    periodLabel: review.periodLabel,
    averageReadiness: review.averageReadiness,
    adherencePct: review.adherencePct,
    loadMinutes: review.loadMinutes,
    trainingDays: review.trainingDays,
    readinessDelta: review.readinessDelta,
    bottleneck: review.bottleneck,
    biggestWin: review.biggestWin,
    nextWeekFocus: review.nextWeekFocus,
    decision: review.decision?.decision || null,
    trustSummary: review.trustSummary,
    trend: review.trend,
    objectiveTest: review.objectiveTest,
    contextSummary: review.contextSummary,
    identityMetrics: review.identityMetrics,
  }
}

function serializeIndividualWeeklyReview(review: IndividualWeeklyReviewSnapshot) {
  return {
    periodLabel: review.periodLabel,
    averageReadiness: review.averageReadiness,
    adherencePct: review.adherencePct,
    readinessDelta: review.readinessDelta,
    progressToPeakPct: review.progressToPeakPct,
    streakCount: review.streakCount,
    bottleneck: review.bottleneck,
    biggestWin: review.biggestWin,
    nextWeekFocus: review.nextWeekFocus,
    directionLabel: review.decision.directionLabel,
    pathwayTitle: review.decision.pathway.title,
    trustSummary: review.trustSummary,
    trend: review.trend,
    objectiveTest: review.objectiveTest,
    contextSummary: review.contextSummary,
    identityMetrics: review.identityMetrics,
  }
}

function serializeCoachWeeklyReview(review: CoachWeeklyReviewSnapshot) {
  return {
    periodLabel: review.periodLabel,
    athleteCount: review.athleteCount,
    teamCount: review.teamCount,
    averageReadiness: review.averageReadiness,
    readinessDelta: review.readinessDelta,
    squadCompliancePct: review.squadCompliancePct,
    activeInterventions: review.activeInterventions,
    lowDataCount: review.lowDataCount,
    resolvedThisWeek: review.resolvedThisWeek,
    objectiveCoveragePct: review.objectiveCoveragePct,
    objectiveDecliningCount: review.objectiveDecliningCount,
    bottleneck: review.bottleneck,
    biggestWin: review.biggestWin,
    highestRiskCluster: review.highestRiskCluster,
    nextWeekFocus: review.nextWeekFocus,
    trend: review.trend,
    topPriorityAthletes: review.topPriorityAthletes,
    groupSuggestions: review.groupSuggestions,
    teamSummaries: review.teamSummaries,
    identityMetrics: review.identityMetrics,
  }
}

function summarizeCoachObjectiveSessions(sessions: ObjectiveTestSession[]) {
  const signals = summarizeObjectiveSignals(sessions, computeObjectiveBaselines(sessions))
  const primarySignal = signals[0] || null
  const freshness = primarySignal?.freshness || 'missing'
  const declining = Boolean(primarySignal && primarySignal.freshness === 'fresh' && primarySignal.trend === 'declining')

  return {
    hasMeasurement: Boolean(primarySignal?.headlineMetricValue !== null),
    freshness,
    declining,
    primarySignal,
  }
}

function buildCoachGroupSuggestions(args: {
  athleteCount: number
  activeInterventions: number
  lowDataCount: number
  readinessDelta: number
  highestRiskTeam: CoachTeamReviewSummary | null
  objectiveDecliningCount: number
  objectiveCoveragePct: number
  identityMetrics: SquadIdentityMetricSummary[]
}): CoachGroupSuggestion[] {
  const suggestions: CoachGroupSuggestion[] = []
  const squadConsistency = getIdentityMetricScore(args.identityMetrics, 'training_consistency')
  const squadReliability = getIdentityMetricScore(args.identityMetrics, 'readiness_reliability')
  const squadRecoveryDiscipline = getIdentityMetricScore(args.identityMetrics, 'recovery_discipline')

  if (args.highestRiskTeam && args.highestRiskTeam.highRiskCount > 0) {
    suggestions.push({
      title: 'Protect the highest-risk cluster',
      detail: `Keep ${args.highestRiskTeam.teamName}'s ${args.highestRiskTeam.highRiskCount}-athlete risk subgroup in modified or technique-biased work until readiness stabilizes.`,
      priority: 'High',
    })
  }

  if (args.lowDataCount > 0) {
    suggestions.push({
      title: 'Reset signal quality',
      detail: `Ask the ${args.lowDataCount} athletes in the low-data queue for same-day check-ins before the next hard loading day.`,
      priority: args.lowDataCount >= Math.max(3, Math.round(args.athleteCount * 0.25)) ? 'High' : 'Watch',
    })
  }

  if (squadReliability !== null && squadReliability < 60) {
    suggestions.push({
      title: 'Tighten readiness reliability',
      detail: 'Too much of the squad is still driving the week on partial signal quality. Protect the daily loop before making harder progression calls.',
      priority: 'High',
    })
  }

  if (squadRecoveryDiscipline !== null && squadRecoveryDiscipline < 60) {
    suggestions.push({
      title: 'Reset recovery discipline',
      detail: 'The squad is not recovering consistently enough between loading days. Make sleep, hydration, and recovery follow-through a team rule this week.',
      priority: 'Watch',
    })
  }

  if (squadConsistency !== null && squadConsistency < 60) {
    suggestions.push({
      title: 'Protect training rhythm',
      detail: 'The weekly pattern is too stop-start. Reduce long gaps and make the next microcycle easier to actually complete.',
      priority: 'Watch',
    })
  }

  if (args.readinessDelta >= 3 && args.activeInterventions <= Math.max(1, Math.round(args.athleteCount * 0.15))) {
    suggestions.push({
      title: 'Use the green window',
      detail: 'The squad trend is stable enough to place one higher-quality loading session mid-week, then reassess the next day.',
      priority: 'Build',
    })
  }

  if (args.objectiveDecliningCount >= 2) {
    suggestions.push({
      title: 'Optional sharpness audit',
      detail: `Invite the ${args.objectiveDecliningCount} athletes with declining recent measured signals to use optional retesting before high-speed exposure.`,
      priority: 'Watch',
    })
  } else if (args.objectiveCoveragePct < 30 && args.athleteCount >= 4) {
    suggestions.push({
      title: 'Optional measured anchor',
      detail: 'Consider inviting a small subgroup to use optional objective testing so weekly comparisons are not purely subjective.',
      priority: 'Build',
    })
  }

  if (!suggestions.length) {
    suggestions.push({
      title: 'Keep the loop steady',
      detail: 'No urgent squad-wide change is obvious, so protect compliance and let the next check-in cycle confirm whether progression should continue.',
      priority: 'Build',
    })
  }

  return suggestions.slice(0, 3)
}

function getCoachPriorityWeight(priority: CoachWeeklyReviewPriority['priority']) {
  if (priority === 'Critical') return 3
  if (priority === 'Warning') return 2
  return 1
}

function buildIndividualTrustSummary({
  individualProfile,
  latestIntel,
  healthSummary,
  objectiveTest,
  contextSummary,
  healthIntegration,
  currentState,
  weekly,
  journeyState,
  pathwayTitle,
  primaryGap,
}: {
  individualProfile: Record<string, unknown>
  latestIntel: Record<string, unknown> | null
  healthSummary: AthleteHealthSummary | null
  objectiveTest: ObjectiveTestSummary | null
  contextSummary: DailyContextSummary | null
  healthIntegration: Record<string, unknown>
  currentState: IndividualCurrentState
  weekly: WeeklyFeedback
  journeyState: IndividualJourneyState
  pathwayTitle: string
  primaryGap: IndividualGapAnalysis['primaryGap']
}): TrustSummary {
  const persisted = readPersistedTrustSummary(latestIntel?.intelligence_trace)
  if (persisted) {
    return mergeContextSummaryIntoTrustSummary(
      mergeObjectiveTestIntoTrustSummary(persisted, objectiveTest),
      contextSummary
    )
  }

  const hasFitStart =
    Boolean(asRecord(individualProfile.basic_profile)) ||
    Boolean(asRecord(individualProfile.current_state)) ||
    Boolean(asRecord(individualProfile.goal_profile))
  const checkInDate = latestIntel?.log_date ? String(latestIntel.log_date) : null
  const isFreshCheckIn = Boolean(checkInDate && checkInDate >= getRecentDateIso(2))
  const connectedMetricDays = numberOr(healthIntegration.connectedMetricDays, healthSummary?.sampleDays || 0)

  const signals: TrustSignalSummary[] = [
    {
      label: 'FitStart baseline',
      type: 'estimated',
      status: hasFitStart ? 'active' : 'limited',
      detail: hasFitStart ? 'Baseline profile and goal context are available.' : 'Baseline still needs stronger profile detail.',
    },
    {
      label: 'Daily check-in',
      type: 'self_reported',
      status: isFreshCheckIn ? 'active' : latestIntel ? 'limited' : 'missing',
      detail: isFreshCheckIn
        ? 'Today’s decision includes a recent self-report.'
        : latestIntel
          ? 'Recent self-report is getting stale.'
          : 'No recent daily loop is attached.',
    },
    {
      label: 'Device recovery',
      type: 'measured',
      status:
        Boolean(healthIntegration.usedInDecision) || connectedMetricDays >= 5
          ? 'active'
          : healthSummary?.connected
            ? 'limited'
            : 'missing',
      detail:
        Boolean(healthIntegration.usedInDecision) || connectedMetricDays >= 5
          ? `${connectedMetricDays} connected metric days are shaping recovery guidance.`
          : healthSummary?.connected
            ? 'Device sync exists, but there is not enough recent data to lean on it heavily.'
            : 'Recovery guidance is currently driven by manual signals.',
    },
    {
      label: 'Daily context',
      type: 'self_reported',
      status: contextSummary?.trustStatus || 'missing',
      detail: contextSummary?.summary || 'No optional heat, commute, fasting, or air-quality context is attached yet.',
    },
    {
      label: 'Objective testing',
      type: 'measured',
      status: hasObjectiveTestMeasurement(objectiveTest) ? objectiveTest?.trustStatus || 'limited' : 'building',
      detail: getOptionalObjectiveDetail(objectiveTest),
    },
    {
      label: 'Weekly trend',
      type: 'estimated',
      status: journeyState.currentWeek > 1 || journeyState.streakCount > 0 ? 'active' : 'building',
      detail:
        weekly.trend === 'declining'
          ? 'Recent trend is softening, so CREEDA is protecting recovery.'
          : weekly.trend === 'improving'
            ? 'Recent trend is improving, which supports progression.'
            : 'Recent trend is stable and helps hold the plan steady.',
    },
    {
      label: 'Pathway model',
      type: 'estimated',
      status: pathwayTitle ? 'active' : 'limited',
      detail: `Your current pathway is ${pathwayTitle}.`,
    },
  ]

  const requiredSignals = signals.filter((signal) => {
    if (signal.label === 'Objective testing') return hasObjectiveTestMeasurement(objectiveTest)
    if (signal.label === 'Daily context') return Boolean(contextSummary?.recentSignalDays)
    return true
  })
  const signalWeights: Record<TrustSignalSummary['status'], number> = {
    active: 1,
    limited: 0.65,
    building: 0.45,
    missing: 0,
  }
  const dataCompleteness = clampTo100(
    Math.round((requiredSignals.reduce((sum, signal) => sum + signalWeights[signal.status], 0) / Math.max(requiredSignals.length, 1)) * 100)
  )
  const confidenceScore = clampTo100(
    Math.round(
      dataCompleteness * 0.55 +
      (isFreshCheckIn ? 16 : latestIntel ? 9 : 0) +
      (Boolean(healthIntegration.usedInDecision) ? 12 : healthSummary?.connected ? 6 : 0) +
      (journeyState.streakCount >= 5 ? 8 : journeyState.streakCount > 0 ? 4 : 0) +
      (currentState.readinessScore >= 80 || currentState.readinessScore <= 45 ? 6 : 3)
    )
  )
  const confidenceLevel =
    confidenceScore >= 80 ? 'HIGH' : confidenceScore >= 55 ? 'MEDIUM' : 'LOW'
  const dataQuality =
    dataCompleteness >= 80 ? 'COMPLETE' : dataCompleteness >= 55 ? 'PARTIAL' : 'WEAK'

  const whyTodayChanged = [
    Boolean(healthIntegration.usedInDecision) && numberOr(healthIntegration.influencePct, 0) > 0
      ? `Device recovery data shifted today's guidance by ${numberOr(healthIntegration.influencePct, 0)}%.`
      : '',
    contextSummary?.highContextLoad ? contextSummary.summary : '',
    objectiveTest?.trend === 'declining' && hasMeaningfulObjectiveChange(objectiveTest)
      ? getObjectiveChangeNarrative(objectiveTest, 'past')
      : objectiveTest?.trend === 'improving' && hasMeaningfulObjectiveChange(objectiveTest)
        ? getObjectiveChangeNarrative(objectiveTest, 'past')
        : '',
    currentState.readinessScore < 45
      ? 'Readiness is low enough that recovery is taking priority over progression today.'
      : currentState.readinessScore >= 80
        ? 'Readiness is high, so today can support a more ambitious progression step.'
        : '',
    primaryGap.gap > 0
      ? `The biggest gap right now is ${primaryGap.pillar.toLowerCase()}, so today is biased toward closing that first.`
      : 'The recent trend is stable, so CREEDA kept the plan steady instead of forcing a change.',
  ].filter(Boolean)

  const nextBestInputs = [
    !isFreshCheckIn ? 'Complete a quick daily check-in tomorrow so the next call is based on fresher signals.' : '',
    connectedMetricDays < 3 ? 'Sync 3 to 5 days of device recovery data to strengthen guidance reliability.' : '',
    contextSummary?.freshness === 'stale'
      ? contextSummary.nextAction
      : '',
    shouldPrioritizeObjectiveRetest(objectiveTest)
      ? objectiveTest?.nextAction || 'Optional: refresh objective testing this week if you want CREEDA to keep comparing measured signals against your daily loop.'
      : '',
    journeyState.streakCount < 3 ? 'Keep the daily loop going for a few more days so trend-based guidance becomes sharper.' : '',
    Number(weekly.adherencePct) < 70 ? 'Log what you actually completed so next week’s adjustments reflect reality.' : '',
  ].filter(Boolean)

  if (!nextBestInputs.length) {
    nextBestInputs.push('Keep logging your daily effort and recovery so CREEDA can tighten progression week over week.')
  }

  return {
    confidenceLevel,
    confidenceScore,
    dataCompleteness,
    dataQuality,
    signals,
    whyTodayChanged,
    nextBestInputs: nextBestInputs.slice(0, 3),
  }
}

function mergeObjectiveTestIntoTrustSummary(
  trustSummary: TrustSummary,
  objectiveTest: ObjectiveTestSummary | null
): TrustSummary {
  if (!objectiveTest) return trustSummary

  const objectiveSignal: TrustSignalSummary = {
    label: 'Objective testing',
    type: 'measured',
    status: hasObjectiveTestMeasurement(objectiveTest) ? objectiveTest.trustStatus : 'building',
    detail: getOptionalObjectiveDetail(objectiveTest),
  }
  const signals = [
    ...trustSummary.signals.filter((signal) => signal.label !== objectiveSignal.label),
    objectiveSignal,
  ]
  const whyTodayChanged = [...trustSummary.whyTodayChanged]
  const nextBestInputs = [...trustSummary.nextBestInputs]

  if (
    objectiveTest.trend === 'declining' &&
    hasMeaningfulObjectiveChange(objectiveTest) &&
    whyTodayChanged.length < 4
  ) {
    whyTodayChanged.push(getObjectiveChangeNarrative(objectiveTest, 'past'))
  }

  if (
    objectiveTest.trend === 'improving' &&
    hasMeaningfulObjectiveChange(objectiveTest) &&
    whyTodayChanged.length < 4
  ) {
    whyTodayChanged.push(getObjectiveChangeNarrative(objectiveTest, 'past'))
  }

  if (shouldPrioritizeObjectiveRetest(objectiveTest)) {
    nextBestInputs.push(objectiveTest.nextAction)
  }

  return {
    ...trustSummary,
    signals,
    whyTodayChanged: whyTodayChanged.slice(0, 4),
    nextBestInputs: Array.from(new Set(nextBestInputs)).slice(0, 3),
  }
}

function mergeContextSummaryIntoTrustSummary(
  trustSummary: TrustSummary,
  contextSummary: DailyContextSummary | null
): TrustSummary {
  if (!contextSummary) return trustSummary

  const contextSignal: TrustSignalSummary = {
    label: 'Daily context',
    type: 'self_reported',
    status: contextSummary.trustStatus,
    detail: contextSummary.summary,
  }
  const signals = [
    ...trustSummary.signals.filter((signal) => signal.label !== contextSignal.label),
    contextSignal,
  ]
  const whyTodayChanged = [...trustSummary.whyTodayChanged]
  const nextBestInputs = [...trustSummary.nextBestInputs]

  if (contextSummary.highContextLoad && whyTodayChanged.length < 4) {
    whyTodayChanged.push(contextSummary.summary)
  }

  if ((contextSummary.highContextLoad || contextSummary.freshness === 'stale') && nextBestInputs.length < 4) {
    nextBestInputs.push(contextSummary.nextAction)
  }

  return {
    ...trustSummary,
    signals,
    whyTodayChanged: Array.from(new Set(whyTodayChanged)).slice(0, 4),
    nextBestInputs: Array.from(new Set(nextBestInputs)).slice(0, 3),
  }
}

function mergeNutritionSafetyIntoTrustSummary(
  trustSummary: TrustSummary,
  nutritionSafety: NutritionSafetySummary
): TrustSummary {
  const nutritionSignal: TrustSignalSummary = {
    label: 'Nutrition safety',
    type: 'self_reported',
    status: nutritionSafety.trustStatus,
    detail: nutritionSafety.summary,
  }
  const signals = [
    ...trustSummary.signals.filter((signal) => signal.label !== nutritionSignal.label),
    nutritionSignal,
  ]
  const whyTodayChanged = [...trustSummary.whyTodayChanged]
  const nextBestInputs = [...trustSummary.nextBestInputs]

  if (nutritionSafety.needsClinicalReview && whyTodayChanged.length < 4) {
    whyTodayChanged.push('Detailed nutrition guidance is paused because medical-health context needs extra caution.')
  }

  if (nutritionSafety.blocksDetailedAdvice) {
    nextBestInputs.unshift(nutritionSafety.nextAction)
  }

  return {
    ...trustSummary,
    signals,
    whyTodayChanged: Array.from(new Set(whyTodayChanged)).slice(0, 4),
    nextBestInputs: Array.from(new Set(nextBestInputs)).slice(0, 3),
  }
}

function mergeContextSummaryIntoDecisionResult(
  result: OrchestratorOutputV5,
  contextSummary: DailyContextSummary | null
): OrchestratorOutputV5 {
  if (!contextSummary) return result

  const decision = result.creedaDecision
  const fallbackTrustSummary: TrustSummary = decision.trustSummary || {
    confidenceLevel: decision.confidenceLevel,
    confidenceScore: decision.confidenceScore,
    dataCompleteness: decision.dataCompleteness,
    dataQuality:
      decision.dataCompleteness >= 80 ? 'COMPLETE' : decision.dataCompleteness >= 55 ? 'PARTIAL' : 'WEAK',
    signals: [],
    whyTodayChanged: decision.confidenceReasons || [],
    nextBestInputs: [],
  }

  return {
    ...result,
    creedaDecision: {
      ...decision,
      trustSummary: mergeContextSummaryIntoTrustSummary(fallbackTrustSummary, contextSummary),
    },
  }
}

function mergeNutritionSafetyIntoDecisionResult(
  result: OrchestratorOutputV5,
  nutritionSafety: NutritionSafetySummary
): OrchestratorOutputV5 {
  const decision = result.creedaDecision
  const fallbackTrustSummary: TrustSummary = decision.trustSummary || {
    confidenceLevel: decision.confidenceLevel,
    confidenceScore: decision.confidenceScore,
    dataCompleteness: decision.dataCompleteness,
    dataQuality:
      decision.dataCompleteness >= 80 ? 'COMPLETE' : decision.dataCompleteness >= 55 ? 'PARTIAL' : 'WEAK',
    signals: [],
    whyTodayChanged: decision.confidenceReasons || [],
    nextBestInputs: [],
  }

  if (!nutritionSafety.blocksDetailedAdvice) {
    return {
      ...result,
      creedaDecision: {
        ...decision,
        trustSummary: mergeNutritionSafetyIntoTrustSummary(fallbackTrustSummary, nutritionSafety),
      },
    }
  }

  return {
    ...result,
    creedaDecision: {
      ...decision,
      components: {
        ...decision.components,
        nutrition: {
          ...decision.components.nutrition,
          meals: null,
          fueling: null,
          totalPortionGrams: 0,
        },
        training: {
          ...decision.components.training,
          sessionProtocol: decision.components.training.sessionProtocol
            ? {
                ...decision.components.training.sessionProtocol,
                nutrition: null,
              }
            : null,
        },
      },
      trustSummary: mergeNutritionSafetyIntoTrustSummary(fallbackTrustSummary, nutritionSafety),
    },
  }
}

function getRecentAthleteLogs(
  latestLog: Record<string, unknown> | null,
  historicalLogs: Record<string, unknown>[]
) {
  const byDate = new Map<string, Record<string, unknown>>()
  ;[latestLog, ...historicalLogs].forEach((entry) => {
    if (!entry) return
    const date = getLogDate(entry)
    if (!date || byDate.has(date)) return
    byDate.set(date, entry)
  })

  return Array.from(byDate.values())
    .sort((a, b) => getLogDate(a).localeCompare(getLogDate(b)))
    .slice(-7)
}

function getRecentIndividualTrend(
  intelligenceRows: Array<Record<string, unknown>>,
  decision: IndividualDashboardDecision
): WeeklyReviewPoint[] {
  const rows = intelligenceRows
    .slice()
    .sort((a, b) => String(a.log_date || '').localeCompare(String(b.log_date || '')))
    .slice(-7)

  if (!rows.length) {
    const today = getTodayInIndia()
    return [
      {
        date: today,
        label: formatReviewDayLabel(today),
        readinessScore: Math.round(decision.readinessScore),
      },
    ]
  }

  return rows.map((row) => {
    const date = String(row.log_date || getTodayInIndia())
    return {
      date,
      label: formatReviewDayLabel(date),
      readinessScore: numberOr(row.readiness_score, Math.round(decision.readinessScore)),
    }
  })
}

function getLogDate(log: Record<string, unknown>) {
  const raw = String(log.log_date || log.created_at || '').slice(0, 10)
  return raw || getTodayInIndia()
}

function buildReviewPeriodLabel(dates: string[]) {
  const sorted = dates.filter(Boolean).slice().sort()
  if (!sorted.length) return 'Last 7 days'
  const format = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }).format(
      new Date(`${date}T00:00:00+05:30`)
    )
  if (sorted.length === 1) return format(sorted[0])
  return `${format(sorted[0])} - ${format(sorted[sorted.length - 1])}`
}

function formatReviewDayLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(
    new Date(`${date}T00:00:00+05:30`)
  )
}

function getRecentDateIso(daysBack: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysBack)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date)
}

function mapSleepValueToScore(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 5) return value
    if (value >= 8) return 5
    if (value >= 7) return 4
    if (value >= 6) return 3
    if (value >= 5) return 2
    return 1
  }

  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('excellent')) return 5
  if (normalized.includes('good')) return 4
  if (normalized.includes('okay') || normalized.includes('fair')) return 3
  if (normalized.includes('poor') || normalized.includes('bad')) return 2
  return null
}

function mapStressValueToScore(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 10) return value * 10
    return value
  }

  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('low')) return 25
  if (normalized.includes('moderate') || normalized.includes('medium')) return 55
  if (normalized.includes('high')) return 80
  if (normalized.includes('severe')) return 90
  return null
}

function readPersistedTrustSummary(trace: unknown): TrustSummary | null {
  const trust = readPersistedDecision(trace)?.creedaDecision?.trustSummary as Record<string, unknown> | undefined
  if (!trust) return null

  const signals = Array.isArray(trust.signals)
    ? trust.signals.reduce<TrustSignalSummary[]>((items, signal) => {
          const record = asRecord(signal)
          if (!record) return items
          const status =
            record.status === 'active' ||
            record.status === 'limited' ||
            record.status === 'missing' ||
            record.status === 'building'
              ? record.status
              : 'limited'
          const type =
            record.type === 'measured' ||
            record.type === 'estimated' ||
            record.type === 'self_reported'
              ? record.type
              : 'estimated'

          items.push({
            label: String(record.label || 'Signal'),
            type,
            status,
            detail: record.detail ? String(record.detail) : undefined,
          })
          return items
        }, [])
    : []

  const confidenceLevel =
    trust.confidenceLevel === 'LOW' ||
    trust.confidenceLevel === 'MEDIUM' ||
    trust.confidenceLevel === 'HIGH'
      ? trust.confidenceLevel
      : 'MEDIUM'
  const dataQuality =
    trust.dataQuality === 'COMPLETE' ||
    trust.dataQuality === 'PARTIAL' ||
    trust.dataQuality === 'WEAK'
      ? trust.dataQuality
      : 'PARTIAL'

  return {
    confidenceLevel,
    confidenceScore: clampTo100(numberOr(trust.confidenceScore, 70)),
    dataCompleteness: clampTo100(numberOr(trust.dataCompleteness, 70)),
    dataQuality,
    signals,
    whyTodayChanged: readStringArray(trust.whyTodayChanged, []),
    nextBestInputs: readStringArray(trust.nextBestInputs, []),
  }
}

function normalizeIndividualActivityLevel(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'sedentary' || normalized === 'active' || normalized === 'athlete') return normalized
  return 'moderate'
}

function normalizeIndividualGoal(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized.includes('fat')) return 'fat_loss'
  if (normalized.includes('muscle')) return 'muscle_gain'
  if (normalized.includes('endurance')) return 'endurance'
  if (normalized.includes('sport')) return 'sport_specific'
  return 'general_fitness'
}

function normalizeIndividualTrainingExperience(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase()
  if (['beginner', 'novice', 'intermediate', 'advanced', 'experienced'].includes(normalized)) {
    return normalized
  }
  return 'novice'
}

function normalizeIndividualPathwayType(value: unknown): 'sport' | 'training' | 'lifestyle' {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'sport' || normalized === 'training' || normalized === 'lifestyle') {
    return normalized
  }
  return 'training'
}

function mapIndividualExperienceScore(trainingExperience: string) {
  if (trainingExperience === 'experienced') return 85
  if (trainingExperience === 'advanced') return 74
  if (trainingExperience === 'intermediate') return 60
  if (trainingExperience === 'novice') return 45
  return 30
}

function inferIndividualWorkoutSessionType(readinessScore: number): 'TRAIN' | 'MODIFY' | 'RECOVER' {
  if (readinessScore < 45) return 'RECOVER'
  if (readinessScore < 62) return 'MODIFY'
  return 'TRAIN'
}

function inferTimingPreference(scheduleConstraints: unknown): 'EARLY' | 'LATE' | 'IF' {
  const constraints = Array.isArray(scheduleConstraints) ? scheduleConstraints.map(item => String(item).toLowerCase()) : []
  if (constraints.some(item => item.includes('fast'))) return 'IF'
  if (constraints.some(item => item.includes('late') || item.includes('evening') || item.includes('after_work'))) {
    return 'LATE'
  }
  return 'EARLY'
}

function inferIndividualInjuryRisk(
  currentState: IndividualCurrentState,
  physiologyProfile: Record<string, unknown>
) {
  const injuryHistory = String(physiologyProfile.injuryHistory || '').toLowerCase()
  const injuryHistoryModifier =
    injuryHistory === 'chronic' ? 22 :
    injuryHistory === 'major' ? 16 :
    injuryHistory === 'moderate' ? 10 :
    injuryHistory === 'minor' ? 4 : 0

  return clampTo100(Math.round((currentState.fatigueIndex * 0.6) + injuryHistoryModifier))
}

function getIndividualDirection(readinessScore: number) {
  if (readinessScore < 45) {
    return {
      label: 'Reset day',
      summary: 'Protect recovery, reduce strain, and rebuild energy before you push again.',
    }
  }
  if (readinessScore < 62) {
    return {
      label: 'Build gently',
      summary: 'Keep momentum today, but use controlled effort instead of high strain.',
    }
  }
  if (readinessScore < 80) {
    return {
      label: 'Progress day',
      summary: 'You have enough readiness to build capacity and move forward today.',
    }
  }
  return {
    label: 'High readiness day',
    summary: 'This is a strong day to execute your hardest planned work with quality.',
  }
}

function normalizeIndividualCurrentState(
  raw: Record<string, unknown> | null,
  latestIntel: Record<string, unknown> | null
): IndividualCurrentState {
  return {
    readinessScore: numberOr(raw?.readinessScore, numberOr(latestIntel?.readiness_score, 50)),
    strengthProfile: numberOr(raw?.strengthProfile, 50),
    enduranceLevel: numberOr(raw?.enduranceLevel, 50),
    mobilityStatus: numberOr(raw?.mobilityStatus, 50),
    recoveryCapacity: numberOr(raw?.recoveryCapacity, 50),
    bodyCompositionIndex: numberOr(raw?.bodyCompositionIndex, 50),
    fatigueIndex: numberOr(raw?.fatigueIndex, 50),
  }
}

function normalizeIndividualPeakState(
  raw: Record<string, unknown> | null,
  currentState: IndividualCurrentState
): IndividualPeakState {
  const currentBmi = numberOr(asRecord(raw?.targetBodyComposition)?.currentBmi, 23)
  return {
    targetEndurance: numberOr(raw?.targetEndurance, Math.max(currentState.enduranceLevel + 12, 70)),
    targetStrength: numberOr(raw?.targetStrength, Math.max(currentState.strengthProfile + 12, 70)),
    targetMobility: numberOr(raw?.targetMobility, Math.max(currentState.mobilityStatus + 8, 72)),
    targetRecoveryEfficiency: numberOr(raw?.targetRecoveryEfficiency, Math.max(currentState.recoveryCapacity + 10, 72)),
    targetReadiness: numberOr(raw?.targetReadiness, Math.max(currentState.readinessScore + 12, 80)),
    targetBodyComposition: {
      currentBmi,
      targetBmi: numberOr(asRecord(raw?.targetBodyComposition)?.targetBmi, currentBmi),
      targetWeightKg: numberOr(asRecord(raw?.targetBodyComposition)?.targetWeightKg, 70),
    },
  }
}

function buildGapItem(pillar: string, current: number, target: number): IndividualGapAnalysis['primaryGap'] {
  const gap = Math.max(0, target - current)
  return {
    pillar,
    current,
    target,
    gap,
    priority: gap >= 20 ? 'high' : gap >= 10 ? 'medium' : 'low',
  }
}

function normalizeIndividualGapAnalysis(
  raw: Record<string, unknown> | null,
  currentState: IndividualCurrentState,
  peakState: IndividualPeakState
): IndividualGapAnalysis {
  const fallbackGaps = [
    buildGapItem('Readiness', currentState.readinessScore, peakState.targetReadiness),
    buildGapItem('Recovery', currentState.recoveryCapacity, peakState.targetRecoveryEfficiency),
    buildGapItem('Strength', currentState.strengthProfile, peakState.targetStrength),
    buildGapItem('Endurance', currentState.enduranceLevel, peakState.targetEndurance),
    buildGapItem('Mobility', currentState.mobilityStatus, peakState.targetMobility),
  ].sort((a, b) => b.gap - a.gap)

  const gaps =
    Array.isArray(raw?.gaps) && raw?.gaps.length
      ? raw.gaps
          .map((item) => {
            const record = asRecord(item)
            if (!record) return null
            return {
              pillar: String(record.pillar || 'Pillar'),
              current: numberOr(record.current, 0),
              target: numberOr(record.target, 0),
              gap: numberOr(record.gap, 0),
              priority:
                record.priority === 'high' || record.priority === 'medium' || record.priority === 'low'
                  ? record.priority
                  : 'medium',
            } as IndividualGapAnalysis['primaryGap']
          })
          .filter((item): item is IndividualGapAnalysis['primaryGap'] => item !== null)
      : fallbackGaps

  const sortedGaps = gaps.length ? [...gaps].sort((a, b) => b.gap - a.gap) : fallbackGaps
  const riskAreas = readStringArray(raw?.riskAreas, [])

  if (!riskAreas.length) {
    if (currentState.recoveryCapacity < 55) riskAreas.push('Recovery capacity is lagging behind your target plan.')
    if (currentState.mobilityStatus < 55) riskAreas.push('Mobility may limit how fast you can safely progress.')
    if (currentState.readinessScore < 50) riskAreas.push('Low readiness means today should stay controlled and recovery-friendly.')
  }

  if (!riskAreas.length) {
    riskAreas.push('Low current risk. Focus on consistency, recovery, and gradual progression.')
  }

  return {
    gaps: sortedGaps,
    primaryGap: sortedGaps[0] || buildGapItem('Readiness', currentState.readinessScore, peakState.targetReadiness),
    riskAreas,
  }
}

function normalizeIndividualPlan(raw: Record<string, unknown> | null): IndividualPlanEngine {
  const trainingPlan = asRecord(raw?.trainingPlan)
  const recoveryPlan = asRecord(raw?.recoveryPlan)
  const lifestylePlan = asRecord(raw?.lifestylePlan)
  const progressionLogic = asRecord(raw?.progressionLogic)

  return {
    trainingPlan: {
      trainingDaysPerWeek: numberOr(trainingPlan?.trainingDaysPerWeek, 3),
      weeklyStructure: Array.isArray(trainingPlan?.weeklyStructure)
        ? trainingPlan.weeklyStructure
            .map((item) => {
              const record = asRecord(item)
              if (!record) return null
              return {
                day: String(record.day || 'Monday'),
                focus: String(record.focus || 'Foundation work'),
                type:
                  record.type === 'training' || record.type === 'recovery' || record.type === 'mobility'
                    ? record.type
                    : 'training',
                intensity:
                  record.intensity === 'low' || record.intensity === 'moderate' || record.intensity === 'high'
                    ? record.intensity
                    : 'moderate',
                durationMinutes: numberOr(record.durationMinutes, 45),
              }
            })
            .filter((item): item is IndividualPlanEngine['trainingPlan']['weeklyStructure'][number] => item !== null)
        : [],
      sportSpecificDrills: readStringArray(trainingPlan?.sportSpecificDrills, []),
    },
    recoveryPlan: {
      sleepTargetHours: numberOr(recoveryPlan?.sleepTargetHours, 8),
      interventions: readStringArray(recoveryPlan?.interventions, ['10-minute mobility reset', 'Walk after meals', 'Aim for a consistent sleep window']),
      deloadLogic: String(recoveryPlan?.deloadLogic || 'Reduce intensity when readiness remains low for multiple days.'),
    },
    lifestylePlan: {
      stepTarget: numberOr(lifestylePlan?.stepTarget, 8000),
      hydrationLiters: numberOr(lifestylePlan?.hydrationLiters, 2.5),
      movementBreakEveryMinutes: numberOr(lifestylePlan?.movementBreakEveryMinutes, 60),
      habitGoals: readStringArray(lifestylePlan?.habitGoals, ['Move daily', 'Keep hydration steady', 'Protect sleep consistency']),
    },
    progressionLogic: {
      loadIncreasePerWeekPct: numberOr(progressionLogic?.loadIncreasePerWeekPct, 5),
      adaptiveRules: readStringArray(progressionLogic?.adaptiveRules, ['If readiness drops, protect recovery before adding intensity.']),
    },
  }
}

function normalizeIndividualJourneyState(raw: Record<string, unknown> | null): IndividualJourneyState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    journeyStartDate: String(raw?.journeyStartDate || today),
    projectedPeakDate: String(raw?.projectedPeakDate || today),
    currentWeek: Math.max(1, numberOr(raw?.currentWeek, 1)),
    totalWeeks: Math.max(1, numberOr(raw?.totalWeeks, 12)),
    completedSessions: Math.max(0, numberOr(raw?.completedSessions, 0)),
    missedSessions: Math.max(0, numberOr(raw?.missedSessions, 0)),
    adherenceScore: numberOr(raw?.adherenceScore, 100),
    streakCount: Math.max(0, numberOr(raw?.streakCount, 0)),
    progressToPeakPct: numberOr(raw?.progressToPeakPct, Math.round(numberOr(raw?.adherenceScore, 100))),
  }
}

function normalizeIndividualDailyGuidance(
  raw: Record<string, unknown> | null,
  currentState: IndividualCurrentState,
  plan: IndividualPlanEngine
): DailyGuidance {
  const fallbackDay = plan.trainingPlan.weeklyStructure[0]
  return {
    todayFocus: String(raw?.todayFocus || fallbackDay?.focus || 'Build your foundation'),
    intensity:
      raw?.intensity === 'low' || raw?.intensity === 'moderate' || raw?.intensity === 'high'
        ? raw.intensity
        : fallbackDay?.intensity || 'moderate',
    readinessScore: numberOr(raw?.readinessScore, currentState.readinessScore),
    sessionDurationMinutes: numberOr(raw?.sessionDurationMinutes, fallbackDay?.durationMinutes || 45),
    whatToDo: readStringArray(raw?.whatToDo, [
      `${fallbackDay?.focus || 'Foundation work'} for ${fallbackDay?.durationMinutes || 45} minutes.`,
      `Hit your step target of ${plan.lifestylePlan.stepTarget.toLocaleString()} today.`,
      'Finish the day with a short reflection so CREEDA can track your trend.',
    ]),
    recoveryActions: readStringArray(raw?.recoveryActions, plan.recoveryPlan.interventions.slice(0, 3)),
    adaptationNote: String(
      raw?.adaptationNote || 'CREEDA is shaping today around your current readiness, recovery, and recent trend.'
    ),
  }
}

function normalizeIndividualWeeklyFeedback(
  raw: Record<string, unknown> | null,
  currentState: IndividualCurrentState,
  journeyState: IndividualJourneyState,
  plan: IndividualPlanEngine
): WeeklyFeedback {
  return {
    averageReadiness: numberOr(raw?.averageReadiness, currentState.readinessScore),
    adherencePct: numberOr(raw?.adherencePct, journeyState.adherenceScore),
    trend:
      raw?.trend === 'improving' || raw?.trend === 'stable' || raw?.trend === 'declining'
        ? raw.trend
        : 'stable',
    improvements: readStringArray(raw?.improvements, ['Your current plan is built to improve consistency before complexity.']),
    adjustments: readStringArray(raw?.adjustments, [
      `Anchor ${plan.trainingPlan.trainingDaysPerWeek} quality movement days this week before adding extra work.`,
    ]),
  }
}

function normalizeIndividualPeakProjection(
  raw: Record<string, unknown> | null,
  currentState: IndividualCurrentState,
  peakState: IndividualPeakState,
  journeyState: IndividualJourneyState
): PeakProjection {
  return {
    currentLevelScore: numberOr(raw?.currentLevelScore, currentState.readinessScore),
    projectedPeakScore: numberOr(raw?.projectedPeakScore, peakState.targetReadiness),
    weeksRemaining: Math.max(1, numberOr(raw?.weeksRemaining, Math.max(1, journeyState.totalWeeks - journeyState.currentWeek + 1))),
    projectedPeakDate: String(raw?.projectedPeakDate || journeyState.projectedPeakDate),
    visualMilestones: Array.isArray(raw?.visualMilestones) && raw?.visualMilestones.length
      ? raw.visualMilestones
          .map((item) => {
            const record = asRecord(item)
            if (!record) return null
            return {
              label: String(record.label || 'Milestone'),
              progressPct: numberOr(record.progressPct, 0),
            }
          })
          .filter((item): item is PeakProjection['visualMilestones'][number] => item !== null)
      : [
          { label: 'Routine', progressPct: 30 },
          { label: 'Build', progressPct: 65 },
          { label: 'Peak Self', progressPct: 100 },
        ],
  }
}

function normalizeIndividualRecommendations(raw: unknown): IndividualPathRecommendation[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const record = asRecord(item)
      if (!record) return null
      return {
        id: String(record.id || ''),
        type:
          record.type === 'sport' || record.type === 'training' || record.type === 'lifestyle'
            ? record.type
            : 'sport',
        title: String(record.title || 'Recommended path'),
        mappedSport: String(record.mappedSport || record.title || 'General Fitness'),
        score: numberOr(record.score, 0),
        summary: String(record.summary || ''),
        why: readStringArray(record.why, []),
      } satisfies IndividualPathRecommendation
    })
    .filter((item): item is IndividualPathRecommendation => item !== null)
}

function normalizeHistoricalLogs(
  logs: Array<Record<string, unknown>>,
  intelligenceRows: Array<Record<string, unknown>>
) {
  const intelByDate = new Map<string, Record<string, unknown>>()
  intelligenceRows.forEach((row) => {
    const key = String(row.log_date || '')
    if (key) intelByDate.set(key, row)
  })

  return logs
    .map((log) => normalizeSingleLog(log, intelByDate.get(String(log.log_date || ''))))
    .filter((log): log is NonNullable<ReturnType<typeof normalizeSingleLog>> => log !== null)
}

function normalizeSingleLog(
  rawLog: Record<string, unknown> | null | undefined,
  intelligenceRow?: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!rawLog) return null

  const baseMeta = asRecord(rawLog.intelligence_meta)
  const trace = asRecord(intelligenceRow?.intelligence_trace)
  const decisionBundle = readPersistedDecision(trace)

  return {
    ...rawLog,
    sleep_quality: readLogField(rawLog, ['sleep_quality', 'sleep']),
    energy_level: readLogField(rawLog, ['energy_level', 'energy']),
    muscle_soreness: readLogField(rawLog, ['muscle_soreness', 'soreness']),
    stress_level: readLogField(rawLog, ['stress_level', 'stress', 'life_stress']),
    readinessScore:
      numberOr(rawLog.readiness_score, numberOr(baseMeta?.readinessScore, numberOr(intelligenceRow?.readiness_score, 70))),
    readiness_score:
      numberOr(rawLog.readiness_score, numberOr(baseMeta?.readinessScore, numberOr(intelligenceRow?.readiness_score, 70))),
    adherenceScore:
      numberOr(decisionBundle?.creedaDecision?.adherence?.adherenceScore, numberOr(baseMeta?.adherenceScore, 0.8)),
    domains: asRecord(decisionBundle?.metrics?.readiness)?.domains || asRecord(baseMeta?.domains),
    intelligence_meta: {
      ...baseMeta,
      loadMetrics: asRecord(baseMeta?.loadMetrics) || asRecord(decisionBundle?.metrics?.load),
      uncertainty: asRecord(baseMeta?.uncertainty) || asRecord(decisionBundle?.metrics?.uncertainty),
    },
  }
}

function normalizeAdaptationProfile(raw: Record<string, unknown> | null | undefined): AdaptationProfile {
  return {
    fatigue_sensitivity: numberOr(raw?.fatigue_sensitivity, DEFAULT_ADAPTATION_PROFILE.fatigue_sensitivity),
    recovery_speed: numberOr(raw?.recovery_speed, DEFAULT_ADAPTATION_PROFILE.recovery_speed),
    load_tolerance: numberOr(raw?.load_tolerance, DEFAULT_ADAPTATION_PROFILE.load_tolerance),
    neuromuscular_bias: numberOr(raw?.neuromuscular_bias, DEFAULT_ADAPTATION_PROFILE.neuromuscular_bias),
    learning_rate: numberOr(raw?.learning_rate, DEFAULT_ADAPTATION_PROFILE.learning_rate),
    ewma_readiness_avg: numberOr(raw?.ewma_readiness_avg, DEFAULT_ADAPTATION_PROFILE.ewma_readiness_avg),
    ewma_fatigue_avg: numberOr(raw?.ewma_fatigue_avg, DEFAULT_ADAPTATION_PROFILE.ewma_fatigue_avg),
    strength_progression_rate: numberOr(
      raw?.strength_progression_rate,
      DEFAULT_ADAPTATION_PROFILE.strength_progression_rate
    ),
    last_updated: String(raw?.last_updated || DEFAULT_ADAPTATION_PROFILE.last_updated),
  }
}

function normalizePerformanceProfile(
  performanceRow: Record<string, unknown> | null,
  diagnostic: Record<string, unknown> | null
): PerformanceProfile | undefined {
  if (!performanceRow && !diagnostic) return undefined

  return {
    estimated1RM: (asRecord(performanceRow?.estimated_1rm) as Record<string, number>) || {},
    strengthLevel: (String(performanceRow?.strength_level || 'BEGINNER').toUpperCase() as PerformanceProfile['strengthLevel']),
    mobilityScore: numberOr(
      performanceRow?.mobility_score,
      numberOr(asRecord(diagnostic?.performance_baseline)?.mobilityScore, 70)
    ),
    isCalibrated: Boolean(performanceRow?.is_calibrated),
  }
}

function normalizeVisionFaults(rows: Array<Record<string, unknown>> | null | undefined): VisionFault[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    fault: String(row.fault || 'Unknown fault'),
    riskMapping: String(row.risk_mapping || ''),
    correctiveDrills: Array.isArray(row.corrective_drills)
      ? row.corrective_drills.map((item) => String(item))
      : [],
    severity: row.severity === 'high' || row.severity === 'moderate' ? row.severity : 'low',
    confidence: 0.75,
    timestamp: String(row.session_date || ''),
  }))
}

function normalizeRehabHistory(rows: Array<Record<string, unknown>> | null | undefined): RehabHistoryEntry[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    date: String(row.date || ''),
    injury_type: normalizeInjuryType(row.injury_type),
    stage: numberOr(row.stage, 1),
    pain_score: numberOr(row.pain_score, 0),
    load_tolerance: numberOr(row.load_tolerance, 0.5),
    progression_flag:
      row.progression_flag === 'progressed' ||
      row.progression_flag === 'regressed' ||
      row.progression_flag === 'held'
        ? row.progression_flag
        : 'started',
  }))
}

function normalizeInjuryType(value: unknown) {
  const normalized = String(value || '').trim().toUpperCase()
  if (
    normalized === 'HAMSTRING' ||
    normalized === 'ACL' ||
    normalized === 'ANKLE' ||
    normalized === 'SHOULDER' ||
    normalized === 'KNEE' ||
    normalized === 'LOWER_BACK' ||
    normalized === 'GROIN' ||
    normalized === 'CALF'
  ) {
    return normalized
  }
  return null
}

function readPersistedDecision(trace: unknown): OrchestratorOutputV5 | null {
  const record = asRecord(trace)
  const candidate = asRecord(record?.decisionBundle || record?.engineResult || record?.result)
  if (candidate?.creedaDecision && candidate?.metrics) {
    return candidate as unknown as OrchestratorOutputV5
  }
  return null
}

async function getObjectiveTestSummary(
  supabase: SupabaseLike,
  userId: string
): Promise<ObjectiveTestSummary | null> {
  const result = await safeSelect(
    supabase,
    'objective_test_sessions',
    '*',
    (query: any) =>
      query
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(32)
  )

  if (!result.available) return null

  const sessions = (Array.isArray(result.data) ? result.data : [])
    .map(normalizeObjectiveTestSession)
    .filter((session): session is ObjectiveTestSession => Boolean(session))
  const baselines = computeObjectiveBaselines(sessions)
  const signals = summarizeObjectiveSignals(sessions, baselines)
  const primarySignal = signals[0] || null
  const primarySessions = primarySignal
    ? sessions.filter((session) => session.testType === primarySignal.protocolId)
    : []
  const latestSession = primarySessions[0] || null
  const previousSession = primarySessions[1] || null
  const latestValidatedScoreMs =
    primarySignal?.headlineMetricUnit === 'ms'
      ? Math.round(primarySignal.headlineMetricValue ?? latestSession?.validatedScoreMs ?? 0)
      : null
  const previousValidatedScoreMs =
    previousSession?.headlineMetricUnit === 'ms'
      ? Math.round(previousSession.headlineMetricValue ?? previousSession?.validatedScoreMs ?? 0)
      : null
  const deltaVsPreviousMs =
    latestValidatedScoreMs !== null && previousValidatedScoreMs !== null
      ? latestValidatedScoreMs - previousValidatedScoreMs
      : null
  const freshness: ObjectiveTestSummary['freshness'] = primarySignal?.freshness || 'missing'
  const trend: ObjectiveTestSummary['trend'] = primarySignal?.trend || 'missing'

  const weekSessionCount = sessions.filter((session) => {
    const date = session.completedAt?.slice(0, 10)
    return Boolean(date && date >= getRecentDateIso(7))
  }).length

  const trustStatus: TrustSignalSummary['status'] =
    !primarySignal
      ? 'building'
      : freshness === 'fresh'
        ? latestSession?.validityStatus === 'accepted'
          ? 'active'
          : 'limited'
        : 'limited'

  return {
    latestSession,
    latestValidatedScoreMs,
    previousValidatedScoreMs,
    deltaVsPreviousMs,
    trend,
    freshness,
    trustStatus,
    classification: primarySignal?.classification || latestSession?.classification || null,
    completedAt: latestSession?.completedAt || null,
    recentSessionCount: sessions.length,
    weekSessionCount,
    summary: primarySignal?.summary || 'Objective testing is optional. No saved objective session is attached yet.',
    nextAction:
      primarySignal?.nextAction ||
      'Optional: run a measured test if you want CREEDA to compare a fresh objective signal against your daily loop.',
    primaryProtocolId: primarySignal?.protocolId || null,
    latestHeadlineMetricValue: primarySignal?.headlineMetricValue ?? null,
    latestHeadlineMetricUnit: primarySignal?.headlineMetricUnit || null,
    latestHeadlineMetricLabel: primarySignal?.headlineMetricLabel || null,
    primarySignal,
    signals,
  }
}

async function getHealthSummary(supabase: SupabaseLike, userId: string): Promise<AthleteHealthSummary | null> {
  const [connectionResult, metricsResult] = await Promise.all([
    safeSelect(
      supabase,
      HEALTH_CONNECTIONS_TABLE,
      'apple_connected,android_connected,last_sync_at,last_sync_status,last_error',
      (query: any) => query.eq('user_id', userId).maybeSingle()
    ),
    safeSelect(
      supabase,
      HEALTH_DAILY_METRICS_TABLE,
      'metric_date,steps,sleep_hours,heart_rate_avg,hrv,source',
      (query: any) => query.eq('user_id', userId).order('metric_date', { ascending: false }).limit(7)
    ),
  ])

  if (!connectionResult.available && !metricsResult.available) return null

  const connection = asRecord(connectionResult.data)
  const rows = Array.isArray(metricsResult.data) ? metricsResult.data : []
  const latest = rows[0] || null

  const apple = Boolean(connection?.apple_connected)
  const android = Boolean(connection?.android_connected)
  const source: AthleteHealthSummary['source'] = apple && android ? 'mixed' : apple ? 'apple' : android ? 'android' : 'none'

  return {
    connected: apple || android,
    available: connectionResult.available || metricsResult.available,
    source,
    lastSyncAt: connection?.last_sync_at ? String(connection.last_sync_at) : null,
    lastSyncStatus: connection?.last_sync_status ? String(connection.last_sync_status) : null,
    lastError: connection?.last_error ? String(connection.last_error) : null,
    latestMetricDate: latest?.metric_date ? String(latest.metric_date) : null,
    latestSteps: latest ? numberOr(latest.steps, 0) : null,
    avgSleepHours: average(rows.map((row) => toFiniteNumber(row.sleep_hours)).filter(isFiniteNumber)),
    avgHeartRate: average(rows.map((row) => toFiniteNumber(row.heart_rate_avg)).filter(isFiniteNumber)),
    avgHrv: average(rows.map((row) => toFiniteNumber(row.hrv)).filter(isFiniteNumber)),
    sampleDays: rows.length,
    latestMetrics: latest
      ? {
          steps: numberOr(latest.steps, 0),
          sleep_hours: numberOr(latest.sleep_hours, 0),
          heart_rate_avg: numberOr(latest.heart_rate_avg, 0),
          hrv: numberOr(latest.hrv, 0),
        }
      : undefined,
  }
}

async function safeSelect(
  supabase: SupabaseLike,
  table: string,
  columns: string,
  build: (query: any) => PromiseLike<{ data: any; error: any }> | { data: any; error: any }
) {
  const result = await build(supabase.from(table).select(columns))
  if (!result.error) return { available: true, data: result.data }
  if (isMissingRelationError(result.error, table)) {
    return { available: false, data: null }
  }
  console.warn(`[dashboard_decisions] ${table} query failed`, result.error)
  return { available: true, data: null }
}

async function persistWeeklyReviewSnapshot(
  supabase: SupabaseLike,
  args: {
    userId: string
    role: 'athlete' | 'individual' | 'coach'
    weekStart: string
    focus: string
    summary: Record<string, unknown>
  }
) {
  const payload = {
    user_id: args.userId,
    role: args.role,
    week_start: args.weekStart,
    summary_json: args.summary,
    focus: args.focus,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const result = await supabase
      .from('weekly_reviews')
      .upsert(payload, { onConflict: 'user_id,role,week_start' })

    if (!result.error) return
    if (isMissingRelationError(result.error, 'weekly_reviews')) return
    console.warn('[dashboard_decisions] weekly_reviews upsert failed', result.error)
  } catch (error) {
    if (isMissingRelationError(error, 'weekly_reviews')) return
    console.warn('[dashboard_decisions] weekly_reviews upsert failed', error)
  }
}

function isMissingRelationError(error: any, table: string) {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes(`relation "${table}"`) ||
    message.includes(`relation '${table}'`) ||
    message.includes(`table ${table}`) ||
    message.includes(table)
  )
}

function buildAdherence(currentLog: Record<string, unknown>) {
  const dayType = String(currentLog.day_type || '').toLowerCase()
  if (dayType === 'missed' || dayType === 'skipped') {
    return { yesterdayPlanFollowed: false, adherenceScore: 0.2 }
  }
  if (dayType === 'rest' || dayType === 'recovery') {
    return { yesterdayPlanFollowed: true, adherenceScore: 0.75 }
  }
  if (currentLog.competition_yesterday || currentLog.competition_today) {
    return { yesterdayPlanFollowed: true, adherenceScore: 0.95 }
  }
  return { yesterdayPlanFollowed: true, adherenceScore: 0.9 }
}

function mapSessionType(value: unknown): SessionType | undefined {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized.includes('speed')) return 'speed'
  if (normalized.includes('strength')) return 'strength'
  if (normalized.includes('endurance')) return 'endurance'
  if (normalized.includes('skill')) return 'skill'
  return undefined
}

function inferActivityLevel(trainingFrequency: unknown, avgIntensity?: unknown, playingLevel?: unknown) {
  const frequency = String(trainingFrequency || '').trim().toLowerCase()
  const intensity = String(avgIntensity || '').trim().toLowerCase()
  const level = String(playingLevel || '').trim().toLowerCase()

  let score = 0
  if (frequency === 'daily') score += 3
  else if (frequency === '4-6 days') score += 2
  else if (frequency === '1-3 days') score += 1

  if (intensity === 'high') score += 2
  else if (intensity === 'moderate') score += 1

  if (['national', 'professional'].includes(level)) score += 2
  else if (['state', 'district'].includes(level)) score += 1

  if (score >= 5) return 'athlete'
  if (score >= 3) return 'active'
  return 'moderate'
}

function normalizeMotivation(value: unknown, fallback = 65) {
  const numeric = toFiniteNumber(value)
  if (numeric !== null) {
    if (numeric >= 0 && numeric <= 5) return Math.round((numeric / 5) * 100)
    if (numeric >= 0 && numeric <= 10) return Math.round((numeric / 10) * 100)
    if (numeric >= 0 && numeric <= 100) return Math.round(numeric)
  }

  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'low') return 35
  if (normalized === 'moderate') return 60
  if (normalized === 'high') return 82
  return fallback
}

function normalizeStressScore(value: unknown) {
  const numeric = toFiniteNumber(value)
  if (numeric !== null) {
    if (numeric >= 0 && numeric <= 5) return Math.round(numeric * 2)
    if (numeric >= 0 && numeric <= 10) return Math.round(numeric)
    if (numeric <= 100) return Math.round(numeric / 10)
  }

  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'low' || normalized === 'none') return 2
  if (normalized === 'moderate') return 5
  if (normalized === 'high') return 8
  if (normalized === 'very high' || normalized === 'extremely high') return 10
  return 5
}

function normalizeEnergyLevel(value: unknown) {
  const numeric = toFiniteNumber(value)
  if (numeric !== null) {
    if (numeric <= 5) return Math.round(numeric)
    if (numeric <= 10) return Math.round(numeric / 2)
    return Math.max(1, Math.min(5, Math.round(numeric / 20)))
  }

  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'drained') return 1
  if (normalized === 'low') return 2
  if (normalized === 'moderate') return 3
  if (normalized === 'high') return 4
  if (normalized === 'peak') return 5
  return 3
}

function readLogField(log: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = log?.[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

function readStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const items = value.map((item) => String(item || '').trim()).filter(Boolean)
  return items.length ? items : fallback
}

function average(values: number[]) {
  if (!values.length) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return Number((total / values.length).toFixed(1))
}

function isFiniteNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toFiniteNumber(value: unknown, fallback?: number) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return parsed
  return typeof fallback === 'number' ? fallback : null
}

function numberOr(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clampTo100(value: number) {
  return Math.max(0, Math.min(100, value))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}
