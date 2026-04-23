import 'server-only'

import { getTodayInIndia } from '@/lib/dashboard_decisions'
import { calculateConfidence } from '@/forms/engine/confidenceEngine'
import { processAthleteDailySignals, processIndividualDailySignals } from '@/forms/engine/dailySignalProcessor'
import { getNextQuestions, getCompletionPercentage } from '@/forms/engine/progressiveProfiler'
import { athleteDailyFlow, athleteOnboardingFlow } from '@/forms/flows/athleteFlow'
import { coachOnboardingFlow } from '@/forms/flows/coachFlow'
import { individualDailyFlow, individualOnboardingFlow } from '@/forms/flows/individualFlow'
import type { AdaptiveProfilePrefill, AdaptiveProfileSummary, FormFlowDefinition } from '@/forms/types'
import { normalizeIndividualOccupation } from '@/lib/individual_performance_engine'

const ADAPTIVE_FORM_PROFILES_TABLE = 'adaptive_form_profiles'
const ADAPTIVE_DAILY_LOGS_TABLE = 'adaptive_daily_logs'

type SupabaseLike = {
  from: (table: string) => any
}

function getFlowById(flowId: string): FormFlowDefinition | null {
  switch (flowId) {
    case athleteOnboardingFlow.id:
      return athleteOnboardingFlow
    case athleteDailyFlow.id:
      return athleteDailyFlow
    case individualOnboardingFlow.id:
      return individualOnboardingFlow
    case individualDailyFlow.id:
      return individualDailyFlow
    case coachOnboardingFlow.id:
      return coachOnboardingFlow
    default:
      return null
  }
}

function splitFields(flow: FormFlowDefinition, answers: Record<string, unknown>) {
  const layer1Ids = new Set(flow.fields.filter((field) => field.layer === 'layer1').map((field) => field.id))
  const layer2Ids = new Set(flow.fields.filter((field) => field.layer === 'layer2').map((field) => field.id))

  const coreFields = Object.fromEntries(
    Object.entries(answers).filter(([key, value]) => layer1Ids.has(key) && value !== undefined)
  )
  const optionalFields = Object.fromEntries(
    Object.entries(answers).filter(([key, value]) => layer2Ids.has(key) && value !== undefined)
  )
  const inferredFields = Object.fromEntries(
    flow.fields
      .filter((field) => field.layer === 'layer3')
      .map((field) => [field.id, field.helper])
  )

  return { coreFields, optionalFields, inferredFields }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function pickNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' ? value : fallback
}

async function deriveAthleteAnswersFromLegacy(supabase: SupabaseLike, userId: string) {
  const [{ data: profile }, { data: diagnostic }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'full_name, username, primary_sport, position, height, weight, guardian_consent_confirmed, legal_consent_at, medical_disclaimer_accepted_at'
      )
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('diagnostics')
      .select('primary_goal, profile_data, sport_context, physical_status')
      .eq('athlete_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const profileData = isRecord(diagnostic?.profile_data) ? diagnostic.profile_data : {}
  const sportContext = isRecord(diagnostic?.sport_context) ? diagnostic.sport_context : {}
  const physicalStatus = isRecord(diagnostic?.physical_status) ? diagnostic.physical_status : {}
  const activeInjuries = Array.isArray(physicalStatus.activeInjuries) ? physicalStatus.activeInjuries : []
  const injuryLocations = activeInjuries
    .map((item: unknown) => (isRecord(item) ? pickString(item.region) : ''))
    .filter(Boolean)
    .slice(0, 2)

  const answers = {
    fullName: pickString(profile?.full_name, pickString(profileData.fullName)),
    username: pickString(profile?.username),
    primarySport: pickString(profile?.primary_sport, pickString(sportContext.primarySport)),
    position: pickString(profile?.position, pickString(sportContext.position)),
    age: pickNumber(profileData.age),
    biologicalSex: pickString(profileData.biologicalSex, 'Other'),
    playingLevel: pickString(sportContext.playingLevel, 'Recreational'),
    heightCm: pickNumber(profile?.height, pickNumber(profileData.heightCm)),
    weightKg: pickNumber(profile?.weight, pickNumber(profileData.weightKg)),
    primaryGoal: pickString(diagnostic?.primary_goal, 'Performance Enhancement'),
    currentIssue: pickString(physicalStatus.currentIssue, 'No'),
    injurySeverity:
      injuryLocations.length > 0
        ? activeInjuries.some((item: unknown) => isRecord(item) && item.recurring === true)
          ? 'high'
          : activeInjuries.length > 1
            ? 'moderate'
            : 'mild'
        : undefined,
    injuryLocations,
    coachLockerCode: '',
    platformConsent: Boolean(profile?.legal_consent_at),
    medicalDisclaimerConsent: Boolean(profile?.medical_disclaimer_accepted_at),
    minorGuardianConsent: Boolean(profile?.guardian_consent_confirmed),
  }

  return Object.fromEntries(
    Object.entries(answers).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  )
}

async function deriveIndividualAnswersFromLegacy(supabase: SupabaseLike, userId: string) {
  const { data } = await supabase
    .from('individual_profiles')
    .select('basic_profile, goal_profile, lifestyle_profile, physiology_profile')
    .eq('id', userId)
    .maybeSingle()

  const basic = isRecord(data?.basic_profile) ? data.basic_profile : {}
  const goals = isRecord(data?.goal_profile) ? data.goal_profile : {}
  const lifestyle = isRecord(data?.lifestyle_profile) ? data.lifestyle_profile : {}
  const physiology = isRecord(data?.physiology_profile) ? data.physiology_profile : {}
  const equipmentAccess = Array.isArray(lifestyle.equipmentAccess)
    ? lifestyle.equipmentAccess.map((value: unknown) => String(value))
    : []
  const normalizedOccupation = normalizeIndividualOccupation(pickString(basic.occupation))

  const occupationMap: Record<string, string> = {
    desk: 'desk_job',
    shift: 'shift_work',
    manual: 'active_job',
    hybrid: 'mixed_day',
    caregiver: 'mixed_day',
    student: 'mixed_day',
  }

  const answers = {
    age: pickNumber(basic.age),
    gender: pickString(basic.gender, 'Prefer not to say'),
    heightCm: pickNumber(basic.heightCm),
    weightKg: pickNumber(basic.weightKg),
    occupation: occupationMap[normalizedOccupation] ?? 'mixed_day',
    activityLevel: pickString(basic.activityLevel, 'moderate'),
    primaryGoal: pickString(goals.primaryGoal, 'general_fitness'),
    timeHorizon: pickString(goals.timeHorizon, '12_weeks'),
    intensityPreference: pickString(goals.intensityPreference, 'moderate'),
    equipmentAccess,
    injuryStatus: pickString(physiology.injuryHistory, 'none'),
    trainingExperience: pickString(physiology.trainingExperience),
    sleepBaseline: pickNumber(physiology.sleepQuality, 0),
  }

  return Object.fromEntries(
    Object.entries(answers).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0
      return value !== '' && value !== undefined && value !== null && value !== 0
    })
  )
}

async function deriveCoachAnswersFromLegacy(supabase: SupabaseLike, userId: string) {
  const [{ data: profile }, { data: team }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, username, mobile_number')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('teams')
      .select('team_name, sport, coaching_level, team_type, squad_size_category, main_coaching_focus, training_frequency')
      .eq('coach_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const answers = {
    fullName: pickString(profile?.full_name),
    username: pickString(profile?.username),
    mobileNumber: pickString(profile?.mobile_number),
    teamName: pickString(team?.team_name),
    sportCoached: pickString(team?.sport),
    coachingLevel: pickString(team?.coaching_level),
    teamType: pickString(team?.team_type),
    numberOfAthletes: pickString(team?.squad_size_category),
    mainCoachingFocus: pickString(team?.main_coaching_focus),
    trainingFrequency: pickString(team?.training_frequency),
  }

  return Object.fromEntries(
    Object.entries(answers).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  )
}

async function hydrateAdaptiveProfileFromLegacy(args: {
  supabase: SupabaseLike
  userId: string
  role: 'athlete' | 'individual' | 'coach'
  flowId: string
}) {
  const { supabase, userId, role, flowId } = args

  if (flowId === athleteOnboardingFlow.id && role === 'athlete') {
    const answers = await deriveAthleteAnswersFromLegacy(supabase, userId)
    if (Object.keys(answers).length > 0) {
      await upsertAdaptiveProfile({
        supabase,
        userId,
        role,
        flow: athleteOnboardingFlow,
        answers,
      })
      return true
    }
  }

  if (flowId === individualOnboardingFlow.id && role === 'individual') {
    const answers = await deriveIndividualAnswersFromLegacy(supabase, userId)
    if (Object.keys(answers).length > 0) {
      await upsertAdaptiveProfile({
        supabase,
        userId,
        role,
        flow: individualOnboardingFlow,
        answers,
      })
      return true
    }
  }

  if (flowId === coachOnboardingFlow.id && role === 'coach') {
    const answers = await deriveCoachAnswersFromLegacy(supabase, userId)
    if (Object.keys(answers).length > 0) {
      await upsertAdaptiveProfile({
        supabase,
        userId,
        role,
        flow: coachOnboardingFlow,
        answers,
      })
      return true
    }
  }

  return false
}

export async function upsertAdaptiveProfile(args: {
  supabase: SupabaseLike
  userId: string
  role: 'athlete' | 'individual' | 'coach'
  flow: FormFlowDefinition
  answers: Record<string, unknown>
  context?: Record<string, unknown>
}) {
  const { supabase, userId, role, flow, answers, context = {} } = args
  const confidence = calculateConfidence({
    flow,
    answers,
    context,
    totalFieldCount: flow.fields.length,
  })
  const completionScore = getCompletionPercentage({ flow, answers, context })
  const nextQuestions = getNextQuestions({ flow, answers, context })
  const { coreFields, optionalFields, inferredFields } = splitFields(flow, answers)

  const payload = {
    user_id: userId,
    role,
    flow_id: flow.id,
    flow_version: flow.version,
    core_fields: coreFields,
    optional_fields: optionalFields,
    inferred_fields: inferredFields,
    completion_score: completionScore,
    confidence_score: confidence.score,
    confidence_level: confidence.level,
    confidence_recommendations: confidence.recommendations,
    next_question_ids: nextQuestions.map((question) => question.id),
  }

  const { error } = await supabase
    .from(ADAPTIVE_FORM_PROFILES_TABLE)
    .upsert(payload, { onConflict: 'user_id,role,flow_id' })

  if (error) {
    console.warn('[adaptive-forms] failed to upsert adaptive profile', error)
  }
}

export async function upsertAdaptiveDailyLog(args: {
  supabase: SupabaseLike
  userId: string
  role: 'athlete' | 'individual'
  flow: FormFlowDefinition
  answers: Record<string, unknown>
  context?: Record<string, unknown>
}) {
  const { supabase, userId, role, flow, answers, context = {} } = args
  const signalResult =
    role === 'athlete'
      ? processAthleteDailySignals({
          energy: Number(answers.energy ?? 3),
          soreness: Number(answers.soreness ?? 3),
          stress: Number(answers.stress ?? 3),
          sleepQuality: answers.sleepQuality ? Number(answers.sleepQuality) : undefined,
          hasOutstandingTrainingCapture: Boolean(context.hasOutstandingTrainingCapture),
        })
      : processIndividualDailySignals({
          energy: Number(answers.energy ?? 3),
          soreness: Number(answers.soreness ?? 3),
          stress: Number(answers.stress ?? 3),
          sleepQuality: answers.sleepQuality ? Number(answers.sleepQuality) : undefined,
          trackTrainingToday: Boolean(context.trackTrainingToday),
        })

  const payload = {
    user_id: userId,
    role,
    flow_id: flow.id,
    flow_version: flow.version,
    log_date: getTodayInIndia(),
    minimal_signals: {
      energy: answers.energy ?? null,
      soreness: answers.soreness ?? null,
      stress: answers.stress ?? null,
    },
    inferred_signals: {
      readinessBand: signalResult.readinessBand,
      sleepQuality: answers.sleepQuality ?? null,
      sessionCompletion: answers.sessionCompletion ?? null,
    },
    anomaly_flags: signalResult.anomalyFlags,
    follow_up_field_ids: signalResult.followUpFieldIds,
    readiness_score: signalResult.readinessScore,
    confidence_score: signalResult.confidenceScore,
  }

  const { error } = await supabase
    .from(ADAPTIVE_DAILY_LOGS_TABLE)
    .upsert(payload, { onConflict: 'user_id,role,flow_id,log_date' })

  if (error) {
    console.warn('[adaptive-forms] failed to upsert adaptive daily log', error)
  }
}

export async function getAdaptiveProfileSummary(args: {
  supabase: SupabaseLike
  userId: string
  role: 'athlete' | 'individual' | 'coach'
  flowId: string
}): Promise<AdaptiveProfileSummary | null> {
  const { supabase, userId, role, flowId } = args

  let { data, error } = await supabase
    .from(ADAPTIVE_FORM_PROFILES_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('role', role)
    .eq('flow_id', flowId)
    .maybeSingle()

  if (!data && !error) {
    const hydrated = await hydrateAdaptiveProfileFromLegacy({
      supabase,
      userId,
      role,
      flowId,
    })

    if (hydrated) {
      const retry = await supabase
        .from(ADAPTIVE_FORM_PROFILES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .eq('flow_id', flowId)
        .maybeSingle()

      data = retry.data
      error = retry.error
    }
  }

  if (error || !data) return null

  const flow = getFlowById(String(data.flow_id))
  const nextQuestionIds = Array.isArray(data.next_question_ids)
    ? data.next_question_ids.map((value: unknown) => String(value))
    : []
  const nextQuestionLabels = flow
    ? nextQuestionIds
        .map((id: string) => flow.fields.find((field) => field.id === id)?.label)
        .filter((label: string | undefined): label is string => Boolean(label))
    : nextQuestionIds

  return {
    flowId: String(data.flow_id),
    flowVersion: String(data.flow_version),
    completionScore: Number(data.completion_score ?? 0),
    confidenceScore: Number(data.confidence_score ?? 0),
    confidenceLevel: String(data.confidence_level ?? 'low') as AdaptiveProfileSummary['confidenceLevel'],
    confidenceRecommendations: Array.isArray(data.confidence_recommendations)
      ? data.confidence_recommendations.map((value: unknown) => String(value))
      : [],
    nextQuestionIds,
    nextQuestionLabels,
    updatedAt: typeof data.updated_at === 'string' ? data.updated_at : null,
  }
}

export async function getAdaptiveProfilePrefill(args: {
  supabase: SupabaseLike
  userId: string
  role: 'athlete' | 'individual' | 'coach'
  flowId: string
}): Promise<AdaptiveProfilePrefill> {
  const { supabase, userId, role, flowId } = args

  let { data, error } = await supabase
    .from(ADAPTIVE_FORM_PROFILES_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('role', role)
    .eq('flow_id', flowId)
    .maybeSingle()

  if (!data && !error) {
    const hydrated = await hydrateAdaptiveProfileFromLegacy({
      supabase,
      userId,
      role,
      flowId,
    })

    if (hydrated) {
      const retry = await supabase
        .from(ADAPTIVE_FORM_PROFILES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .eq('flow_id', flowId)
        .maybeSingle()

      data = retry.data
      error = retry.error
    }
  }

  if (error || !data) {
    return {
      summary: null,
      answers: {},
    }
  }

  const summary = await getAdaptiveProfileSummary({
    supabase,
    userId,
    role,
    flowId,
  })

  const coreFields =
    data.core_fields && typeof data.core_fields === 'object' && !Array.isArray(data.core_fields)
      ? (data.core_fields as Record<string, unknown>)
      : {}
  const optionalFields =
    data.optional_fields && typeof data.optional_fields === 'object' && !Array.isArray(data.optional_fields)
      ? (data.optional_fields as Record<string, unknown>)
      : {}

  return {
    summary,
    answers: {
      ...coreFields,
      ...optionalFields,
    },
  }
}
