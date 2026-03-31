import { notFound, redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/DashboardLayout'
import { VideoAnalysisReportView } from '@/components/video-analysis/VideoAnalysisReportView'
import { normalizeVideoAnalysisReport } from '@/lib/video-analysis/reporting'
import { createClient } from '@/lib/supabase/server'

export default async function IndividualVideoReportPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/login')

  const { data: rawReport } = await supabase
    .from('video_analysis_reports')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  const report = normalizeVideoAnalysisReport(rawReport)
  if (!report || report.userId !== user.id) notFound()

  return (
    <DashboardLayout type="individual" user={profile}>
      <VideoAnalysisReportView
        report={report}
        dashboardHref="/individual/dashboard"
        scanHref="/individual/scan"
      />
    </DashboardLayout>
  )
}
