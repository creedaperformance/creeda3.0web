import { redirect } from 'next/navigation'

import { VideoAnalysisHub } from '@/components/video-analysis/VideoAnalysisHub'
import { createClient } from '@/lib/supabase/server'

export default async function AthleteScanPage() {
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

  if (profile?.role === 'individual') redirect('/individual/scan')
  if (profile?.role === 'coach') redirect('/coach/reports')

  return (
    <VideoAnalysisHub
      role="athlete"
      dashboardHref="/athlete/dashboard"
      preferredSport={profile?.primary_sport || null}
    />
  )
}
