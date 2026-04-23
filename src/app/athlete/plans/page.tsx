import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  HeartPulse,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { RoleDesktopNav } from '@/components/RoleDesktopNav'
import { createClient } from '@/lib/supabase/server'
import {
  buildWeeklyCalendar,
  getOrCreateTodayExecutionSession,
  listCoachFeedback,
  listExecutionHistory,
  listExerciseHistory,
} from '@/lib/product/server'
import {
  getRoleHomeRoute,
  getRoleOnboardingRoute,
  isAppRole,
} from '@/lib/auth_utils'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function computeStreak(
  history: Array<{ status: 'planned' | 'in_progress' | 'completed' | 'skipped' }>
) {
  let streak = 0
  for (const item of history) {
    if (item.status === 'completed') {
      streak += 1
      continue
    }
    break
  }
  return streak
}

function averageCompliance(
  history: Array<{ compliancePct: number | null }>
) {
  const values = history
    .map((item) => item.compliancePct)
    .filter((value): value is number => value !== null)
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export default async function AthletePlansPage() {
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

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const [todaySession, weeklyCalendar, history, exerciseHistory, coachFeedback] =
    await Promise.all([
      getOrCreateTodayExecutionSession(supabase, user.id),
      buildWeeklyCalendar(supabase, user.id),
      listExecutionHistory(supabase, user.id, 10),
      listExerciseHistory(supabase, user.id, 6),
      listCoachFeedback(supabase, user.id, null),
    ])

  const compliance = averageCompliance(history)
  const streak = computeStreak(history)
  const completedThisWeek = weeklyCalendar.filter((entry) => entry.status === 'completed').length

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-24 pt-16 text-white md:pl-72 md:pr-6 md:pt-6">
      <RoleDesktopNav role="athlete" />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[30px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Link
              href="/athlete/dashboard"
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--chakra-neon)]">
                Execution calendar
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Training plan that actually gets executed
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                Today&apos;s session, weekly rhythm, missed-session carry forward, recovery days, and exercise progression all live here now.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-12 rounded-2xl bg-[var(--saffron)] px-6 text-sm font-black text-black hover:brightness-110"
            >
              <Link href="/athlete/sessions/today">
                <Dumbbell className="mr-2 h-4 w-4" />
                Start today&apos;s session
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-2xl border-white/12 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/5"
            >
              <Link href="/athlete/exercises">
                <BookOpenCheck className="mr-2 h-4 w-4" />
                Exercise library
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={TrendingUp}
            label="Average compliance"
            value={`${compliance}%`}
            helper="Across recent logged sessions"
          />
          <MetricCard
            icon={Flame}
            label="Current streak"
            value={`${streak}`}
            helper="Consecutive completed sessions"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Completed this week"
            value={`${completedThisWeek}`}
            helper="Weekly completion count"
          />
          <MetricCard
            icon={HeartPulse}
            label="Today&apos;s mode"
            value={todaySession.session.mode.replace(/_/g, ' ')}
            helper={`${todaySession.expectedDurationMinutes} minutes`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(10,132,255,0.18),transparent_42%),rgba(255,255,255,0.03)] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Today&apos;s executable plan
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {todaySession.session.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                    {todaySession.session.explainability.headline}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Readiness
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {todaySession.session.readiness.score}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    {todaySession.session.readiness.band}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {todaySession.session.blocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-[24px] border border-white/8 bg-black/20 p-4"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {block.type}
                    </p>
                    <p className="mt-2 text-base font-bold text-white">{block.title}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {block.exercises.length} exercises • {block.intensity}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Weekly calendar
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    Rhythm, recovery, and missed-session logic
                  </h2>
                </div>
                <CalendarDays className="h-5 w-5 text-[var(--chakra-neon)]" />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
                {weeklyCalendar.map((entry) => (
                  <div
                    key={entry.date}
                    className={`rounded-[24px] border p-4 ${
                      entry.status === 'today'
                        ? 'border-[var(--saffron)]/35 bg-[var(--saffron)]/10'
                        : entry.status === 'completed'
                          ? 'border-emerald-500/25 bg-emerald-500/10'
                          : entry.status === 'missed'
                            ? 'border-red-500/20 bg-red-500/8'
                            : 'border-white/8 bg-black/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {entry.label}
                      </p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white">
                        {entry.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-white">{formatDate(entry.date)}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-100">{entry.title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {entry.reason}
                    </p>
                    {entry.carryForwardFrom && (
                      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--saffron-light)]">
                        Carry-forward from {formatDate(entry.carryForwardFrom)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Session history
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    Actual execution, not just assigned work
                  </h2>
                </div>
                <Clock3 className="h-5 w-5 text-[var(--chakra-neon)]" />
              </div>

              <div className="mt-6 space-y-4">
                {history.length > 0 ? (
                  history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[24px] border border-white/8 bg-black/20 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-lg font-bold text-white">{entry.title}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            {formatDate(entry.sessionDate)} • {entry.mode.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
                          {entry.compliancePct !== null
                            ? `${Math.round(entry.compliancePct)}% compliance`
                            : entry.status}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        Expected duration {entry.expectedDurationMinutes} minutes
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    Session history will appear here as soon as you complete your first guided day.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-[var(--chakra-neon)]" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Exercise progression
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-tight">
                    The movements you keep improving
                  </h2>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {exerciseHistory.length > 0 ? (
                  exerciseHistory.map((entry) => (
                    <div
                      key={entry.exerciseSlug}
                      className="rounded-[24px] border border-white/8 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold text-white">
                            {entry.exerciseName}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            Last performed {new Intl.DateTimeFormat('en-US', {
                              month: 'short',
                              day: 'numeric',
                            }).format(new Date(entry.lastCompletedAt))}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {entry.totalCompletions} logs
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <MiniMetric
                          label="Best load"
                          value={entry.bestLoadKg !== null ? `${entry.bestLoadKg} kg` : 'Bodyweight / N/A'}
                        />
                        <MiniMetric
                          label="Best volume"
                          value={entry.bestRepVolume !== null ? `${Math.round(entry.bestRepVolume)}` : 'N/A'}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    Log sessions and this panel will start surfacing your repeat exposures and load progressions.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3">
                <HeartPulse className="h-5 w-5 text-[var(--saffron-light)]" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Recovery + coach loop
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-tight">
                    Keep recovery and communication in the same system
                  </h2>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[var(--saffron)]/20 bg-[var(--saffron)]/8 p-4">
                <p className="text-sm leading-relaxed text-slate-100">
                  Recovery blocks are already injected into today&apos;s session when readiness is low or when rehab focus areas are active. You do not have to go hunt for cooldowns anymore.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {coachFeedback.length > 0 ? (
                  coachFeedback.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[22px] border border-white/8 bg-black/20 p-4"
                    >
                      <p className="text-sm leading-relaxed text-white">{entry.message}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        {entry.feedbackType.replace(/_/g, ' ')} •{' '}
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }).format(new Date(entry.createdAt))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    Coach notes will show up here alongside your execution history.
                  </p>
                )}
              </div>

              <div className="mt-5">
                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-white/12 bg-transparent text-sm font-bold text-white hover:bg-white/5"
                >
                  <Link href="/athlete/sessions/today">
                    Open the guided session
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4 text-[var(--chakra-neon)]" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </div>
  )
}

function MiniMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  )
}
