'use server'
 
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { verifyRole } from '@/lib/auth_utils'
import { orchestrateV5 } from '@/lib/engine/EngineOrchestrator'
import { AthleteInput } from '@/lib/engine/types'

async function findCoachIdByLockerCode(supabase: Awaited<ReturnType<typeof createClient>>, code: string): Promise<string | null> {
  const normalizedCode = code.trim().toUpperCase()

  const { data: rpcCoach } = await supabase
    .rpc('find_profile_by_locker_code', { code: normalizedCode })
    .maybeSingle()

  if ((rpcCoach as any)?.id) return (rpcCoach as any).id as string

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

export async function submitDiagnosticForm(data: any) {
  const supabase = await createClient()

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

  const performance_baseline = {
    weekly_training_minutes: data.typicalWeeklyMinutes,
    avg_session_rpe: data.typicalRPE,
    chronic_load_seed: data.typicalWeeklyMinutes * data.typicalRPE,
    initialized_at: new Date().toISOString()
  }

  // Initial profile update — onboarding_completed stays FALSE until diagnostics succeeds
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
    medical_disclaimer_accepted_at: new Date().toISOString(),
    guardian_consent_confirmed: data.minorGuardianConsent || false
  }).eq('id', user.id)

  if (profileError) {
    console.error("Profile Update Error during onboarding:", profileError)
    return { error: `Profile update failed: ${profileError.message}` }
  }

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
    activeInjuries: (data as any).activeInjuries || [],
    pastMajorInjury: data.pastMajorInjury,
    pastInjuries: (data as any).pastInjuries || [],
    hasIllness: (data as any).hasIllness,
    illnesses: (data as any).illnesses || []
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
  const { error: healthConnectionError } = await supabase
    .from('health_connections')
    .upsert(
      {
        user_id: user.id,
        connection_preference: data.health_connection_preference || 'later',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

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
        activityLevel: data.trainingFrequency === 'Daily' ? 'athlete' : data.trainingFrequency === '4-6 days' ? 'active' : 'moderate',
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
