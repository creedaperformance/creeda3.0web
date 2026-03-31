import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, ArrowRight, ClipboardList, Video } from 'lucide-react'

import { DashboardLayout } from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/server'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'
import { getCoachVideoReports } from '@/lib/video-analysis/service'

export default async function CoachReports() {
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

  if (profile) {
    if (isAppRole(profile.role) && profile.role !== 'coach') {
      redirect(getRoleHomeRoute(profile.role))
    }
    if (profile.onboarding_completed === false) {
      redirect('/coach/onboarding')
    }
  }

  const reports = await getCoachVideoReports(supabase, user.id, 36)

  return (
    <DashboardLayout user={{ email: user.email ?? null }} type="coach">
      <div className="flex-1 overflow-auto bg-[var(--background)]">
        <main className="max-w-7xl mx-auto p-4 md:p-8 pt-8 space-y-8 pb-32">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Coach Reports</h1>
            <p className="text-sm font-medium text-white/50">
              Real biomechanical video reports from athlete scans across your roster.
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
              <Video className="h-10 w-10 text-slate-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-white">No athlete scans yet</p>
              <p className="text-sm text-slate-500 mt-2">
                Once your athletes upload movement clips, their reports will appear here with score, faults, and correction plans.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/coach/reports/${report.id}`}
                  className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        {report.athleteName}
                      </p>
                      <h2 className="mt-3 text-xl font-bold text-white">{report.sportLabel}</h2>
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{report.summary.headline}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-white">{report.summary.score}%</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">{report.summary.status}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <Metric label="Corrections" value={String(report.warnings)} />
                    <Metric label="Positives" value={String(report.positive)} />
                    <Metric label="Frames" value={String(report.frameCount)} />
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {report.recommendations.slice(0, 2).map((recommendation) => (
                        <span
                          key={`${report.id}-${recommendation.title}`}
                          className="px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-[10px] font-bold uppercase tracking-widest text-slate-400"
                        >
                          {recommendation.title}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-orange-300">
                      Open report
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-5">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-blue-300" />
              <div>
                <p className="text-sm font-semibold text-white">Coach action loop</p>
                <p className="text-xs text-slate-400 mt-1">
                  Use these reports to adjust drill emphasis, lower chaos when high-severity faults appear, and rescan once the movement pattern stabilizes.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  )
}
