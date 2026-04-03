import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Database,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'

import { DashboardLayout } from '@/components/DashboardLayout'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'
import { getCoachWeeklyReviewSnapshot } from '@/lib/dashboard_decisions'
import { createClient } from '@/lib/supabase/server'

import { SquadTrendsChart } from '../components/SquadTrendsChart'

export const dynamic = 'force-dynamic'

export default async function CoachAnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
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

  const review = await getCoachWeeklyReviewSnapshot(supabase, user.id)
  const chartData = review.trend.map((entry) => ({
    date: entry.label,
    Readiness: entry.readinessScore,
  }))

  return (
    <DashboardLayout type="coach" user={user}>
      <div className="space-y-8 pb-20">
        <header className="rounded-[2.25rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(245,124,0,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_40%),rgba(255,255,255,0.02)] p-8 sm:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Coach Analytics</p>
              <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white">
                Squad trends, pressure, and planning signals
              </h1>
              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
                {review.periodLabel}. Analytics should help a coach answer three things quickly: Is the squad holding up, where is the pressure concentrated, and what should the next microcycle protect or push?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:min-w-[340px]">
              <MetricCard label="Average readiness" value={`${review.averageReadiness}`} />
              <MetricCard label="Squad compliance" value={`${review.squadCompliancePct}%`} />
              <MetricCard label="Live interventions" value={`${review.activeInterventions}`} />
              <MetricCard label="Objective coverage" value={`${review.objectiveCoveragePct}%`} />
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">7-day readiness trajectory</p>
            </div>
            <div className="mt-6 h-[340px]">
              <SquadTrendsChart data={chartData} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Delta" value={`${review.readinessDelta >= 0 ? '+' : ''}${review.readinessDelta}`} compact />
              <MetricCard label="Resolved" value={`${review.resolvedThisWeek}`} compact />
              <MetricCard label="Low-data" value={`${review.lowDataCount}`} compact />
              <MetricCard label="Objective declines" value={`${review.objectiveDecliningCount}`} compact />
            </div>
          </SurfaceCard>

          <div className="grid gap-4">
            <InsightCard
              icon={ShieldAlert}
              eyebrow="Pressure"
              title="Where the squad is getting squeezed"
              body={review.bottleneck}
            />
            <InsightCard
              icon={ShieldCheck}
              eyebrow="Stability"
              title="What is holding up well"
              body={review.biggestWin}
            />
            <InsightCard
              icon={Users}
              eyebrow="Cluster"
              title="Where to look first"
              body={review.highestRiskCluster}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Team comparison</p>
            </div>
            <div className="mt-6 space-y-3">
              {review.teamSummaries.length > 0 ? (
                review.teamSummaries.map((team) => (
                  <div key={team.teamId} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-white">{team.teamName}</h3>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {team.athleteCount} athletes • {team.objectiveCoveragePct}% optional objective coverage
                        </p>
                      </div>
                      <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                        {team.highRiskCount} high-risk
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MetricCard label="Readiness" value={`${team.averageReadiness}`} compact />
                      <MetricCard label="Compliance" value={`${team.compliancePct}%`} compact />
                      <MetricCard label="Interventions" value={`${team.interventionCount}`} compact />
                      <MetricCard label="Low-data" value={`${team.lowDataCount}`} compact />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No team analytics yet"
                  body="Invite athletes and let the daily loop run so Creeda can compare teams with real signal quality."
                />
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Actionable patterns</p>
            </div>
            <div className="mt-6 space-y-3">
              {review.groupSuggestions.map((suggestion) => (
                <div key={suggestion.title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2">
                    <SuggestionPill priority={suggestion.priority} />
                    <h3 className="text-lg font-bold tracking-tight text-white">{suggestion.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{suggestion.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Next weekly focus</p>
              <p className="mt-3 text-xl font-bold text-white">{review.nextWeekFocus}</p>
            </div>
          </SurfaceCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Top live priorities</p>
            </div>
            <div className="mt-6 space-y-3">
              {review.topPriorityAthletes.length > 0 ? (
                review.topPriorityAthletes.map((item) => (
                  <div key={`${item.teamId}-${item.athleteId}-${item.queueType}`} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold tracking-tight text-white">{item.athleteName}</h3>
                      <PriorityPill priority={item.priority} />
                      <QueueTypePill queueType={item.queueType} />
                    </div>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.teamName}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.recommendation}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No active pressure points"
                  body="The current intervention view is quiet enough that no single athlete is dominating squad planning."
                />
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Use the analytics</p>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
              Move from monitoring to planning
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The dashboard tells you who needs attention today. Analytics tells you whether the next block should protect recovery, clean up signal quality, or press a quality window.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/coach/review"
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black hover:brightness-110 transition-all"
              >
                <TrendingUp className="h-4 w-4" />
                Weekly Review
              </Link>
              <Link
                href="/coach/dashboard"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 hover:bg-white/[0.05] transition-all"
              >
                <Users className="h-4 w-4" />
                Back To Today
              </Link>
            </div>
          </SurfaceCard>
        </section>
      </div>
    </DashboardLayout>
  )
}

function SurfaceCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-3 font-black tracking-tight text-white ${compact ? 'text-xl' : 'text-2xl'}`}>{value}</p>
    </div>
  )
}

function InsightCard({
  icon: Icon,
  eyebrow,
  title,
  body,
}: {
  icon: typeof Activity
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <SurfaceCard>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
    </SurfaceCard>
  )
}

function SuggestionPill({ priority }: { priority: 'High' | 'Watch' | 'Build' }) {
  const styles =
    priority === 'High'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : priority === 'Watch'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${styles}`}>
      {priority}
    </span>
  )
}

function PriorityPill({ priority }: { priority: 'Critical' | 'Warning' | 'Informational' }) {
  const styles =
    priority === 'Critical'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : priority === 'Warning'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
        : 'border-blue-500/20 bg-blue-500/10 text-blue-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${styles}`}>
      {priority === 'Informational' ? 'Watch' : priority}
    </span>
  )
}

function QueueTypePill({ queueType }: { queueType: 'intervention' | 'low_data' }) {
  const styles =
    queueType === 'intervention'
      ? 'border-white/[0.08] bg-white/[0.04] text-white'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${styles}`}>
      {queueType === 'intervention' ? 'Intervention' : 'Low-data'}
    </span>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/[0.08] bg-white/[0.02] p-5">
      <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  )
}
