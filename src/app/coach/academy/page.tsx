import { redirect } from 'next/navigation'

import { CoachAcademyCenter } from '@/components/academy/CoachAcademyCenter'
import { DashboardLayout } from '@/components/DashboardLayout'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'
import { getCoachAcademySnapshot } from '@/lib/coach-academy'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CoachAcademyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect('/coach/onboarding')
  }

  if (isAppRole(profile.role) && profile.role !== 'coach') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const academy = await getCoachAcademySnapshot(supabase, user.id)

  return (
    <DashboardLayout type="coach" user={profile}>
      <CoachAcademyCenter teams={academy.teams} juniorAthletes={academy.juniorAthletes} />
    </DashboardLayout>
  )
}
