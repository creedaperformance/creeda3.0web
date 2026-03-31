'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { verifyRole } from '@/lib/auth_utils'

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

  // 0. Check for Username Uniqueness
  const { isUsernameTaken } = await import('@/lib/auth_utils')
  if (await isUsernameTaken(data.username, user.id)) {
    return { error: 'Username is already taken. Please choose another.' }
  }

  // 1. Update Profile (Username + Mobile Number + Avatar + Onboarding Flag)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      full_name: data.fullName,
      username: data.username,
      mobile_number: data.mobileNumber,
      avatar_url: data.avatarUrl,
      onboarding_completed: true,
      locker_code: Math.floor(100000 + Math.random() * 900000).toString()
    })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  // Generate prefix from sport (first 3 chars, uppercase)
  const prefix = data.sportCoached.substring(0, 3).toUpperCase()
  // Generate random 4 digit number
  const suffix = Math.floor(1000 + Math.random() * 9000).toString()
  const generatedCode = `${prefix}-SQD-${suffix}`

  // 2. Create Initial Team
  const { error: teamError } = await supabase
    .from('teams')
    .insert({
      coach_id: user.id,
      team_name: data.teamName,
      sport: data.sportCoached,
      invite_code: generatedCode,
      coaching_level: data.coachingLevel,
      team_type: data.teamType,
      main_coaching_focus: data.mainCoachingFocus,
      squad_size_category: data.numberOfAthletes,
      training_frequency: data.trainingFrequency,
      critical_risks: data.criticalRisks || []
    })

  if (teamError) return { error: teamError.message }

  redirect('/coach')
}

export async function addAthleteToTeam(identifier: string, teamId: string) {
  const { user } = await verifyRole('coach')
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
  const { user } = await verifyRole('coach')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('invite_code')
    .eq('id', teamId)
    .single()
  
  if (error) return null
  return data.invite_code
}
