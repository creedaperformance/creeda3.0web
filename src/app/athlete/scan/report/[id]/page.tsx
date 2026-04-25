import { notFound, redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/DashboardLayout'
import { VideoAnalysisReportView } from '@/components/video-analysis/VideoAnalysisReportView'
import { CoachAthleteCommentThread } from '@/components/video-analysis/CoachAthleteCommentThread'
import { normalizeVideoAnalysisReport } from '@/lib/video-analysis/reporting'
import { listVideoComments, markCommentsReadForAthlete } from '@/lib/video-analysis/comments'
import { createClient } from '@/lib/supabase/server'

export default async function AthleteVideoReportPage(props: { params: Promise<{ id: string }> }) {
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

  const comments = await listVideoComments(supabase, params.id)
  // Mark unread coach comments as read for this athlete on view.
  if (comments.some((c) => c.athleteReadAt == null)) {
    await markCommentsReadForAthlete(supabase, { reportId: params.id, athleteId: user.id })
  }

  return (
    <DashboardLayout type="athlete" user={profile}>
      <VideoAnalysisReportView report={report} dashboardHref="/athlete/dashboard" scanHref="/athlete/scan" />
      <div className="mt-6">
        <CoachAthleteCommentThread reportId={params.id} comments={comments} canPost={false} />
      </div>
    </DashboardLayout>
  )
}
