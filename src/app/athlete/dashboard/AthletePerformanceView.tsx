'use client'

import Link from 'next/link'
import { ClipboardCheck, ScanLine, TrendingUp, Activity, Watch } from 'lucide-react'

import { ReadinessOrb } from '@/components/neon/ReadinessOrb'
import { PerformanceShell } from '@/components/performance-view/PerformanceShell'
import { CalibrationCard } from '@/components/onboarding-v2/CalibrationCard'
import { buildDirective, actionTone, type SportContext } from '@/components/performance-view/directives'
import type {
  AthleteHealthSummary,
  AthleteDashboardSnapshot,
  ObjectiveTestSummary,
} from '@/lib/dashboard_decisions'
import type { OrchestratorOutputV5 } from '@/lib/engine/types'
import type { VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'
import type { DailyContextSummary } from '@/lib/context-signals/storage'
import type { NutritionSafetySummary } from '@/lib/nutrition-safety'
import type { AdaptiveProfileSummary } from '@/forms/types'
import type { DailyOperatingSnapshot } from '@/lib/product/operating-system/types'
import type { OnboardingV2Snapshot } from '@/lib/onboarding-v2/types'

interface AthletePerformanceViewProps {
  result: OrchestratorOutputV5 | null
  performanceProfile?: Record<string, unknown> | null
  healthSummary?: AthleteHealthSummary | null
  latestVideoReport?: VideoAnalysisReportSummary | null
  objectiveTest?: ObjectiveTestSummary | null
  contextSummary?: DailyContextSummary | null
  nutritionSafety: NutritionSafetySummary
  adaptiveProfile: AdaptiveProfileSummary | null
  operatingSnapshot: DailyOperatingSnapshot | null
  profile?: AthleteDashboardSnapshot['profile']
  unreadCoachComments?: number
  onboardingV2?: OnboardingV2Snapshot | null
}

function inferSport(profile?: Record<string, unknown> | null): SportContext {
  const raw = String(profile?.primary_sport || profile?.sport || '').toLowerCase()
  if (raw.includes('cricket')) return 'cricket'
  if (raw.includes('football') || raw.includes('soccer')) return 'football'
  if (raw.includes('badminton')) return 'badminton'
  if (raw.includes('athletic') || raw.includes('sprint') || raw.includes('run')) return 'athletics'
  if (raw.includes('strength') || raw.includes('lift') || raw.includes('crossfit') || raw.includes('gym')) {
    return 'strength'
  }
  return 'general'
}

export function AthletePerformanceView({
  operatingSnapshot,
  result,
  healthSummary,
  latestVideoReport,
  profile,
  unreadCoachComments = 0,
  onboardingV2,
}: AthletePerformanceViewProps) {
  if (!operatingSnapshot) return <EmptyState onboardingV2={onboardingV2} />

  const sport = inferSport(profile)
  const readiness = operatingSnapshot.readiness
  const today = operatingSnapshot.today
  const retention = operatingSnapshot.retention
  const goal = operatingSnapshot.goal
  const integrations = operatingSnapshot.integrations

  const topReason = readiness.reasons
    .slice()
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))[0]

  const directive = buildDirective({
    persona: 'athlete',
    action: readiness.action,
    sport,
    phase: goal.phase,
    topReasonLabel: topReason?.label,
    topReasonImpact: topReason?.impact,
    hasInjury: goal.onTrackStatus === 'off_track' || readiness.reasons.some((r) => r.label === 'Body status' && r.impact <= -10),
    streakDays: retention.streakDays,
  })

  const tone = actionTone(readiness.action)
  const decisionResult = result?.creedaDecision

  return (
    <PerformanceShell
      role="athlete"
      sport={sport}
      decision={
        <ZoneDecision
          score={readiness.score}
          actionLabel={readiness.actionLabel}
          headline={directive.headline}
          whyLine={directive.whyLine}
          confidence={readiness.confidenceLabel}
          tone={tone}
        />
      }
      plan={
        <ZonePlan
          title={today.title}
          durationMinutes={today.expectedDurationMinutes}
          mode={today.mode}
          actionDetail={readiness.actionDetail}
          href={today.href}
        />
      }
      week={
        <ZoneWeek
          streakDays={retention.streakDays}
          weeklyCompliancePct={retention.weeklyCompliancePct}
          phase={goal.phase}
          daysUntilEvent={goal.daysUntilEvent}
          eventName={goal.eventName}
          decisionScore={decisionResult?.confidenceScore ?? null}
        />
      }
      next={
        <ZoneNext
          hasWearable={(healthSummary?.connected ?? false) || integrations.connectedCount > 0}
          latestVideoReport={latestVideoReport}
          missingDataCount={readiness.missingDataWarnings.length}
          unreadCoachComments={unreadCoachComments}
        />
      }
      extra={onboardingV2?.hasV2Data ? <CalibrationCard snapshot={onboardingV2} /> : null}
    />
  )
}

function ZoneDecision({
  score,
  actionLabel,
  headline,
  whyLine,
  confidence,
  tone,
}: {
  score: number
  actionLabel: string
  headline: string
  whyLine: string
  confidence: 'high' | 'medium' | 'low'
  tone: 'go' | 'steady' | 'slow' | 'stop'
}) {
  const toneAccent = tone === 'go'
    ? 'text-[#3DDC97]'
    : tone === 'steady'
      ? 'text-[#FFB547]'
      : tone === 'slow'
        ? 'text-[#7C5CFF]'
        : 'text-[#FF3A5C]'

  return (
    <div className="flex flex-col items-center text-center">
      <ReadinessOrb score={score} status={actionLabel} />
      <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
        {headline}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">{whyLine}</p>
      <div className="mt-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em]">
        <span className={toneAccent}>{actionLabel}</span>
        <span className="text-white/30">·</span>
        <span className="text-white/40">Confidence {confidence}</span>
      </div>
    </div>
  )
}

function ZonePlan({
  title,
  durationMinutes,
  mode,
  actionDetail,
  href,
}: {
  title: string
  durationMinutes: number
  mode: string
  actionDetail: string
  href: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Today</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          {durationMinutes} min · {mode}
        </p>
      </div>
      <h2 className="mt-2 text-xl font-black tracking-tight text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{actionDetail}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--saffron)] px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_0_30px_var(--saffron-glow)] transition hover:brightness-110"
        >
          <Activity className="h-4 w-4" /> Start session
        </Link>
        <Link
          href="/athlete/checkin"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/[0.06]"
        >
          <ClipboardCheck className="h-4 w-4" /> Log RPE / skip
        </Link>
      </div>
    </div>
  )
}

function ZoneWeek({
  streakDays,
  weeklyCompliancePct,
  phase,
  daysUntilEvent,
  eventName,
  decisionScore,
}: {
  streakDays: number
  weeklyCompliancePct: number
  phase: string
  daysUntilEvent: number | null
  eventName: string | null
  decisionScore: number | null
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Stat label="Streak" value={`${streakDays}d`} />
      <Stat label="Compliance" value={`${Math.round(weeklyCompliancePct)}%`} />
      <Stat label="Phase" value={phase} />
      <Stat
        label={eventName ? 'Event' : 'Confidence'}
        value={
          daysUntilEvent !== null && eventName
            ? `${daysUntilEvent}d`
            : decisionScore !== null
              ? `${Math.round(decisionScore)}%`
              : '—'
        }
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">{label}</p>
      <p className="mt-1 text-lg font-black tracking-tight text-white">{value}</p>
    </div>
  )
}

function ZoneNext({
  hasWearable,
  latestVideoReport,
  missingDataCount,
  unreadCoachComments,
}: {
  hasWearable: boolean
  latestVideoReport?: VideoAnalysisReportSummary | null
  missingDataCount: number
  unreadCoachComments: number
}) {
  // Coach feedback wins all other priorities — this is Vineet's "single biggest differentiator".
  if (unreadCoachComments > 0 && latestVideoReport) {
    return (
      <NextRow
        href={`/athlete/scan/report/${latestVideoReport.id}`}
        icon={<TrendingUp className="h-4 w-4" />}
        title={`Coach left feedback (${unreadCoachComments})`}
        body="Your coach commented on your last scan. Open the report to see what to focus on."
        accent
      />
    )
  }
  if (!hasWearable) {
    return (
      <NextRow
        href="/athlete/integrations"
        icon={<Watch className="h-4 w-4" />}
        title="Connect a wearable"
        body="Apple Health, Health Connect, Garmin or Fitbit. The score gets sharper after one sync."
      />
    )
  }
  if (latestVideoReport) {
    return (
      <NextRow
        href={`/athlete/scan/report/${latestVideoReport.id}`}
        icon={<TrendingUp className="h-4 w-4" />}
        title="Review your last scan"
        body={`Faults: ${latestVideoReport.visionFaults?.length ?? 0}. Take the prescribed drills into today's warm-up.`}
      />
    )
  }
  if (missingDataCount > 0) {
    return (
      <NextRow
        href="/athlete/checkin"
        icon={<ClipboardCheck className="h-4 w-4" />}
        title="Boost score accuracy"
        body={`${missingDataCount} signals are estimated. Take the 10-second check-in to swap them for measured data.`}
      />
    )
  }
  return (
    <NextRow
      href="/athlete/scan"
      icon={<ScanLine className="h-4 w-4" />}
      title="Run a movement scan"
      body="Record a clip — squat, sprint, or sport-specific. The engine flags faults and prescribes drills."
    />
  )
}

function NextRow({
  href,
  icon,
  title,
  body,
  accent = false,
}: {
  href: string
  icon: React.ReactNode
  title: string
  body: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className={
        accent
          ? 'flex items-start gap-4 rounded-2xl border border-[var(--persona-accent)]/35 bg-[var(--persona-accent-soft)] p-4 transition hover:brightness-110'
          : 'flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]'
      }
    >
      <span
        className={
          accent
            ? 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--persona-accent)]/25 text-[var(--persona-accent)]'
            : 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--saffron)]/15 text-[var(--saffron)]'
        }
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{body}</p>
      </div>
    </Link>
  )
}

function EmptyState({ onboardingV2 }: { onboardingV2?: OnboardingV2Snapshot | null }) {
  const checkinHref = onboardingV2?.hasV2Data ? '/onboarding/daily-ritual' : '/athlete/checkin'
  return (
    <PerformanceShell
      role="athlete"
      decision={
        <div className="flex flex-col items-center text-center">
          <ReadinessOrb score={0} status="Awaiting Check-In" isLoading />
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
            Your sports scientist is ready
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/55">
            Take the 10-second check-in. Energy, body, mind. That&apos;s all the engine needs to make today&apos;s call.
          </p>
          <Link
            href={checkinHref}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--saffron)] px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_0_30px_var(--saffron-glow)]"
          >
            <ClipboardCheck className="h-4 w-4" /> Start check-in
          </Link>
        </div>
      }
      plan={<EmptyHint title="Today's plan" body="Plan locks in after the first check-in." />}
      week={<EmptyHint title="This week" body="Trends start appearing after 3 days of data." />}
      next={<EmptyHint title="Next" body="Connect a wearable any time to make the score sharper." />}
      extra={onboardingV2?.hasV2Data ? <CalibrationCard snapshot={onboardingV2} /> : null}
    />
  )
}

function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{title}</p>
      <p className="mt-2 text-sm text-white/45">{body}</p>
    </div>
  )
}
