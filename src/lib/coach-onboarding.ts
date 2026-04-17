import type { SupabaseClient } from '@supabase/supabase-js'
import * as z from 'zod'

import { SPORTS_LIST } from '@/lib/constants'
import {
  generateSixDigitCode,
  generateTeamInviteCode as generateSecureTeamInviteCode,
} from '@/lib/security/codes'

const coachingLevelSchema = z.enum([
  'Private Pro Coach',
  'Academy / Club Coach',
  'School / University Coach',
])

const teamTypeSchema = z.enum([
  'Single Team',
  'Multiple Teams / Age Groups',
  'Individual Athletes',
])

const mainCoachingFocusSchema = z.enum([
  'Injury Risk Reduction',
  'Peak Performance Optimization',
  'Player Compliance',
  'Scouting / Talent ID',
])

const numberOfAthletesSchema = z.enum(['1-5', '6-15', '16-30', '30+'])
const trainingFrequencySchema = z.enum(['Daily', '3-4x Weekly', '1-2x Weekly'])

export const coachOnboardingSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  mobileNumber: z.string().min(10, 'Valid mobile number required'),
  teamName: z.string().min(2, 'Team/Squad name required'),
  sportCoached: z.enum(SPORTS_LIST),
  coachingLevel: coachingLevelSchema,
  teamType: teamTypeSchema,
  mainCoachingFocus: mainCoachingFocusSchema,
  numberOfAthletes: numberOfAthletesSchema,
  trainingFrequency: trainingFrequencySchema,
  criticalRisks: z.array(z.string()).min(1).default(['General Fatigue']),
  avatarUrl: z.string().url().nullable().optional().or(z.literal('')).default(''),
})

export type CoachOnboardingPayload = z.infer<typeof coachOnboardingSchema>

export type CoachOnboardingResult =
  | {
      success: true
      destination: '/coach/dashboard'
      coachLockerCode: string
      teamInviteCode: string
      teamName: string
    }
  | {
      error: string
    }

type SupabaseLike = SupabaseClient

async function isUsernameTakenWithClient(
  supabase: SupabaseLike,
  username: string,
  excludeUserId?: string
) {
  let query = supabase.from('profiles').select('id').ilike('username', username)

  if (excludeUserId) {
    query = query.neq('id', excludeUserId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('[coach-onboarding] username check failed', error)
    return false
  }

  return !!data
}

function generateCoachLockerCode() {
  return generateSixDigitCode()
}

function generateTeamInviteCode(sportCoached: string) {
  return generateSecureTeamInviteCode(sportCoached)
}

export async function submitCoachOnboardingForUser(args: {
  supabase: SupabaseLike
  userId: string
  payload: CoachOnboardingPayload
}): Promise<CoachOnboardingResult> {
  const { supabase, userId, payload } = args
  const normalizedUsername = payload.username.trim().toLowerCase()

  if (await isUsernameTakenWithClient(supabase, normalizedUsername, userId)) {
    return { error: 'Username is already taken. Please choose another.' }
  }

  const coachLockerCode = generateCoachLockerCode()

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: payload.fullName.trim(),
      username: normalizedUsername,
      mobile_number: payload.mobileNumber.trim(),
      avatar_url: payload.avatarUrl || null,
      onboarding_completed: true,
      locker_code: coachLockerCode,
    })
    .eq('id', userId)

  if (profileError) {
    return { error: profileError.message }
  }

  const teamInviteCode = generateTeamInviteCode(payload.sportCoached)

  const { error: teamError } = await supabase.from('teams').insert({
    coach_id: userId,
    team_name: payload.teamName.trim(),
    sport: payload.sportCoached,
    invite_code: teamInviteCode,
    coaching_level: payload.coachingLevel,
    team_type: payload.teamType,
    main_coaching_focus: payload.mainCoachingFocus,
    squad_size_category: payload.numberOfAthletes,
    training_frequency: payload.trainingFrequency,
    critical_risks: payload.criticalRisks || [],
  })

  if (teamError) {
    return { error: teamError.message }
  }

  return {
    success: true,
    destination: '/coach/dashboard',
    coachLockerCode,
    teamInviteCode,
    teamName: payload.teamName.trim(),
  }
}
