'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function manageSeat(athleteId: string, teamId: string, action: 'gift' | 'reclaim') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, coach_id')
    .eq('id', teamId)
    .single()

  if (teamError || !team) return { error: 'Team not found' }
  if (team.coach_id !== user.id) return { error: 'Unauthorized access to team' }

  if (action === 'gift') {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ coach_id: user.id })
      .eq('id', athleteId)

    if (updateError) return { error: 'Failed to connect athlete.' }
  } else {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ coach_id: null })
      .eq('id', athleteId)
      .eq('coach_id', user.id)

    if (updateError) return { error: 'Failed to disconnect athlete.' }
  }

  revalidatePath('/coach')
  revalidatePath('/athlete')
  return { success: true }
}
