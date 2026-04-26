'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Leaf,
  Moon,
  Mountain,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import type {
  NutritionProfile,
  OnboardingV2Phase2Day,
  OnboardingV2Phase2Submission,
  Persona,
} from '@creeda/schemas'

import { submitOnboardingV2Phase2Day } from '../actions'

const DAYS: Array<{
  id: OnboardingV2Phase2Day
  eyebrow: string
  title: string
  detail: string
  icon: typeof Activity
}> = [
  {
    id: 'day1_aerobic',
    eyebrow: 'Day 1',
    title: 'Aerobic baseline',
    detail: 'Resting HR, Cooper run, timed run, walk, or stairs.',
    icon: Activity,
  },
  {
    id: 'day2_strength_power',
    eyebrow: 'Day 2',
    title: 'Strength and power',
    detail: '1RM, jumps, pushups, plank, and training history.',
    icon: ShieldCheck,
  },
  {
    id: 'day3_movement_quality',
    eyebrow: 'Day 3',
    title: 'Movement quality',
    detail: 'FMS-style self scores or confirmation that camera baseline is done.',
    icon: RotateCcw,
  },
  {
    id: 'day4_anaerobic_recovery',
    eyebrow: 'Day 4',
    title: 'Anaerobic and recovery',
    detail: 'Sprint, repeat sprint, HR recovery, HRV, or recovery rating.',
    icon: Activity,
  },
  {
    id: 'day5_nutrition',
    eyebrow: 'Day 5',
    title: 'Nutrition',
    detail: 'Protein, hydration, diet pattern, deficiencies, and RED-S risk inputs.',
    icon: Leaf,
  },
  {
    id: 'day6_psych_sleep',
    eyebrow: 'Day 6',
    title: 'APSQ and sleep',
    detail: 'APSQ-10 uses 0-4 responses, plus a simple sleep baseline.',
    icon: Moon,
  },
  {
    id: 'day7_environment',
    eyebrow: 'Day 7',
    title: 'Environment',
    detail: 'Training city, heat, air quality, altitude, commute, and stress context.',
    icon: Mountain,
  },
]

type Phase2Success = Extract<
  Awaited<ReturnType<typeof submitOnboardingV2Phase2Day>>,
  { success: true }
>

function dayAfter(day: OnboardingV2Phase2Day) {
  const index = DAYS.findIndex((item) => item.id === day)
  return DAYS[Math.min(DAYS.length - 1, index + 1)]?.id ?? day
}

function fieldValue(values: Record<string, string>, key: string) {
  return values[key] ?? ''
}

function numberValue(values: Record<string, string>, key: string) {
  const raw = fieldValue(values, key).trim()
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function listValue(values: Record<string, string>, key: string) {
  return fieldValue(values, key)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function textValue(values: Record<string, string>, key: string) {
  const value = fieldValue(values, key).trim()
  return value || undefined
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
        {label}
      </span>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
      />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 text-sm font-bold text-white outline-none transition focus:border-[#6ee7b7]/70"
      >
        {children}
      </select>
    </label>
  )
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-bold transition ${
        active
          ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
          : 'border-white/10 bg-white/[0.03] text-white/62 hover:bg-white/[0.06]'
      }`}
    >
      {label}
    </button>
  )
}

export function Phase2OnboardingClient({
  persona,
  initialCalibrationPct,
  initialDay,
  initialCompletedDays,
}: {
  persona: Extract<Persona, 'athlete' | 'individual'>
  initialCalibrationPct: number
  initialDay: OnboardingV2Phase2Day
  initialCompletedDays: OnboardingV2Phase2Day[]
}) {
  const router = useRouter()
  const [activeDay, setActiveDay] = useState<OnboardingV2Phase2Day>(initialDay)
  const [completedDays, setCompletedDays] = useState<OnboardingV2Phase2Day[]>(initialCompletedDays)
  const [calibrationPct, setCalibrationPct] = useState(initialCalibrationPct)
  const [result, setResult] = useState<Phase2Success | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [startedAt] = useState(() => Date.now())
  const [values, setValues] = useState<Record<string, string>>({
    diet_pattern: 'omnivore',
    target_protein_g_per_kg: '1.6',
    training_hours_per_week: '',
    primary_training_city: '',
    sleep_environment: '',
    travel_frequency: '',
    current_high_stress_phase: 'false',
    caregiving_responsibilities: 'false',
    heat_acclimated: 'false',
    strength_training_past_year: 'false',
    camera_baseline_completed: 'false',
  })

  const day = useMemo(() => DAYS.find((item) => item.id === activeDay) ?? DAYS[0], [activeDay])
  const Icon = day.icon

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function basePayload() {
    return {
      phase: 2 as const,
      persona,
      source: 'web' as const,
      completion_seconds: Math.round((Date.now() - startedAt) / 1000),
    }
  }

  function buildPayload(): OnboardingV2Phase2Submission {
    const base = basePayload()

    if (activeDay === 'day1_aerobic') {
      return {
        ...base,
        day: activeDay,
        resting_hr_bpm: numberValue(values, 'resting_hr_bpm'),
        cooper_distance_meters: numberValue(values, 'cooper_distance_meters'),
        run_1km_seconds: numberValue(values, 'run_1km_seconds'),
        run_5km_seconds: numberValue(values, 'run_5km_seconds'),
        run_10km_seconds: numberValue(values, 'run_10km_seconds'),
        walk_1km_seconds: numberValue(values, 'walk_1km_seconds'),
        stairs_flights_completed: numberValue(values, 'stairs_flights_completed'),
        perceived_exertion_1_to_10: numberValue(values, 'perceived_exertion_1_to_10'),
      }
    }

    if (activeDay === 'day2_strength_power') {
      return {
        ...base,
        day: activeDay,
        squat_1rm_kg: numberValue(values, 'squat_1rm_kg'),
        deadlift_1rm_kg: numberValue(values, 'deadlift_1rm_kg'),
        bench_1rm_kg: numberValue(values, 'bench_1rm_kg'),
        ohp_1rm_kg: numberValue(values, 'ohp_1rm_kg'),
        vertical_jump_cm: numberValue(values, 'vertical_jump_cm'),
        broad_jump_cm: numberValue(values, 'broad_jump_cm'),
        pushups_60s: numberValue(values, 'pushups_60s'),
        plank_hold_seconds: numberValue(values, 'plank_hold_seconds'),
        strength_training_past_year: values.strength_training_past_year === 'true',
      }
    }

    if (activeDay === 'day3_movement_quality') {
      return {
        ...base,
        day: activeDay,
        fms: {
          aslr_left: numberValue(values, 'aslr_left'),
          aslr_right: numberValue(values, 'aslr_right'),
          shoulder_left: numberValue(values, 'shoulder_left'),
          shoulder_right: numberValue(values, 'shoulder_right'),
          trunk_pushup: numberValue(values, 'trunk_pushup'),
          single_leg_squat_left: numberValue(values, 'single_leg_squat_left'),
          single_leg_squat_right: numberValue(values, 'single_leg_squat_right'),
          inline_lunge_left: numberValue(values, 'inline_lunge_left'),
          inline_lunge_right: numberValue(values, 'inline_lunge_right'),
        },
        self_reported_pain_0_to_10: numberValue(values, 'self_reported_pain_0_to_10'),
        camera_baseline_completed: values.camera_baseline_completed === 'true',
        notes: textValue(values, 'movement_notes'),
      }
    }

    if (activeDay === 'day4_anaerobic_recovery') {
      return {
        ...base,
        day: activeDay,
        sprint_100m_seconds: numberValue(values, 'sprint_100m_seconds'),
        rsa_6x30m_best_seconds: numberValue(values, 'rsa_6x30m_best_seconds'),
        rsa_6x30m_average_seconds: numberValue(values, 'rsa_6x30m_average_seconds'),
        recovery_hr_drop_bpm_60s: numberValue(values, 'recovery_hr_drop_bpm_60s'),
        hrv_ppg_ms: numberValue(values, 'hrv_ppg_ms'),
        recovery_rating_1_to_5: numberValue(values, 'recovery_rating_1_to_5'),
      }
    }

    if (activeDay === 'day5_nutrition') {
      return {
        ...base,
        day: activeDay,
        nutrition: {
          diet_pattern: fieldValue(values, 'diet_pattern') as NutritionProfile['diet_pattern'],
          protein_portions_per_day: numberValue(values, 'protein_portions_per_day'),
          estimated_protein_grams: numberValue(values, 'estimated_protein_grams'),
          water_cups_per_day: numberValue(values, 'water_cups_per_day'),
          caffeine_mg_per_day: numberValue(values, 'caffeine_mg_per_day'),
          pre_workout_pattern: textValue(values, 'pre_workout_pattern') as
            | 'carb_heavy'
            | 'mixed'
            | 'minimal'
            | 'fasted'
            | undefined,
          allergies: listValue(values, 'allergies'),
          supplements: listValue(values, 'supplements'),
          known_deficiencies: listValue(values, 'known_deficiencies'),
        },
        body_mass_kg: numberValue(values, 'body_mass_kg'),
        training_hours_per_week: numberValue(values, 'training_hours_per_week') ?? -1,
        target_protein_g_per_kg: numberValue(values, 'target_protein_g_per_kg') ?? 1.6,
        recent_weight_loss_pct: numberValue(values, 'recent_weight_loss_pct'),
        missed_periods_last_90_days: numberValue(values, 'missed_periods_last_90_days'),
        fatigue_score_1_to_5: numberValue(values, 'fatigue_score_1_to_5'),
      }
    }

    if (activeDay === 'day6_psych_sleep') {
      const apsqResponses = Array.from({ length: 10 }, (_, index) =>
        numberValue(values, `apsq_${index + 1}`)
      )
      const hasApsq = apsqResponses.every((value) => value !== undefined)
      return {
        ...base,
        day: activeDay,
        apsq10: hasApsq ? { responses: apsqResponses as number[] } : undefined,
        sleep_baseline:
          numberValue(values, 'avg_sleep_hours') !== undefined
            ? {
                avg_sleep_hours: numberValue(values, 'avg_sleep_hours') ?? 0,
                sleep_quality_1_to_5: numberValue(values, 'sleep_quality_1_to_5'),
                wakeups_per_night: numberValue(values, 'wakeups_per_night'),
                bedtime_consistency_1_to_5: numberValue(values, 'bedtime_consistency_1_to_5'),
                screen_before_bed_minutes: numberValue(values, 'screen_before_bed_minutes'),
              }
            : undefined,
        life_stress_1_to_5: numberValue(values, 'life_stress_1_to_5'),
      }
    }

    return {
      ...base,
      day: 'day7_environment',
      environment: {
        primary_training_city: fieldValue(values, 'primary_training_city'),
        primary_training_lat: numberValue(values, 'primary_training_lat'),
        primary_training_lng: numberValue(values, 'primary_training_lng'),
        altitude_meters: numberValue(values, 'altitude_meters'),
        indoor_outdoor_split_pct: numberValue(values, 'indoor_outdoor_split_pct'),
        sleep_environment: textValue(values, 'sleep_environment') as
          | 'ac'
          | 'fan_only'
          | 'open_windows'
          | 'shared_room'
          | undefined,
        commute_minutes: numberValue(values, 'commute_minutes'),
        commute_mode: textValue(values, 'commute_mode'),
        travel_frequency: textValue(values, 'travel_frequency') as
          | 'rarely'
          | 'monthly'
          | 'biweekly'
          | 'weekly'
          | undefined,
        current_high_stress_phase: values.current_high_stress_phase === 'true',
        high_stress_reason: textValue(values, 'high_stress_reason'),
        caregiving_responsibilities: values.caregiving_responsibilities === 'true',
      },
      heat_index_c: numberValue(values, 'heat_index_c'),
      aqi: numberValue(values, 'aqi'),
      training_surface: textValue(values, 'training_surface') as
        | 'grass'
        | 'turf'
        | 'track'
        | 'road'
        | 'gym_floor'
        | 'mixed'
        | undefined,
      heat_acclimated: values.heat_acclimated === 'true',
    }
  }

  function submitDay() {
    setError(null)
    startTransition(async () => {
      const response = await submitOnboardingV2Phase2Day(buildPayload())
      if (!response.success) {
        setError(response.error ?? 'Unable to save this Phase 2 diagnostic day.')
        return
      }

      setResult(response as Phase2Success)
      setCalibrationPct(response.profileCalibrationPct)
      setCompletedDays(response.completedDays)
      if (activeDay !== 'day7_environment') {
        setActiveDay(dayAfter(activeDay))
      } else {
        router.refresh()
      }
    })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,#020617,#08111f)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6ee7b7]/25 bg-[#6ee7b7]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-[#a7f3d0]">
            <ShieldCheck className="h-4 w-4" />
            Phase 2 diagnostics
          </div>
          <h1 className="mt-5 text-4xl font-black sm:text-5xl">
            Calibrate the engine one day at a time.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/62">
            These seven checkpoints turn the profile from provisional into a useful operating
            baseline. Use the measurement you can honestly capture today.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">
                  Profile calibration
                </p>
                <p className="mt-2 text-2xl font-black">{calibrationPct}%</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6ee7b7]/12 text-[#6ee7b7]">
                <Icon className="h-7 w-7" />
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#6ee7b7]" style={{ width: `${calibrationPct}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/48">
              Completed: {completedDays.length}/7 diagnostic days.
            </p>
          </div>

          <div className="mt-6 grid gap-2">
            {DAYS.map((item) => {
              const ItemIcon = item.icon
              const active = item.id === activeDay
              const done = completedDays.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveDay(item.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/12'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[#6ee7b7]">
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <ItemIcon className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                        {item.eyebrow}
                      </p>
                      <p className="mt-1 text-sm font-black">{item.title}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-[#030712]/86 p-4 shadow-2xl shadow-black/30 sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
            {day.eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-black">{day.title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/58">{day.detail}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">{renderDayFields(activeDay, values, setValue)}</div>

          {result ? (
            <div className="mt-5 rounded-2xl border border-[#6ee7b7]/25 bg-[#6ee7b7]/10 p-4 text-sm font-semibold leading-6 text-[#d1fae5]">
              <p>
                Saved {DAYS.find((item) => item.id === result.day)?.title ?? 'diagnostic day'}.
                Calibration is now {result.profileCalibrationPct}%.
              </p>
              {result.day === 'day7_environment' ? (
                <Link
                  href="/onboarding/daily-ritual"
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6ee7b7] px-4 text-sm font-black text-slate-950 transition hover:brightness-110"
                >
                  Start daily ritual
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-semibold leading-6 text-amber-100">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/10 px-5 text-sm font-bold text-white/72 transition hover:bg-white/[0.06]"
            >
              Back to Phase 1
            </Link>
            <button
              type="button"
              onClick={submitDay}
              disabled={isPending}
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Saving...' : activeDay === 'day7_environment' ? 'Finish Phase 2' : 'Save and continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

function renderDayFields(
  day: OnboardingV2Phase2Day,
  values: Record<string, string>,
  setValue: (key: string, value: string) => void
) {
  if (day === 'day1_aerobic') {
    return (
      <>
        <Input label="Resting HR bpm" type="number" value={fieldValue(values, 'resting_hr_bpm')} onChange={(value) => setValue('resting_hr_bpm', value)} />
        <Input label="Cooper distance m" type="number" value={fieldValue(values, 'cooper_distance_meters')} onChange={(value) => setValue('cooper_distance_meters', value)} />
        <Input label="1 km run seconds" type="number" value={fieldValue(values, 'run_1km_seconds')} onChange={(value) => setValue('run_1km_seconds', value)} />
        <Input label="1 km walk seconds" type="number" value={fieldValue(values, 'walk_1km_seconds')} onChange={(value) => setValue('walk_1km_seconds', value)} />
        <Input label="5 km run seconds" type="number" value={fieldValue(values, 'run_5km_seconds')} onChange={(value) => setValue('run_5km_seconds', value)} />
        <Input label="10 km run seconds" type="number" value={fieldValue(values, 'run_10km_seconds')} onChange={(value) => setValue('run_10km_seconds', value)} />
        <Input label="Stair flights" type="number" value={fieldValue(values, 'stairs_flights_completed')} onChange={(value) => setValue('stairs_flights_completed', value)} />
        <Input label="RPE 1-10" type="number" value={fieldValue(values, 'perceived_exertion_1_to_10')} onChange={(value) => setValue('perceived_exertion_1_to_10', value)} />
      </>
    )
  }

  if (day === 'day2_strength_power') {
    return (
      <>
        <Input label="Squat 1RM kg" type="number" value={fieldValue(values, 'squat_1rm_kg')} onChange={(value) => setValue('squat_1rm_kg', value)} />
        <Input label="Deadlift 1RM kg" type="number" value={fieldValue(values, 'deadlift_1rm_kg')} onChange={(value) => setValue('deadlift_1rm_kg', value)} />
        <Input label="Bench 1RM kg" type="number" value={fieldValue(values, 'bench_1rm_kg')} onChange={(value) => setValue('bench_1rm_kg', value)} />
        <Input label="OHP 1RM kg" type="number" value={fieldValue(values, 'ohp_1rm_kg')} onChange={(value) => setValue('ohp_1rm_kg', value)} />
        <Input label="Vertical jump cm" type="number" value={fieldValue(values, 'vertical_jump_cm')} onChange={(value) => setValue('vertical_jump_cm', value)} />
        <Input label="Broad jump cm" type="number" value={fieldValue(values, 'broad_jump_cm')} onChange={(value) => setValue('broad_jump_cm', value)} />
        <Input label="Pushups in 60s" type="number" value={fieldValue(values, 'pushups_60s')} onChange={(value) => setValue('pushups_60s', value)} />
        <Input label="Plank seconds" type="number" value={fieldValue(values, 'plank_hold_seconds')} onChange={(value) => setValue('plank_hold_seconds', value)} />
        <div className="sm:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Strength training last year
          </span>
          <div className="mt-2 flex gap-2">
            <Toggle active={values.strength_training_past_year === 'false'} label="No" onClick={() => setValue('strength_training_past_year', 'false')} />
            <Toggle active={values.strength_training_past_year === 'true'} label="Yes" onClick={() => setValue('strength_training_past_year', 'true')} />
          </div>
        </div>
      </>
    )
  }

  if (day === 'day3_movement_quality') {
    return (
      <>
        <Input label="ASLR left 0-3" type="number" value={fieldValue(values, 'aslr_left')} onChange={(value) => setValue('aslr_left', value)} />
        <Input label="ASLR right 0-3" type="number" value={fieldValue(values, 'aslr_right')} onChange={(value) => setValue('aslr_right', value)} />
        <Input label="Shoulder left 0-3" type="number" value={fieldValue(values, 'shoulder_left')} onChange={(value) => setValue('shoulder_left', value)} />
        <Input label="Shoulder right 0-3" type="number" value={fieldValue(values, 'shoulder_right')} onChange={(value) => setValue('shoulder_right', value)} />
        <Input label="Trunk pushup 0-3" type="number" value={fieldValue(values, 'trunk_pushup')} onChange={(value) => setValue('trunk_pushup', value)} />
        <Input label="Pain 0-10" type="number" value={fieldValue(values, 'self_reported_pain_0_to_10')} onChange={(value) => setValue('self_reported_pain_0_to_10', value)} />
        <div className="sm:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Camera baseline already completed
          </span>
          <div className="mt-2 flex gap-2">
            <Toggle active={values.camera_baseline_completed === 'false'} label="No" onClick={() => setValue('camera_baseline_completed', 'false')} />
            <Toggle active={values.camera_baseline_completed === 'true'} label="Yes" onClick={() => setValue('camera_baseline_completed', 'true')} />
          </div>
        </div>
        <Input label="Notes" value={fieldValue(values, 'movement_notes')} onChange={(value) => setValue('movement_notes', value)} />
      </>
    )
  }

  if (day === 'day4_anaerobic_recovery') {
    return (
      <>
        <Input label="100m sprint seconds" type="number" value={fieldValue(values, 'sprint_100m_seconds')} onChange={(value) => setValue('sprint_100m_seconds', value)} />
        <Input label="RSA best seconds" type="number" value={fieldValue(values, 'rsa_6x30m_best_seconds')} onChange={(value) => setValue('rsa_6x30m_best_seconds', value)} />
        <Input label="RSA average seconds" type="number" value={fieldValue(values, 'rsa_6x30m_average_seconds')} onChange={(value) => setValue('rsa_6x30m_average_seconds', value)} />
        <Input label="HR drop bpm in 60s" type="number" value={fieldValue(values, 'recovery_hr_drop_bpm_60s')} onChange={(value) => setValue('recovery_hr_drop_bpm_60s', value)} />
        <Input label="HRV PPG ms" type="number" value={fieldValue(values, 'hrv_ppg_ms')} onChange={(value) => setValue('hrv_ppg_ms', value)} />
        <Input label="Recovery rating 1-5" type="number" value={fieldValue(values, 'recovery_rating_1_to_5')} onChange={(value) => setValue('recovery_rating_1_to_5', value)} />
      </>
    )
  }

  if (day === 'day5_nutrition') {
    return (
      <>
        <Select label="Diet pattern" value={fieldValue(values, 'diet_pattern')} onChange={(value) => setValue('diet_pattern', value)}>
          <option value="omnivore">Omnivore</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="eggetarian">Eggetarian</option>
          <option value="pescatarian">Pescatarian</option>
          <option value="vegan">Vegan</option>
          <option value="jain">Jain</option>
        </Select>
        <Input label="Training hours/week" type="number" value={fieldValue(values, 'training_hours_per_week')} onChange={(value) => setValue('training_hours_per_week', value)} />
        <Input label="Body mass kg" type="number" value={fieldValue(values, 'body_mass_kg')} onChange={(value) => setValue('body_mass_kg', value)} />
        <Input label="Protein grams/day" type="number" value={fieldValue(values, 'estimated_protein_grams')} onChange={(value) => setValue('estimated_protein_grams', value)} />
        <Input label="Protein portions/day" type="number" value={fieldValue(values, 'protein_portions_per_day')} onChange={(value) => setValue('protein_portions_per_day', value)} />
        <Input label="Water cups/day" type="number" value={fieldValue(values, 'water_cups_per_day')} onChange={(value) => setValue('water_cups_per_day', value)} />
        <Input label="Recent weight loss %" type="number" value={fieldValue(values, 'recent_weight_loss_pct')} onChange={(value) => setValue('recent_weight_loss_pct', value)} />
        <Input label="Fatigue 1-5" type="number" value={fieldValue(values, 'fatigue_score_1_to_5')} onChange={(value) => setValue('fatigue_score_1_to_5', value)} />
        <Input label="Missed periods 90d" type="number" value={fieldValue(values, 'missed_periods_last_90_days')} onChange={(value) => setValue('missed_periods_last_90_days', value)} />
        <Input label="Known deficiencies" value={fieldValue(values, 'known_deficiencies')} onChange={(value) => setValue('known_deficiencies', value)} placeholder="Comma separated" />
      </>
    )
  }

  if (day === 'day6_psych_sleep') {
    return (
      <>
        {Array.from({ length: 10 }, (_, index) => (
          <Input
            key={index}
            label={`APSQ ${index + 1} 0-4`}
            type="number"
            value={fieldValue(values, `apsq_${index + 1}`)}
            onChange={(value) => setValue(`apsq_${index + 1}`, value)}
          />
        ))}
        <Input label="Avg sleep hours" type="number" value={fieldValue(values, 'avg_sleep_hours')} onChange={(value) => setValue('avg_sleep_hours', value)} />
        <Input label="Sleep quality 1-5" type="number" value={fieldValue(values, 'sleep_quality_1_to_5')} onChange={(value) => setValue('sleep_quality_1_to_5', value)} />
        <Input label="Wakeups/night" type="number" value={fieldValue(values, 'wakeups_per_night')} onChange={(value) => setValue('wakeups_per_night', value)} />
        <Input label="Life stress 1-5" type="number" value={fieldValue(values, 'life_stress_1_to_5')} onChange={(value) => setValue('life_stress_1_to_5', value)} />
      </>
    )
  }

  return (
    <>
      <Input label="Training city" value={fieldValue(values, 'primary_training_city')} onChange={(value) => setValue('primary_training_city', value)} />
      <Input label="Heat index C" type="number" value={fieldValue(values, 'heat_index_c')} onChange={(value) => setValue('heat_index_c', value)} />
      <Input label="AQI" type="number" value={fieldValue(values, 'aqi')} onChange={(value) => setValue('aqi', value)} />
      <Input label="Altitude meters" type="number" value={fieldValue(values, 'altitude_meters')} onChange={(value) => setValue('altitude_meters', value)} />
      <Input label="Outdoor split %" type="number" value={fieldValue(values, 'indoor_outdoor_split_pct')} onChange={(value) => setValue('indoor_outdoor_split_pct', value)} />
      <Input label="Commute minutes" type="number" value={fieldValue(values, 'commute_minutes')} onChange={(value) => setValue('commute_minutes', value)} />
      <Select label="Sleep environment" value={fieldValue(values, 'sleep_environment')} onChange={(value) => setValue('sleep_environment', value)}>
        <option value="">Not set</option>
        <option value="ac">AC</option>
        <option value="fan_only">Fan only</option>
        <option value="open_windows">Open windows</option>
        <option value="shared_room">Shared room</option>
      </Select>
      <Select label="Travel frequency" value={fieldValue(values, 'travel_frequency')} onChange={(value) => setValue('travel_frequency', value)}>
        <option value="">Not set</option>
        <option value="rarely">Rarely</option>
        <option value="monthly">Monthly</option>
        <option value="biweekly">Biweekly</option>
        <option value="weekly">Weekly</option>
      </Select>
      <Select label="Training surface" value={fieldValue(values, 'training_surface')} onChange={(value) => setValue('training_surface', value)}>
        <option value="">Not set</option>
        <option value="grass">Grass</option>
        <option value="turf">Turf</option>
        <option value="track">Track</option>
        <option value="road">Road</option>
        <option value="gym_floor">Gym floor</option>
        <option value="mixed">Mixed</option>
      </Select>
    </>
  )
}
