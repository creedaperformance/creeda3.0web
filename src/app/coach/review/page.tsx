import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarRange,
  ClipboardList,
  Database,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'

import { DashboardLayout } from '@/components/DashboardLayout'
import { IdentityMetricGrid } from '@/components/review/IdentityMetricGrid'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'
import { getCoachWeeklyReviewSnapshot } from '@/lib/dashboard_decisions'
import { createClient } from '@/lib/supabase/server'

import { SquadTrendsChart } from '../components/SquadTrendsChart'

export const dynamic = 'force-dynamic'

export default async function CoachReviewPage() {
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
        <section className="rounded-[2.25rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,124,0,0.14),transparent_42%),rgba(255,255,255,0.02)] p-8 sm:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-300">Coach Weekly Review</p>
              <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white">
                What the squad needs next week
              </h1>
              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
                {review.periodLabel}. {review.biggestWin} {review.bottleneck}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <BadgeChip icon={Users} text={`${review.athleteCount} athletes`} />
                <BadgeChip icon={ShieldCheck} text={`${review.activeInterventions} live interventions`} />
                <BadgeChip icon={Database} text={`${review.lowDataCount} low-data items`} />
                <BadgeChip icon={BarChart3} text={`${review.squadCompliancePct}% compliance`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:min-w-[340px]">
              <MetricCard label="Average readiness" value={`${review.averageReadiness}`} />
              <MetricCard label="Readiness delta" value={`${review.readinessDelta >= 0 ? '+' : ''}${review.readinessDelta}`} />
              <MetricCard label="Resolved this week" value={`${review.resolvedThisWeek}`} />
              <MetricCard label="Objective coverage" value={`${review.objectiveCoveragePct}%`} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Squad readiness trend</p>
            </div>
            <div className="mt-6 h-[320px]">
              <SquadTrendsChart data={chartData} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Teams" value={`${review.teamCount}`} compact />
              <MetricCard label="Athletes" value={`${review.athleteCount}`} compact />
              <MetricCard label="Interventions" value={`${review.activeInterventions}`} compact />
              <MetricCard label="Objective declines" value={`${review.objectiveDecliningCount}`} compact />
            </div>
          </SurfaceCard>

          <div className="grid gap-4">
            <InsightCard
              icon={AlertTriangle}
              eyebrow="Bottleneck"
              title="What held the squad back"
              body={review.bottleneck}
            />
            <InsightCard
              icon={ShieldCheck}
              eyebrow="Win"
              title="What moved forward"
              body={review.biggestWin}
            />
            <InsightCard
              icon={Users}
              eyebrow="Risk cluster"
              title="Where the pressure is concentrated"
              body={review.highestRiskCluster}
            />
            <InsightCard
              icon={ArrowRight}
              eyebrow="Next week"
              title="What to change first"
              body={review.nextWeekFocus}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Top priority athletes</p>
            </div>
            <div className="mt-6 space-y-3">
              {review.topPriorityAthletes.length > 0 ? (
                review.topPriorityAthletes.map((item) => (
                  <div key={`${item.teamId}-${item.athleteId}-${item.queueType}`} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold tracking-tight text-white">{item.athleteName}</p>
                      <PriorityPill priority={item.priority} />
                      <QueueTypePill queueType={item.queueType} />
                    </div>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{item.teamName}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.reasons.map((reason) => (
                        <span
                          key={`${item.athleteId}-${reason}`}
                          className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.recommendation}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No live priority athletes right now"
                  body="The queue is currently clear enough that no athlete is demanding immediate squad-level escalation."
                />
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Group suggestions</p>
            </div>
            <div className="mt-6 space-y-3">
              {review.groupSuggestions.map((suggestion) => (
                <div key={suggestion.title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <SuggestionPill priority={suggestion.priority} />
                    <h3 className="text-lg font-bold tracking-tight text-white">{suggestion.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{suggestion.detail}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </section>

        <SurfaceCard>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Squad identity</p>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            The traits the squad is actually reinforcing
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
            This is the layer beneath readiness. It shows whether the group is becoming more resilient, more reliable, and easier to coach with confidence.
          </p>
          <div className="mt-6">
            <IdentityMetricGrid metrics={review.identityMetrics} showSquadContext />
          </div>
        </SurfaceCard>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {review.teamSummaries.length > 0 ? (
            review.teamSummaries.map((team) => (
              <SurfaceCard key={team.teamId}>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Team summary</p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">{team.teamName}</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MetricCard label="Readiness" value={`${team.averageReadiness}`} compact />
                  <MetricCard label="Compliance" value={`${team.compliancePct}%`} compact />
                  <MetricCard label="Interventions" value={`${team.interventionCount}`} compact />
                  <MetricCard label="High-risk" value={`${team.highRiskCount}`} compact />
                  <MetricCard label="Consistency" value={team.consistencyScore !== null ? `${team.consistencyScore}` : 'N/A'} compact />
                  <MetricCard label="Reliability" value={team.reliabilityScore !== null ? `${team.reliabilityScore}` : 'N/A'} compact />
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {team.athleteCount} athletes • {team.objectiveCoveragePct}% optional objective coverage
                </p>
              </SurfaceCard>
            ))
          ) : (
            <SurfaceCard>
              <EmptyState
                title="No team summaries yet"
                body="Link athletes to a team and let the daily loop run for a few days so CREEDA can form weekly squad stories."
              />
            </SurfaceCard>
          )}
        </section>

        <SurfaceCard>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Use the review</p>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Turn the weekly readout into the next microcycle
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
            The coaching win is not the chart. It is the faster decision you can make because the chart, queue, and group suggestions are finally pointing in the same direction.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              href="/coach/dashboard"
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black hover:brightness-110 transition-all"
            >
              <Users className="h-4 w-4" />
              Squad Roster
            </Link>
            <Link
              href="/coach/analytics"
              className="flex items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-200 hover:bg-blue-500/15 transition-all"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
            <Link
              href="/coach/reports"
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 hover:bg-white/[0.05] transition-all"
            >
              <ClipboardList className="h-4 w-4" />
              Reports
            </Link>
          </div>
        </SurfaceCard>
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
  icon: typeof AlertTriangle
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

function BadgeChip({
  icon: Icon,
  text,
}: {
  icon: typeof Users
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
      <Icon className="h-3.5 w-3.5 text-blue-300" />
      {text}
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
  const label = queueType === 'intervention' ? 'Intervention' : 'Low-data'
  const styles =
    queueType === 'intervention'
      ? 'border-white/[0.08] bg-white/[0.04] text-white'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${styles}`}>
      {label}
    </span>
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/[0.08] bg-white/[0.02] p-5">
      <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  )
}
