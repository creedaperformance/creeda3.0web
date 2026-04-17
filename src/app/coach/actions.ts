'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { verifyRole } from '@/lib/auth_utils'
import { rateLimit } from '@/lib/rate_limit'
import {
  coachOnboardingSchema,
  submitCoachOnboardingForUser,
} from '@/lib/coach-onboarding'

export async function submitCoachOnboarding(data: { 
  fullName: string; 
  username: string; 
  mobileNumber: string; 
  teamName: string; 
  sportCoached: string; 
  coachingLevel: string;
  teamType: string;
  mainCoachingFocus: string;
  numberOfAthletes: string;
  trainingFrequency: string;
  criticalRisks?: string[];
  avatarUrl?: string 
}) {
  const { user } = await verifyRole('coach')
  const supabase = await createClient()
  const parsed = coachOnboardingSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Please complete every required coaching field before continuing.' }
  }

  const result = await submitCoachOnboardingForUser({
    supabase,
    userId: user.id,
    payload: parsed.data,
  })

  if ('error' in result) return result

  redirect('/coach/dashboard')
}

export async function addAthleteToTeam(identifier: string, teamId: string) {
  await verifyRole('coach')
  const supabase = await createClient()

  // 1. Find Athlete by Username or Email (Case-Insensitive)
  // We prioritize Username (starts with @) but Fallback to Email if no @
  const isUsername = identifier.startsWith('@')
  const cleanId = isUsername ? identifier.substring(1).trim() : identifier.trim()

  const query = supabase
    .from('profiles')
    .select('id, role, full_name')

  if (isUsername) {
    query.ilike('username', cleanId)
  } else {
    query.ilike('email', cleanId)
  }

  const { data: athlete, error: findError } = await query.maybeSingle()

  if (findError) return { error: "Database error during search." }
  if (!athlete) return { error: `No user found with ${isUsername ? 'username' : 'email'}: ${identifier}` }
  if (athlete.role !== 'athlete') return { error: "User is registered as a Coach, not an Athlete." }

  // 2. Check if already in team
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('athlete_id', athlete.id)
    .maybeSingle()

  if (existing) return { error: "Athlete is already in this team." }

  // 3. Add to Team & Allocate Seat via Secure RPC
  const { data: result, error: rpcError } = await supabase.rpc('manage_squad_member', {
    p_athlete_id: athlete.id,
    p_team_id: teamId,
    p_action: 'add'
  })

  if (rpcError) return { error: rpcError.message }
  if (result?.error) return { error: result.error }

  return { success: true }
}

export async function joinTeamWithCode(inviteCode: string) {
  const { user } = await verifyRole('athlete')
  const supabase = await createClient()
  const limiter = await rateLimit(`team-invite:${user.id}`, 10, 3600, {
    failOpen: false,
  })

  if (!limiter.success) {
    return { error: limiter.error }
  }

  // 1. Find team by code
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, team_name')
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .maybeSingle()

  if (teamError || !team) return { error: "Invalid join code. Please check with your coach." }

  // 2. Add athlete to team & Allocate Seat via Secure RPC
  const { data: result, error: rpcError } = await supabase.rpc('manage_squad_member', {
    p_athlete_id: user.id,
    p_team_id: team.id,
    p_action: 'add'
  })

  if (rpcError) return { error: rpcError.message }
  if (result?.error) return { error: result.error }

  return { success: true, message: "Successfully connected to your coach/team.", teamName: team.team_name }
}

export async function getTeamInviteCode(teamId: string) {
  await verifyRole('coach')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('invite_code')
    .eq('id', teamId)
    .single()
  
  if (error) return null
  return data.invite_code
}
