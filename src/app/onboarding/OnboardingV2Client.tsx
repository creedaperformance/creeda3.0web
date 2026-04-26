'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react'
import type { OnboardingV2Phase1Submission, ParqPlus, Persona } from '@creeda/schemas'

import {
  submitOnboardingV2Phase1,
  submitOnboardingV2SafetyGate,
  trackOnboardingV2Event,
} from './actions'

const PERSONA_OPTIONS: Array<{
  id: Persona
  title: string
  detail: string
  metric: string
  icon: typeof Dumbbell
}> = [
  {
    id: 'athlete',
    title: 'Athlete',
    detail: 'Sport context, load, recovery, and performance decisions.',
    metric: 'Performance mode',
    icon: Dumbbell,
  },
  {
    id: 'individual',
    title: 'Individual',
    detail: 'Health, movement, sleep, strength, and consistency guidance.',
    metric: 'Health mode',
    icon: UserRound,
  },
  {
    id: 'coach',
    title: 'Coach',
    detail: 'Squad setup, triage, compliance, and athlete drill-down.',
    metric: 'Triage mode',
    icon: Users,
  },
]

const PARQ_ITEMS: Array<{
  key: keyof Pick<
    ParqPlus,
    | 'q1_heart_condition'
    | 'q2_chest_pain_activity'
    | 'q3_chest_pain_rest'
    | 'q4_dizziness_loc'
    | 'q5_bone_joint_problem'
    | 'q6_bp_heart_meds'
    | 'q7_other_reason'
  >
  label: string
}> = [
  { key: 'q1_heart_condition', label: 'A doctor has said you have a heart condition.' },
  { key: 'q2_chest_pain_activity', label: 'You feel chest pain during physical activity.' },
  { key: 'q3_chest_pain_rest', label: 'You have had chest pain while resting.' },
  { key: 'q4_dizziness_loc', label: 'You lose balance because of dizziness or have lost consciousness.' },
  { key: 'q5_bone_joint_problem', label: 'You have a bone or joint issue that could worsen with activity.' },
  { key: 'q6_bp_heart_meds', label: 'A doctor currently prescribes blood pressure or heart medication.' },
  { key: 'q7_other_reason', label: 'You know another reason you should not do physical activity.' },
]

const BODY_REGION_OPTIONS = [
  { value: 'lower_back', label: 'Lower back' },
  { value: 'left_shoulder', label: 'Left shoulder' },
  { value: 'right_shoulder', label: 'Right shoulder' },
  { value: 'left_knee_acl', label: 'Left knee' },
  { value: 'right_knee_acl', label: 'Right knee' },
  { value: 'left_ankle', label: 'Left ankle' },
  { value: 'right_ankle', label: 'Right ankle' },
  { value: 'left_hamstring', label: 'Left hamstring' },
  { value: 'right_hamstring', label: 'Right hamstring' },
  { value: 'groin', label: 'Groin' },
] as const

const GOAL_OPTIONS = [
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'sport_performance', label: 'Sport performance' },
  { value: 'strength_gain', label: 'Strength gain' },
  { value: 'fat_loss', label: 'Fat loss' },
  { value: 'return_to_play', label: 'Return to play' },
  { value: 'event_prep', label: 'Event prep' },
  { value: 'movement_quality', label: 'Movement quality' },
] as const

const defaultParq: ParqPlus = {
  q1_heart_condition: false,
  q2_chest_pain_activity: false,
  q3_chest_pain_rest: false,
  q4_dizziness_loc: false,
  q5_bone_joint_problem: false,
  q6_bp_heart_meds: false,
  q7_other_reason: false,
  q7_other_reason_text: '',
  pregnancy_status: 'not_applicable',
  cycle_tracking_optin: false,
}

type Step =
  | 'persona'
  | 'safety'
  | 'phase0Complete'
  | 'identity'
  | 'sport'
  | 'goal'
  | 'load'
  | 'ortho'
  | 'wearable'
  | 'squad'
  | 'phase1Complete'

type SafetyGateSuccess = Extract<
  Awaited<ReturnType<typeof submitOnboardingV2SafetyGate>>,
  { success: true }
>
type Phase1Success = Extract<
  Awaited<ReturnType<typeof submitOnboardingV2Phase1>>,
  { success: true }
>

type Phase1FormState = {
  identity: OnboardingV2Phase1Submission['identity']
  sport: OnboardingV2Phase1Submission['sport']
  goal: OnboardingV2Phase1Submission['goal']
  training_load: NonNullable<OnboardingV2Phase1Submission['training_load']>
  orthopedic_entry: OnboardingV2Phase1Submission['orthopedic_history'][number]
  has_orthopedic_history: boolean
  wearable: OnboardingV2Phase1Submission['wearable']
  squad: NonNullable<OnboardingV2Phase1Submission['squad']>
}

const defaultPhase1: Phase1FormState = {
  identity: {
    display_name: 'Creeda Athlete',
    date_of_birth: '2005-01-01',
    biological_sex: 'prefer_not_to_say',
    gender_identity: '',
    height_cm: 175,
    weight_kg: 70,
    dominant_hand: 'right',
    dominant_leg: 'right',
  },
  sport: {
    primary_sport: 'Cricket',
    position: '',
    level: 'recreational',
  },
  goal: {
    primary_goal: 'sport_performance',
    goal_detail: '',
    target_event_name: '',
    target_event_date: undefined,
  },
  training_load: {
    weekly_sessions: 3,
    avg_session_minutes: 60,
    typical_rpe: 6,
    pattern_4_weeks: 'same',
  },
  orthopedic_entry: {
    body_region: 'lower_back',
    severity: 'annoying',
    occurred_at_estimate: '2025-01-01',
    currently_symptomatic: false,
    current_pain_score: 0,
    has_seen_clinician: false,
    clinician_type: 'none',
    notes: '',
  },
  has_orthopedic_history: false,
  wearable: {
    preference: 'later',
    provider: 'none',
  },
  squad: {
    name: 'First Squad',
    sport: 'Cricket',
    level: 'Academy',
    size_estimate: 12,
    primary_focus: 'in_season_maintenance',
  },
}

function anyParqYes(parq: ParqPlus) {
  return PARQ_ITEMS.some((item) => Boolean(parq[item.key]))
}

function cleanOptional(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function stepPhase(step: Step) {
  return step === 'persona' || step === 'safety' || step === 'phase0Complete' ? 0 : 1
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
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
      {children}
    </button>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-12 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 text-sm font-bold text-white outline-none transition focus:border-[#6ee7b7]/70"
    />
  )
}

function StepFooter({
  backLabel = 'Back',
  nextLabel,
  onBack,
  onNext,
  disabled,
}: {
  backLabel?: string
  nextLabel: string
  onBack: () => void
  onNext: () => void
  disabled?: boolean
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onBack}
        className="h-13 rounded-2xl border border-white/10 px-5 text-sm font-bold text-white/72 transition hover:bg-white/[0.06]"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export function OnboardingV2Client({
  initialPersona,
  initialCalibrationPct,
  initialPhase,
}: {
  initialPersona: Persona
  initialCalibrationPct: number
  initialPhase: number
}) {
  const [persona, setPersona] = useState<Persona>(initialPersona)
  const [step, setStep] = useState<Step>(initialPhase > 1 ? 'identity' : initialPhase > 0 ? 'safety' : 'persona')
  const [parq, setParq] = useState<ParqPlus>(defaultParq)
  const [startedAt] = useState(() => Date.now())
  const [phase1StartedAt] = useState(() => Date.now())
  const [safetyResult, setSafetyResult] = useState<SafetyGateSuccess | null>(null)
  const [phase1Result, setPhase1Result] = useState<Phase1Success | null>(null)
  const [phase1, setPhase1] = useState<Phase1FormState>(defaultPhase1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedPersona = useMemo(
    () => PERSONA_OPTIONS.find((option) => option.id === persona) ?? PERSONA_OPTIONS[1],
    [persona]
  )
  const Icon = selectedPersona.icon
  const modifiedModePreview = anyParqYes(parq)
  const calibrationPct =
    phase1Result?.profileCalibrationPct ??
    safetyResult?.profileCalibrationPct ??
    initialCalibrationPct

  useEffect(() => {
    void trackOnboardingV2Event({
      event_name: 'onb.screen.viewed',
      persona,
      phase: stepPhase(step),
      screen: step,
      source: 'web',
      metadata: {},
    })
  }, [persona, step])

  function updatePhase1<K extends keyof Phase1FormState>(key: K, value: Phase1FormState[K]) {
    setPhase1((current) => ({ ...current, [key]: value }))
  }

  function submitSafetyGate() {
    setError(null)
    startTransition(async () => {
      const response = await submitOnboardingV2SafetyGate({
        persona,
        source: 'web',
        parq,
        completion_seconds: Math.round((Date.now() - startedAt) / 1000),
      })

      if (!response.success) {
        setError(response.error ?? 'Unable to save the safety gate.')
        return
      }

      setSafetyResult(response as SafetyGateSuccess)
      setStep('phase0Complete')
    })
  }

  function phase1Payload(): OnboardingV2Phase1Submission {
    const targetEventName = cleanOptional(phase1.goal.target_event_name)
    const payload = {
      phase: 1,
      persona,
      source: 'web',
      identity: {
        ...phase1.identity,
        display_name: phase1.identity.display_name.trim(),
        gender_identity: cleanOptional(phase1.identity.gender_identity),
      },
      sport: {
        ...phase1.sport,
        primary_sport: phase1.sport.primary_sport.trim(),
        position: cleanOptional(phase1.sport.position),
      },
      goal: {
        ...phase1.goal,
        goal_detail: cleanOptional(phase1.goal.goal_detail),
        target_event_name: targetEventName,
        target_event_date: targetEventName ? phase1.goal.target_event_date : undefined,
      },
      training_load: persona === 'coach' ? undefined : phase1.training_load,
      orthopedic_history:
        persona === 'coach' || !phase1.has_orthopedic_history
          ? []
          : [
              {
                ...phase1.orthopedic_entry,
                current_pain_score: phase1.orthopedic_entry.currently_symptomatic
                  ? phase1.orthopedic_entry.current_pain_score
                  : undefined,
                clinician_type: phase1.orthopedic_entry.has_seen_clinician
                  ? phase1.orthopedic_entry.clinician_type
                  : 'none',
                notes: cleanOptional(phase1.orthopedic_entry.notes),
              },
            ],
      wearable: phase1.wearable,
      squad: persona === 'coach' ? phase1.squad : undefined,
      completion_seconds: Math.round((Date.now() - phase1StartedAt) / 1000),
    }

    return payload as OnboardingV2Phase1Submission
  }

  function submitPhase1() {
    setError(null)
    startTransition(async () => {
      const response = await submitOnboardingV2Phase1(phase1Payload())

      if (!response.success) {
        setError(response.error ?? 'Unable to save Phase 1.')
        return
      }

      setPhase1Result(response as Phase1Success)
      setStep('phase1Complete')
    })
  }

  const nextAfterGoal = persona === 'coach' ? 'squad' : 'load'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,#020617,#08111f)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6ee7b7]/25 bg-[#6ee7b7]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-[#a7f3d0]">
            <ShieldCheck className="h-4 w-4" />
            Onboarding v2
          </div>
          <h1 className="mt-5 text-4xl font-black sm:text-5xl">
            Build confidence before we score you.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/62">
            Creeda starts with safety, then calibrates the profile through sport, load, injury,
            wearable, and squad context.
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
                <HeartPulse className="h-7 w-7" />
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#6ee7b7]" style={{ width: `${calibrationPct}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/48">
              First-day readiness remains provisional until measured movement, sleep, and check-in
              data build confidence.
            </p>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-[#030712]/86 p-4 shadow-2xl shadow-black/30 sm:p-6">
          {step === 'persona' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Pick your route
              </p>
              <h2 className="mt-3 text-2xl font-black">Same engine. Different experience.</h2>
              <div className="mt-6 grid gap-3">
                {PERSONA_OPTIONS.map((option) => {
                  const OptionIcon = option.icon
                  const active = persona === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPersona(option.id)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        active
                          ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/12'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-[#6ee7b7]">
                          <OptionIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black">{option.title}</h3>
                            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                              {option.metric}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/58">{option.detail}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setStep('safety')}
                className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110 sm:w-auto"
              >
                Continue with {selectedPersona.title}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {step === 'safety' ? (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                    Phase 0 Safety Gate
                  </p>
                  <h2 className="mt-3 text-2xl font-black">Seven quick safety checks.</h2>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    This does not diagnose anything. It decides whether Creeda should use a
                    modified, safer starting mode.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <Icon className="h-5 w-5 text-[#6ee7b7]" />
                  <span className="text-sm font-bold">{selectedPersona.title}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {PARQ_ITEMS.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-semibold leading-6 text-white/78">{item.label}</p>
                    <div className="mt-3 flex gap-2">
                      <ToggleButton
                        active={!parq[item.key]}
                        onClick={() => setParq((current) => ({ ...current, [item.key]: false }))}
                      >
                        No
                      </ToggleButton>
                      <ToggleButton
                        active={Boolean(parq[item.key])}
                        onClick={() => setParq((current) => ({ ...current, [item.key]: true }))}
                      >
                        Yes
                      </ToggleButton>
                    </div>
                  </div>
                ))}
              </div>

              {parq.q7_other_reason ? (
                <label className="mt-4 block">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                    Optional context
                  </span>
                  <textarea
                    value={parq.q7_other_reason_text ?? ''}
                    onChange={(event) =>
                      setParq((current) => ({
                        ...current,
                        q7_other_reason_text: event.target.value.slice(0, 200),
                      }))
                    }
                    className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#6ee7b7]/70"
                    placeholder="A short note for your own record."
                  />
                </label>
              ) : null}

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                  Pregnancy or cycle context
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['not_applicable', 'no', 'pregnant', 'trying_to_conceive', 'postpartum'] as const).map(
                    (status) => (
                      <ToggleButton
                        key={status}
                        active={parq.pregnancy_status === status}
                        onClick={() => setParq((current) => ({ ...current, pregnancy_status: status }))}
                      >
                        {status.replaceAll('_', ' ')}
                      </ToggleButton>
                    )
                  )}
                </div>
                <label className="mt-4 flex items-start gap-3 text-sm text-white/62">
                  <input
                    type="checkbox"
                    checked={parq.cycle_tracking_optin}
                    onChange={(event) =>
                      setParq((current) => ({ ...current, cycle_tracking_optin: event.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-[#6ee7b7]"
                  />
                  Use cycle context to adjust future readiness confidence.
                </label>
              </div>

              <div
                className={`mt-5 rounded-2xl border p-4 ${
                  modifiedModePreview
                    ? 'border-amber-300/30 bg-amber-300/10 text-amber-50'
                    : 'border-[#6ee7b7]/25 bg-[#6ee7b7]/10 text-[#d1fae5]'
                }`}
              >
                <div className="flex gap-3">
                  {modifiedModePreview ? (
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <p className="text-sm leading-6">
                    {modifiedModePreview
                      ? 'Creeda will start in modified mode and keep recommendations conservative until clearance and more data improve confidence.'
                      : 'No safety flag selected. Confidence still starts low until measured context exists.'}
                  </p>
                </div>
              </div>

              {error ? <p className="mt-4 text-sm font-semibold text-amber-200">{error}</p> : null}

              <StepFooter
                nextLabel={isPending ? 'Saving...' : 'Save safety gate'}
                onBack={() => setStep('persona')}
                onNext={submitSafetyGate}
                disabled={isPending}
              />
            </div>
          ) : null}

          {step === 'phase0Complete' && safetyResult?.success ? (
            <div className="py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#6ee7b7]/12 text-[#6ee7b7]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Phase 0 complete
              </p>
              <h2 className="mt-3 text-3xl font-black">
                Your first confidence tier is {safetyResult.confidence.tier}.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                Calibration is now {safetyResult.profileCalibrationPct}%. The next step adds the
                profile data needed for a provisional readiness score.
              </p>
              {safetyResult.modifiedModeActive ? (
                <p className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                  Modified mode is active. Creeda will keep recommendations conservative and use
                  clinician-clearance language where needed.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setStep('identity')}
                className="mt-6 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                Continue to Phase 1
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {step === 'identity' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Phase 1 Identity
              </p>
              <h2 className="mt-3 text-2xl font-black">Profile basics.</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Display name">
                  <TextInput
                    value={phase1.identity.display_name}
                    onChange={(event) =>
                      updatePhase1('identity', { ...phase1.identity, display_name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Date of birth">
                  <TextInput
                    type="date"
                    value={phase1.identity.date_of_birth}
                    onChange={(event) =>
                      updatePhase1('identity', { ...phase1.identity, date_of_birth: event.target.value })
                    }
                  />
                </Field>
                <Field label="Biological sex">
                  <Select
                    value={phase1.identity.biological_sex}
                    onChange={(event) =>
                      updatePhase1('identity', {
                        ...phase1.identity,
                        biological_sex: event.target.value as Phase1FormState['identity']['biological_sex'],
                      })
                    }
                  >
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="intersex">Intersex</option>
                  </Select>
                </Field>
                <Field label="Gender identity">
                  <TextInput
                    value={phase1.identity.gender_identity ?? ''}
                    onChange={(event) =>
                      updatePhase1('identity', { ...phase1.identity, gender_identity: event.target.value })
                    }
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Height cm">
                  <TextInput
                    type="number"
                    min={100}
                    max={230}
                    value={phase1.identity.height_cm}
                    onChange={(event) =>
                      updatePhase1('identity', { ...phase1.identity, height_cm: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Weight kg">
                  <TextInput
                    type="number"
                    min={30}
                    max={200}
                    value={phase1.identity.weight_kg}
                    onChange={(event) =>
                      updatePhase1('identity', { ...phase1.identity, weight_kg: Number(event.target.value) })
                    }
                  />
                </Field>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Dominant hand">
                  <div className="flex flex-wrap gap-2">
                    {(['left', 'right', 'ambidextrous'] as const).map((value) => (
                      <ToggleButton
                        key={value}
                        active={phase1.identity.dominant_hand === value}
                        onClick={() => updatePhase1('identity', { ...phase1.identity, dominant_hand: value })}
                      >
                        {value}
                      </ToggleButton>
                    ))}
                  </div>
                </Field>
                <Field label="Dominant leg">
                  <div className="flex flex-wrap gap-2">
                    {(['left', 'right', 'ambidextrous'] as const).map((value) => (
                      <ToggleButton
                        key={value}
                        active={phase1.identity.dominant_leg === value}
                        onClick={() => updatePhase1('identity', { ...phase1.identity, dominant_leg: value })}
                      >
                        {value}
                      </ToggleButton>
                    ))}
                  </div>
                </Field>
              </div>
              <StepFooter onBack={() => setStep('phase0Complete')} onNext={() => setStep('sport')} nextLabel="Continue" />
            </div>
          ) : null}

          {step === 'sport' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Sport Context
              </p>
              <h2 className="mt-3 text-2xl font-black">Specificity before scoring.</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={persona === 'coach' ? 'Squad sport' : 'Primary sport or activity'}>
                  <TextInput
                    value={phase1.sport.primary_sport}
                    onChange={(event) =>
                      updatePhase1('sport', { ...phase1.sport, primary_sport: event.target.value })
                    }
                  />
                </Field>
                <Field label="Position or focus">
                  <TextInput
                    value={phase1.sport.position ?? ''}
                    onChange={(event) =>
                      updatePhase1('sport', { ...phase1.sport, position: event.target.value })
                    }
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Current level">
                  <Select
                    value={phase1.sport.level}
                    onChange={(event) =>
                      updatePhase1('sport', {
                        ...phase1.sport,
                        level: event.target.value as Phase1FormState['sport']['level'],
                      })
                    }
                  >
                    <option value="starter">Starter</option>
                    <option value="recreational">Recreational</option>
                    <option value="competitive">Competitive</option>
                    <option value="academy">Academy</option>
                    <option value="elite">Elite</option>
                  </Select>
                </Field>
              </div>
              <StepFooter onBack={() => setStep('identity')} onNext={() => setStep('goal')} nextLabel="Continue" />
            </div>
          ) : null}

          {step === 'goal' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Goal Anchor
              </p>
              <h2 className="mt-3 text-2xl font-black">What should Creeda bias toward?</h2>
              <div className="mt-6 grid gap-4">
                <Field label="Primary goal">
                  <Select
                    value={phase1.goal.primary_goal}
                    onChange={(event) =>
                      updatePhase1('goal', {
                        ...phase1.goal,
                        primary_goal: event.target.value as Phase1FormState['goal']['primary_goal'],
                      })
                    }
                  >
                    {GOAL_OPTIONS.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Goal detail">
                  <TextInput
                    value={phase1.goal.goal_detail ?? ''}
                    onChange={(event) => updatePhase1('goal', { ...phase1.goal, goal_detail: event.target.value })}
                    placeholder="Optional"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Target event">
                    <TextInput
                      value={phase1.goal.target_event_name ?? ''}
                      onChange={(event) =>
                        updatePhase1('goal', { ...phase1.goal, target_event_name: event.target.value })
                      }
                      placeholder="Optional"
                    />
                  </Field>
                  <Field label="Event date">
                    <TextInput
                      type="date"
                      value={phase1.goal.target_event_date ?? ''}
                      onChange={(event) =>
                        updatePhase1('goal', {
                          ...phase1.goal,
                          target_event_date: cleanOptional(event.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
              <StepFooter onBack={() => setStep('sport')} onNext={() => setStep(nextAfterGoal)} nextLabel="Continue" />
            </div>
          ) : null}

          {step === 'load' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Load Snapshot
              </p>
              <h2 className="mt-3 text-2xl font-black">Four-week training reality.</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Weekly sessions">
                  <TextInput
                    type="number"
                    min={0}
                    max={14}
                    value={phase1.training_load.weekly_sessions}
                    onChange={(event) =>
                      updatePhase1('training_load', {
                        ...phase1.training_load,
                        weekly_sessions: Number(event.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Average session minutes">
                  <Select
                    value={phase1.training_load.avg_session_minutes}
                    onChange={(event) =>
                      updatePhase1('training_load', {
                        ...phase1.training_load,
                        avg_session_minutes: Number(event.target.value) as Phase1FormState['training_load']['avg_session_minutes'],
                      })
                    }
                  >
                    {[15, 30, 45, 60, 90, 120, 150].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} min
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Typical RPE">
                  <TextInput
                    type="number"
                    min={1}
                    max={10}
                    value={phase1.training_load.typical_rpe}
                    onChange={(event) =>
                      updatePhase1('training_load', {
                        ...phase1.training_load,
                        typical_rpe: Number(event.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Last four weeks">
                  <Select
                    value={phase1.training_load.pattern_4_weeks}
                    onChange={(event) =>
                      updatePhase1('training_load', {
                        ...phase1.training_load,
                        pattern_4_weeks: event.target.value as Phase1FormState['training_load']['pattern_4_weeks'],
                      })
                    }
                  >
                    <option value="same">Mostly the same</option>
                    <option value="more_now">More now than before</option>
                    <option value="less_now">Less now than before</option>
                    <option value="returning_from_break">Returning from break</option>
                  </Select>
                </Field>
              </div>
              <StepFooter onBack={() => setStep('goal')} onNext={() => setStep('ortho')} nextLabel="Continue" />
            </div>
          ) : null}

          {step === 'ortho' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Orthopedic History
              </p>
              <h2 className="mt-3 text-2xl font-black">Pain and injury context.</h2>
              <div className="mt-6 flex flex-wrap gap-2">
                <ToggleButton
                  active={!phase1.has_orthopedic_history}
                  onClick={() => updatePhase1('has_orthopedic_history', false)}
                >
                  Nothing to report
                </ToggleButton>
                <ToggleButton
                  active={phase1.has_orthopedic_history}
                  onClick={() => updatePhase1('has_orthopedic_history', true)}
                >
                  Add one area
                </ToggleButton>
              </div>
              {phase1.has_orthopedic_history ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Body region">
                    <Select
                      value={phase1.orthopedic_entry.body_region}
                      onChange={(event) =>
                        updatePhase1('orthopedic_entry', {
                          ...phase1.orthopedic_entry,
                          body_region: event.target.value,
                        })
                      }
                    >
                      {BODY_REGION_OPTIONS.map((region) => (
                        <option key={region.value} value={region.value}>
                          {region.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Severity">
                    <Select
                      value={phase1.orthopedic_entry.severity}
                      onChange={(event) =>
                        updatePhase1('orthopedic_entry', {
                          ...phase1.orthopedic_entry,
                          severity: event.target.value as Phase1FormState['orthopedic_entry']['severity'],
                        })
                      }
                    >
                      <option value="annoying">Annoying</option>
                      <option value="limited_1_2_weeks">Limited 1-2 weeks</option>
                      <option value="limited_1_2_months">Limited 1-2 months</option>
                      <option value="surgery_required">Surgery required</option>
                    </Select>
                  </Field>
                  <Field label="When it happened">
                    <TextInput
                      type="date"
                      value={phase1.orthopedic_entry.occurred_at_estimate}
                      onChange={(event) =>
                        updatePhase1('orthopedic_entry', {
                          ...phase1.orthopedic_entry,
                          occurred_at_estimate: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Current pain score">
                    <TextInput
                      type="number"
                      min={0}
                      max={10}
                      value={phase1.orthopedic_entry.current_pain_score ?? 0}
                      onChange={(event) =>
                        updatePhase1('orthopedic_entry', {
                          ...phase1.orthopedic_entry,
                          current_pain_score: Number(event.target.value),
                          currently_symptomatic: Number(event.target.value) > 0,
                        })
                      }
                    />
                  </Field>
                  <Field label="Clinician seen">
                    <div className="flex flex-wrap gap-2">
                      <ToggleButton
                        active={!phase1.orthopedic_entry.has_seen_clinician}
                        onClick={() =>
                          updatePhase1('orthopedic_entry', {
                            ...phase1.orthopedic_entry,
                            has_seen_clinician: false,
                            clinician_type: 'none',
                          })
                        }
                      >
                        No
                      </ToggleButton>
                      <ToggleButton
                        active={phase1.orthopedic_entry.has_seen_clinician}
                        onClick={() =>
                          updatePhase1('orthopedic_entry', {
                            ...phase1.orthopedic_entry,
                            has_seen_clinician: true,
                            clinician_type: 'physio',
                          })
                        }
                      >
                        Yes
                      </ToggleButton>
                    </div>
                  </Field>
                  <Field label="Note">
                    <TextInput
                      value={phase1.orthopedic_entry.notes ?? ''}
                      onChange={(event) =>
                        updatePhase1('orthopedic_entry', {
                          ...phase1.orthopedic_entry,
                          notes: event.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              ) : null}
              <StepFooter onBack={() => setStep('load')} onNext={() => setStep('wearable')} nextLabel="Continue" />
            </div>
          ) : null}

          {step === 'squad' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Squad Setup
              </p>
              <h2 className="mt-3 text-2xl font-black">Create the first coach workspace.</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Squad name">
                  <TextInput
                    value={phase1.squad.name}
                    onChange={(event) => updatePhase1('squad', { ...phase1.squad, name: event.target.value })}
                  />
                </Field>
                <Field label="Sport">
                  <TextInput
                    value={phase1.squad.sport}
                    onChange={(event) => updatePhase1('squad', { ...phase1.squad, sport: event.target.value })}
                  />
                </Field>
                <Field label="Level">
                  <TextInput
                    value={phase1.squad.level}
                    onChange={(event) => updatePhase1('squad', { ...phase1.squad, level: event.target.value })}
                  />
                </Field>
                <Field label="Athlete count">
                  <TextInput
                    type="number"
                    min={0}
                    max={500}
                    value={phase1.squad.size_estimate ?? 0}
                    onChange={(event) =>
                      updatePhase1('squad', { ...phase1.squad, size_estimate: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Primary focus">
                  <Select
                    value={phase1.squad.primary_focus}
                    onChange={(event) =>
                      updatePhase1('squad', {
                        ...phase1.squad,
                        primary_focus: event.target.value as Phase1FormState['squad']['primary_focus'],
                      })
                    }
                  >
                    <option value="rehab">Rehab</option>
                    <option value="peak_velocity">Peak velocity</option>
                    <option value="avoid_burnout">Avoid burnout</option>
                    <option value="in_season_maintenance">In-season maintenance</option>
                    <option value="preseason_build">Preseason build</option>
                  </Select>
                </Field>
              </div>
              <StepFooter onBack={() => setStep('goal')} onNext={() => setStep('wearable')} nextLabel="Continue" />
            </div>
          ) : null}

          {step === 'wearable' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Wearable Preference
              </p>
              <h2 className="mt-3 text-2xl font-black">Objective data path.</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Preference">
                  <div className="flex flex-wrap gap-2">
                    <ToggleButton
                      active={phase1.wearable.preference === 'connect_now'}
                      onClick={() =>
                        updatePhase1('wearable', {
                          ...phase1.wearable,
                          preference: 'connect_now',
                          provider: phase1.wearable.provider === 'none' ? 'android_health_connect' : phase1.wearable.provider,
                        })
                      }
                    >
                      Connect now
                    </ToggleButton>
                    <ToggleButton
                      active={phase1.wearable.preference === 'later'}
                      onClick={() => updatePhase1('wearable', { preference: 'later', provider: 'none' })}
                    >
                      Later
                    </ToggleButton>
                  </div>
                </Field>
                <Field label="Provider">
                  <Select
                    value={phase1.wearable.provider}
                    onChange={(event) =>
                      updatePhase1('wearable', {
                        preference: event.target.value === 'none' ? 'later' : phase1.wearable.preference,
                        provider: event.target.value as Phase1FormState['wearable']['provider'],
                      })
                    }
                  >
                    <option value="none">None</option>
                    <option value="apple_health">Apple Health</option>
                    <option value="android_health_connect">Android Health Connect</option>
                    <option value="fitbit">Fitbit</option>
                    <option value="garmin">Garmin</option>
                  </Select>
                </Field>
              </div>
              {error ? <p className="mt-4 text-sm font-semibold text-amber-200">{error}</p> : null}
              <StepFooter
                onBack={() => setStep(persona === 'coach' ? 'squad' : 'ortho')}
                onNext={submitPhase1}
                nextLabel={isPending ? 'Saving...' : 'Finish Phase 1'}
                disabled={isPending}
              />
            </div>
          ) : null}

          {step === 'phase1Complete' && phase1Result?.success ? (
            <div className="py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#6ee7b7]/12 text-[#6ee7b7]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Phase 1 complete
              </p>
              <h2 className="mt-3 text-3xl font-black">
                Calibration is now {phase1Result.profileCalibrationPct}%.
              </h2>
              {phase1Result.readiness ? (
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                  Provisional readiness is {phase1Result.readiness.score}/100 with{' '}
                  {phase1Result.confidence.tier} confidence. {phase1Result.readiness.directive}
                </p>
              ) : (
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                  Your coach workspace is ready for athlete invites, squad load rules, and readiness
                  triage once athletes connect.
                </p>
              )}
              <Link
                href={phase1Result.destination}
                className="mt-6 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
