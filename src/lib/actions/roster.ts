'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Archive an athlete from the active squad using the secure RPC.
 * This reclaims a seat for the coach and downgrades the athlete to Free.
 */
export async function archiveAthlete(athleteId: string, teamId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('manage_squad_member', {
    p_athlete_id: athleteId,
    p_team_id: teamId,
    p_action: 'archive'
  })

  if (error) {
    console.error('Archive Athlete RPC Error:', error)
    return { error: error.message }
  }

  if (data?.error) return { error: data.error }

  revalidatePath('/coach')
  revalidatePath('/athlete')

  return { success: true }
}

/**
 * Restore an archived athlete to the active squad using the secure RPC.
 */
export async function restoreAthlete(athleteId: string, teamId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('manage_squad_member', {
    p_athlete_id: athleteId,
    p_team_id: teamId,
    p_action: 'restore'
  })

  if (error) {
    console.error('Restore Athlete RPC Error:', error)
    return { error: error.message }
  }

  if (data?.error) return { error: data.error }

  revalidatePath('/coach')
  revalidatePath('/athlete')
  
  return { success: true }
}

/**
 * Permanently remove an athlete from the squad.
 */
export async function removeAthlete(athleteId: string, teamId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('manage_squad_member', {
    p_athlete_id: athleteId,
    p_team_id: teamId,
    p_action: 'remove'
  })

  if (error) {
    console.error('Remove Athlete RPC Error:', error)
    return { error: error.message }
  }

  if (data?.error) return { error: data.error }

  revalidatePath('/coach')
  revalidatePath('/athlete')
  
  return { success: true }
}
