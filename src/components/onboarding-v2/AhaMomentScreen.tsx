'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Share2,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type { Persona } from '@creeda/schemas'

import type { WeakLinkSummary } from '@/lib/onboarding-v2/types'
import { drillForId } from '@/lib/drills/catalog'

type Severity = 'mild' | 'moderate' | 'severe'

const SEVERITY_LABEL: Record<Severity, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
}

const SEVERITY_GLOW: Record<Severity, string> = {
  mild: 'rgba(167, 243, 208, 0.55)',
  moderate: 'rgba(252, 211, 77, 0.55)',
  severe: 'rgba(251, 113, 133, 0.65)',
}

const SEVERITY_ACCENT: Record<Severity, string> = {
  mild: '#A7F3D0',
  moderate: '#FCD34D',
  severe: '#FB7185',
}

export function AhaMomentScreen({
  persona,
  movementQualityScore,
  weakLinks,
  nextHref,
  exitHref,
  sportLabel,
  athleteHandle,
}: {
  persona: Persona
  movementQualityScore: number | null
  weakLinks: WeakLinkSummary[]
  nextHref: string
  exitHref: string
  sportLabel?: string | null
  athleteHandle?: string | null
}) {
  const sortedLinks = useMemo(
    () => [...weakLinks].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)),
    [weakLinks]
  )
  const topFinding = sortedLinks[0]

  const shareCardUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('finding', topFinding?.finding ?? 'Cleared, no red flags.')
    params.set('region', topFinding?.region ?? 'overall')
    params.set('severity', topFinding?.severity ?? 'mild')
    params.set('score', String(movementQualityScore ?? 0))
    if (sportLabel) params.set('sport', sportLabel)
    if (athleteHandle) params.set('handle', athleteHandle)
    return `/api/og/aha-card?${params.toString()}`
  }, [topFinding, movementQualityScore, sportLabel, athleteHandle])

  if (!topFinding) {
    return (
      <CinematicShell
        eyebrow="Cleared"
        eyebrowTone="#A7F3D0"
        finding="No red flags. Strong baseline."
        score={movementQualityScore}
        severity="mild"
        sportLabel={sportLabel}
        nextHref={nextHref}
        exitHref={exitHref}
        shareCardUrl={shareCardUrl}
        persona={persona}
      >
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
          Your overhead-squat baseline came back clean. Movement quality is{' '}
          <span className="font-black text-white">{movementQualityScore ?? '—'}/100</span>. Creeda
          will retest in 4 weeks to track drift. Your daily check-in starts tonight.
        </p>
      </CinematicShell>
    )
  }

  const accent = SEVERITY_ACCENT[topFinding.severity]
  const drill = topFinding.drillId ? drillForId(topFinding.drillId) : null
  const sub = sortedLinks[1]

  return (
    <CinematicShell
      eyebrow="We found something to watch"
      eyebrowTone={accent}
      finding={topFinding.finding}
      score={movementQualityScore}
      severity={topFinding.severity}
      sportLabel={sportLabel}
      nextHref={nextHref}
      exitHref={exitHref}
      shareCardUrl={shareCardUrl}
      persona={persona}
      region={topFinding.region}
    >
      {drill ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.45 }}
          className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.06] p-4"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-300">
            <Wrench className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
              Tonight&apos;s warm-up has been updated
            </p>
            <p className="mt-1 text-sm font-bold text-white">{drill.label}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/65">{drill.summary}</p>
            <Link
              href={`/drills/${drill.id}`}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300 hover:text-emerald-200"
            >
              Watch the drill <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      ) : null}

      {sub ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="mt-3 flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-white/55" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Also noted
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/72">{sub.finding}</p>
          </div>
        </motion.div>
      ) : null}

      {sortedLinks.length > 2 ? (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.18em] text-white/45 transition hover:text-white/70">
            See full list ({sortedLinks.length} total) ↓
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
    </CinematicShell>
  )
}

function CinematicShell({
  eyebrow,
  eyebrowTone,
  finding,
  score,
  severity,
  sportLabel,
  region,
  nextHref,
  exitHref,
  shareCardUrl,
  persona,
  children,
}: {
  eyebrow: string
  eyebrowTone: string
  finding: string
  score: number | null
  severity: Severity
  sportLabel?: string | null
  region?: string
  nextHref: string
  exitHref: string
  shareCardUrl: string
  persona: Persona
  children?: React.ReactNode
}) {
  const glow = SEVERITY_GLOW[severity]

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] bg-[#06080d] p-6 sm:p-8">
      {/* ── Atmospheric backdrop ────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 65%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)' }}
      />

      {/* ── Eyebrow ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em]"
        style={{ color: eyebrowTone }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </motion.div>

      {/* ── Layout: silhouette + finding ──────────────────────────── */}
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1fr_280px]">
        {/* ── Finding column ────────────────────────────────────── */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-4xl"
          >
            {finding}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]"
          >
            <SeverityChip severity={severity} />
            {region ? (
              <>
                <span className="text-white/30">·</span>
                <span className="text-white/60">{region.replace(/_/g, ' ')}</span>
              </>
            ) : null}
            {score !== null ? (
              <>
                <span className="text-white/30">·</span>
                <span className="text-white/60">Movement {score}/100</span>
              </>
            ) : null}
            {sportLabel ? (
              <>
                <span className="text-white/30">·</span>
                <span className="text-white/60 capitalize">{sportLabel}</span>
              </>
            ) : null}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="mt-5 max-w-xl text-sm leading-relaxed text-white/72"
          >
            This is a yellow flag for downstream injury risk. Creeda has built it into your warm-up
            and will re-test in 4 weeks to confirm change.
          </motion.p>

          {children}
        </div>

        {/* ── Animated body silhouette ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative mx-auto aspect-[1/1.7] w-full max-w-[260px] overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01]"
        >
          <BodySilhouetteCinematic region={region} severity={severity} />
        </motion.div>
      </div>

      {/* ── Footer CTAs ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <Link
          href={nextHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110"
        >
          Begin Day 1
          <ArrowRight className="h-4 w-4" />
        </Link>
        <ShareButton shareCardUrl={shareCardUrl} finding={finding} />
        <Link
          href={exitHref}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 px-5 text-sm font-bold text-white/65 transition hover:bg-white/[0.06]"
        >
          Save & exit
        </Link>
        {persona === 'individual' ? (
          <p className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
            Three taps tomorrow morning · we learn your normal in 7 days
          </p>
        ) : null}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7, duration: 0.4 }}
        className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-3"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        <p className="text-[12px] leading-relaxed text-white/55">
          Today&apos;s focus: set up your morning check-in. Your readiness will sharpen over the next 7
          days as we calibrate to you.
        </p>
      </motion.div>
    </section>
  )
}

function ShareButton({ shareCardUrl, finding }: { shareCardUrl: string; finding: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const fullUrl =
          typeof window === 'undefined' ? shareCardUrl : new URL(shareCardUrl, window.location.origin).toString()
        try {
          if (typeof navigator !== 'undefined' && navigator.share) {
            await navigator.share({
              title: 'My Creeda Aha moment',
              text: finding,
              url: fullUrl,
            })
            return
          }
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(fullUrl)
            window.alert('Share link copied — paste into Instagram or WhatsApp.')
          }
        } catch (error) {
          console.warn('share failed', error)
        }
      }}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-bold text-white/82 transition hover:bg-white/[0.08]"
    >
      <Share2 className="h-4 w-4" />
      Share my finding
    </button>
  )
}

function SeverityChip({ severity }: { severity: Severity }) {
  const className =
    severity === 'severe'
      ? 'rounded-full border border-rose-400/50 bg-rose-400/15 px-2.5 py-1 text-rose-200'
      : severity === 'moderate'
        ? 'rounded-full border border-amber-300/50 bg-amber-300/15 px-2.5 py-1 text-amber-200'
        : 'rounded-full border border-emerald-300/50 bg-emerald-300/15 px-2.5 py-1 text-emerald-200'
  return <span className={className}>{SEVERITY_LABEL[severity]}</span>
}

function BodySilhouetteCinematic({
  region,
  severity,
}: {
  region?: string
  severity: Severity
}) {
  const target = regionToCoord(region)
  const accent = SEVERITY_ACCENT[severity]

  return (
    <svg
      viewBox="0 0 100 200"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="cinematicBody" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
        <radialGradient id="weakLinkGlow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.85" />
          <stop offset="60%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Body */}
      <ellipse cx="50" cy="10" rx="6.5" ry="8" fill="url(#cinematicBody)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
      <rect x="47" y="17" width="6" height="6" rx="2" fill="url(#cinematicBody)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
      <path
        d="M 30 24 Q 30 22 35 22 L 65 22 Q 70 22 70 24 L 72 50 Q 72 52 70 54 L 60 56 Q 58 58 58 60 L 56 92 Q 56 94 54 94 L 46 94 Q 44 94 44 92 L 42 60 Q 42 58 40 56 L 30 54 Q 28 52 28 50 Z"
        fill="url(#cinematicBody)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      <path
        d="M 28 24 L 22 30 L 18 70 L 22 96 L 25 96 L 27 70 L 31 38 Z"
        fill="url(#cinematicBody)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      <path
        d="M 72 24 L 78 30 L 82 70 L 78 96 L 75 96 L 73 70 L 69 38 Z"
        fill="url(#cinematicBody)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      <path
        d="M 41 94 L 39 130 L 38 168 L 36 196 L 44 196 L 45 168 L 47 130 L 49 94 Z"
        fill="url(#cinematicBody)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      <path
        d="M 51 94 L 53 130 L 55 168 L 56 196 L 64 196 L 62 168 L 61 130 L 59 94 Z"
        fill="url(#cinematicBody)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />

      {target ? (
        <g>
          <circle cx={target.cx} cy={target.cy} r="14" fill="url(#weakLinkGlow)">
            <animate
              attributeName="r"
              values="11;16;11"
              dur="2.4s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={target.cx} cy={target.cy} r="3.3" fill={accent}>
            <animate
              attributeName="r"
              values="2.6;3.6;2.6"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ) : null}
    </svg>
  )
}

function regionToCoord(region?: string): { cx: number; cy: number } | null {
  if (!region) return null
  const map: Record<string, { cx: number; cy: number }> = {
    knee: { cx: 50, cy: 130 },
    left_knee_acl: { cx: 42, cy: 132 },
    left_knee_mcl: { cx: 44.5, cy: 132 },
    left_knee_lcl: { cx: 39, cy: 132 },
    left_knee_meniscus: { cx: 42, cy: 134 },
    left_knee_other: { cx: 42, cy: 132 },
    right_knee_acl: { cx: 58, cy: 132 },
    right_knee_mcl: { cx: 55.5, cy: 132 },
    right_knee_lcl: { cx: 61, cy: 132 },
    right_knee_meniscus: { cx: 58, cy: 134 },
    right_knee_other: { cx: 58, cy: 132 },
    ankle: { cx: 50, cy: 184 },
    left_ankle: { cx: 40, cy: 184 },
    right_ankle: { cx: 60, cy: 184 },
    foot: { cx: 50, cy: 192 },
    left_foot: { cx: 40, cy: 192 },
    right_foot: { cx: 60, cy: 192 },
    plantar_fascia: { cx: 50, cy: 196 },
    thoracic_spine: { cx: 50, cy: 50 },
    upper_back: { cx: 50, cy: 44 },
    lower_back: { cx: 50, cy: 88 },
    neck: { cx: 50, cy: 22 },
    core: { cx: 50, cy: 70 },
    squat_pattern: { cx: 50, cy: 110 },
    left_shoulder: { cx: 30, cy: 32 },
    right_shoulder: { cx: 70, cy: 32 },
    left_hip: { cx: 42, cy: 92 },
    right_hip: { cx: 58, cy: 92 },
    groin: { cx: 50, cy: 96 },
    left_hamstring: { cx: 42, cy: 122 },
    right_hamstring: { cx: 58, cy: 122 },
    left_quad: { cx: 42, cy: 116 },
    right_quad: { cx: 58, cy: 116 },
    left_calf: { cx: 42, cy: 158 },
    right_calf: { cx: 58, cy: 158 },
  }
  if (map[region]) return map[region]
  // Fallback: prefix match (e.g. "left_knee_acl" → "knee" coord)
  for (const key of Object.keys(map)) {
    if (region.startsWith(key)) return map[key]
  }
  return { cx: 50, cy: 100 }
}

function severityRank(severity: Severity) {
  switch (severity) {
    case 'severe':
      return 0
    case 'moderate':
      return 1
    case 'mild':
      return 2
  }
}
