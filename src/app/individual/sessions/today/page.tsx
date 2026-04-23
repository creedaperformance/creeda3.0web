import { redirect } from 'next/navigation'

import { SessionExecutionClient } from '@/app/athlete/sessions/components/SessionExecutionClient'
import {
  getRoleHomeRoute,
  getRoleOnboardingRoute,
  isAppRole,
} from '@/lib/auth_utils'
import {
  getOrCreateTodayExecutionSessionForIndividual,
  listExecutionHistory,
} from '@/lib/product/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function IndividualTodaySessionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('individual'))
  }

  if (isAppRole(profile.role) && profile.role !== 'individual') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const session = await getOrCreateTodayExecutionSessionForIndividual(supabase, user.id)
  const history = await listExecutionHistory(supabase, user.id, 4)

  return (
    <SessionExecutionClient
      role="individual"
      initialSession={session}
      recentHistory={history}
      coachFeedback={[]}
    />
  )
}
