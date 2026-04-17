import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GamifiedCoachDashboard } from './GamifiedCoachDashboard'
import { CreedaProvider } from '@/lib/state_engine'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'
import { getCoachVideoReports } from '@/lib/video-analysis/service'
import { coachOnboardingFlow } from '@/forms/flows/coachFlow'
import { getAdaptiveProfileSummary } from '@/forms/storage'

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

  const videoReports = await getCoachVideoReports(supabase, user.id, 12)
  const adaptiveProfile = await getAdaptiveProfileSummary({
    supabase,
    userId: user.id,
    role: 'coach',
    flowId: coachOnboardingFlow.id,
  })

  return (
    <CreedaProvider>
      <GamifiedCoachDashboard
        videoReports={videoReports}
        lockerCode={profile?.locker_code ?? null}
        adaptiveProfile={adaptiveProfile}
      />
    </CreedaProvider>
  )
}
