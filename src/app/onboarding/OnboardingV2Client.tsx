'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Info,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react'
import type {
  ActivityLevel,
  CompetitiveLevel,
  EventPriority,
  MovementPreference,
  OnboardingV2Phase1Submission,
  OnboardingV2PrimaryGoal,
  ParqPlus,
  Persona,
  TimeHorizon,
  TrainingLoadSnapshot,
} from '@creeda/schemas'

import { SportPicker, type SportSelection } from '@/components/onboarding-v2/SportPicker'
import { BodyMap2D } from '@/components/onboarding-v2/BodyMap2D'
import { IdentityForm } from '@/components/onboarding-v2/IdentityForm'
import { GoalForm, type GoalFormState } from '@/components/onboarding-v2/GoalForm'
import { TrainingLoadForm } from '@/components/onboarding-v2/TrainingLoadForm'
import {
  IndividualMovementForm,
  type IndividualMovementState,
} from '@/components/onboarding-v2/IndividualMovementForm'
import { AgeGateForm, getAgeGateOutcome, type AgeGateState } from '@/components/onboarding-v2/AgeGateForm'
import { competitiveLevelToV2, SPORT_BY_ID } from '@/lib/onboarding-v2/sports'

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

type ParqKey =
  | 'q1_heart_condition'
  | 'q2_chest_pain_activity'
  | 'q3_chest_pain_rest'
  | 'q4_dizziness_loc'
  | 'q5_bone_joint_problem'
  | 'q6_bp_heart_meds'
  | 'q7_other_reason'

const PARQ_ITEMS: Array<{ key: ParqKey; label: string; why: string }> = [
  {
    key: 'q1_heart_condition',
    label: 'A doctor has said you have a heart condition.',
    why: 'Heart conditions need physician clearance before high-intensity work — we cap recommendations until you confirm clearance.',
  },
  {
    key: 'q2_chest_pain_activity',
    label: 'You feel chest pain during physical activity.',
    why: 'Activity-induced chest pain is a red-flag symptom; we want you to rule out cardiac causes before pushing intensity.',
  },
  {
    key: 'q3_chest_pain_rest',
    label: 'You have had chest pain while resting.',
    why: 'Resting chest pain warrants a clinical conversation before we ramp load.',
  },
  {
    key: 'q4_dizziness_loc',
    label: 'You lose balance from dizziness or have lost consciousness.',
    why: 'Syncope or unexplained dizziness is unsafe to train through without a check-up.',
  },
  {
    key: 'q5_bone_joint_problem',
    label: 'You have a bone or joint issue that could worsen with activity.',
    why: 'We will tighten asymmetry thresholds and avoid loading the affected pattern until you self-clear.',
  },
  {
    key: 'q6_bp_heart_meds',
    label: 'A doctor currently prescribes blood pressure or heart medication.',
    why: 'Some BP/heart medications change HR + perceived exertion responses; we calibrate readiness accordingly.',
  },
  {
    key: 'q7_other_reason',
    label: 'You know another reason you should not do physical activity.',
    why: 'If anything else gives you pause, flag it. We will keep prescriptions conservative and add a note for your record.',
  },
]

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
  ageGate: AgeGateState
  sport: SportSelection
  competitiveLevelOverride?: CompetitiveLevel
  individual: IndividualMovementState
  goal: GoalFormState
  training_load: TrainingLoadSnapshot
  orthopedic_history: OnboardingV2Phase1Submission['orthopedic_history']
  wearable: OnboardingV2Phase1Submission['wearable']
  squad: NonNullable<OnboardingV2Phase1Submission['squad']>
}

function todayMinusYears(years: number) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

function defaultPhase1State(): Phase1FormState {
  return {
    identity: {
      display_name: '',
      date_of_birth: todayMinusYears(25),
      biological_sex: 'prefer_not_to_say',
      gender_identity: '',
      height_cm: 170,
      weight_kg: 70,
      dominant_hand: 'right',
      dominant_leg: 'right',
    },
    ageGate: {
      date_of_birth: todayMinusYears(25),
      guardian_email: '',
    },
    sport: {
      sportId: 'cricket',
      sportLabel: 'Cricket',
      positionId: undefined,
      positionLabel: undefined,
      customPosition: undefined,
      competitiveLevel: 'club',
      yearsInSport: 1,
      secondarySportId: undefined,
    },
    competitiveLevelOverride: 'club',
    individual: {
      movement_preferences: [],
      activity_level: 'light',
      years_active: 1,
    },
    goal: {
      primary_goal: 'sport_performance',
      goal_detail: undefined,
      time_horizon: 'twelve_weeks',
      has_target_event: false,
    },
    training_load: {
      weekly_sessions: 3,
      avg_session_minutes: 60,
      typical_rpe: 6,
      pattern_4_weeks: 'same',
    },
    orthopedic_history: [],
    wearable: { preference: 'later', provider: 'none' },
    squad: {
      name: '',
      sport: '',
      level: 'Academy',
      size_estimate: 12,
      primary_focus: 'in_season_maintenance',
    },
  }
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

function defaultGoalForPersona(persona: Persona): OnboardingV2PrimaryGoal {
  switch (persona) {
    case 'athlete':
      return 'sport_performance'
    case 'individual':
      return 'feel_better'
    case 'coach':
      return 'coach_in_season'
  }
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
  const [step, setStep] = useState<Step>(
    initialPhase > 1 ? 'identity' : initialPhase > 0 ? 'safety' : 'persona'
  )
  const [parq, setParq] = useState<ParqPlus>(defaultParq)
  const [whyOpen, setWhyOpen] = useState<Set<ParqKey>>(new Set())
  const [startedAt] = useState(() => Date.now())
  const [phase1StartedAt] = useState(() => Date.now())
  const [safetyResult, setSafetyResult] = useState<SafetyGateSuccess | null>(null)
  const [phase1Result, setPhase1Result] = useState<Phase1Success | null>(null)
  const [phase1, setPhase1] = useState<Phase1FormState>(() => defaultPhase1State())
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

  function selectPersona(next: Persona) {
    setPersona(next)
    // Sync the default goal to the persona's preferred goal — but only if the
    // user hasn't already moved away from the prior default.
    setPhase1((current) => ({
      ...current,
      goal: { ...current.goal, primary_goal: defaultGoalForPersona(next) },
    }))
  }

  function setAgeGate(next: AgeGateState) {
    setPhase1((current) => ({
      ...current,
      ageGate: next,
      identity: { ...current.identity, date_of_birth: next.date_of_birth },
    }))
  }

  function updatePhase1<K extends keyof Phase1FormState>(key: K, value: Phase1FormState[K]) {
    setPhase1((current) => ({ ...current, [key]: value }))
  }

  function toggleWhy(key: ParqKey) {
    setWhyOpen((set) => {
      const next = new Set(set)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function submitSafetyGate() {
    setError(null)
    const ageOutcome = getAgeGateOutcome(phase1.ageGate)
    if (ageOutcome.status === 'incomplete') {
      setError('Add a date of birth so we can apply age-appropriate guardrails.')
      return
    }
    if (ageOutcome.status === 'blocked') {
      setError('Creeda is not built for users under 13. Please come back when you’re older.')
      return
    }
    if (ageOutcome.status === 'guardian_required') {
      const guardian = phase1.ageGate.guardian_email?.trim()
      if (!guardian || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guardian)) {
        setError('Please add a guardian email so we can request consent.')
        return
      }
    }

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
    const isIndividual = persona === 'individual'
    const isCoach = persona === 'coach'

    // Compose sport block:
    // - Athlete uses SportPicker selection.
    // - Individual ships movement_preferences and a synthetic primary_sport string.
    // - Coach uses squad sport.
    const sportLabel = isIndividual
      ? phase1.individual.movement_preferences[0] ?? 'general'
      : phase1.sport.sportLabel || phase1.sport.sportId

    const sportPosition = isIndividual
      ? undefined
      : phase1.sport.positionLabel ?? phase1.sport.customPosition

    const v2Level = isIndividual
      ? 'recreational'
      : competitiveLevelToV2(phase1.sport.competitiveLevel)

    const goalPayload = {
      primary_goal: phase1.goal.primary_goal,
      goal_detail: cleanOptional(phase1.goal.goal_detail),
      time_horizon: phase1.goal.time_horizon,
      target_event_name: phase1.goal.has_target_event
        ? cleanOptional(phase1.goal.target_event_name)
        : undefined,
      target_event_date: phase1.goal.has_target_event ? phase1.goal.target_event_date : undefined,
      target_event_sport: phase1.goal.has_target_event
        ? cleanOptional(phase1.goal.target_event_sport ?? sportLabel)
        : undefined,
      target_event_priority: phase1.goal.has_target_event
        ? phase1.goal.target_event_priority
        : undefined,
    }

    const payload = {
      phase: 1 as const,
      persona,
      source: 'web' as const,
      identity: {
        ...phase1.identity,
        display_name: phase1.identity.display_name.trim() || 'Creeda athlete',
        gender_identity: cleanOptional(phase1.identity.gender_identity),
      },
      sport: {
        primary_sport: typeof sportLabel === 'string' ? sportLabel : 'general',
        position: sportPosition,
        level: v2Level,
        primary_sport_id: isIndividual ? undefined : phase1.sport.sportId,
        position_id: isIndividual ? undefined : phase1.sport.positionId,
        competitive_level: isIndividual ? undefined : phase1.sport.competitiveLevel,
        years_in_sport: isIndividual ? undefined : phase1.sport.yearsInSport,
        secondary_sport_id: isIndividual ? undefined : phase1.sport.secondarySportId,
        movement_preferences: isIndividual ? phase1.individual.movement_preferences : undefined,
        activity_level: isIndividual ? phase1.individual.activity_level : undefined,
        years_active: isIndividual ? phase1.individual.years_active : undefined,
      },
      goal: goalPayload,
      training_load: isCoach ? undefined : phase1.training_load,
      orthopedic_history: isCoach ? [] : phase1.orthopedic_history,
      wearable: phase1.wearable,
      squad: isCoach
        ? {
            ...phase1.squad,
            name: phase1.squad.name.trim() || 'My squad',
            sport: phase1.squad.sport.trim() || 'General',
          }
        : undefined,
      completion_seconds: Math.round((Date.now() - phase1StartedAt) / 1000),
    }

    return payload as OnboardingV2Phase1Submission
  }

  function submitPhase1() {
    setError(null)
    if (!phase1.identity.display_name.trim()) {
      setError('Please add a name so we know who we’re working with.')
      return
    }
    if (persona === 'individual' && phase1.individual.movement_preferences.length === 0) {
      setError('Pick at least one type of movement you enjoy.')
      return
    }
    if (persona === 'athlete' && !phase1.sport.sportId) {
      setError('Pick a sport so we can calibrate position-specific norms.')
      return
    }
    if (persona === 'coach' && !phase1.squad.name.trim()) {
      setError('Add a name for your squad — even a working title is fine.')
      return
    }

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

  const nextAfterGoal: Step = persona === 'coach' ? 'squad' : 'load'

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
          {/* ── Persona ─────────────────────────────────────── */}
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
                      onClick={() => selectPersona(option.id)}
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

          {/* ── Safety gate (PARQ + DOB + pregnancy) ────────── */}
          {step === 'safety' ? (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                    Phase 0 · Safety gate
                  </p>
                  <h2 className="mt-3 text-2xl font-black">A few medical questions first.</h2>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    This is the same screening a sports clinic would run. It does not diagnose
                    anything — it tells Creeda whether to start in a safer mode.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <Icon className="h-5 w-5 text-[#6ee7b7]" />
                  <span className="text-sm font-bold">{selectedPersona.title}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {PARQ_ITEMS.map((item) => {
                  const isYes = Boolean(parq[item.key])
                  const showWhy = whyOpen.has(item.key)
                  return (
                    <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold leading-6 text-white/82">{item.label}</p>
                      <div className="mt-3 flex gap-2">
                        <ToggleButton
                          active={!isYes}
                          onClick={() => setParq((current) => ({ ...current, [item.key]: false }))}
                        >
                          No
                        </ToggleButton>
                        <ToggleButton
                          active={isYes}
                          onClick={() => setParq((current) => ({ ...current, [item.key]: true }))}
                        >
                          Yes
                        </ToggleButton>
                        <button
                          type="button"
                          onClick={() => toggleWhy(item.key)}
                          className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white/70"
                        >
                          <Info className="h-3.5 w-3.5" />
                          {showWhy ? 'Hide' : 'Why we ask'}
                        </button>
                      </div>
                      {showWhy ? (
                        <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[12px] leading-relaxed text-white/55">
                          {item.why}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
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

              <details className="mt-4 group rounded-2xl border border-white/10 bg-white/[0.03] p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/55 transition hover:text-white/82">
                  <span>Pregnancy or cycle context (optional)</span>
                  <span className="text-white/40 transition group-open:rotate-180">▾</span>
                </summary>
                <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                  Calibrates RED-S risk + readiness modelling. Open only if it applies to you. Stored
                  encrypted, never displayed to coaches.
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
              </details>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                  Date of birth
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                  Drives age-appropriate baselines, guardian consent under 18, and modified mode for 65+.
                </p>
                <div className="mt-2">
                  <AgeGateForm value={phase1.ageGate} onChange={setAgeGate} />
                </div>
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
                      ? 'Creeda will start in modified mode — every directive caps at "Maintain" until a doctor clears you.'
                      : 'No safety flag. Confidence still starts low until measured context exists.'}
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

          {/* ── Phase 0 complete ────────────────────────────── */}
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

          {/* ── Identity ────────────────────────────────────── */}
          {step === 'identity' ? (
            <div className="py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Phase 1.1 · Identity
              </p>
              <h2 className="mt-3 text-2xl font-black">
                {persona === 'athlete'
                  ? 'Tell us who we’re working with.'
                  : persona === 'individual'
                    ? 'Let’s get to know you.'
                    : 'Tell us about yourself, Coach.'}
              </h2>
              <div className="mt-6">
                <IdentityForm
                  value={phase1.identity}
                  onChange={(next) => updatePhase1('identity', next)}
                />
              </div>
              {error ? <p className="mt-4 text-sm font-semibold text-amber-200">{error}</p> : null}
              <StepFooter
                onBack={() => setStep('phase0Complete')}
                onNext={() => {
                  if (!phase1.identity.display_name.trim()) {
                    setError('Add a name so we know who we’re working with.')
                    return
                  }
                  setError(null)
                  setStep('sport')
                }}
                nextLabel="Continue"
              />
            </div>
          ) : null}

          {/* ── Sport / Movement ────────────────────────────── */}
          {step === 'sport' ? (
            <div className="py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Phase 1.2 · {persona === 'individual' ? 'Movement preference' : 'Sport context'}
              </p>
              <h2 className="mt-3 text-2xl font-black">
                {persona === 'athlete'
                  ? 'Sport, role, and history.'
                  : persona === 'individual'
                    ? 'What kind of movement do you actually enjoy?'
                    : 'What do you coach?'}
              </h2>
              <div className="mt-6">
                {persona === 'individual' ? (
                  <IndividualMovementForm
                    value={phase1.individual}
                    onChange={(next) => updatePhase1('individual', next)}
                  />
                ) : (
                  <SportPicker
                    value={phase1.sport}
                    onChange={(next) => updatePhase1('sport', next)}
                  />
                )}
              </div>
              {error ? <p className="mt-4 text-sm font-semibold text-amber-200">{error}</p> : null}
              <StepFooter
                onBack={() => setStep('identity')}
                onNext={() => {
                  if (persona === 'individual' && phase1.individual.movement_preferences.length === 0) {
                    setError('Pick at least one type of movement you enjoy.')
                    return
                  }
                  setError(null)
                  setStep('goal')
                }}
                nextLabel="Continue"
              />
            </div>
          ) : null}

          {/* ── Goal ────────────────────────────────────────── */}
          {step === 'goal' ? (
            <div className="py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Phase 1.3 · Goal anchor
              </p>
              <h2 className="mt-3 text-2xl font-black">What are we working toward?</h2>
              <div className="mt-6">
                <GoalForm
                  persona={persona}
                  value={phase1.goal}
                  onChange={(next) => updatePhase1('goal', next)}
                />
              </div>
              {error ? <p className="mt-4 text-sm font-semibold text-amber-200">{error}</p> : null}
              <StepFooter
                onBack={() => setStep('sport')}
                onNext={() => setStep(nextAfterGoal)}
                nextLabel="Continue"
              />
            </div>
          ) : null}

          {/* ── Training load (athlete + individual) ────────── */}
          {step === 'load' ? (
            <div className="py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Phase 1.4 · Training load snapshot
              </p>
              <h2 className="mt-3 text-2xl font-black">
                {persona === 'individual'
                  ? 'How active have you actually been?'
                  : 'Help us calibrate your chronic load.'}
              </h2>
              <p className="mt-2 text-sm text-white/55">
                We back-fill 4 weeks of self-reported load so your ACWR (acute-to-chronic workload
                ratio) is computable from Day 1.
              </p>
              <div className="mt-6">
                <TrainingLoadForm
                  value={phase1.training_load}
                  onChange={(next) => updatePhase1('training_load', next)}
                />
              </div>
              <StepFooter
                onBack={() => setStep('goal')}
                onNext={() => setStep('ortho')}
                nextLabel="Continue"
              />
            </div>
          ) : null}

          {/* ── Body map / orthopedic ────────────────────────── */}
          {step === 'ortho' ? (
            <div className="py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Phase 1.5 · 3-year orthopedic history
              </p>
              <h2 className="mt-3 text-2xl font-black">
                Tap any region you have had trouble with.
              </h2>
              <p className="mt-2 text-sm text-white/55">
                Anything that stopped training for a week or more in the last 3 years. Multiple
                entries per region are fine (e.g. ACL surgery + meniscus on the same knee).
              </p>
              <div className="mt-6">
                <BodyMap2D
                  entries={phase1.orthopedic_history}
                  onChange={(next) => updatePhase1('orthopedic_history', next)}
                />
              </div>
              <StepFooter
                onBack={() => setStep('load')}
                onNext={() => setStep('wearable')}
                nextLabel="Continue"
              />
            </div>
          ) : null}

          {/* ── Coach squad setup ───────────────────────────── */}
          {step === 'squad' ? (
            <div className="py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Phase 1.4 · Squad setup
              </p>
              <h2 className="mt-3 text-2xl font-black">Build your squad foundation.</h2>
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                    Squad name
                  </span>
                  <input
                    type="text"
                    maxLength={80}
                    value={phase1.squad.name}
                    onChange={(event) =>
                      updatePhase1('squad', { ...phase1.squad, name: event.target.value.slice(0, 80) })
                    }
                    placeholder="e.g. U19 Cricket — Mumbai Academy"
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                    Sport
                  </span>
                  <select
                    value={phase1.squad.sport}
                    onChange={(event) =>
                      updatePhase1('squad', { ...phase1.squad, sport: event.target.value })
                    }
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 text-sm font-bold text-white outline-none transition focus:border-[#6ee7b7]/70"
                  >
                    <option value="">Select sport</option>
                    {Object.values(SPORT_BY_ID).map((sport) => (
                      <option key={sport.id} value={sport.label}>
                        {sport.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                      Level
                    </span>
                    <input
                      type="text"
                      maxLength={60}
                      value={phase1.squad.level}
                      onChange={(event) =>
                        updatePhase1('squad', {
                          ...phase1.squad,
                          level: event.target.value.slice(0, 60),
                        })
                      }
                      placeholder="Academy / U19 / 1st team"
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                      Approx. squad size
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={phase1.squad.size_estimate ?? 0}
                      onChange={(event) =>
                        updatePhase1('squad', {
                          ...phase1.squad,
                          size_estimate: Math.max(0, Math.min(500, Number(event.target.value) || 0)),
                        })
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#6ee7b7]/70"
                    />
                  </label>
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                    Primary focus
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(
                      [
                        { id: 'preseason_build' as const, label: 'Preseason build' },
                        { id: 'in_season_maintenance' as const, label: 'In-season' },
                        { id: 'peak_velocity' as const, label: 'Peak velocity' },
                        { id: 'avoid_burnout' as const, label: 'Avoid burnout' },
                        { id: 'rehab' as const, label: 'Rehab returns' },
                      ]
                    ).map((option) => {
                      const active = phase1.squad.primary_focus === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            updatePhase1('squad', { ...phase1.squad, primary_focus: option.id })
                          }
                          className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                            active
                              ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                              : 'border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <StepFooter
                onBack={() => setStep('goal')}
                onNext={() => setStep('wearable')}
                nextLabel="Continue"
              />
            </div>
          ) : null}

          {/* ── Wearable ────────────────────────────────────── */}
          {step === 'wearable' ? (
            <div className="py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Phase 1.6 · Wearable
              </p>
              <h2 className="mt-3 text-2xl font-black">Connect a wearable, or skip.</h2>
              <p className="mt-2 text-sm text-white/55">
                Wearable HRV + sleep raises your confidence tier instantly. No wearable? Creeda
                works phone-only — about 40% of our users do.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(['apple_health', 'android_health_connect', 'fitbit', 'garmin', 'none'] as const).map(
                  (provider) => {
                    const labels: Record<typeof provider, string> = {
                      apple_health: 'Apple Health',
                      android_health_connect: 'Android Health Connect',
                      fitbit: 'Fitbit',
                      garmin: 'Garmin',
                      none: "I don't wear one",
                    } as Record<string, string>
                    const active = phase1.wearable.provider === provider
                    return (
                      <button
                        key={provider}
                        type="button"
                        onClick={() =>
                          updatePhase1('wearable', {
                            preference: provider === 'none' ? 'later' : 'connect_now',
                            provider,
                          })
                        }
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                          active
                            ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                            : 'border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
                        }`}
                      >
                        {labels[provider]}
                      </button>
                    )
                  }
                )}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                OAuth flow ships in a follow-up — for now we capture your preference so the engine
                weights confidence correctly.
              </p>
              {error ? <p className="mt-4 text-sm font-semibold text-amber-200">{error}</p> : null}
              <StepFooter
                onBack={() => setStep(persona === 'coach' ? 'squad' : 'ortho')}
                onNext={submitPhase1}
                nextLabel={isPending ? 'Saving…' : 'Finish Phase 1'}
                disabled={isPending}
              />
            </div>
          ) : null}

          {/* ── Phase 1 complete ────────────────────────────── */}
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
                  Run one movement baseline next to unlock the first body-specific finding.
                </p>
              ) : (
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                  Your coach workspace is ready for athlete invites, squad load rules, and readiness
                  triage once athletes connect.
                </p>
              )}
              <Link
                href={
                  persona === 'coach'
                    ? phase1Result.destination
                    : `/${persona}/scan/analyze?sport=${phase1.sport.sportId}&baseline=onboarding_v2&source=web`
                }
                className="mt-6 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                {persona === 'coach' ? 'Open dashboard' : 'Run movement baseline'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {persona !== 'coach' ? (
                <>
                  <Link
                    href="/onboarding/phase-2"
                    className="ml-0 mt-3 inline-flex h-13 items-center justify-center rounded-2xl border border-[#6ee7b7]/30 px-5 text-sm font-bold text-[#d1fae5] transition hover:bg-[#6ee7b7]/10 sm:ml-3"
                  >
                    Continue Phase 2 diagnostics
                  </Link>
                  <Link
                    href={phase1Result.destination}
                    className="ml-0 mt-3 inline-flex h-13 items-center justify-center rounded-2xl border border-white/10 px-5 text-sm font-bold text-white/70 transition hover:bg-white/[0.06] sm:ml-3"
                  >
                    Skip to dashboard
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
