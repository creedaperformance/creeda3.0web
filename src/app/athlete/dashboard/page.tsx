import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAthleteDashboardSnapshot } from '@/lib/dashboard_decisions'
import { getDailyOperatingSnapshot } from '@/lib/product/operating-system/server'
import { athleteOnboardingFlow } from '@/forms/flows/athleteFlow'
import { getAdaptiveProfileSummary } from '@/forms/storage'
import { countUnreadCommentsForAthlete } from '@/lib/video-analysis/comments'
import { getOnboardingV2Snapshot } from '@/lib/onboarding-v2/queries'
import { AthletePerformanceView } from './AthletePerformanceView'
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
  const [adaptiveProfile, operatingSnapshot, unreadCoachComments, onboardingV2] = await Promise.all([
    getAdaptiveProfileSummary({
      supabase,
      userId: user.id,
      role: 'athlete',
      flowId: athleteOnboardingFlow.id,
    }),
    getDailyOperatingSnapshot(supabase, user.id, snapshot),
    countUnreadCommentsForAthlete(supabase, user.id),
    getOnboardingV2Snapshot(supabase, user.id),
  ])

  return (
    <AthletePerformanceView
      result={snapshot.decisionResult}
      performanceProfile={snapshot.performanceProfile}
      healthSummary={snapshot.healthSummary}
      latestVideoReport={snapshot.latestVideoReport}
      objectiveTest={snapshot.objectiveTest}
      contextSummary={snapshot.contextSummary}
      nutritionSafety={snapshot.nutritionSafety}
      adaptiveProfile={adaptiveProfile}
      operatingSnapshot={operatingSnapshot}
      profile={snapshot.profile}
      unreadCoachComments={unreadCoachComments}
      onboardingV2={onboardingV2}
    />
  )
}
