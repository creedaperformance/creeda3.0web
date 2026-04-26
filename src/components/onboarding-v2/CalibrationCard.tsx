'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'

import {
  ONBOARDING_V2_DAY_LABELS,
  type OnboardingV2Snapshot,
  type Phase2DayKey,
  type WeakLinkSummary,
} from '@/lib/onboarding-v2/types'
import { ReminderToggle } from './ReminderToggle'

const TIER_LABEL: Record<'low' | 'medium' | 'high' | 'locked', string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  locked: 'Locked',
}

const TIER_ACCENT: Record<'low' | 'medium' | 'high' | 'locked', string> = {
  low: 'bg-amber-400',
  medium: 'bg-sky-400',
  high: 'bg-emerald-400',
  locked: 'bg-violet-400',
}

const TIER_TEXT: Record<'low' | 'medium' | 'high' | 'locked', string> = {
  low: 'text-amber-300',
  medium: 'text-sky-300',
  high: 'text-emerald-300',
  locked: 'text-violet-300',
}

const SEVERITY_LABEL: Record<WeakLinkSummary['severity'], string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
}

const SEVERITY_TEXT: Record<WeakLinkSummary['severity'], string> = {
  mild: 'text-white/55',
  moderate: 'text-amber-300',
  severe: 'text-rose-300',
}

interface CalibrationCardProps {
  snapshot: OnboardingV2Snapshot
  showHeader?: boolean
  className?: string
}

export function CalibrationCard({ snapshot, showHeader = true, className }: CalibrationCardProps) {
  if (!snapshot.hasV2Data) return null

  const persona = snapshot.persona ?? 'individual'
  const isCoach = persona === 'coach'
  const calibrationPct = Math.max(0, Math.min(100, snapshot.calibrationPct))
  const tier = snapshot.latestReadiness?.tier ?? 'low'
  const accent = TIER_ACCENT[tier]
  const tierText = TIER_TEXT[tier]
  const tierLabel = TIER_LABEL[tier]
  const ritualHref = '/onboarding/daily-ritual'
  const phase2Href = snapshot.phase2.nextDay
    ? `/onboarding/phase-2?day=${snapshot.phase2.nextDay}`
    : '/onboarding/phase-2'
  const scanHref = `/${persona}/scan/analyze?sport=other&baseline=onboarding_v2&source=web`

  const topWeakLink = pickTopWeakLink(snapshot.latestMovementBaseline?.weakLinks ?? [])

  return (
    <section
      className={
        className ??
        'rounded-[28px] border border-white/[0.06] bg-[#0F1015] p-5 sm:p-6 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
      }
      data-testid="onboarding-v2-calibration-card"
      data-persona={persona}
    >
      {showHeader ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              {isCoach ? 'Coach profile calibration' : 'Profile calibration'}
            </p>
            <h3 className="mt-1 text-lg font-black tracking-tight">
              {calibrationPct}% calibrated{snapshot.latestReadiness ? ` · ${tierLabel} confidence` : ''}
            </h3>
          </div>
          <ConfidenceDot tier={tier} />
        </div>
      ) : null}

      <CalibrationMeter pct={calibrationPct} accent={accent} />

      {!isCoach && !snapshot.dailyCheckIn.hasToday ? (
        <CheckInReminderRail
          streakDays={snapshot.dailyCheckIn.streakDays}
          ritualHref={ritualHref}
        />
      ) : null}

      {snapshot.modifiedMode ? <ModifiedModeBanner /> : null}

      {isCoach ? (
        <CoachContinueOnboardingCta
          phase={snapshot.onboardingPhase}
          calibrationPct={calibrationPct}
        />
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {snapshot.latestReadiness ? (
              <ReadinessTile
                score={snapshot.latestReadiness.score}
                tier={tier}
                tierLabel={tierLabel}
                tierText={tierText}
                confidencePct={snapshot.latestReadiness.confidencePct}
                directive={snapshot.latestReadiness.directive}
                missing={snapshot.latestReadiness.missing}
                modifiedMode={snapshot.modifiedMode}
              />
            ) : (
              <ReadinessEmptyTile />
            )}

            <CheckInTile
              streakDays={snapshot.dailyCheckIn.streakDays}
              hasToday={snapshot.dailyCheckIn.hasToday}
              ritualHref={ritualHref}
            />
          </div>

          {topWeakLink ? (
            <AhaTile weakLink={topWeakLink} href={scanHref} />
          ) : snapshot.latestMovementBaseline === null && snapshot.onboardingPhase >= 1 ? (
            <ScanCta href={scanHref} />
          ) : null}

          <Phase2Progress
            daysCompleted={snapshot.phase2.daysCompleted}
            totalDays={snapshot.phase2.totalDays}
            nextDay={snapshot.phase2.nextDay}
            completed={snapshot.phase2.completed}
            href={phase2Href}
          />

          {snapshot.reminderSubscription.vapidPublicKey ? (
            <ReminderToggle
              initiallyActive={snapshot.reminderSubscription.hasActive}
              vapidPublicKey={snapshot.reminderSubscription.vapidPublicKey}
            />
          ) : null}
        </>
      )}
    </section>
  )
}

function CoachContinueOnboardingCta({
  phase,
  calibrationPct,
}: {
  phase: number
  calibrationPct: number
}) {
  if (phase >= 1 && calibrationPct >= 25) {
    return (
      <p className="mt-4 text-xs leading-relaxed text-white/55">
        Coach setup complete. Squad readiness rolls up below as athletes finish their own
        calibration.
      </p>
    )
  }
  return (
    <Link
      href="/onboarding"
      className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          Finish coach onboarding
        </p>
        <p className="mt-1 text-sm font-bold text-white">
          A few more questions to unlock squad triage and protocol templates.
        </p>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-white/40" />
    </Link>
  )
}

function CalibrationMeter({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div className="mt-4">
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`absolute inset-y-0 left-0 ${accent} rounded-full transition-[width] duration-700`}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
        <span>0%</span>
        <span>{pct}%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

function ConfidenceDot({ tier }: { tier: 'low' | 'medium' | 'high' | 'locked' }) {
  const fill = TIER_ACCENT[tier]
  return (
    <span
      className="relative inline-flex h-3 w-3 items-center justify-center"
      title={`${TIER_LABEL[tier]} confidence`}
      aria-label={`${TIER_LABEL[tier]} confidence`}
    >
      <span className={`absolute inset-0 ${fill} rounded-full opacity-30 motion-safe:animate-ping`} />
      <span className={`relative h-3 w-3 ${fill} rounded-full`} />
    </span>
  )
}

function CheckInReminderRail({
  streakDays,
  ritualHref,
}: {
  streakDays: number
  ritualHref: string
}) {
  const dayWord = streakDays === 1 ? 'day' : 'days'
  return (
    <Link
      href={ritualHref}
      className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--saffron,_#FF7A1A)]/30 bg-[var(--saffron,_#FF7A1A)]/[0.06] p-3 transition hover:bg-[var(--saffron,_#FF7A1A)]/[0.1]"
    >
      <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--saffron,_#FF7A1A)]/15 text-[var(--saffron,_#FF7A1A)]">
        <span
          aria-hidden
          className="absolute inset-0 rounded-xl bg-[var(--saffron,_#FF7A1A)]/30 motion-safe:animate-ping"
        />
        <ClipboardCheck className="relative h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Today’s check-in is open</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">
          {streakDays > 0
            ? `You’re on a ${streakDays}-${dayWord} streak. Keep it going — three taps.`
            : 'Three taps — energy, body, mind. Recalibrates today’s plan.'}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-white/55" />
    </Link>
  )
}

function ModifiedModeBanner() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-3">
      <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
      <div className="text-xs leading-relaxed text-amber-100/85">
        <p className="font-bold text-amber-200">Modified mode is on.</p>
        <p className="mt-0.5 text-amber-100/70">
          Your safety screen flagged something to discuss with a doctor before high-intensity work.
          Creeda will keep recommendations conservative until you mark yourself cleared in Settings →
          Health.
        </p>
      </div>
    </div>
  )
}

function ReadinessTile({
  score,
  tier,
  tierLabel,
  tierText,
  confidencePct,
  directive,
  missing,
  modifiedMode,
}: {
  score: number
  tier: 'low' | 'medium' | 'high' | 'locked'
  tierLabel: string
  tierText: string
  confidencePct: number
  directive: string
  missing: string[]
  modifiedMode: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          Calibrated readiness
        </p>
        <span className={`text-[10px] font-bold uppercase tracking-[0.22em] ${tierText}`}>
          {tierLabel} · {confidencePct}%
        </span>
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight">
        {score}
        <span className="ml-1 text-base font-bold text-white/40">/100</span>
      </p>
      {directive ? (
        <p className="mt-1.5 text-xs leading-relaxed text-white/60">
          {modifiedMode ? 'Capped at maintain — ' : ''}
          {directive}
        </p>
      ) : null}
      {missing.length > 0 && tier !== 'locked' ? (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            What would sharpen this
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-white/55">
            {missing.slice(0, 3).map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-white/30" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function ReadinessEmptyTile() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        Calibrated readiness
      </p>
      <p className="mt-2 text-sm text-white/55">
        Finish your performance fingerprint and the engine starts producing a calibrated daily score.
      </p>
    </div>
  )
}

function CheckInTile({
  streakDays,
  hasToday,
  ritualHref,
}: {
  streakDays: number
  hasToday: boolean
  ritualHref: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          Daily check-in
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">
          <Flame className="h-3 w-3" /> {streakDays}d
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/65">
        {hasToday
          ? 'Logged today. Tomorrow keeps the streak alive.'
          : 'Three taps — energy, body, mind. Recalibrates today’s plan.'}
      </p>
      <Link
        href={ritualHref}
        className={
          hasToday
            ? 'mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.08]'
            : 'mt-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--saffron,_#FF7A1A)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:brightness-110'
        }
      >
        <ClipboardCheck className="h-4 w-4" />
        {hasToday ? 'View today’s log' : 'Log check-in'}
      </Link>
    </div>
  )
}

function AhaTile({ weakLink, href }: { weakLink: WeakLinkSummary; href: string }) {
  const sevText = SEVERITY_TEXT[weakLink.severity]
  return (
    <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
            Found something to watch
          </p>
          <p className="mt-1 text-sm font-bold leading-snug text-white">{weakLink.finding}</p>
          <p className={`mt-1 text-[11px] font-bold uppercase tracking-[0.18em] ${sevText}`}>
            {SEVERITY_LABEL[weakLink.severity]} · {weakLink.region.replace(/_/g, ' ')}
          </p>
          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300 transition hover:text-emerald-200"
          >
            Open scan report <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function ScanCta({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mt-3 flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--saffron,_#FF7A1A)]/15 text-[var(--saffron,_#FF7A1A)]">
        <ScanLine className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-bold text-white">Run your overhead-squat baseline</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          One 30-second scan. Unlocks the first body-specific finding and bumps your calibration.
        </p>
      </div>
      <ArrowRight className="mt-3 h-4 w-4 flex-shrink-0 text-white/40" />
    </Link>
  )
}

function Phase2Progress({
  daysCompleted,
  totalDays,
  nextDay,
  completed,
  href,
}: {
  daysCompleted: number
  totalDays: number
  nextDay: Phase2DayKey | null
  completed: boolean
  href: string
}) {
  if (completed) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-3">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-300" />
        <p className="text-xs leading-relaxed text-white/70">
          Phase 2 diagnostic complete. Re-tests scheduled at Day 28 to lock confidence.
        </p>
      </div>
    )
  }

  if (!nextDay) return null

  return (
    <Link
      href={href}
      className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          Continue calibration · {daysCompleted}/{totalDays}
        </p>
        <p className="mt-1 truncate text-sm font-bold text-white">
          Next: {ONBOARDING_V2_DAY_LABELS[nextDay]}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/50">
          Each day takes ~2 minutes and adds measurable inputs to your readiness model.
        </p>
      </div>
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--saffron,_#FF7A1A)]/15 text-[var(--saffron,_#FF7A1A)]">
        <Activity className="h-4 w-4" />
      </span>
    </Link>
  )
}

function pickTopWeakLink(weakLinks: WeakLinkSummary[]): WeakLinkSummary | null {
  if (weakLinks.length === 0) return null
  const order: Record<WeakLinkSummary['severity'], number> = { severe: 0, moderate: 1, mild: 2 }
  return [...weakLinks].sort((a, b) => order[a.severity] - order[b.severity])[0] ?? null
}
