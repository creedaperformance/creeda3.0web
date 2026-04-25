import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CalendarRange,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react'

import { DashboardLayout } from '@/components/DashboardLayout'
import { IdentityMetricGrid } from '@/components/review/IdentityMetricGrid'
import { getIndividualWeeklyReviewSnapshot } from '@/lib/dashboard_decisions'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function IndividualReviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')
  if (profile.role !== 'individual') redirect(`/${profile.role}/dashboard`)
  if (!profile.onboarding_completed) redirect('/fitstart')

  const review = await getIndividualWeeklyReviewSnapshot(supabase, user.id)

  if (!review) {
    redirect('/individual/dashboard')
  }

  return (
    <DashboardLayout type="individual" user={profile}>
      <div className="space-y-8 pb-20">
        <section className="rounded-[2.25rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(245,124,0,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_42%),rgba(255,255,255,0.02)] p-8 sm:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Weekly Review</p>
              <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white">
                How your week is shaping the next step
              </h1>
              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
                {review.periodLabel}. {review.biggestWin} {review.bottleneck}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <BadgeChip icon={Sparkles} text={review.decision.directionLabel} />
                <BadgeChip icon={ShieldCheck} text={`${review.trustSummary.confidenceLevel} confidence`} />
                <BadgeChip icon={BarChart3} text={`${review.progressToPeakPct}% to peak`} />
                <BadgeChip icon={Brain} text={`${review.contextSummary?.loadLabel || 'Low'} context`} />
                <BadgeChip
                  icon={Timer}
                  text={review.objectiveTest?.latestValidatedScoreMs ? `${review.objectiveTest.latestValidatedScoreMs}ms objective` : 'Objective test optional'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:min-w-[340px]">
              <MetricCard label="Average readiness" value={`${review.averageReadiness}`} />
              <MetricCard label="Adherence" value={`${review.adherencePct}%`} />
              <MetricCard label="Peak progress" value={`${review.progressToPeakPct}%`} />
              <MetricCard label="Streak" value={`${review.streakCount} days`} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Readiness trend</p>
            </div>
            <div className="mt-6 grid grid-cols-7 gap-3">
              {review.trend.map((entry) => (
                <div key={entry.date} className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{entry.label}</p>
                  <div className="mt-4 flex h-32 items-end justify-center">
                    <div className="flex w-full items-end justify-center rounded-full bg-white/[0.04] px-2 py-2">
                      <div
                        className="w-full rounded-full bg-gradient-to-t from-primary to-blue-400"
                        style={{ height: `${Math.max(12, Math.round(entry.readinessScore))}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-lg font-black tracking-tight text-white">{entry.readinessScore}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <div className="grid gap-4">
            <InsightCard
              icon={Target}
              eyebrow="Bottleneck"
              title="What deserves attention"
              body={review.bottleneck}
            />
            <InsightCard
              icon={CheckCircle2}
              eyebrow="Win"
              title="What improved"
              body={review.biggestWin}
            />
            <InsightCard
              icon={ArrowRight}
              eyebrow="Next week"
              title="What to keep doing"
              body={review.nextWeekFocus}
            />
            <InsightCard
              icon={Timer}
              eyebrow="Objective"
              title={review.objectiveTest?.classification || 'Measured signal'}
              body={review.objectiveTest?.summary || 'Objective testing is optional. Add a reaction test only if you want CREEDA to pair your weekly story with one measured phone-based signal.'}
            />
          </div>
        </section>

        <SurfaceCard>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Identity this week</p>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            The deeper traits your routine is building
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
            The daily plan matters, but the bigger win is what your habits are becoming. These metrics keep the focus on durable momentum, not one good day.
          </p>
          <div className="mt-6">
            <IdentityMetricGrid metrics={review.identityMetrics} />
          </div>
        </SurfaceCard>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SurfaceCard>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Trust this week</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Confidence" value={`${review.trustSummary.confidenceLevel} ${review.trustSummary.confidenceScore}`} />
              <MetricCard label="Data quality" value={review.trustSummary.dataQuality} />
              <MetricCard label="Completeness" value={`${review.trustSummary.dataCompleteness}%`} />
              <MetricCard label="Objective" value={review.objectiveTest?.latestValidatedScoreMs ? `${review.objectiveTest.latestValidatedScoreMs}ms` : 'Not recent'} />
            </div>

            <div className="mt-6 space-y-3">
              {review.trustSummary.nextBestInputs.slice(0, 3).map((item) => (
                <p key={item} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-slate-300">
                  {item}
                </p>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Use the review</p>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
              Keep the system calm, clear, and useful
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The point of this review is to remove guesswork. Let it guide your next few days, then let fresh signals confirm whether the plan is working.
            </p>

            <div className="mt-6 rounded-[1.6rem] border border-white/[0.06] bg-white/[0.03] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Today&apos;s path</p>
              <p className="mt-3 text-xl font-bold text-white">{review.decision.pathway.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{review.decision.pathway.rationale}</p>
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-white/[0.06] bg-white/[0.03] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Objective signal</p>
              <p className="mt-3 text-xl font-bold text-white">
                {review.objectiveTest?.latestValidatedScoreMs ? `${review.objectiveTest.latestValidatedScoreMs}ms` : 'No recent test'}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {review.objectiveTest?.summary || 'Objective testing is optional. Add one saved reaction session only if you want CREEDA to compare how you feel with a measured response-speed anchor.'}
              </p>
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-white/[0.06] bg-white/[0.03] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">India-context signal</p>
              <p className="mt-3 text-xl font-bold text-white">{review.contextSummary?.loadLabel || 'Low'} load</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {review.contextSummary?.summary || 'Optional context like heat, commute, fasting, or air quality did not become a major driver this week.'}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/individual/logging"
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black hover:brightness-110 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                Daily Check-In
              </Link>
              <Link
                href="/individual/dashboard"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 hover:bg-white/[0.05] transition-all"
              >
                <Brain className="h-4 w-4" />
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
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

function BadgeChip({
  icon: Icon,
  text,
}: {
  icon: typeof Activity
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {text}
    </span>
  )
}
