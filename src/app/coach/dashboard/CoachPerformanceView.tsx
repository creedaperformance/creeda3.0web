'use client'

import Link from 'next/link'
import { ClipboardList, Copy, MessageSquareQuote, Users, Video } from 'lucide-react'

import { PerformanceShell } from '@/components/performance-view/PerformanceShell'
import { buildCoachDirective } from '@/components/performance-view/directives'
import type {
  CoachOperatingSnapshot,
  CoachOperatingAthlete,
} from '@/lib/product/operating-system/types'
import type { VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'
import type { AdaptiveProfileSummary } from '@/forms/types'

type CoachVideoReport = VideoAnalysisReportSummary & { athleteName: string; athleteAvatarUrl: string | null }

interface CoachPerformanceViewProps {
  videoReports: CoachVideoReport[]
  lockerCode: string | null
  adaptiveProfile: AdaptiveProfileSummary | null
  operatingSnapshot: CoachOperatingSnapshot | null
}

function bucketAthlete(a: CoachOperatingAthlete): 'red' | 'amber' | 'green' | 'low_data' {
  if (a.readinessScore == null) return 'low_data'
  if (a.recentPainReports.length > 0 || a.injuryRiskFlags.length > 0) return 'red'
  if (a.readinessScore < 55) return 'red'
  if (a.readinessScore < 70) return 'amber'
  return 'green'
}

export function CoachPerformanceView({
  videoReports,
  lockerCode,
  operatingSnapshot,
}: CoachPerformanceViewProps) {
  const totalAthletes = (operatingSnapshot?.interventionQueue.length ?? 0) + (operatingSnapshot?.lowDataAthletes.length ?? 0)

  if (!operatingSnapshot || totalAthletes === 0) {
    return <EmptySquadView lockerCode={lockerCode} />
  }

  const queue = operatingSnapshot.interventionQueue
  const lowData = operatingSnapshot.lowDataAthletes

  const buckets = queue.reduce(
    (acc, a) => {
      const b = bucketAthlete(a)
      acc[b] = (acc[b] || 0) + 1
      return acc
    },
    { red: 0, amber: 0, green: 0, low_data: 0 } as Record<string, number>
  )
  const lowDataCount = lowData.length + (buckets.low_data || 0)

  const directive = buildCoachDirective({
    totalAthletes,
    redCount: buckets.red || 0,
    amberCount: buckets.amber || 0,
    lowDataCount,
  })

  return (
    <PerformanceShell
      role="coach"
      decision={
        <ZoneSquadPulse
          headline={directive.headline}
          whyLine={directive.whyLine}
          totalAthletes={totalAthletes}
          redCount={buckets.red || 0}
          amberCount={buckets.amber || 0}
          greenCount={buckets.green || 0}
          lowDataCount={lowDataCount}
          averageReadiness={operatingSnapshot.averageReadiness}
        />
      }
      plan={<ZoneTriage queue={queue.slice(0, 5)} lowData={lowData.slice(0, 3)} />}
      week={
        <ZoneSquadWeek
          averageCompliancePct={operatingSnapshot.averageCompliancePct}
          missedToday={lowDataCount}
          interventionCount={queue.length}
          videoQueueCount={videoReports.length}
        />
      }
      next={<ZoneCoachNext videoReports={videoReports.slice(0, 3)} lockerCode={lockerCode} />}
    />
  )
}

function ZoneSquadPulse({
  headline,
  whyLine,
  totalAthletes,
  redCount,
  amberCount,
  greenCount,
  lowDataCount,
  averageReadiness,
}: {
  headline: string
  whyLine: string
  totalAthletes: number
  redCount: number
  amberCount: number
  greenCount: number
  lowDataCount: number
  averageReadiness: number
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Squad pulse</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{headline}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">{whyLine}</p>
      <div className="mt-5 grid grid-cols-4 gap-3 sm:gap-4">
        <PulseStat color="text-[#FF3A5C]" label="Red" value={redCount} />
        <PulseStat color="text-[#FFB547]" label="Amber" value={amberCount} />
        <PulseStat color="text-[#3DDC97]" label="Green" value={greenCount} />
        <PulseStat color="text-white/40" label="Low data" value={lowDataCount} />
      </div>
      <div className="mt-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
        <Users className="h-3.5 w-3.5" /> {totalAthletes} athletes
        <span className="text-white/30">·</span>
        <span>Avg readiness {Math.round(averageReadiness)}</span>
      </div>
    </div>
  )
}

function PulseStat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">{label}</p>
    </div>
  )
}

function ZoneTriage({
  queue,
  lowData,
}: {
  queue: CoachOperatingAthlete[]
  lowData: CoachOperatingAthlete[]
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Pre-practice triage</p>
        <Link
          href="/coach/execution"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--saffron)] hover:text-[var(--saffron)]/80"
        >
          Open execution board →
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {queue.length === 0 && lowData.length === 0 ? (
          <li className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-white/55">
            No interventions needed. Hold the plan you wrote.
          </li>
        ) : null}
        {queue.map((a) => (
          <TriageRow key={a.athleteId} athlete={a} bucket={bucketAthlete(a)} />
        ))}
        {lowData.map((a) => (
          <TriageRow key={a.athleteId} athlete={a} bucket="low_data" />
        ))}
      </ul>
    </div>
  )
}

function TriageRow({
  athlete,
  bucket,
}: {
  athlete: CoachOperatingAthlete
  bucket: 'red' | 'amber' | 'green' | 'low_data'
}) {
  const tone =
    bucket === 'red' ? 'border-[#FF3A5C]/30 bg-[#FF3A5C]/[0.06]' :
    bucket === 'amber' ? 'border-[#FFB547]/30 bg-[#FFB547]/[0.06]' :
    bucket === 'low_data' ? 'border-white/10 bg-white/[0.02]' :
    'border-[#3DDC97]/20 bg-[#3DDC97]/[0.04]'
  const detail = athlete.recentPainReports[0]
    || athlete.injuryRiskFlags[0]
    || (athlete.readinessScore != null ? `Readiness ${athlete.readinessScore}` : 'No check-in today')

  return (
    <li className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${tone}`}>
      <div>
        <p className="text-sm font-bold text-white">{athlete.athleteName}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/55">{detail}</p>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
        {athlete.compliancePct != null ? <span>{Math.round(athlete.compliancePct)}%</span> : null}
        {athlete.lastSessionId ? (
          <Link
            href={`/coach/review`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/70 hover:bg-white/[0.08]"
          >
            Open
          </Link>
        ) : null}
      </div>
    </li>
  )
}

function ZoneSquadWeek({
  averageCompliancePct,
  missedToday,
  interventionCount,
  videoQueueCount,
}: {
  averageCompliancePct: number
  missedToday: number
  interventionCount: number
  videoQueueCount: number
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">This week</p>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Compliance" value={`${Math.round(averageCompliancePct)}%`} />
        <Stat label="Missed today" value={`${missedToday}`} />
        <Stat label="Interventions" value={`${interventionCount}`} />
        <Stat label="Video queue" value={`${videoQueueCount}`} />
      </div>
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

function ZoneCoachNext({
  videoReports,
  lockerCode,
}: {
  videoReports: CoachVideoReport[]
  lockerCode: string | null
}) {
  if (videoReports.length === 0) {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Next</p>
        <div className="mt-3 flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--saffron)]/15 text-[var(--saffron)]">
            <Copy className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">Invite athletes</p>
            {lockerCode ? (
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Locker code <span className="font-mono text-white">{lockerCode}</span>. Share via WhatsApp — they sign up at <span className="font-mono text-white">/join/{lockerCode}</span>.
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Generate a locker code from settings, then share via WhatsApp or email.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Video review queue</p>
        <Link
          href="/coach/review"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--saffron)] hover:text-[var(--saffron)]/80"
        >
          See all →
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {videoReports.map((r) => (
          <li key={r.id}>
            <Link
              href={`/coach/reports/${r.id}`}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:bg-white/[0.04]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--chakra-neon)]/15 text-[var(--chakra-neon)]">
                <Video className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{r.athleteName}</p>
                <p className="mt-0.5 text-xs text-white/55 truncate">
                  {r.sportLabel} · {r.visionFaults?.length ?? 0} faults · {r.summary?.headline ?? 'Review'}
                </p>
              </div>
              <MessageSquareQuote className="h-4 w-4 text-white/30" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmptySquadView({ lockerCode }: { lockerCode: string | null }) {
  return (
    <PerformanceShell
      role="coach"
      decision={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Squad pulse</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white">No athletes linked yet</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
            Once athletes connect to your squad, this becomes a live triage board. Share your locker code to onboard them in two taps.
          </p>
        </div>
      }
      plan={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Invite athletes</p>
          {lockerCode ? (
            <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">Locker code</p>
              <p className="mt-2 font-mono text-2xl font-black tracking-widest text-white">{lockerCode}</p>
              <p className="mt-3 text-xs text-white/55">
                Share <span className="font-mono">/join/{lockerCode}</span> via WhatsApp or email. Athletes sign up and auto-link to your squad.
              </p>
            </div>
          ) : (
            <Link
              href="/coach/settings"
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[var(--saffron)] px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black"
            >
              <ClipboardList className="h-4 w-4" /> Generate locker code
            </Link>
          )}
        </div>
      }
      week={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">This week</p>
          <p className="mt-2 text-sm text-white/45">Trends appear after your first three athletes log a check-in.</p>
        </div>
      }
      next={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Next</p>
          <p className="mt-2 text-sm text-white/45">Video review queue lights up as athletes upload movement scans.</p>
        </div>
      }
    />
  )
}
