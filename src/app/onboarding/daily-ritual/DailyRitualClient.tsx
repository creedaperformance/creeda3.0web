'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  HeartPulse,
  Moon,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import type { OnboardingV2DailyRitualSubmission, Persona } from '@creeda/schemas'

import { submitOnboardingV2DailyRitual } from '../actions'

type DailyRitualSuccess = Extract<
  Awaited<ReturnType<typeof submitOnboardingV2DailyRitual>>,
  { success: true }
>

type ReadinessPreview = {
  score: number
  directive: string
  confidencePct: number
}

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const
const APSQ_OPTIONS = [0, 1, 2, 3, 4] as const
const PAIN_LOCATIONS = ['Knee', 'Back', 'Shoulder', 'Hip', 'Ankle', 'Neck'] as const

function ScoreRow({
  label,
  icon: Icon,
  value,
  highLabel,
  lowLabel,
  onChange,
}: {
  label: string
  icon: typeof Zap
  value: number
  highLabel: string
  lowLabel: string
  onChange: (value: number) => void
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6ee7b7]/12 text-[#6ee7b7]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-white">{label}</p>
          <p className="mt-1 text-xs text-white/45">
            {lowLabel} to {highLabel}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {SCORE_OPTIONS.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`aspect-square rounded-2xl border text-base font-black transition ${
              value === score
                ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/16 text-[#d1fae5]'
                : 'border-white/10 bg-black/20 text-white/55 hover:bg-white/[0.07]'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </section>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
      />
    </label>
  )
}

function toNumber(value: string) {
  const next = Number(value)
  return Number.isFinite(next) ? next : undefined
}

export function DailyRitualClient({
  persona,
  today,
  initialCalibrationPct,
  completedDates,
  initialReadiness,
}: {
  persona: Extract<Persona, 'athlete' | 'individual'>
  today: string
  initialCalibrationPct: number
  completedDates: string[]
  initialReadiness: ReadinessPreview | null
}) {
  const [energy, setEnergy] = useState(3)
  const [bodyFeel, setBodyFeel] = useState(3)
  const [mentalLoad, setMentalLoad] = useState(3)
  const [sleepHours, setSleepHours] = useState('')
  const [sleepQuality, setSleepQuality] = useState('')
  const [painLocations, setPainLocations] = useState<string[]>([])
  const [painScore, setPainScore] = useState('')
  const [apsq3, setApsq3] = useState<[number, number, number]>([1, 1, 1])
  const [wantsRecoveryDay, setWantsRecoveryDay] = useState(false)
  const [startedAt] = useState(() => Date.now())
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<DailyRitualSuccess | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showSleep = energy <= 2
  const showPain = bodyFeel <= 2
  const showStress = mentalLoad >= 4
  const latestReadiness = result
    ? {
        score: result.readiness.score,
        directive: result.readiness.directive,
        confidencePct: result.confidence.pct,
      }
    : initialReadiness

  const completedCount = useMemo(
    () => new Set(result?.completedDates ?? completedDates).size,
    [completedDates, result?.completedDates]
  )

  function togglePainLocation(location: string) {
    setPainLocations((current) =>
      current.includes(location)
        ? current.filter((item) => item !== location)
        : [...current, location]
    )
  }

  function buildPayload(): OnboardingV2DailyRitualSubmission {
    const painValue = toNumber(painScore)
    const painScores =
      showPain && painValue !== undefined
        ? Object.fromEntries(painLocations.map((location) => [location, painValue]))
        : {}

    return {
      phase: 3,
      persona,
      source: 'web',
      date: today,
      energy,
      body_feel: bodyFeel,
      mental_load: mentalLoad,
      sleep_hours_self: showSleep ? toNumber(sleepHours) : undefined,
      sleep_quality_self: showSleep ? toNumber(sleepQuality) : undefined,
      pain_locations: showPain ? painLocations : [],
      pain_scores: painScores,
      apsq3: showStress ? apsq3 : undefined,
      wants_recovery_day: wantsRecoveryDay,
      completion_seconds: Math.round((Date.now() - startedAt) / 1000),
    }
  }

  function submitRitual() {
    setError(null)
    startTransition(async () => {
      const response = await submitOnboardingV2DailyRitual(buildPayload())
      if (!response.success) {
        setError(response.error ?? 'Unable to save today.')
        return
      }
      setResult(response as DailyRitualSuccess)
    })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.1),transparent_34%),linear-gradient(180deg,#020617,#08111f)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6ee7b7]/25 bg-[#6ee7b7]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-[#a7f3d0]">
            <CheckCircle2 className="h-4 w-4" />
            Phase 3 daily ritual
          </div>
          <h1 className="mt-5 text-4xl font-black sm:text-5xl">
            Tell Creeda how today starts.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/62">
            Three quick signals update readiness, confidence, and today&apos;s training guardrails.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">
              Profile calibration
            </p>
            <p className="mt-2 text-3xl font-black">
              {result?.profileCalibrationPct ?? initialCalibrationPct}%
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#6ee7b7]"
                style={{ width: `${result?.profileCalibrationPct ?? initialCalibrationPct}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/48">
              {completedCount} ritual day{completedCount === 1 ? '' : 's'} captured.
            </p>
          </div>

          {latestReadiness ? (
            <div className="mt-5 rounded-2xl border border-[#38bdf8]/20 bg-[#38bdf8]/10 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#bae6fd]">
                Readiness
              </p>
              <p className="mt-2 text-4xl font-black text-white">{latestReadiness.score}</p>
              <p className="mt-3 text-sm leading-6 text-white/62">{latestReadiness.directive}</p>
              <p className="mt-3 text-xs font-bold text-white/42">
                Confidence {latestReadiness.confidencePct}%
              </p>
            </div>
          ) : null}
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-[#030712]/86 p-4 shadow-2xl shadow-black/30 sm:p-6">
          <div className="grid gap-4">
            <ScoreRow
              label="Energy"
              icon={Zap}
              value={energy}
              lowLabel="flat"
              highLabel="charged"
              onChange={setEnergy}
            />
            <ScoreRow
              label="Body feel"
              icon={HeartPulse}
              value={bodyFeel}
              lowLabel="heavy"
              highLabel="ready"
              onChange={setBodyFeel}
            />
            <ScoreRow
              label="Mental load"
              icon={Brain}
              value={mentalLoad}
              lowLabel="calm"
              highLabel="loaded"
              onChange={setMentalLoad}
            />
          </div>

          {showSleep ? (
            <div className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 sm:col-span-2">
                <Moon className="h-5 w-5 text-[#6ee7b7]" />
                <p className="text-sm font-black text-white">Sleep context</p>
              </div>
              <NumberInput label="Sleep hours" value={sleepHours} onChange={setSleepHours} placeholder="7.5" />
              <NumberInput label="Sleep quality 1-10" value={sleepQuality} onChange={setSleepQuality} placeholder="7" />
            </div>
          ) : null}

          {showPain ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-200" />
                <p className="text-sm font-black text-white">Pain context</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PAIN_LOCATIONS.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => togglePainLocation(location)}
                    className={`min-h-10 rounded-xl border px-4 text-sm font-bold transition ${
                      painLocations.includes(location)
                        ? 'border-amber-200/50 bg-amber-200/12 text-amber-100'
                        : 'border-white/10 bg-black/20 text-white/55'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
              <div className="mt-4 max-w-xs">
                <NumberInput label="Pain score 0-10" value={painScore} onChange={setPainScore} placeholder="3" />
              </div>
            </div>
          ) : null}

          {showStress ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-black text-white">Stress pulse</p>
              {['I feel tense', 'I feel mentally drained', 'I am struggling to switch off'].map(
                (label, index) => (
                  <div key={label} className="mt-4">
                    <p className="text-xs font-bold text-white/55">{label}</p>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {APSQ_OPTIONS.map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() =>
                            setApsq3((current) => {
                              const next: [number, number, number] = [
                                current[0],
                                current[1],
                                current[2],
                              ]
                              next[index] = score
                              return next
                            })
                          }
                          className={`h-10 rounded-xl border text-sm font-black transition ${
                            apsq3[index] === score
                              ? 'border-[#38bdf8]/70 bg-[#38bdf8]/16 text-[#bae6fd]'
                              : 'border-white/10 bg-black/20 text-white/55'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setWantsRecoveryDay((current) => !current)}
            className={`mt-5 w-full rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${
              wantsRecoveryDay
                ? 'border-[#6ee7b7]/60 bg-[#6ee7b7]/12 text-[#d1fae5]'
                : 'border-white/10 bg-white/[0.03] text-white/62'
            }`}
          >
            Bias today toward recovery
          </button>

          {result ? (
            <p className="mt-5 rounded-2xl border border-[#6ee7b7]/25 bg-[#6ee7b7]/10 p-4 text-sm font-semibold leading-6 text-[#d1fae5]">
              Saved today. Readiness is {result.readiness.score}.
            </p>
          ) : null}
          {error ? (
            <p className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-semibold leading-6 text-amber-100">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={submitRitual}
              disabled={isPending}
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Saving...' : 'Save today'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href={result?.destination ?? '/onboarding/phase-2'}
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 text-sm font-bold text-white/72 transition hover:bg-white/[0.06]"
            >
              {result ? 'Open dashboard' : 'Back to diagnostics'}
              <Activity className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
