import { notFound, redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/DashboardLayout'
import { VideoAnalysisReportView } from '@/components/video-analysis/VideoAnalysisReportView'
import { createClient } from '@/lib/supabase/server'
import { getCoachVideoReportById } from '@/lib/video-analysis/service'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'

export default async function CoachVideoReportPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, username, avatar_url, onboarding_completed, locker_code')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && isAppRole(profile.role) && profile.role !== 'coach') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const report = await getCoachVideoReportById(supabase, user.id, params.id)
  if (!report) notFound()

  return (
    <DashboardLayout user={{ email: user.email ?? null }} type="coach">
      <VideoAnalysisReportView
        report={report}
        subjectName={report.athleteName}
        dashboardHref="/coach/dashboard"
        scanHref="/coach/reports"
      />
    </DashboardLayout>
  )
}
