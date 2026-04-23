import Link from 'next/link'
import { Camera, CheckCircle2, Target, Zap } from 'lucide-react'

import { buildSkillIntelligenceSnapshot } from '@/lib/product'
import type { VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'

interface Props {
  role: 'athlete' | 'individual'
  latestReport: VideoAnalysisReportSummary | null
  preferredSport?: string | null
}
function tone(status: ReturnType<typeof buildSkillIntelligenceSnapshot>['status']) {
  if (status === 'corrective') return 'border-red-500/20 bg-red-500/8 text-red-100'
  if (status === 'watch') return 'border-amber-500/20 bg-amber-500/8 text-amber-100'
  if (status === 'baseline') return 'border-emerald-500/20 bg-emerald-500/8 text-emerald-100'
  return 'border-white/[0.08] bg-white/[0.02] text-slate-300'
}

export function SkillIntelligencePanel({ role, latestReport, preferredSport }: Props) {
  const snapshot = buildSkillIntelligenceSnapshot(latestReport)
  const query = preferredSport ? `?sport=${encodeURIComponent(preferredSport)}` : ''
  const scanHref = `/${role}/scan${query}`

  return (
    <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Skill Intelligence
          </p>
          <h3 className="mt-3 text-xl font-bold tracking-tight text-white">
            {snapshot.headline}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {snapshot.planAdjustment}
          </p>
        </div>
        <div className={`min-w-[142px] rounded-2xl border px-4 py-3 ${tone(snapshot.status)}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Scan state</p>
          <p className="mt-2 text-2xl font-black text-white">
            {snapshot.score === null ? '--' : `${snapshot.score}%`}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] opacity-80">
            {snapshot.status.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <Target className="h-4 w-4 text-[var(--chakra-neon)]" />
            Priority Areas
          </div>

          <div className="mt-4 space-y-3">
            {snapshot.priorityAreas.length > 0 ? (
              snapshot.priorityAreas.slice(0, 3).map((area) => (
                <div key={area.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-white">{area.label}</p>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      {area.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{area.reason}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-sm text-slate-400">
                  Technique priorities will appear after the first accepted movement scan.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <Zap className="h-4 w-4 text-[var(--saffron)]" />
            Correction Loop
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {snapshot.targetedDrills.length > 0 ? (
              snapshot.targetedDrills.slice(0, 6).map((drill) => (
                <span
                  key={drill}
                  className="rounded-full border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--chakra-neon)]"
                >
                  {drill}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Awaiting scan
              </span>
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            {snapshot.nextScanStandard}
          </p>
          <Link
            href={scanHref}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--saffron)] px-4 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:brightness-110"
          >
            {latestReport ? <CheckCircle2 className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {latestReport ? 'Re-scan' : 'Record scan'}
          </Link>
        </div>
      </div>
    </section>
  )
}
