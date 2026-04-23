import Link from 'next/link'
import { ArrowRight, Camera, ShieldAlert, Sparkles, Video } from 'lucide-react'

import type { VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'
import { canonicalizeSportId } from '@/lib/video-analysis/catalog'
import { MAX_VIDEO_ANALYSIS_SECONDS, MIN_VIDEO_ANALYSIS_SECONDS } from '@/lib/video-analysis/clipValidation'

interface Props {
  role: 'athlete' | 'individual'
  latestReport: VideoAnalysisReportSummary | null
  preferredSport?: string | null
  className?: string
}

function scoreTone(score: number) {
  if (score >= 86) return 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10'
  if (score >= 70) return 'text-amber-200 border-amber-500/20 bg-amber-500/10'
  return 'text-red-200 border-red-500/20 bg-red-500/10'
}

export function VideoAnalysisSummaryCard({ role, latestReport, preferredSport, className = '' }: Props) {
  const preferredQuery = canonicalizeSportId(preferredSport || latestReport?.sportId || '')
  const scanHref = preferredQuery ? `/${role}/scan?sport=${preferredQuery}` : `/${role}/scan`
  const reportHref = latestReport ? `/${role}/scan/report/${latestReport.id}` : scanHref

  return (
    <div className={`rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Video Analysis</p>
          <h3 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white">
            {role === 'athlete' ? 'Scan the movement, not just the stats' : 'See how your body actually moves'}
          </h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-xl">
            CREEDA only accepts clips with clear human movement for the selected sport, then turns the usable ones into correction drills and next-session guidance.
          </p>
        </div>
        <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 items-center justify-center text-orange-300">
          <Video className="h-5 w-5" />
        </div>
      </div>

      {latestReport ? (
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${scoreTone(latestReport.summary.score)}`}>
              {latestReport.summary.score}% movement score
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/[0.08] bg-white/[0.03] text-slate-300">
              {latestReport.sportLabel}
            </span>
            {latestReport.subjectPosition && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/[0.08] bg-white/[0.03] text-slate-400">
                {latestReport.subjectPosition}
              </span>
            )}
          </div>

          <p className="mt-3 text-sm font-semibold text-white">{latestReport.summary.headline}</p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {latestReport.recommendations[0]?.reason || latestReport.summary.coachSummary}
          </p>

          {latestReport.summary.validation && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ValidationPill label="Reps" value={latestReport.summary.validation.repEstimate === null ? '--' : String(latestReport.summary.validation.repEstimate)} />
              <ValidationPill label="Tempo" value={latestReport.summary.validation.tempoLabel} />
              <ValidationPill label="Execution" value={`${latestReport.summary.validation.executionScore}%`} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={reportHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-4 py-2.5 text-xs font-bold hover:brightness-110 transition-all"
            >
              View report
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={scanHref}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/[0.06] transition-all"
            >
              Scan again
              <Camera className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/[0.08] bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">No scan on file yet</p>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Record a {MIN_VIDEO_ANALYSIS_SECONDS}-{MAX_VIDEO_ANALYSIS_SECONDS} second clip and CREEDA will build a movement report with technical faults, injury-risk signals, and correction drills.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={scanHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-black hover:brightness-110 transition-all"
            >
              Start scan
              <Camera className="h-3.5 w-3.5" />
            </Link>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-slate-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              Uses on-device biomechanical detection
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ValidationPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-black capitalize text-white">{value}</p>
    </div>
  )
}
