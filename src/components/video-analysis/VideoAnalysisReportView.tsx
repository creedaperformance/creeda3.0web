import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Award, ChevronRight, Info, ShieldCheck, Target, Zap } from 'lucide-react'

import type { VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'

interface Props {
  report: VideoAnalysisReportSummary
  dashboardHref: string
  scanHref: string
  subjectName?: string | null
  shell?: 'dashboard' | 'standalone'
}

function scoreTone(score: number) {
  if (score >= 86) return 'text-emerald-300'
  if (score >= 70) return 'text-amber-300'
  return 'text-red-300'
}

export function VideoAnalysisReportView({
  report,
  dashboardHref,
  scanHref,
  subjectName,
}: Props) {
  const totalEvents = report.positive + report.warnings

  return (
    <div className="min-h-screen text-white pt-14 pb-24 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href={scanHref} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Video Analysis <span className="text-orange-300">Action Plan</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              {subjectName ? `${subjectName} • ` : ''}{report.sportLabel} • {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Target className="h-24 w-24 text-orange-300" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Movement Score</p>
            <div className="flex items-end gap-3">
              <h2 className={`text-6xl font-black ${scoreTone(report.summary.score)}`}>{report.summary.score}%</h2>
              <div className="pb-2">
                <p className="text-xs font-bold text-white/20 uppercase tracking-tighter">{report.summary.status}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300 max-w-lg">{report.summary.headline}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Frames" value={String(report.frameCount)} />
            <MetricCard label="Corrections" value={String(report.warnings)} />
            <MetricCard label="Positive Reads" value={String(report.positive)} />
            <MetricCard label="Tracked Events" value={String(totalEvents)} />
          </div>
        </div>

        <div className="mb-10 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-300" /> Coaching Readout
          </h3>
          <p className="text-sm leading-7 text-slate-300 max-w-4xl">{report.summary.coachSummary}</p>
        </div>

        <div className="mb-10">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 mb-5 flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-300" /> Recommended Corrections
          </h3>

          <div className="space-y-4">
            {report.recommendations.length === 0 ? (
              <div className="p-8 rounded-3xl bg-green-500/5 border border-green-500/10 text-center">
                <Award className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-green-100">Stable pattern detected</h4>
                <p className="text-sm text-green-400/60 mt-1">
                  No major technical deviations were detected in this clip. Save this as a reference pattern.
                </p>
              </div>
            ) : (
              report.recommendations.map((recommendation) => (
                <div
                  key={`${recommendation.title}-${recommendation.priority}`}
                  className="group p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] hover:border-orange-500/30 transition-all flex items-start gap-4"
                >
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                    <ShieldCheck className="h-6 w-6 text-orange-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-white group-hover:text-orange-300 transition-colors">
                        {recommendation.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {recommendation.priority}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">{recommendation.reason}</p>
                    {recommendation.correctionCue ? (
                      <p className="mt-3 text-xs text-orange-100/85 leading-relaxed">
                        <span className="font-bold text-orange-300">Correction cue:</span> {recommendation.correctionCue}
                      </p>
                    ) : null}
                    {recommendation.nextRepFocus ? (
                      <p className="mt-2 text-xs text-sky-100/70 leading-relaxed">
                        <span className="font-bold text-sky-300">Re-scan standard:</span> {recommendation.nextRepFocus}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recommendation.drills.map((drill) => (
                        <span
                          key={drill}
                          className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-300"
                        >
                          {drill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-white transition-colors self-center" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 mb-5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-300" /> Fault Trace
            </h3>

            <div className="space-y-3">
              {report.visionFaults.length > 0 ? (
                report.visionFaults.map((fault) => (
                  <div key={`${fault.fault}-${fault.timestamp || fault.riskMapping}`} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{fault.fault}</p>
                      <span className="px-2 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {fault.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">{fault.riskMapping}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
                      Confidence {Math.round((fault.confidence || 0) * 100)}%
                    </p>
                    {fault.correctiveDrills.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {fault.correctiveDrills.slice(0, 3).map((drill) => (
                          <span
                            key={drill}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-300"
                          >
                            {drill}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/[0.08] bg-black/20 p-5 text-sm text-slate-500">
                  No structured fault rows were stored for this report.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 mb-5 flex items-center gap-2">
              <Info className="h-4 w-4 text-orange-300" /> Feedback Log
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {report.feedbackLog.length > 0 ? (
                report.feedbackLog.map((event, index) => (
                  <div key={`${event.message}-${index}`} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${event.isError ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      <p className={`text-xs font-semibold ${event.isError ? 'text-red-100' : 'text-emerald-100'}`}>
                        {event.message}
                      </p>
                    </div>
                    {typeof event.timestampMs === 'number' && (
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
                        {Math.floor(event.timestampMs / 1000)}.{String(event.timestampMs % 1000).padStart(3, '0')}s
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/[0.08] bg-black/20 p-5 text-sm text-slate-500">
                  No event log was stored for this report.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href={scanHref}
            className="h-14 rounded-2xl bg-white/[0.05] text-white font-bold text-sm hover:bg-white/10 flex items-center justify-center"
          >
            New Analysis
          </Link>
          <Link
            href={dashboardHref}
            className="h-14 rounded-2xl bg-orange-500 text-black font-bold text-sm hover:brightness-110 flex items-center justify-center"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-3xl font-black text-white/90">{value}</p>
    </div>
  )
}
