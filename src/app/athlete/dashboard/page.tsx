import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAthleteDashboardSnapshot } from '@/lib/dashboard_decisions'
import { DecisionHUD } from './DecisionHUD'
import { getRoleHomeRoute, getRoleOnboardingRoute, isAppRole } from '@/lib/auth_utils'

export const dynamic = 'force-dynamic'

export default async function AthletePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, primary_sport, position, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const snapshot = await getAthleteDashboardSnapshot(supabase, user.id)

  return (
    <DecisionHUD
      result={snapshot.decisionResult}
      performanceProfile={snapshot.performanceProfile}
      healthSummary={snapshot.healthSummary}
      latestVideoReport={snapshot.latestVideoReport}
      objectiveTest={snapshot.objectiveTest}
      contextSummary={snapshot.contextSummary}
      nutritionSafety={snapshot.nutritionSafety}
    />
  )
}
