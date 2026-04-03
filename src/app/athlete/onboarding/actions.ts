'use server'
 
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { verifyRole } from '@/lib/auth_utils'
import { orchestrateV5 } from '@/lib/engine/EngineOrchestrator'
import { AthleteInput } from '@/lib/engine/types'
import { upsertHealthConnectionPreference } from '@/lib/health/storage'
import { LEGAL_POLICY_VERSION } from '@/lib/legal/constants'
import { persistLegalConsentBundle } from '@/lib/legal/compliance'

function inferAthleteActivityLevel(trainingFrequency: string, avgIntensity: string, playingLevel: string) {
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

type InjuryEntryLike = {
  region: string
  type: string
  side: string
  recurring: boolean
}

type DiagnosticFormPayload = {
  fullName: string
  username?: string
  primarySport: string
  position: string
  coachId?: string | null
  coachLockerCode?: string
  inviteToken?: string
  heightCm: number
  weightKg: number
  avatar_url?: string
  minorGuardianConsent?: boolean
  typicalWeeklyHours: number
  typicalRPE: number
  age: number
  biologicalSex: string
  dominantSide: string
  playingLevel: string
  seasonPhase?: string
  trainingFrequency: string
  avgIntensity: string
  typicalSleep: string
  usualWakeUpTime: string
  typicalSoreness: string
  typicalEnergy: string
  currentIssue: string
  activeInjuries?: InjuryEntryLike[]
  pastMajorInjury: string
  pastInjuries?: InjuryEntryLike[]
  hasIllness?: string
  illnesses?: string[]
  endurance_capacity: number
  strength_capacity: number
  explosive_power: number
  agility_control: number
  reaction_self_perception?: number
  recovery_efficiency: number
  fatigue_resistance: number
  load_tolerance: number
  movement_robustness: number
  coordination_control: number
  reaction_time_ms?: number
  primaryGoal: string
  health_connection_preference?: 'connect_now' | 'later'
  legalConsent: boolean
  medicalDisclaimerConsent: boolean
  dataProcessingConsent: boolean
  aiAcknowledgementConsent: boolean
  marketingConsent?: boolean
}

async function findCoachIdByLockerCode(supabase: Awaited<ReturnType<typeof createClient>>, code: string): Promise<string | null> {
  const normalizedCode = code.trim().toUpperCase()

  const { data: rpcCoach } = await supabase
    .rpc('find_profile_by_locker_code', { code: normalizedCode })
    .maybeSingle()

  const rpcCoachRecord = rpcCoach as { id?: string } | null
  if (rpcCoachRecord?.id) return rpcCoachRecord.id

  const { data: scopedCoach } = await supabase
    .from('profiles')
    .select('id')
    .eq('locker_code', normalizedCode)
    .eq('role', 'coach')
    .maybeSingle()

  if (scopedCoach?.id) return scopedCoach.id

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient()
    const { data: adminCoach } = await admin
      .from('profiles')
      .select('id')
      .eq('locker_code', normalizedCode)
      .eq('role', 'coach')
      .maybeSingle()

    if (adminCoach?.id) return adminCoach.id
  }

  return null
}

export async function submitDiagnosticForm(data: DiagnosticFormPayload) {
  const supabase = await createClient()
  const headersList = await headers()

  const { user } = await verifyRole('athlete')

  // 0. Check for Username Uniqueness
  if (data.username) {
    const { isUsernameTaken } = await import('@/lib/auth_utils')
    if (await isUsernameTaken(data.username, user.id)) {
      return { error: 'Username is already taken. Please choose another.' }
    }
  }

  // 1. Coach connection state
  let coach_id = data.coachId || null
  let pending_coach_id = null

  // 1a. Handle Coach Locker Code (Phase 18)
  if (data.coachLockerCode) {
    pending_coach_id = await findCoachIdByLockerCode(supabase, data.coachLockerCode)
  }

  // Handle invite tokens
  if (data.inviteToken) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, coach_id')
      .eq('invite_code', data.inviteToken)
      .single()

    if (teamData) {
      coach_id = teamData.coach_id

      await supabase.from('team_members').upsert({
        team_id: teamData.id,
        athlete_id: user.id
      })
    }
  }

  // 2. Update Core Profile (Essential fields ONLY)
  // Generation of a simple locker code
  const lockerCode = Math.floor(100000 + Math.random() * 900000).toString()
  const typicalWeeklyMinutes = Number(data.typicalWeeklyHours || 0) * 60

  const performance_baseline = {
    weekly_training_minutes: typicalWeeklyMinutes,
    avg_session_rpe: data.typicalRPE,
    chronic_load_seed: typicalWeeklyMinutes * Number(data.typicalRPE || 0),
    initialized_at: new Date().toISOString()
  }

  // Initial profile update — onboarding_completed stays FALSE until diagnostics succeeds
  const consentTimestamp = new Date().toISOString()
  const { error: profileError } = await supabase.from('profiles').update({ 
    full_name: data.fullName,
    username: data.username?.toLowerCase(),
    primary_sport: data.primarySport,
    position: data.position,
    coach_id,
    onboarding_completed: false,
    locker_code: lockerCode,
    height: data.heightCm,
    weight: data.weightKg,
    avatar_url: data.avatar_url || undefined,
    legal_consent_at: consentTimestamp,
    legal_policy_version: LEGAL_POLICY_VERSION,
    privacy_policy_version: LEGAL_POLICY_VERSION,
    consent_policy_version: LEGAL_POLICY_VERSION,
    medical_disclaimer_accepted_at: data.medicalDisclaimerConsent ? consentTimestamp : null,
    data_processing_consent_at: data.dataProcessingConsent ? consentTimestamp : null,
    ai_acknowledgement_at: data.aiAcknowledgementConsent ? consentTimestamp : null,
    marketing_consent: Boolean(data.marketingConsent),
    marketing_consent_at: data.marketingConsent ? consentTimestamp : null,
    consent_updated_at: consentTimestamp,
    guardian_consent_confirmed: data.minorGuardianConsent || false,
  }).eq('id', user.id)

  if (profileError) {
    console.error("Profile Update Error during onboarding:", profileError)
    return { error: `Profile update failed: ${profileError.message}` }
  }

  await persistLegalConsentBundle({
    supabase,
    userId: user.id,
    role: 'athlete',
    acceptedAt: consentTimestamp,
    policyVersion: LEGAL_POLICY_VERSION,
    source: 'onboarding',
    userAgent: headersList.get('user-agent'),
    requestIp: headersList.get('x-forwarded-for'),
    termsAccepted: data.legalConsent,
    privacyAccepted: data.legalConsent,
    medicalDisclaimerAccepted: data.medicalDisclaimerConsent,
    dataProcessingAccepted: data.dataProcessingConsent,
    aiDecisionSupportAccepted: data.aiAcknowledgementConsent,
    marketingAccepted: Boolean(data.marketingConsent),
    guardianConsentAccepted: Boolean(data.minorGuardianConsent),
    metadata: {
      flow: 'athlete_onboarding',
      objective_testing_optional: true,
    },
  })

  // 2b. Create Connection Request if pending_coach_id exists
  if (pending_coach_id) {
    await supabase.from('connection_requests').upsert({
      athlete_id: user.id,
      coach_id: pending_coach_id,
      status: 'pending'
    })
  }

  // 3. Construct Performance Intelligence Blocks (V4 Mapping)
  const profile_data = {
    fullName: data.fullName,
    age: data.age,
    biologicalSex: data.biologicalSex,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    dominantSide: data.dominantSide,
    initialized_at: new Date().toISOString()
  }

  const sport_context = {
    primarySport: data.primarySport,
    position: data.position,
    playingLevel: data.playingLevel,
    seasonPhase: data.seasonPhase
  }

  const training_reality = {
    trainingFrequency: data.trainingFrequency,
    avgIntensity: data.avgIntensity
  }

  const recovery_baseline = {
    typicalSleep: data.typicalSleep,
    usualWakeUpTime: data.usualWakeUpTime,
    typicalSoreness: data.typicalSoreness,
    typicalEnergy: data.typicalEnergy
  }

  const physical_status = {
    currentIssue: data.currentIssue,
    activeInjuries: data.activeInjuries || [],
    pastMajorInjury: data.pastMajorInjury,
    pastInjuries: data.pastInjuries || [],
    hasIllness: data.hasIllness,
    illnesses: data.illnesses || []
  }

  const physiology_profile = {
    endurance_capacity: data.endurance_capacity,
    strength_capacity: data.strength_capacity,
    explosive_power: data.explosive_power,
    agility_control: data.agility_control,
    reaction_self_perception: data.reaction_self_perception,
    recovery_efficiency: data.recovery_efficiency,
    fatigue_resistance: data.fatigue_resistance,
    load_tolerance: data.load_tolerance,
    movement_robustness: data.movement_robustness,
    coordination_control: data.coordination_control,
    confidence: "low",
    last_updated: new Date().toISOString()
  }

  const reaction_profile = {
    reaction_time_ms: data.reaction_time_ms,
    confidence: "low",
    last_updated: new Date().toISOString()
  }

  const daily_living = {
    context: "Onboarding complete. Daily living data will be collected via trend engine."
  }

  // 4. Save to Diagnostics Table
  const { error: insertError } = await supabase
    .from('diagnostics')
    .insert({
      athlete_id: user.id, // Consistently use athlete_id across primary tables
      profile_data,
      sport_context,
      training_reality,
      daily_living,
      recovery_baseline,
      physical_status,
      physiology_profile,
      reaction_profile,
      primary_goal: data.primaryGoal,
      performance_baseline // Include for diagnostic consistency
    })

  if (insertError) {
    console.error("Diagnostic Insertion Error:", insertError)
    return { error: 'Failed to save intelligence baseline. Please try again.' }
  }

  // Diagnostics saved successfully — NOW mark onboarding as complete
  const { error: finalizeError } = await supabase.from('profiles').update({
    onboarding_completed: true
  }).eq('id', user.id)

  if (finalizeError) {
    console.error("Onboarding Finalize Error:", finalizeError)
    return { error: 'Profile saved but finalization failed. Please try again.' }
  }

  // Optional health-data integration preference (non-blocking).
  const { error: healthConnectionError } = await upsertHealthConnectionPreference(supabase, {
    userId: user.id,
    connectionPreference: data.health_connection_preference || 'later',
    updatedAt: new Date().toISOString(),
  })

  if (healthConnectionError) {
    // Keep onboarding completion resilient even if health tables are not migrated yet.
    console.warn('Health connection preference persistence skipped:', healthConnectionError.message)
  }

  revalidatePath('/athlete')

  // --- 5. CALCULATE REAL BASELINE INTELLIGENCE (V5) ---
  try {
    const logDate = new Date().toISOString().split('T')[0]
    
    // Map onboarding "typical" labels to 1-5 engine scales
    const sleepMap: Record<string, number> = {
      "< 6 hours": 1, "6-7 hours": 2, "7-8 hours": 3, "8-9 hours": 4, "> 9 hours": 5
    }
    const energyMap: Record<string, number> = { "Low": 1, "Moderate": 3, "High": 5 }
    const sorenessMap: Record<string, number> = { "None": 1, "Low": 2, "Moderate": 3, "High": 5 }

    const input: AthleteInput = {
      userId: user.id,
      wellness: {
        sleep_quality: sleepMap[data.typicalSleep] || 3,
        energy_level: energyMap[data.typicalEnergy] || 3,
        muscle_soreness: sorenessMap[data.typicalSoreness] || 1,
        stress_level: 3,
        motivation: 3,
        current_pain_level: 0,
      },
      context: {
        sport: data.primarySport,
        position: data.position,
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
        last_updated: new Date().toISOString()
      },
      profile: {
        age: Number(data.age) || undefined,
        biologicalSex: String(data.biologicalSex || ''),
        heightCm: Number(data.heightCm) || undefined,
        weightKg: Number(data.weightKg) || undefined,
        primaryGoal: String(data.primaryGoal || ''),
        activityLevel: inferAthleteActivityLevel(data.trainingFrequency, data.avgIntensity, data.playingLevel),
        wakeTime: String(data.usualWakeUpTime || ''),
      },
    }

    const { creedaDecision, metrics } = await orchestrateV5(input);

    // Save initial computed intelligence in the V5 format
    await supabase.from('computed_intelligence').upsert({
      user_id: user.id,
      log_date: logDate,
      readiness_score: metrics.readiness.score,
      recovery_capacity: metrics.readiness.score,
      load_tolerance: 50, // Default baseline
      risk_score: metrics.risk.score,
      status: metrics.risk.priority === 'low' ? 'Good to Go' : 'Caution',
      reason: creedaDecision.explanation.primaryDrivers[0]?.reason || 'Initial baseline set.',
      action_instruction: creedaDecision.explanation.primaryDrivers[0]?.factor || 'Continue profile build.',
      alert_priority: metrics.risk.priority,
      intelligence_trace: {
        engine_version: 'v5-sports-scientist-baseline',
        calculated_at: new Date().toISOString(),
        input_snapshot: input,
        decision: creedaDecision
      }
    }, { onConflict: 'user_id,log_date' })

  } catch (err) {
    console.error("Failed to compute initial V5 intelligence:", err)
  }

  return { success: true }
}
