import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  getOrCreateTodayExecutionSession,
  listCoachFeedback,
  listExecutionHistory,
} from '@/lib/product/server'
import {
  getRoleHomeRoute,
  getRoleOnboardingRoute,
  isAppRole,
} from '@/lib/auth_utils'
import { SessionExecutionClient } from '@/app/athlete/sessions/components/SessionExecutionClient'

export const dynamic = 'force-dynamic'

export default async function AthleteTodaySessionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed, primary_sport')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const session = await getOrCreateTodayExecutionSession(supabase, user.id)
  const [history, feedback] = await Promise.all([
    listExecutionHistory(supabase, user.id, 4),
    listCoachFeedback(supabase, user.id, session.id),
  ])

  return (
    <SessionExecutionClient
      initialSession={session}
      recentHistory={history}
      coachFeedback={feedback}
      preferredSport={profile.primary_sport || null}
    />
  )
}
