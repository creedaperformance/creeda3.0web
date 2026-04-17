import type { SupabaseClient } from '@supabase/supabase-js'
import * as z from 'zod'

import { SPORTS_LIST } from '@/lib/constants'
import { orchestrateV5 } from '@/lib/engine/EngineOrchestrator'
import type { AthleteInput } from '@/lib/engine/types'
import { upsertHealthConnectionPreference } from '@/lib/health/storage'
import { LEGAL_POLICY_VERSION } from '@/lib/legal/constants'
import { persistLegalConsentBundle } from '@/lib/legal/compliance'
import { generateSixDigitCode } from '@/lib/security/codes'

const biologicalSexSchema = z.enum(['Male', 'Female', 'Other'])
const dominantSideSchema = z.enum(['Left', 'Right', 'Both', 'Ambidextrous'])
const playingLevelSchema = z.enum([
  'Recreational',
  'School',
  'District',
  'State',
  'National',
  'Professional',
])
const trainingFrequencySchema = z.enum(['1-3 days', '4-6 days', 'Daily'])
const avgIntensitySchema = z.enum(['Low', 'Moderate', 'High'])
const primaryGoalSchema = z.enum([
  'Performance Enhancement',
  'Injury Prevention',
  'Recovery Efficiency',
  'Return from Injury',
  'Competition Prep',
])
const yesNoSchema = z.enum(['No', 'Yes'])
const typicalSleepSchema = z.enum(['< 6 hours', '6-7 hours', '7-8 hours', '8-9 hours', '> 9 hours'])
const typicalSorenessSchema = z.enum(['None', 'Low', 'Moderate', 'High'])
const typicalEnergySchema = z.enum(['Low', 'Moderate', 'High'])
const healthConnectionPreferenceSchema = z.enum(['connect_now', 'later'])

export const injuryEntrySchema = z.object({
  region: z.string().min(1),
  type: z.string().min(1),
  side: z.string().min(1),
  recurring: z.boolean(),
})

const physiologyDomainSchema = z.number().min(1).max(4)

export const athleteOnboardingSchema = z
  .object({
    fullName: z.string().min(2, 'Full Name is required'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
    primarySport: z.enum(SPORTS_LIST),
    position: z.string().min(1, 'Position is required'),
    coachId: z.string().optional().nullable(),
    coachLockerCode: z.string().optional().default(''),
    inviteToken: z.string().optional().default(''),
    heightCm: z.number().min(100, 'Min height 100cm').max(250, 'Max height 250cm'),
    weightKg: z.number().min(20, 'Min weight 20kg').max(200, 'Max weight 200kg'),
    avatar_url: z.string().url().nullable().optional(),
    minorGuardianConsent: z.boolean().optional().default(false),
    typicalWeeklyHours: z.number().min(0, 'Min 0').max(100, 'Max 100'),
    typicalRPE: z.number().min(1, 'Min RPE 1').max(10, 'Max RPE 10'),
    age: z.number().min(8, 'Minimum age is 8').max(80, 'Maximum age is 80'),
    biologicalSex: biologicalSexSchema,
    dominantSide: dominantSideSchema,
    playingLevel: playingLevelSchema,
    seasonPhase: z.string().optional().default('In-season'),
    trainingFrequency: trainingFrequencySchema,
    avgIntensity: avgIntensitySchema,
    typicalSleep: typicalSleepSchema,
    usualWakeUpTime: z.string().min(1, 'Usual wake-up time is required'),
    typicalSoreness: typicalSorenessSchema,
    typicalEnergy: typicalEnergySchema,
    currentIssue: yesNoSchema,
    activeInjuries: z.array(injuryEntrySchema).optional().default([]),
    pastMajorInjury: yesNoSchema,
    pastInjuries: z.array(injuryEntrySchema).optional().default([]),
    hasIllness: yesNoSchema.optional().default('No'),
    illnesses: z.array(z.string()).optional().default([]),
    endurance_capacity: physiologyDomainSchema,
    strength_capacity: physiologyDomainSchema,
    explosive_power: physiologyDomainSchema,
    agility_control: physiologyDomainSchema,
    reaction_self_perception: physiologyDomainSchema.optional().default(2),
    recovery_efficiency: physiologyDomainSchema,
    fatigue_resistance: physiologyDomainSchema,
    load_tolerance: physiologyDomainSchema,
    movement_robustness: physiologyDomainSchema,
    coordination_control: physiologyDomainSchema,
    reaction_time_ms: z.number().positive().optional(),
    primaryGoal: primaryGoalSchema,
    health_connection_preference: healthConnectionPreferenceSchema.optional().default('later'),
    legalConsent: z.boolean().refine((value) => value === true, 'Consent is required to continue'),
    medicalDisclaimerConsent: z
      .boolean()
      .refine((value) => value === true, 'Medical disclaimer acknowledgement is required'),
    dataProcessingConsent: z
      .boolean()
      .refine((value) => value === true, 'Data processing consent is required'),
    aiAcknowledgementConsent: z
      .boolean()
      .refine((value) => value === true, 'AI acknowledgement is required'),
    marketingConsent: z.boolean().optional().default(false),
  })
  .refine((data) => !(data.age < 18 && !data.minorGuardianConsent), {
    message: 'Guardian or coach consent is required for athletes under 18',
    path: ['minorGuardianConsent'],
  })

export type AthleteOnboardingPayload = z.infer<typeof athleteOnboardingSchema>

export type AthleteOnboardingResult =
  | {
      success: true
      destination: '/athlete/dashboard'
    }
  | {
      success: false
      error: string
    }

function inferAthleteActivityLevel(
  trainingFrequency: string,
  avgIntensity: string,
  playingLevel: string
) {
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

async function isUsernameTakenWithClient(
  supabase: SupabaseClient,
  username: string,
  excludeUserId?: string
) {
  let query = supabase.from('profiles').select('id').ilike('username', username)

  if (excludeUserId) {
    query = query.neq('id', excludeUserId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('[athlete-onboarding] username check failed', error)
    return false
  }

  return !!data
}

async function findCoachIdByLockerCode(args: {
  lookupSupabase: SupabaseClient
  fallbackSupabase?: SupabaseClient
  code: string
}): Promise<string | null> {
  const { lookupSupabase, fallbackSupabase, code } = args
  const normalizedCode = code.trim().toUpperCase()

  if (!normalizedCode) return null

  const clients = [lookupSupabase, fallbackSupabase].filter(Boolean) as SupabaseClient[]
  for (const client of clients) {
    const { data: rpcCoach, error: rpcError } = await client
      .rpc('find_profile_by_locker_code', { code: normalizedCode })
      .maybeSingle()

    const rpcCoachRecord = rpcCoach as { id?: string } | null
    if (!rpcError && rpcCoachRecord?.id) {
      return rpcCoachRecord.id
    }

    const { data: scopedCoach, error: profileError } = await client
      .from('profiles')
      .select('id')
      .eq('locker_code', normalizedCode)
      .eq('role', 'coach')
      .maybeSingle()

    if (!profileError && scopedCoach?.id) {
      return scopedCoach.id
    }
  }

  return null
}

export async function submitAthleteOnboardingForUser(args: {
  supabase: SupabaseClient
  adminLookupSupabase?: SupabaseClient
  userId: string
  payload: AthleteOnboardingPayload
  auditMeta?: {
    userAgent?: string | null
    requestIp?: string | null
  }
}): Promise<AthleteOnboardingResult> {
  const { supabase, adminLookupSupabase, userId, payload, auditMeta } = args
  const normalizedUsername = payload.username.trim().toLowerCase()
  const lookupSupabase = adminLookupSupabase ?? supabase

  if (await isUsernameTakenWithClient(lookupSupabase, normalizedUsername, userId)) {
    return { success: false, error: 'Username is already taken. Please choose another.' }
  }

  let coachId = payload.coachId || null
  let pendingCoachId = null

  if (payload.coachLockerCode) {
    pendingCoachId = await findCoachIdByLockerCode({
      lookupSupabase,
      fallbackSupabase: supabase,
      code: payload.coachLockerCode,
    })
  }

  if (payload.inviteToken) {
    const normalizedInviteToken = payload.inviteToken.trim().toUpperCase()
    const { data: teamData } = await lookupSupabase
      .from('teams')
      .select('id, coach_id')
      .eq('invite_code', normalizedInviteToken)
      .single()

    if (teamData) {
      coachId = teamData.coach_id

      await supabase.from('team_members').upsert({
        team_id: teamData.id,
        athlete_id: userId,
      })
    }
  }

  const lockerCode = generateSixDigitCode()
  const typicalWeeklyMinutes = Number(payload.typicalWeeklyHours || 0) * 60
  const consentTimestamp = new Date().toISOString()

  const performanceBaseline = {
    weekly_training_minutes: typicalWeeklyMinutes,
    avg_session_rpe: payload.typicalRPE,
    chronic_load_seed: typicalWeeklyMinutes * Number(payload.typicalRPE || 0),
    initialized_at: new Date().toISOString(),
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: payload.fullName.trim(),
      username: normalizedUsername,
      primary_sport: payload.primarySport,
      position: payload.position.trim(),
      coach_id: coachId,
      onboarding_completed: false,
      locker_code: lockerCode,
      height: payload.heightCm,
      weight: payload.weightKg,
      avatar_url: payload.avatar_url ?? null,
      legal_consent_at: consentTimestamp,
      legal_policy_version: LEGAL_POLICY_VERSION,
      privacy_policy_version: LEGAL_POLICY_VERSION,
      consent_policy_version: LEGAL_POLICY_VERSION,
      medical_disclaimer_accepted_at: payload.medicalDisclaimerConsent ? consentTimestamp : null,
      data_processing_consent_at: payload.dataProcessingConsent ? consentTimestamp : null,
      ai_acknowledgement_at: payload.aiAcknowledgementConsent ? consentTimestamp : null,
      marketing_consent: Boolean(payload.marketingConsent),
      marketing_consent_at: payload.marketingConsent ? consentTimestamp : null,
      consent_updated_at: consentTimestamp,
      guardian_consent_confirmed: payload.minorGuardianConsent || false,
    })
    .eq('id', userId)

  if (profileError) {
    console.error('[athlete-onboarding] profile update failed', profileError)
    return { success: false, error: `Profile update failed: ${profileError.message}` }
  }

  await persistLegalConsentBundle({
    supabase,
    userId,
    role: 'athlete',
    acceptedAt: consentTimestamp,
    policyVersion: LEGAL_POLICY_VERSION,
    source: 'onboarding',
    userAgent: auditMeta?.userAgent,
    requestIp: auditMeta?.requestIp,
    termsAccepted: payload.legalConsent,
    privacyAccepted: payload.legalConsent,
    medicalDisclaimerAccepted: payload.medicalDisclaimerConsent,
    dataProcessingAccepted: payload.dataProcessingConsent,
    aiDecisionSupportAccepted: payload.aiAcknowledgementConsent,
    marketingAccepted: Boolean(payload.marketingConsent),
    guardianConsentAccepted: Boolean(payload.minorGuardianConsent),
    metadata: {
      flow: 'athlete_onboarding',
      objective_testing_optional: true,
    },
  })

  if (pendingCoachId) {
    await supabase.from('connection_requests').upsert({
      athlete_id: userId,
      coach_id: pendingCoachId,
      status: 'pending',
    })
  }

  const profileData = {
    fullName: payload.fullName.trim(),
    age: payload.age,
    biologicalSex: payload.biologicalSex,
    heightCm: payload.heightCm,
    weightKg: payload.weightKg,
    dominantSide: payload.dominantSide,
    initialized_at: new Date().toISOString(),
  }

  const sportContext = {
    primarySport: payload.primarySport,
    position: payload.position.trim(),
    playingLevel: payload.playingLevel,
    seasonPhase: payload.seasonPhase,
  }

  const trainingReality = {
    trainingFrequency: payload.trainingFrequency,
    avgIntensity: payload.avgIntensity,
  }

  const recoveryBaseline = {
    typicalSleep: payload.typicalSleep,
    usualWakeUpTime: payload.usualWakeUpTime,
    typicalSoreness: payload.typicalSoreness,
    typicalEnergy: payload.typicalEnergy,
  }

  const physicalStatus = {
    currentIssue: payload.currentIssue,
    activeInjuries: payload.activeInjuries || [],
    pastMajorInjury: payload.pastMajorInjury,
    pastInjuries: payload.pastInjuries || [],
    hasIllness: payload.hasIllness,
    illnesses: payload.illnesses || [],
  }

  const physiologyProfile = {
    endurance_capacity: payload.endurance_capacity,
    strength_capacity: payload.strength_capacity,
    explosive_power: payload.explosive_power,
    agility_control: payload.agility_control,
    reaction_self_perception: payload.reaction_self_perception,
    recovery_efficiency: payload.recovery_efficiency,
    fatigue_resistance: payload.fatigue_resistance,
    load_tolerance: payload.load_tolerance,
    movement_robustness: payload.movement_robustness,
    coordination_control: payload.coordination_control,
    confidence: 'low',
    last_updated: new Date().toISOString(),
  }

  const reactionProfile = {
    reaction_time_ms: payload.reaction_time_ms,
    confidence: 'low',
    last_updated: new Date().toISOString(),
  }

  const dailyLiving = {
    context: 'Onboarding complete. Daily living data will be collected via trend engine.',
  }

  const { error: insertError } = await supabase.from('diagnostics').insert({
    athlete_id: userId,
    profile_data: profileData,
    sport_context: sportContext,
    training_reality: trainingReality,
    daily_living: dailyLiving,
    recovery_baseline: recoveryBaseline,
    physical_status: physicalStatus,
    physiology_profile: physiologyProfile,
    reaction_profile: reactionProfile,
    primary_goal: payload.primaryGoal,
    performance_baseline: performanceBaseline,
  })

  if (insertError) {
    console.error('[athlete-onboarding] diagnostic insertion failed', insertError)
    return { success: false, error: 'Failed to save intelligence baseline. Please try again.' }
  }

  const { error: finalizeError } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
    })
    .eq('id', userId)

  if (finalizeError) {
    console.error('[athlete-onboarding] finalization failed', finalizeError)
    return { success: false, error: 'Profile saved but finalization failed. Please try again.' }
  }

  const { error: healthConnectionError } = await upsertHealthConnectionPreference(supabase, {
    userId,
    connectionPreference: payload.health_connection_preference || 'later',
    updatedAt: new Date().toISOString(),
  })

  if (healthConnectionError) {
    console.warn(
      '[athlete-onboarding] health connection preference persistence skipped:',
      healthConnectionError.message
    )
  }

  try {
    const logDate = new Date().toISOString().split('T')[0]
    const sleepMap: Record<string, number> = {
      '< 6 hours': 1,
      '6-7 hours': 2,
      '7-8 hours': 3,
      '8-9 hours': 4,
      '> 9 hours': 5,
    }
    const energyMap: Record<string, number> = { Low: 1, Moderate: 3, High: 5 }
    const sorenessMap: Record<string, number> = { None: 1, Low: 2, Moderate: 3, High: 5 }

    const input: AthleteInput = {
      userId,
      wellness: {
        sleep_quality: sleepMap[payload.typicalSleep] || 3,
        energy_level: energyMap[payload.typicalEnergy] || 3,
        muscle_soreness: sorenessMap[payload.typicalSoreness] || 1,
        stress_level: 3,
        motivation: 3,
        current_pain_level: 0,
      },
      context: {
        sport: payload.primarySport,
        position: payload.position,
        is_match_day: false,
        travel_day: false,
      },
      history: [],
      adaptation_profile: {
        fatigue_sensitivity: 0.5,
        recovery_speed: 0.5,
        load_tolerance: 0.5,
        neuromuscular_bias: 0.5,
        learning_rate: 0.05,
        ewma_readiness_avg: 70,
        ewma_fatigue_avg: 30,
        strength_progression_rate: 0,
        last_updated: new Date().toISOString(),
      },
      profile: {
        age: Number(payload.age) || undefined,
        biologicalSex: String(payload.biologicalSex || ''),
        heightCm: Number(payload.heightCm) || undefined,
        weightKg: Number(payload.weightKg) || undefined,
        primaryGoal: String(payload.primaryGoal || ''),
        activityLevel: inferAthleteActivityLevel(
          payload.trainingFrequency,
          payload.avgIntensity,
          payload.playingLevel
        ),
        wakeTime: String(payload.usualWakeUpTime || ''),
      },
    }

    const { creedaDecision, metrics } = await orchestrateV5(input)

    await supabase.from('computed_intelligence').upsert(
      {
        user_id: userId,
        log_date: logDate,
        readiness_score: metrics.readiness.score,
        recovery_capacity: metrics.readiness.score,
        load_tolerance: 50,
        risk_score: metrics.risk.score,
        status: metrics.risk.priority === 'low' ? 'Good to Go' : 'Caution',
        reason:
          creedaDecision.explanation.primaryDrivers[0]?.reason || 'Initial baseline set.',
        action_instruction:
          creedaDecision.explanation.primaryDrivers[0]?.factor || 'Continue profile build.',
        alert_priority: metrics.risk.priority,
        intelligence_trace: {
          engine_version: 'v5-sports-scientist-baseline',
          calculated_at: new Date().toISOString(),
          input_snapshot: input,
          decision: creedaDecision,
        },
      },
      { onConflict: 'user_id,log_date' }
    )
  } catch (error) {
    console.error('[athlete-onboarding] failed to compute initial V5 intelligence', error)
  }

  return {
    success: true,
    destination: '/athlete/dashboard',
  }
}
