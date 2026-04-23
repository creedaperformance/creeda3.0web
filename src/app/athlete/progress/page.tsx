import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  Camera,
  CheckCircle2,
  Dumbbell,
  Flame,
  TrendingUp,
} from 'lucide-react'

import { RoleDesktopNav } from '@/components/RoleDesktopNav'
import { createClient } from '@/lib/supabase/server'
import {
  getOrCreateTodayExecutionSession,
  listExecutionHistory,
  listExerciseHistory,
} from '@/lib/product/server'
import { buildSkillIntelligenceSnapshot } from '@/lib/product'
import { getUserVideoReports } from '@/lib/video-analysis/service'
import {
  getRoleHomeRoute,
  getRoleOnboardingRoute,
  isAppRole,
} from '@/lib/auth_utils'

export const dynamic = 'force-dynamic'

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function computeStreak(history: Array<{ status: string }>) {
  let streak = 0
  for (const entry of history) {
    if (entry.status === 'completed') streak += 1
    else break
  }
  return streak
}

function progressionText(entry: Awaited<ReturnType<typeof listExerciseHistory>>[number]) {
  const latest = entry.recentEntries[0]
  const oldest = entry.recentEntries[entry.recentEntries.length - 1]
  if (!latest || !oldest || latest === oldest) return 'Baseline building'

  if (latest.loadKg !== null && oldest.loadKg !== null && latest.loadKg !== oldest.loadKg) {
    const delta = latest.loadKg - oldest.loadKg
    return `${delta > 0 ? '+' : ''}${delta} kg since first saved set`
  }

  if (latest.reps !== null && oldest.reps !== null && latest.reps !== oldest.reps) {
    const delta = latest.reps - oldest.reps
    return `${delta > 0 ? '+' : ''}${delta} reps since first saved set`
  }

  if (latest.durationSeconds !== null && oldest.durationSeconds !== null && latest.durationSeconds !== oldest.durationSeconds) {
    const delta = latest.durationSeconds - oldest.durationSeconds
    return `${delta > 0 ? '+' : ''}${delta}s since first saved set`
  }

  return `${entry.totalCompletions} saved exposure${entry.totalCompletions === 1 ? '' : 's'}`
}

export default async function AthleteProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed, primary_sport')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const [todaySession, history, exerciseHistory, videoReports] = await Promise.all([
    getOrCreateTodayExecutionSession(supabase, user.id),
    listExecutionHistory(supabase, user.id, 14),
    listExerciseHistory(supabase, user.id, 8),
    getUserVideoReports(supabase, user.id, 6),
  ])

  const complianceValues = history
    .map((entry) => entry.compliancePct)
    .filter((value): value is number => value !== null)
  const compliance = average(complianceValues)
  const completed = history.filter((entry) => entry.status === 'completed').length
  const streak = computeStreak(history)
  const latestSkill = buildSkillIntelligenceSnapshot(videoReports[0] || null)
  const bestVideoScore = videoReports.length
    ? Math.max(...videoReports.map((report) => report.summary.score))
    : null

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-24 pt-16 text-white md:pl-72 md:pr-6 md:pt-6">
      <RoleDesktopNav role="athlete" />
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <Link
            href="/athlete/dashboard"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--chakra-neon)]">
                Proof of improvement
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Before, now, and what changed
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                This view only uses saved sessions, exercise logs, and accepted movement scans.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/athlete/sessions/today"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--saffron)] px-5 text-sm font-black text-black transition hover:brightness-110"
              >
                <Dumbbell className="h-4 w-4" />
                Start session
              </Link>
              <Link
                href="/athlete/scan"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Camera className="h-4 w-4" />
                Record scan
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={CheckCircle2} label="Compliance" value={`${compliance}%`} detail="Recent completed logs" />
          <Metric icon={Flame} label="Streak" value={`${streak}`} detail="Completed sessions in a row" />
          <Metric icon={TrendingUp} label="Training Days" value={`${completed}`} detail="Recent sessions completed" />
          <Metric icon={BarChart3} label="Movement Best" value={bestVideoScore === null ? '--' : `${bestVideoScore}%`} detail="Accepted scan score" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Movement and skill trend
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{latestSkill.headline}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{latestSkill.planAdjustment}</p>

            <div className="mt-6 grid gap-3">
              {videoReports.length > 0 ? (
                videoReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/athlete/scan/report/${report.id}`}
                    className="rounded-[22px] border border-white/8 bg-black/20 p-4 transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-white">{report.sportLabel}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          {formatDate(report.createdAt)} • {report.summary.status}
                        </p>
                      </div>
                      <p className="text-2xl font-black text-white">{report.summary.score}%</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[var(--chakra-neon)]"
                        style={{ width: `${report.summary.score}%` }}
                      />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-5 text-sm leading-relaxed text-slate-400">
                  Record one accepted scan to start a movement-quality baseline.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Exercise progression
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Repeat exposures that are improving</h2>
            <div className="mt-6 space-y-4">
              {exerciseHistory.length > 0 ? (
                exerciseHistory.slice(0, 6).map((entry) => (
                  <div key={entry.exerciseSlug} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-white">{entry.exerciseName}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{progressionText(entry)}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300">
                        {entry.totalCompletions} logs
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-5 text-sm leading-relaxed text-slate-400">
                  Complete guided sessions to create exercise-specific improvement proof.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,153,51,0.16),transparent_40%),rgba(255,255,255,0.03)] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Today closes the loop
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{todaySession.session.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            {todaySession.session.explainability.reasons.join(' ')}
          </p>
          {todaySession.session.summary.skillFocus?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {todaySession.session.summary.skillFocus.map((focus) => (
                <span
                  key={focus}
                  className="rounded-full border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--chakra-neon)]"
                >
                  {focus}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CheckCircle2
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4 text-[var(--chakra-neon)]" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{detail}</p>
    </div>
  )
}
