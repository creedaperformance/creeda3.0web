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
import type { ParqPlus, Persona } from '@creeda/schemas'

import {
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
    detail: 'Sharper training calls with load, recovery, sport context, and confidence tiers.',
    metric: 'Performance mode',
    icon: Dumbbell,
  },
  {
    id: 'individual',
    title: 'Individual',
    detail: 'Plain-language guidance for health, movement, sleep, strength, and consistency.',
    metric: 'Health mode',
    icon: UserRound,
  },
  {
    id: 'coach',
    title: 'Coach',
    detail: 'A squad-first route for triage, compliance, readiness, and athlete drill-down.',
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
  {
    key: 'q1_heart_condition',
    label: 'A doctor has said you have a heart condition.',
  },
  {
    key: 'q2_chest_pain_activity',
    label: 'You feel chest pain during physical activity.',
  },
  {
    key: 'q3_chest_pain_rest',
    label: 'You have had chest pain while not doing physical activity.',
  },
  {
    key: 'q4_dizziness_loc',
    label: 'You lose balance because of dizziness or have lost consciousness.',
  },
  {
    key: 'q5_bone_joint_problem',
    label: 'You have a bone or joint issue that could worsen with activity.',
  },
  {
    key: 'q6_bp_heart_meds',
    label: 'A doctor currently prescribes blood pressure or heart medication.',
  },
  {
    key: 'q7_other_reason',
    label: 'You know another reason you should not do physical activity.',
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

type Step = 'persona' | 'safety' | 'complete'

type SafetyGateSuccess = Extract<
  Awaited<ReturnType<typeof submitOnboardingV2SafetyGate>>,
  { success: true }
>

type SubmitResult = SafetyGateSuccess | null

function anyParqYes(parq: ParqPlus) {
  return PARQ_ITEMS.some((item) => Boolean(parq[item.key]))
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
  const [step, setStep] = useState<Step>(initialPhase > 0 ? 'safety' : 'persona')
  const [parq, setParq] = useState<ParqPlus>(defaultParq)
  const [startedAt] = useState(() => Date.now())
  const [result, setResult] = useState<SubmitResult>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedPersona = useMemo(
    () => PERSONA_OPTIONS.find((option) => option.id === persona) ?? PERSONA_OPTIONS[1],
    [persona]
  )

  useEffect(() => {
    void trackOnboardingV2Event({
      event_name: 'onb.screen.viewed',
      persona,
      phase: step === 'persona' ? 0 : 1,
      screen: step === 'persona' ? 'persona_selector' : 'safety_gate',
      source: 'web',
      metadata: {},
    })
  }, [persona, step])

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

      setResult(response as SafetyGateSuccess)
      setStep('complete')
    })
  }

  const Icon = selectedPersona.icon
  const modifiedModePreview = anyParqYes(parq)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,#020617,#08111f)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6ee7b7]/25 bg-[#6ee7b7]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-[#a7f3d0]">
            <ShieldCheck className="h-4 w-4" />
            Onboarding v2
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            Build confidence before we score you.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/62">
            Creeda now routes onboarding by persona and shows calibration openly.
            The first gate is safety, then the profile gets smarter through measured inputs.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">
                  Profile calibration
                </p>
                <p className="mt-2 text-2xl font-black">
                  {result?.success ? result.profileCalibrationPct : initialCalibrationPct}%
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6ee7b7]/12 text-[#6ee7b7]">
                <HeartPulse className="h-7 w-7" />
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#6ee7b7]"
                style={{
                  width: `${result?.success ? result.profileCalibrationPct : initialCalibrationPct}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/48">
              First-day scores stay low-confidence until enough sleep, load,
              movement, and check-in data exists.
            </p>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-[#030712]/86 p-4 shadow-2xl shadow-black/30 sm:p-6">
          {step === 'persona' ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#38bdf8]">
                Pick your route
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">
                Same engine. Different experience.
              </h2>
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
                  <h2 className="mt-3 text-2xl font-black tracking-tight">
                    Seven quick safety checks.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    This does not diagnose anything. It only decides whether Creeda should use a
                    modified, safer starting mode and recommend clinician clearance.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <Icon className="h-5 w-5 text-[#6ee7b7]" />
                  <span className="text-sm font-bold">{selectedPersona.title}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {PARQ_ITEMS.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
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
                        onClick={() =>
                          setParq((current) => ({ ...current, pregnancy_status: status }))
                        }
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
                      setParq((current) => ({
                        ...current,
                        cycle_tracking_optin: event.target.checked,
                      }))
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
                      ? 'Creeda will start you in modified mode and keep early recommendations conservative until clearance and more data improve confidence.'
                      : 'No safety flag selected. Creeda will still show low confidence until your profile has measured context.'}
                  </p>
                </div>
              </div>

              {error ? <p className="mt-4 text-sm font-semibold text-amber-200">{error}</p> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep('persona')}
                  className="h-13 rounded-2xl border border-white/10 px-5 text-sm font-bold text-white/72 transition hover:bg-white/[0.06]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitSafetyGate}
                  disabled={isPending}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Saving...' : 'Save safety gate'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {step === 'complete' && result?.success ? (
            <div className="py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#6ee7b7]/12 text-[#6ee7b7]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
                Phase 0 complete
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Your first confidence tier is {result.confidence.tier}.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                Calibration is now {result.profileCalibrationPct}%. Continue into the existing
                Phase 1 setup while the deeper movement scan, capacity tests, and week-one
                diagnostics come online behind the same schema.
              </p>
              {result.modifiedModeActive ? (
                <p className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                  Modified mode is active. Creeda will keep recommendations conservative and use
                  clinician-clearance language where needed.
                </p>
              ) : null}
              <Link
                href={result.destination}
                className="mt-6 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                Continue to Phase 1
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
