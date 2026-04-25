'use client'

import Link from 'next/link'
import { Activity, ClipboardCheck, ScanLine, Watch } from 'lucide-react'

import { ReadinessOrb } from '@/components/neon/ReadinessOrb'
import { PerformanceShell } from '@/components/performance-view/PerformanceShell'
import { buildDirective, type SportContext } from '@/components/performance-view/directives'
import type { IndividualDashboardSnapshot } from '@/lib/dashboard_decisions'
import type { AdaptiveProfileSummary } from '@/forms/types'

interface IndividualPerformanceViewProps {
  profile: Record<string, unknown>
  snapshot: IndividualDashboardSnapshot
  adaptiveProfile: AdaptiveProfileSummary | null
}

function inferSport(snapshot: IndividualDashboardSnapshot): SportContext {
  const raw = String(snapshot.sport || '').toLowerCase()
  if (raw.includes('cricket')) return 'cricket'
  if (raw.includes('football') || raw.includes('soccer')) return 'football'
  if (raw.includes('badminton')) return 'badminton'
  if (raw.includes('run') || raw.includes('athletic')) return 'athletics'
  if (raw.includes('strength') || raw.includes('gym') || raw.includes('lift')) return 'strength'
  return 'general'
}

function intensityToAction(intensity: 'low' | 'moderate' | 'high', score: number) {
  if (score < 35) return 'recovery_focus' as const
  if (score < 50) return 'mobility_only' as const
  if (intensity === 'high') return 'train_hard' as const
  if (intensity === 'low') return 'mobility_only' as const
  return 'train_light' as const
}

export function IndividualPerformanceView({
  snapshot,
  profile,
}: IndividualPerformanceViewProps) {
  const decision = snapshot.decision
  const score = snapshot.readinessScore
  const sport = inferSport(snapshot)

  if (!decision) {
    return <EmptyIndividualView name={String(profile.full_name || 'there')} />
  }

  const action = intensityToAction(decision.today.intensity, score)
  const directive = buildDirective({
    persona: 'individual',
    action,
    sport,
    streakDays: 0,
  })

  return (
    <PerformanceShell
      role="individual"
      sport={sport}
      decision={
        <ZoneIndividualHero
          score={score}
          headline={directive.headline}
          whyLine={decision.explanation || directive.whyLine}
          directionLabel={decision.directionLabel}
        />
      }
      plan={
        <ZoneIndividualPlan
          focus={decision.today.todayFocus}
          intensity={decision.today.intensity}
          duration={decision.today.sessionDurationMinutes}
          whatToDo={decision.today.whatToDo}
          recoveryActions={decision.today.recoveryActions}
        />
      }
      week={
        <ZoneIndividualWeek
          adherencePct={decision.weekly.adherencePct}
          averageReadiness={decision.weekly.averageReadiness}
          trend={decision.weekly.trend}
          peakWeeks={decision.peak.weeksRemaining}
        />
      }
      next={<ZoneIndividualNext snapshot={snapshot} />}
    />
  )
}

function ZoneIndividualHero({
  score,
  headline,
  whyLine,
  directionLabel,
}: {
  score: number
  headline: string
  whyLine: string
  directionLabel: string
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <ReadinessOrb score={score} status={directionLabel} />
      <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
        {headline}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">{whyLine}</p>
      <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#3DDC97]">
        {directionLabel}
      </div>
    </div>
  )
}

function ZoneIndividualPlan({
  focus,
  intensity,
  duration,
  whatToDo,
  recoveryActions,
}: {
  focus: string
  intensity: 'low' | 'moderate' | 'high'
  duration: number
  whatToDo: string[]
  recoveryActions: string[]
}) {
  const items = whatToDo.length > 0 ? whatToDo.slice(0, 3) : recoveryActions.slice(0, 3)
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Today</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          {duration} min · {intensity}
        </p>
      </div>
      <h2 className="mt-2 text-xl font-black tracking-tight text-white">{focus}</h2>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm text-white/65">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-[#3DDC97]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/individual/sessions/today"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3DDC97] px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:brightness-110"
        >
          <Activity className="h-4 w-4" /> Start session
        </Link>
        <Link
          href="/individual/logging"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/[0.06]"
        >
          <ClipboardCheck className="h-4 w-4" /> Log how I feel
        </Link>
      </div>
    </div>
  )
}

function ZoneIndividualWeek({
  adherencePct,
  averageReadiness,
  trend,
  peakWeeks,
}: {
  adherencePct: number
  averageReadiness: number
  trend: 'improving' | 'stable' | 'declining'
  peakWeeks: number
}) {
  const trendColor = trend === 'improving' ? 'text-[#3DDC97]' : trend === 'stable' ? 'text-white/60' : 'text-[#FFB547]'
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">This week</p>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Consistency" value={`${Math.round(adherencePct)}%`} />
        <Stat label="Avg readiness" value={`${Math.round(averageReadiness)}`} />
        <Stat label="Trend" value={trend} color={trendColor} />
        <Stat label="To peak" value={peakWeeks > 0 ? `${peakWeeks}w` : '—'} />
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">{label}</p>
      <p className={`mt-1 text-lg font-black capitalize tracking-tight ${color ?? 'text-white'}`}>{value}</p>
    </div>
  )
}

function ZoneIndividualNext({ snapshot }: { snapshot: IndividualDashboardSnapshot }) {
  if (snapshot.latestVideoReport) {
    return (
      <NextRow
        href={`/individual/scan/report/${snapshot.latestVideoReport.id}`}
        icon={<ScanLine className="h-4 w-4" />}
        title="Review your last scan"
        body={`${snapshot.latestVideoReport.visionFaults?.length ?? 0} movement faults detected. Take the corrective drills into today's session.`}
      />
    )
  }
  return (
    <NextRow
      href="/individual/scan"
      icon={<Watch className="h-4 w-4" />}
      title="Try a movement scan"
      body="Record a 5-second clip of any movement. The engine flags posture, knee tracking, and hip drop — universally, no sport required."
    />
  )
}

function NextRow({
  href,
  icon,
  title,
  body,
}: {
  href: string
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#3DDC97]/15 text-[#3DDC97]">
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{body}</p>
      </div>
    </Link>
  )
}

function EmptyIndividualView({ name }: { name: string }) {
  return (
    <PerformanceShell
      role="individual"
      decision={
        <div className="flex flex-col items-center text-center">
          <ReadinessOrb score={0} status="Awaiting check-in" isLoading />
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
            Welcome back, {name}
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/55">
            Take the 60-second pulse — energy, body feel, life load. That's enough to give you today's call.
          </p>
          <Link
            href="/individual/logging"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#3DDC97] px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black"
          >
            <ClipboardCheck className="h-4 w-4" /> Daily pulse
          </Link>
        </div>
      }
      plan={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Today</p>
          <p className="mt-2 text-sm text-white/45">A short, sustainable plan unlocks after your first check-in.</p>
        </div>
      }
      week={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">This week</p>
          <p className="mt-2 text-sm text-white/45">Streaks and consistency scores appear after 3 days of logs.</p>
        </div>
      }
      next={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Next</p>
          <p className="mt-2 text-sm text-white/45">Connect Apple Health or Health Connect any time to make the score sharper.</p>
        </div>
      }
    />
  )
}
