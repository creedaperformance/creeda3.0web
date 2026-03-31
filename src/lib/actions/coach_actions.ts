'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveConnectionRequest(requestId: string, athleteId: string, coachId: string, teamId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }
    if (user.id !== coachId) return { error: 'Unauthorized: Coach mismatch.' }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, coach_id')
      .eq('id', teamId)
      .maybeSingle()

    if (teamError) return { error: teamError.message }
    if (!team || team.coach_id !== user.id) {
      return { error: 'Unauthorized: Team not found or not owned by coach.' }
    }

    const { data: request, error: requestFetchError } = await supabase
      .from('connection_requests')
      .select('id, athlete_id, coach_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (requestFetchError) return { error: requestFetchError.message }
    if (!request) return { error: 'Connection request not found.' }
    if (request.coach_id !== user.id || request.athlete_id !== athleteId) {
      return { error: 'Unauthorized request payload.' }
    }
    if (request.status !== 'pending') return { error: 'Request is no longer pending.' }

    // Add athlete to squad using secure RPC
    const { data: addResult, error: addError } = await supabase.rpc('manage_squad_member', {
      p_athlete_id: athleteId,
      p_team_id: teamId,
      p_action: 'add'
    })

    if (addError) return { error: addError.message }
    if (addResult?.error) return { error: addResult.error }

    // Mark request approved
    const { error: requestError } = await supabase
        .from('connection_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('coach_id', user.id)

    if (requestError) return { error: requestError.message }

    revalidatePath('/coach')
    revalidatePath('/coach/dashboard')
    revalidatePath('/athlete')
    return { success: true }
}

export async function denyConnectionRequest(requestId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'denied', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('coach_id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/coach')
    revalidatePath('/coach/dashboard')
    return { success: true }
}
