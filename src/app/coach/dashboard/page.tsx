import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CoachPerformanceView } from './CoachPerformanceView'
import { CreedaProvider } from '@/lib/state_engine'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'
import { getCoachVideoReports } from '@/lib/video-analysis/service'
import { coachOnboardingFlow } from '@/forms/flows/coachFlow'
import { getAdaptiveProfileSummary } from '@/forms/storage'
import { getCoachOperatingSnapshot } from '@/lib/product/operating-system/server'

export default async function CoachDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Verify Role & Fetch Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, username, avatar_url, onboarding_completed, locker_code')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    if (isAppRole(profile.role) && profile.role !== 'coach') {
      redirect(getRoleHomeRoute(profile.role))
    }
    if (profile.onboarding_completed === false) {
      redirect('/coach/onboarding')
    }
  }

  const [videoReports, adaptiveProfile, operatingSnapshot] = await Promise.all([
    getCoachVideoReports(supabase, user.id, 12),
    getAdaptiveProfileSummary({
      supabase,
      userId: user.id,
      role: 'coach',
      flowId: coachOnboardingFlow.id,
    }),
    getCoachOperatingSnapshot(supabase, user.id),
  ])

  return (
    <CreedaProvider>
      <CoachPerformanceView
        videoReports={videoReports}
        lockerCode={profile?.locker_code ?? null}
        adaptiveProfile={adaptiveProfile}
        operatingSnapshot={operatingSnapshot}
      />
    </CreedaProvider>
  )
}
