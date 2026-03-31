'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  Battery,
  CheckCircle2,
  Droplets,
  Flame,
  Footprints,
  Heart,
  Info,
  Moon,
  Pencil,
  Timer,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logIndividualSignal } from '../actions'

type StepType = 'card' | 'number' | 'text'
type CompletionValue = 'missed' | 'partial' | 'complete' | 'crushed'

interface CardOption {
  label: string
  value: string | number
  emoji: string
}

interface StepDef {
  id: keyof SignalState
  title: string
  subtitle: string
  icon: typeof Moon
  color: string
  type: StepType
  options?: CardOption[]
  numberConfig?: { min: number; max: number; step?: number; unit: string; placeholder: string }
  textConfig?: { placeholder: string; maxLength: number }
  xp: number
}

type SignalState = {
  sleep_quality: number
  energy_level: number
  stress_level: number
  recovery_feel: number
  soreness_level: number
  session_completion: CompletionValue
  training_minutes: number
  session_rpe: number
  steps: number
  hydration_liters: number
  session_notes: string
}

const defaultState: SignalState = {
  sleep_quality: 3,
  energy_level: 3,
  stress_level: 3,
  recovery_feel: 3,
  soreness_level: 2,
  session_completion: 'partial',
  training_minutes: 30,
  session_rpe: 5,
  steps: 7000,
  hydration_liters: 2.5,
  session_notes: '',
}

type LogResult = {
  score: number
  status: string
  reason: string
  action: string
}

function buildSteps(completion: CompletionValue): StepDef[] {
  const base: StepDef[] = [
    {
      id: 'sleep_quality',
      title: 'How did you sleep last night?',
      subtitle: 'Just your honest read. No need to overthink it.',
      icon: Moon,
      color: '#818CF8',
      type: 'card',
      options: [
        { label: 'Terrible', value: 1, emoji: '😴' },
        { label: 'Poor', value: 2, emoji: '😕' },
        { label: 'Okay', value: 3, emoji: '🙂' },
        { label: 'Good', value: 4, emoji: '😊' },
        { label: 'Excellent', value: 5, emoji: '🌟' },
      ],
      xp: 20,
    },
    {
      id: 'energy_level',
      title: 'How is your energy right now?',
      subtitle: 'Think about how ready you feel for the day ahead.',
      icon: Battery,
      color: '#34D399',
      type: 'card',
      options: [
        { label: 'Empty', value: 1, emoji: '🪫' },
        { label: 'Low', value: 2, emoji: '🔋' },
        { label: 'Okay', value: 3, emoji: '⚡' },
        { label: 'Good', value: 4, emoji: '🔥' },
        { label: 'Very high', value: 5, emoji: '💥' },
      ],
      xp: 20,
    },
    {
      id: 'stress_level',
      title: 'How stressed do you feel?',
      subtitle: 'This can be work stress, life stress, or mental load.',
      icon: Heart,
      color: '#FB923C',
      type: 'card',
      options: [
        { label: 'Very stressed', value: 5, emoji: '😰' },
        { label: 'Stressed', value: 4, emoji: '😟' },
        { label: 'A little', value: 3, emoji: '😐' },
        { label: 'Calm', value: 2, emoji: '😌' },
        { label: 'Very calm', value: 1, emoji: '😎' },
      ],
      xp: 20,
    },
    {
      id: 'recovery_feel',
      title: 'How recovered does your body feel?',
      subtitle: 'Think about how fresh, heavy, or flat your body feels.',
      icon: Activity,
      color: '#4ADE80',
      type: 'card',
      options: [
        { label: 'Worn out', value: 1, emoji: '🩹' },
        { label: 'Tired', value: 2, emoji: '😩' },
        { label: 'Normal', value: 3, emoji: '👍' },
        { label: 'Fresh', value: 4, emoji: '💪' },
        { label: 'Fully ready', value: 5, emoji: '⚡' },
      ],
      xp: 20,
    },
    {
      id: 'soreness_level',
      title: 'How sore or stiff do you feel?',
      subtitle: 'This includes tightness from work, travel, walking, or training.',
      icon: Flame,
      color: '#F87171',
      type: 'card',
      options: [
        { label: 'Very sore', value: 5, emoji: '🔴' },
        { label: 'Sore', value: 4, emoji: '🟠' },
        { label: 'A little', value: 3, emoji: '🟡' },
        { label: 'Barely', value: 2, emoji: '🟢' },
        { label: 'None', value: 1, emoji: '✅' },
      ],
      xp: 20,
    },
    {
      id: 'session_completion',
      title: 'How active were you today?',
      subtitle: 'Pick the option that best matches your real day.',
      icon: CheckCircle2,
      color: '#A78BFA',
      type: 'card',
      options: [
        { label: 'Mostly sedentary', value: 'missed', emoji: '🛋️' },
        { label: 'Got some movement', value: 'partial', emoji: '🚶' },
        { label: 'Completed my plan', value: 'complete', emoji: '✅' },
        { label: 'Did more than planned', value: 'crushed', emoji: '🔥' },
      ],
      xp: 25,
    },
  ]

  const movementSteps: StepDef[] =
    completion === 'missed'
      ? []
      : [
          {
            id: 'training_minutes',
            title:
              completion === 'partial'
                ? 'About how many minutes of intentional movement did you do?'
                : 'About how many minutes did you train or move on purpose?',
            subtitle: 'Walking, gym work, home workouts, sport, yoga, or mobility all count.',
            icon: Timer,
            color: '#38BDF8',
            type: 'number',
            numberConfig: { min: 0, max: 180, unit: 'minutes', placeholder: '30' },
            xp: 15,
          },
          {
            id: 'session_rpe',
            title:
              completion === 'partial'
                ? 'How demanding did that movement feel on your body?'
                : 'How demanding did the day feel on your body?',
            subtitle: '1 is very easy. 10 is extremely hard.',
            icon: Zap,
            color: '#F97316',
            type: 'card',
            options: Array.from({ length: 10 }, (_, index) => {
              const n = index + 1
              return {
                label: `${n}`,
                value: n,
                emoji: n <= 3 ? '🟢' : n <= 6 ? '🟡' : n <= 8 ? '🟠' : '🔴',
              }
            }),
            xp: 15,
          },
        ]

  return [
    ...base,
    ...movementSteps,
    {
      id: 'hydration_liters',
      title: 'How much water did you drink?',
      subtitle: 'A rough estimate is good enough.',
      icon: Droplets,
      color: '#38BDF8',
      type: 'number',
      numberConfig: { min: 0, max: 10, step: 0.5, unit: 'liters', placeholder: '2.5' },
      xp: 15,
    },
    {
      id: 'steps',
      title: 'About how many steps did you get today?',
      subtitle: 'Use your phone or watch if you have one. Otherwise, give your best estimate.',
      icon: Footprints,
      color: '#60A5FA',
      type: 'number',
      numberConfig: { min: 0, max: 50000, unit: 'steps', placeholder: '7000' },
      xp: 10,
    },
    {
      id: 'session_notes',
      title: 'Anything else CREEDA should know?',
      subtitle: 'Optional. This helps explain an unusual day.',
      icon: Pencil,
      color: '#94A3B8',
      type: 'text',
      textConfig: { placeholder: 'e.g. long commute, poor sleep, extra walk, lower back stiffness', maxLength: 300 },
      xp: 10,
    },
  ]
}

export default function IndividualLoggingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [signals, setSignals] = useState<SignalState>(defaultState)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<LogResult | null>(null)

  const steps = useMemo(() => buildSteps(signals.session_completion), [signals.session_completion])
  const safeCurrentStep = Math.min(currentStep, steps.length - 1)
  const step = steps[safeCurrentStep]
  const totalXp = useMemo(() => steps.reduce((sum, item) => sum + item.xp, 0), [steps])
  const progress = result ? 100 : Math.round((safeCurrentStep / Math.max(1, steps.length)) * 100)
  const xpEarned = result ? totalXp : steps.slice(0, safeCurrentStep).reduce((sum, item) => sum + item.xp, 0)

  const updateSignal = (key: keyof SignalState, value: SignalState[keyof SignalState]) => {
    setSignals((prev) => ({ ...prev, [key]: value }))
  }

  const handleCardSelect = (value: string | number) => {
    updateSignal(step.id, value as never)
    if (safeCurrentStep < steps.length - 1) {
      setTimeout(() => setCurrentStep((value) => value + 1), 180)
    }
  }

  const handleNext = () => {
    if (safeCurrentStep < steps.length - 1) {
      setCurrentStep((value) => value + 1)
      return
    }
    void handleSubmit()
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((value) => value - 1)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    const response = await logIndividualSignal(signals)

    if (response.error) {
      toast.error(response.error)
      setSaving(false)
      return
    }

    setResult(response.result as LogResult)
    setSaving(false)
    toast.success('Daily guidance updated')
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#070A11] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-5 z-10"
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/20 text-primary text-xs font-bold">
              <CheckCircle2 size={14} />
              Daily direction updated · +{totalXp} XP
            </div>
          </div>

          <div className="p-8 rounded-[32px] bg-white/[0.04] border border-primary/15 shadow-[0_0_40px_rgba(245,124,0,0.08)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 mb-2">Readiness today</p>
            <h2 className="text-7xl font-black text-primary mb-6">{result.score}%</h2>

            <div className="text-left space-y-4">
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                  <Zap size={12} /> Status: {result.status}
                </p>
                <p className="text-sm font-bold text-white mb-1">{result.reason}</p>
                <p className="text-xs text-white/50 leading-relaxed">{result.action}</p>
              </div>

              <div className="flex items-start gap-3 p-3">
                <Info size={14} className="text-primary/30 mt-0.5 shrink-0" />
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Keep check-ins simple and consistent. CREEDA learns your trend over time, not from one perfect entry.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => router.push('/individual/dashboard')}
            className="w-full h-14 rounded-full bg-white text-black font-bold text-sm transition-transform active:scale-95"
          >
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070A11] text-white flex flex-col p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] transition-colors duration-700"
          style={{ backgroundColor: step?.color || '#F57C00' }}
        />
      </div>

      <header className="py-4 z-10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Daily Wellness Check-In</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary">+{xpEarned} XP</span>
          </div>
        </div>

        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #F57C00, #FBBF24)' }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[10px] text-white/30 mt-1.5 text-right">
          Step {safeCurrentStep + 1} of {steps.length}
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-6 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.03 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-sm"
          >
            <div className="relative rounded-[32px] bg-white/[0.04] border border-white/[0.08] p-8 pb-6 shadow-2xl backdrop-blur-sm overflow-hidden">
              <div className="absolute top-6 right-6 opacity-[0.04]">
                <step.icon size={120} />
              </div>

              <div className="mb-6">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${step.color}15` }}
                >
                  <step.icon size={28} style={{ color: step.color }} />
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">{step.title}</h2>
                <p className="text-sm text-white/40 mt-3 leading-relaxed">{step.subtitle}</p>
              </div>

              {step.type === 'card' && step.options && (
                <div className={`relative z-10 ${step.options.length > 5 ? 'grid grid-cols-5 gap-2' : 'space-y-2.5'}`}>
                  {step.options.map((option) => {
                    const isSelected = signals[step.id] === option.value
                    const isGridView = step.options!.length > 5
                    return (
                      <motion.button
                        key={String(option.value)}
                        type="button"
                        onClick={() => handleCardSelect(option.value)}
                        whileTap={{ scale: 0.97 }}
                        className={`rounded-2xl border text-sm font-semibold transition-all flex items-center gap-2 ${
                          isGridView ? 'py-3 px-2 flex-col text-center' : 'w-full py-3.5 px-5 flex-row'
                        } ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-white'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.15]'
                        }`}
                      >
                        <span className={isGridView ? 'text-sm' : 'text-lg'}>{option.emoji}</span>
                        <span className={isGridView ? 'text-[10px]' : 'text-sm'}>{option.label}</span>
                      </motion.button>
                    )
                  })}
                </div>
              )}

              {step.type === 'number' && step.numberConfig && (
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={step.numberConfig.min}
                      max={step.numberConfig.max}
                      step={step.numberConfig.step || 1}
                      value={signals[step.id] as number}
                      onChange={(e) => updateSignal(step.id, (Number(e.target.value) || 0) as never)}
                      className="h-16 bg-white/[0.04] border-white/[0.1] text-white text-2xl font-bold rounded-2xl px-5 text-center"
                    />
                    <span className="text-sm text-white/40 font-medium whitespace-nowrap">{step.numberConfig.unit}</span>
                  </div>
                  <Button onClick={handleNext} className="w-full h-12 rounded-2xl bg-primary text-white font-bold">
                    Continue
                  </Button>
                </div>
              )}

              {step.type === 'text' && step.textConfig && (
                <div className="space-y-3 relative z-10">
                  <textarea
                    value={signals[step.id] as string}
                    onChange={(e) => updateSignal(step.id, e.target.value.slice(0, step.textConfig!.maxLength) as never)}
                    placeholder={step.textConfig.placeholder}
                    className="w-full min-h-[100px] rounded-2xl bg-white/[0.04] border border-white/[0.1] px-4 py-3 text-sm text-white outline-none focus:border-white/[0.2] resize-none"
                  />
                  <Button
                    onClick={handleNext}
                    disabled={saving}
                    className="w-full h-12 rounded-2xl bg-primary text-white font-bold"
                  >
                    {saving ? 'Saving...' : 'Update My Daily Guidance'}
                  </Button>
                </div>
              )}

              {safeCurrentStep > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 mt-4 transition-colors"
                >
                  <ArrowLeft size={12} />
                  Go back
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
