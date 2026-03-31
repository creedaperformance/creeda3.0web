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
  OrchestratorOutputV5,
  PerformanceProfile,
  RehabHistoryEntry,
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
}

export interface AthleteDashboardSnapshot extends AthleteDecisionContext {
  decisionResult: OrchestratorOutputV5 | null
  latestVideoReport: VideoAnalysisReportSummary | null
}

export interface IndividualDashboardSnapshot {
  individualProfile: Record<string, unknown> | null
  intelligenceRows: Array<Record<string, unknown>>
  readinessScore: number
  sport: string
  primaryGoal: string
  decision: IndividualDashboardDecision | null
  latestVideoReport: VideoAnalysisReportSummary | null
}

export interface IndividualDashboardDecision {
  readinessScore: number
  directionLabel: string
  directionSummary: string
  explanation: string
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
  prescriptions: {
    workoutPlan: WorkoutPlan | null
    mealPlan: RecommendedMeal[] | null
    nutritionFramework: PersonalizedNutritionFramework
    trainingFramework: PersonalizedTrainingFramework
    sources: EvidenceReference[]
  }
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
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, primary_sport, position, onboarding_completed')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('diagnostics')
      .select(
        'primary_goal, physiology_profile, reaction_profile, performance_baseline, profile_data, training_reality, sport_context'
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
  ])

  const profile = profileResult.data || null
  const diagnostic = diagnosticResult.data || null
  const rawLogs = Array.isArray(logsResult.data) ? logsResult.data : []
  const rawIntelligence = Array.isArray(intelligenceResult.data) ? intelligenceResult.data : []

  const latestLog = options?.beforeDate ? null : normalizeSingleLog(rawLogs[0], rawIntelligence[0])
  const historicalRawLogs = options?.beforeDate ? rawLogs : rawLogs.slice(1)
  const historicalLogs = normalizeHistoricalLogs(historicalRawLogs, rawIntelligence)
  const latestIntelligence = options?.beforeDate ? null : rawIntelligence[0] || null

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
  }
}

export async function getAthleteDashboardSnapshot(
  supabase: SupabaseLike,
  userId: string
): Promise<AthleteDashboardSnapshot> {
  const [context, latestVideoReport] = await Promise.all([
    getAthleteDecisionContext(supabase, userId),
    getLatestUserVideoReport(supabase, userId),
  ])
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

  return {
    ...context,
    decisionResult,
    latestVideoReport,
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
  source = 'athlete_daily_checkin_v1'
) {
  return {
    source,
    generatedAt: new Date().toISOString(),
    decisionBundle: result,
    healthSummary,
  }
}

export async function getIndividualDashboardSnapshot(
  supabase: SupabaseLike,
  userId: string
): Promise<IndividualDashboardSnapshot> {
  const [individualProfileResult, intelligenceResult, healthSummary, latestVideoReport] = await Promise.all([
    supabase.from('individual_profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('computed_intelligence')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(14),
    getHealthSummary(supabase, userId),
    getLatestUserVideoReport(supabase, userId),
  ])

  const individualProfile = individualProfileResult.data || null
  const intelligenceRows = Array.isArray(intelligenceResult.data) ? intelligenceResult.data : []
  const latestIntel = intelligenceRows[0] || null

  const sportProfile = asRecord(individualProfile?.sport_profile)
  const goalProfile = asRecord(individualProfile?.goal_profile)
  const currentState = normalizeIndividualCurrentState(asRecord(individualProfile?.current_state), latestIntel)

  return {
    individualProfile,
    intelligenceRows,
    readinessScore: currentState.readinessScore,
    sport: String(sportProfile?.selectedSport || 'General Fitness'),
    primaryGoal: String(goalProfile?.primaryGoal || ''),
    decision: individualProfile ? await buildIndividualDashboardDecision(userId, individualProfile, latestIntel, healthSummary) : null,
    latestVideoReport,
  }
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

  const sessionRpe = numberOr(currentLog.session_rpe, 0)
  const durationMinutes = numberOr(currentLog.duration_minutes, 0)
  const motivation = normalizeMotivation(readLogField(currentLog, ['motivation', 'mental_readiness']))
  const stressNumeric = normalizeStressScore(readLogField(currentLog, ['stress', 'stress_level', 'life_stress']))
  const healthMetrics = context.healthSummary?.latestMetrics
  const sleepInput = readLogField(currentLog, ['sleep_quality', 'sleep'])
  const energyInput = readLogField(currentLog, ['energy_level', 'energy'])
  const sorenessInput = readLogField(currentLog, ['muscle_soreness', 'soreness'])
  const stressInput = readLogField(currentLog, ['stress_level', 'stress', 'life_stress'])

  return {
    userId: context.userId,
    wellness: {
      sleep_quality: typeof sleepInput === 'string' || typeof sleepInput === 'number' ? sleepInput : 3,
      energy_level: normalizeEnergyLevel(energyInput),
      muscle_soreness: typeof sorenessInput === 'string' || typeof sorenessInput === 'number' ? sorenessInput : 2,
      stress_level: normalizeStressScore(stressInput),
      motivation,
      current_pain_level: numberOr(currentLog.current_pain_level, 0),
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
      activityLevel: inferActivityLevel(trainingReality.trainingFrequency || trainingReality.training_frequency),
    },
    context: {
      sport: String(sportContext.primarySport || context.profile?.primary_sport || 'General'),
      position: String(sportContext.position || context.profile?.position || ''),
      is_match_day: Boolean(currentLog.is_match_day || currentLog.competition_today),
      travel_day: String(currentLog.day_type || '').toLowerCase() === 'travel',
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

async function buildIndividualDashboardDecision(
  userId: string,
  individualProfile: Record<string, unknown>,
  latestIntel: Record<string, unknown> | null,
  healthSummary: AthleteHealthSummary | null
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
  const mealPlan = await nutritionGenerator.buildDailyNutrition(
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

  const direction = getIndividualDirection(currentState.readinessScore)
  const primaryGap = gapAnalysis.primaryGap
  const explanationBits = [
    primaryGap.gap > 0 ? `Your biggest opportunity right now is ${primaryGap.pillar.toLowerCase()}.` : '',
    today.adaptationNote,
    healthIntegration.usedInDecision
      ? `Device data influenced today's guidance by ${numberOr(healthIntegration.influencePct, 0)}%.`
      : '',
  ].filter(Boolean)

  return {
    readinessScore: currentState.readinessScore,
    directionLabel: direction.label,
    directionSummary: direction.summary,
    explanation: explanationBits.join(' '),
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
    prescriptions: {
      workoutPlan,
      mealPlan,
      nutritionFramework,
      trainingFramework,
      sources: prescriptionSources,
    },
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

async function getHealthSummary(supabase: SupabaseLike, userId: string): Promise<AthleteHealthSummary | null> {
  const [connectionResult, metricsResult] = await Promise.all([
    safeSelect(
      supabase,
      'health_connections',
      'apple_connected,android_connected,last_sync_at,last_sync_status,last_error',
      (query: any) => query.eq('user_id', userId).maybeSingle()
    ),
    safeSelect(
      supabase,
      'health_daily_metrics',
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

function inferActivityLevel(trainingFrequency: unknown) {
  const normalized = String(trainingFrequency || '').trim().toLowerCase()
  if (normalized === 'daily') return 'athlete'
  if (normalized === '4-6 days') return 'active'
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
