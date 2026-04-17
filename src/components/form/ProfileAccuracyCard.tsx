'use client'

import Link from 'next/link'

import {
  buildAdaptiveEntryHref,
  PROFILE_ACCURACY_CARD_SOURCE,
} from '@/forms/analytics'
import type { AdaptiveProfileSummary } from '@/forms/types'

interface ProfileAccuracyCardProps {
  summary: AdaptiveProfileSummary | null
  title: string
  body: string
  ctaHref: string
  ctaLabel: string
}

export function ProfileAccuracyCard({
  summary,
  title,
  body,
  ctaHref,
  ctaLabel,
}: ProfileAccuracyCardProps) {
  const trackedHref = buildAdaptiveEntryHref(ctaHref, {
    entrySource: PROFILE_ACCURACY_CARD_SOURCE,
    entryMode: 'enrichment',
  })

  const confidenceTone =
    summary?.confidenceLevel === 'high'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
      : summary?.confidenceLevel === 'medium'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
        : 'border-sky-500/20 bg-sky-500/10 text-sky-200'

  const nextItems =
    summary?.nextQuestionLabels?.length
      ? summary.nextQuestionLabels.slice(0, 2)
      : summary?.confidenceRecommendations?.length
        ? summary.confidenceRecommendations.slice(0, 2)
        : ['Add one more useful detail to sharpen personalization.']

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Accuracy Layer
          </p>
          <h3 className="mt-2 text-lg font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
        </div>

        <div className={`rounded-2xl border px-3 py-2 text-right ${confidenceTone}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.22em]">Confidence</p>
          <p className="mt-1 text-lg font-black">{summary?.confidenceScore ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Profile completion" value={`${summary?.completionScore ?? 0}%`} />
        <Metric label="Confidence level" value={(summary?.confidenceLevel ?? 'low').toUpperCase()} />
        <Metric label="Next unlocks" value={String(summary?.nextQuestionIds?.length ?? nextItems.length)} />
        <Metric
          label="Last updated"
          value={summary?.updatedAt ? summary.updatedAt.slice(0, 10) : 'Today'}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Best next questions
        </p>
        <div className="mt-3 space-y-2">
          {nextItems.map((item) => (
            <p key={item} className="text-sm leading-relaxed text-slate-300">
              {item}
            </p>
          ))}
        </div>
      </div>

      <Link
        href={trackedHref}
        className="inline-flex rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  )
}
