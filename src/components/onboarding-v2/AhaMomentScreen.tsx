'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Sparkles, Wrench } from 'lucide-react'
import type { Persona } from '@creeda/schemas'

import type { WeakLinkSummary } from '@/lib/onboarding-v2/types'

export function AhaMomentScreen({
  persona,
  movementQualityScore,
  weakLinks,
  nextHref,
  exitHref,
}: {
  persona: Persona
  movementQualityScore: number | null
  weakLinks: WeakLinkSummary[]
  nextHref: string
  exitHref: string
}) {
  const sortedLinks = [...weakLinks].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
  const topFinding = sortedLinks[0]

  if (!topFinding) {
    return (
      <section className="rounded-3xl border border-emerald-300/25 bg-emerald-300/[0.05] p-6">
        <Sparkles className="h-6 w-6 text-emerald-300" />
        <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
          We did not find any red flags in your scan.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
          Your overhead-squat baseline came back clean. Movement quality is{' '}
          <span className="font-black text-white">{movementQualityScore ?? '—'}/100</span>. Creeda
          will retest in 4 weeks to track drift, and your daily check-in starts tonight.
        </p>
        <FooterLinks nextHref={nextHref} exitHref={exitHref} primary="Begin Day 1" />
      </section>
    )
  }

  const sub = sortedLinks[1]

  return (
    <section className="rounded-3xl border border-[#6ee7b7]/25 bg-[#6ee7b7]/[0.04] p-6">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
        <Sparkles className="h-3.5 w-3.5" />
        We found something to watch
      </div>

      <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
        {topFinding.finding}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
        <span
          className={
            topFinding.severity === 'severe'
              ? 'rounded-full border border-rose-400/50 bg-rose-400/15 px-2.5 py-1 text-rose-200'
              : topFinding.severity === 'moderate'
                ? 'rounded-full border border-amber-300/50 bg-amber-300/15 px-2.5 py-1 text-amber-200'
                : 'rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-white/55'
          }
        >
          {severityLabel(topFinding.severity)}
        </span>
        <span className="text-white/40">·</span>
        <span className="text-white/55">{topFinding.region.replace(/_/g, ' ')}</span>
        {movementQualityScore !== null ? (
          <>
            <span className="text-white/40">·</span>
            <span className="text-white/55">
              Movement quality {movementQualityScore}/100
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/72">
        This kind of pattern is a yellow flag for downstream injury risk. Creeda will work it into
        your warm-ups and re-test in 4 weeks to confirm the change.
      </p>

      {sub ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-white/55" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Also noted
            </p>
            <p className="mt-1 text-sm text-white/72">{sub.finding}</p>
          </div>
        </div>
      ) : null}

      {sortedLinks.length > 2 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.18em] text-white/45 hover:text-white/65">
            See full list ({sortedLinks.length} total)
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-white/55">
            {sortedLinks.slice(2).map((link, idx) => (
              <li key={`${link.region}-${idx}`} className="flex items-start gap-2">
                <span aria-hidden className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-white/30" />
                <span>{link.finding}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        <p className="mt-2 text-sm font-bold text-white">
          Today&apos;s focus: set up your morning check-in.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55">
          {persona === 'individual'
            ? 'Three taps tomorrow morning. We learn your normal in a week.'
            : 'Three taps every morning — energy, body, mind. We watch this pattern weekly and re-test in 4 weeks.'}
        </p>
      </div>

      <FooterLinks nextHref={nextHref} exitHref={exitHref} primary="Begin Day 1" />
    </section>
  )
}

function FooterLinks({
  nextHref,
  exitHref,
  primary,
}: {
  nextHref: string
  exitHref: string
  primary: string
}) {
  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
      <Link
        href={nextHref}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110"
      >
        {primary}
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href={exitHref}
        className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 px-5 text-sm font-bold text-white/65 transition hover:bg-white/[0.06]"
      >
        Save & exit
      </Link>
    </div>
  )
}

function severityLabel(severity: 'mild' | 'moderate' | 'severe') {
  switch (severity) {
    case 'severe':
      return 'Severe'
    case 'moderate':
      return 'Moderate'
    case 'mild':
      return 'Mild'
  }
}

function severityRank(severity: 'mild' | 'moderate' | 'severe') {
  switch (severity) {
    case 'severe':
      return 0
    case 'moderate':
      return 1
    case 'mild':
      return 2
  }
}
