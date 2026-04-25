import { redirect } from 'next/navigation'

import { DiagnosticCoachWorkspace } from '@/components/diagnostics/DiagnosticCoachWorkspace'
import { createClient } from '@/lib/supabase/server'

export default async function IndividualDiagnosticPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'athlete') redirect('/athlete/diagnostic')
  if (profile?.role === 'coach') redirect('/coach/reports')

  const { data: individualProfile } = await supabase
    .from('individual_profiles')
    .select('sport_profile')
    .eq('id', user.id)
    .maybeSingle()

  const sportProfile = (individualProfile?.sport_profile || {}) as Record<string, unknown>
  const preferredSport = typeof sportProfile.selectedSport === 'string' ? sportProfile.selectedSport : null

  return (
    <DiagnosticCoachWorkspace
      role="individual"
      dashboardHref="/individual/dashboard"
      scanHref="/individual/scan"
      preferredSport={preferredSport}
    />
  )
}
