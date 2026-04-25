import { redirect } from 'next/navigation'

import { DiagnosticCoachWorkspace } from '@/components/diagnostics/DiagnosticCoachWorkspace'
import { createClient } from '@/lib/supabase/server'

export default async function AthleteDiagnosticPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, primary_sport')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'individual') redirect('/individual/diagnostic')
  if (profile?.role === 'coach') redirect('/coach/reports')

  return (
    <DiagnosticCoachWorkspace
      role="athlete"
      dashboardHref="/athlete/dashboard"
      scanHref="/athlete/scan"
      preferredSport={profile?.primary_sport || null}
    />
  )
}
