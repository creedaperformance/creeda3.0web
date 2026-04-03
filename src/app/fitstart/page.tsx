'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Flame,
  Heart,
  LayoutGrid,
  Loader2,
  Moon,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { scrollToTop } from '@/lib/utils'
import { saveFitStartProfile } from './actions'
import {
  formatIndividualOccupationLabel,
  INDIVIDUAL_OCCUPATION_OPTIONS,
  normalizeIndividualOccupation,
  recommendPathwaysForIndividual,
  type IndividualPathRecommendation,
  type NormalIndividualFitStartInput,
} from '@/lib/individual_performance_engine'

const TOTAL_STEPS = 7

const SCHEDULE_OPTIONS = [
  { id: 'early_morning', label: 'Early morning' },
  { id: 'after_work', label: 'After work' },
  { id: 'late_evening', label: 'Late evening' },
  { id: 'weekends_only', label: 'Mostly weekends' },
  { id: 'shift_work', label: 'Shift work' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'home_dumbbells', label: 'Home weights' },
  { id: 'gym', label: 'Gym access' },
  { id: 'cardio_machine', label: 'Cardio machine' },
  { id: 'pool', label: 'Pool access' },
]

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']

type FitStartDraftState = {
  basic: Omit<NormalIndividualFitStartInput['basic'], 'activityLevel'> & {
    activityLevel: NormalIndividualFitStartInput['basic']['activityLevel'] | ''
  }
  physiology: Omit<
    NormalIndividualFitStartInput['physiology'],
    'injuryHistory' | 'mobilityLimitations' | 'trainingExperience'
  > & {
    injuryHistory: NormalIndividualFitStartInput['physiology']['injuryHistory'] | ''
    mobilityLimitations: NormalIndividualFitStartInput['physiology']['mobilityLimitations'] | ''
    trainingExperience: NormalIndividualFitStartInput['physiology']['trainingExperience'] | ''
  }
  lifestyle: Omit<NormalIndividualFitStartInput['lifestyle'], 'nutritionHabits'> & {
    nutritionHabits: NormalIndividualFitStartInput['lifestyle']['nutritionHabits'] | ''
  }
  goals: {
    primaryGoal: NormalIndividualFitStartInput['goals']['primaryGoal'] | ''
    timeHorizon: NormalIndividualFitStartInput['goals']['timeHorizon'] | ''
    intensityPreference: NormalIndividualFitStartInput['goals']['intensityPreference'] | ''
  }
  sport: NormalIndividualFitStartInput['sport']
}

const defaultState: FitStartDraftState = {
  basic: {
    age: 0,
    gender: '',
    heightCm: 0,
    weightKg: 0,
    occupation: '',
    activityLevel: '',
  },
  physiology: {
    sleepQuality: 0,
    energyLevels: 0,
    stressLevels: 0,
    recoveryRate: 0,
    injuryHistory: '',
    mobilityLimitations: '',
    trainingExperience: '',
    endurance_capacity: 0,
    strength_capacity: 0,
    explosive_power: 0,
    agility_control: 0,
    reaction_self_perception: 0,
    recovery_efficiency: 0,
    fatigue_resistance: 0,
    load_tolerance: 0,
    movement_robustness: 0,
    coordination_control: 0,
    reaction_time_ms: undefined,
  },
  lifestyle: {
    scheduleConstraints: [],
    equipmentAccess: [],
    nutritionHabits: '',
    sedentaryHours: -1,
  },
  goals: {
    primaryGoal: '',
    timeHorizon: '',
    intensityPreference: '',
  },
  sport: {
    selectedSport: '',
    selectedPathwayId: '',
    selectedPathwayType: 'sport',
    selectedRecommendationTitle: '',
    selectionRationale: '',
  },
}

function mergeWithDefaultState(partial: Partial<FitStartDraftState>): FitStartDraftState {
  const normalizedOccupation = normalizeIndividualOccupation(partial.basic?.occupation || '')
  return {
    basic: {
      ...defaultState.basic,
      ...(partial.basic || {}),
      occupation: normalizedOccupation || '',
    },
    physiology: { ...defaultState.physiology, ...(partial.physiology || {}) },
    lifestyle: { ...defaultState.lifestyle, ...(partial.lifestyle || {}) },
    goals: { ...defaultState.goals, ...(partial.goals || {}) },
    sport: { ...defaultState.sport, ...(partial.sport || {}) },
  }
}

function toValidatedFitStartInput(state: FitStartDraftState): NormalIndividualFitStartInput | null {
  if (
    !state.basic.gender ||
    !state.basic.activityLevel ||
    !state.physiology.injuryHistory ||
    !state.physiology.mobilityLimitations ||
    !state.physiology.trainingExperience ||
    !state.lifestyle.nutritionHabits ||
    !state.goals.primaryGoal ||
    !state.goals.timeHorizon ||
    !state.goals.intensityPreference
  ) {
    return null
  }

  return {
    basic: {
      ...state.basic,
      activityLevel: state.basic.activityLevel,
    },
    physiology: {
      ...state.physiology,
      injuryHistory: state.physiology.injuryHistory,
      mobilityLimitations: state.physiology.mobilityLimitations,
      trainingExperience: state.physiology.trainingExperience,
    },
    lifestyle: {
      ...state.lifestyle,
      nutritionHabits: state.lifestyle.nutritionHabits,
    },
    goals: {
      primaryGoal: state.goals.primaryGoal,
      timeHorizon: state.goals.timeHorizon,
      intensityPreference: state.goals.intensityPreference,
    },
    sport: state.sport,
  }
}

const NUTRITION_OPTS = [
  { id: 'poor', label: 'Needs work' },
  { id: 'basic', label: 'Okay' },
  { id: 'good', label: 'Good' },
  { id: 'structured', label: 'Very structured' },
]

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Mostly seated' },
  { id: 'moderate', label: 'Some movement' },
  { id: 'active', label: 'Active most days' },
]

const INJURY_OPTS = [
  { id: 'none', label: 'None' },
  { id: 'minor', label: 'Minor' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'major', label: 'Major' },
  { id: 'chronic', label: 'Chronic' },
]

const MOBILITY_OPTS = [
  { id: 'none', label: 'None' },
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'severe', label: 'Severe' },
]

const EXPERIENCE_OPTS = [
  { id: 'beginner', label: 'Brand new' },
  { id: 'novice', label: 'A little experience' },
  { id: 'intermediate', label: 'Some consistency' },
  { id: 'advanced', label: 'Very consistent' },
  { id: 'experienced', label: 'Long-term experience' },
]

const GOAL_OPTIONS = [
  { id: 'fat_loss', label: 'Fat loss', icon: Activity },
  { id: 'muscle_gain', label: 'Muscle gain', icon: Flame },
  { id: 'endurance', label: 'Endurance', icon: Zap },
  { id: 'general_fitness', label: 'General fitness', icon: Target },
  { id: 'sport_specific', label: 'Get into a sport', icon: Trophy },
]

const TIME_HORIZONS = [
  { id: '4_weeks', label: '4 weeks' },
  { id: '8_weeks', label: '8 weeks' },
  { id: '12_weeks', label: '12 weeks' },
  { id: 'long_term', label: 'Long term' },
]

const INTENSITY_OPTS = [
  { id: 'low', label: 'Low' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'high', label: 'High' },
]

const RECOVERY_SIGNAL_OPTIONS = [
  {
    key: 'sleepQuality',
    label: 'Sleep quality',
    description: 'How well you usually sleep.',
    icon: Moon,
  },
  {
    key: 'energyLevels',
    label: 'Daily energy',
    description: 'How switched on you usually feel.',
    icon: Zap,
  },
  {
    key: 'stressLevels',
    label: 'Stress load',
    description: 'How heavy life feels most weeks.',
    icon: Heart,
  },
  {
    key: 'recoveryRate',
    label: 'Bounce-back speed',
    description: 'How quickly your body feels normal again.',
    icon: ShieldCheck,
  },
] as const

const PHYSIOLOGY_DOMAINS = [
  { id: 'endurance_capacity', label: 'Endurance', description: 'How long you can keep moving before you need a real break.' },
  { id: 'strength_capacity', label: 'Strength', description: 'How strong lifting, carrying, pushing, and pulling feel in real life.' },
  { id: 'explosive_power', label: 'Power', description: 'How quickly you can move when you need to react fast.' },
  { id: 'agility_control', label: 'Balance and control', description: 'How steady and coordinated you feel when you move quickly.' },
  { id: 'reaction_self_perception', label: 'Reaction speed', description: 'How quickly you notice something and respond.' },
  { id: 'recovery_efficiency', label: 'Recovery efficiency', description: 'How well your body resets after a hard day.' },
  { id: 'fatigue_resistance', label: 'Holding up when tired', description: 'How well you still function when the day runs long.' },
  { id: 'load_tolerance', label: 'Weekly load', description: 'How much activity your body can handle in a normal week.' },
  { id: 'movement_robustness', label: 'Movement quality', description: 'How comfortable and free your joints feel when you move.' },
  { id: 'coordination_control', label: 'Coordination', description: 'How naturally different body parts work together.' },
] as const

const SCALE_LABELS = ['Needs work', 'Okay', 'Solid', 'Strong']

const STEP_COPY = {
  1: {
    title: 'Start with your basics',
    subtitle: 'These basics help CREEDA understand your body, body size, and daily reality.',
  },
  2: {
    title: 'Map your normal routine',
    subtitle: 'Your schedule, sitting time, and food habits change what a realistic plan looks like.',
  },
  3: {
    title: 'Understand your usual baseline',
    subtitle: 'This tells CREEDA how your body usually feels before it starts guiding your week.',
  },
  4: {
    title: 'Capture your movement history',
    subtitle: 'Past injuries, mobility limits, and experience decide how fast you can safely progress.',
  },
  5: {
    title: 'Rate your current capacity',
    subtitle: 'This is a practical self-check so CREEDA can estimate your current strength, endurance, movement, and recovery.',
  },
  6: {
    title: 'Set the outcome you want',
    subtitle: 'Your goal, time frame, and equipment access shape the best next path.',
  },
  7: {
    title: 'Pick your best starting path',
    subtitle: 'CREEDA has ranked the starting plans that best fit your body, routine, and goal.',
  },
} as const

const STEP_PURPOSES = {
  1: {
    usedFor: 'Used to estimate body composition targets, realistic load, and lifestyle demand.',
    note: 'Your day pattern helps CREEDA estimate fatigue and recovery needs. It is not a judgment about fitness.',
  },
  2: {
    usedFor: 'Used to make the plan realistic around schedule, sitting time, and food structure.',
  },
  3: {
    usedFor: 'Used to estimate baseline readiness and recovery capacity before any daily logs exist.',
  },
  4: {
    usedFor: 'Used to set safer progression speed and flag injury or mobility risk.',
  },
  5: {
    usedFor: 'Used to estimate current physiology across strength, endurance, movement quality, and coordination.',
    note: 'These are guidance scores, not lab measurements.',
  },
  6: {
    usedFor: 'Used to build the right weekly plan, intensity, and equipment match.',
  },
  7: {
    usedFor: 'Used to lock the best starting path and store whether you want device sync now or later.',
  },
} as const

const RECOMMENDATION_TYPE_LABELS: Record<IndividualPathRecommendation['type'], string> = {
  sport: 'Sport entry',
  training: 'Strength track',
  lifestyle: 'Lifestyle track',
}

function getRecommendationFocusLabel(rec: IndividualPathRecommendation) {
  if (rec.type === 'sport') return `Best matched sport: ${rec.mappedSport}`
  if (rec.type === 'training') return `Best matched training focus: ${rec.mappedSport}`
  return 'Best matched focus: healthy living'
}

function toggleArrayValue(items: string[], value: string) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value]
}

function SegmentedOption({
  active,
  label,
  onClick,
  className = '',
}: {
  active: boolean
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={`h-14 rounded-xl border-slate-800 text-[10px] font-bold uppercase tracking-widest ${className}`}
    >
      {label}
    </Button>
  )
}

function LikertRow({
  label,
  description,
  value,
  onChange,
  icon: Icon,
}: {
  label: string
  description: string
  value: number
  onChange: (value: number) => void
  icon: typeof Moon
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/50 p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-white">{label}</Label>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((option) => (
          <Button
            key={option}
            type="button"
            variant={value === option ? 'default' : 'outline'}
            onClick={() => onChange(option)}
            className="h-12 rounded-xl border-slate-800 text-[10px] font-bold"
          >
            {option}
          </Button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}

export default function FitStartPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<FitStartDraftState>(defaultState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recommendations, setRecommendations] = useState<IndividualPathRecommendation[]>([])
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null)
  const [healthPreference, setHealthPreference] = useState<'connect_now' | 'later'>('later')
  const [userId, setUserId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  const storageKey = useMemo(
    () => (userId ? `creeda_fitstart_v4_state_${userId}` : 'creeda_fitstart_v4_state_guest'),
    [userId]
  )

  const activeCopy = STEP_COPY[step as keyof typeof STEP_COPY]
  const activePurpose = STEP_PURPOSES[step as keyof typeof STEP_PURPOSES] as
    | { usedFor: string; note?: string }
    | undefined
  const selectedRecommendation = recommendations.find((item) => item.id === selectedRecommendationId) || null

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)

      const key = user ? `creeda_fitstart_v4_state_${user.id}` : 'creeda_fitstart_v4_state_guest'
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setState(mergeWithDefaultState(parsed))
        } catch {
          console.error('FitStart: Could not parse saved state')
        }
      }
      setIsHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(storageKey, JSON.stringify(state))
    }
  }, [state, isHydrated, storageKey])

  const nextStep = () => {
    if (step === 1) {
      if (!state.basic.occupation.trim()) {
        toast.error('Choose the option that best matches your normal day so CREEDA can estimate lifestyle load.')
        return
      }
      if (state.basic.age <= 0 || state.basic.heightCm <= 0 || state.basic.weightKg <= 0) {
        toast.error('Please add your real age, height, and weight before continuing.')
        return
      }
      if (!state.basic.gender) {
        toast.error('Select the gender option that fits you best.')
        return
      }
    }

    if (step === 2) {
      if (!state.basic.activityLevel) {
        toast.error('Choose the activity level that best matches your normal week.')
        return
      }
      if (state.lifestyle.sedentaryHours < 0 || state.lifestyle.sedentaryHours > 24) {
        toast.error('Please enter valid sedentary hours between 0 and 24.')
        return
      }
      if (!state.lifestyle.nutritionHabits) {
        toast.error('Choose the option that best matches your food routine.')
        return
      }
      if (state.lifestyle.scheduleConstraints.length === 0) {
        toast.error('Choose at least one time window that usually works for you.')
        return
      }
    }

    if (step === 4) {
      if (!state.physiology.injuryHistory || !state.physiology.mobilityLimitations || !state.physiology.trainingExperience) {
        toast.error('Answer the injury, mobility, and experience questions before continuing.')
        return
      }
    }

    if (step === 6) {
      if (!state.goals.primaryGoal || !state.goals.timeHorizon || !state.goals.intensityPreference) {
        toast.error('Choose your goal, time horizon, and intensity so CREEDA can build the right path.')
        return
      }
      if (state.lifestyle.equipmentAccess.length === 0) {
        toast.error('Please select at least one equipment option.')
        return
      }
    }

    if (step === 3) {
      const recoverySignals = [
        state.physiology.sleepQuality,
        state.physiology.energyLevels,
        state.physiology.stressLevels,
        state.physiology.recoveryRate,
      ]
      if (recoverySignals.some((value) => value < 1 || value > 5)) {
        toast.error('Rate all four baseline signals so CREEDA is not guessing.')
        return
      }
    }

    if (step === 5) {
      const capacitySignals = PHYSIOLOGY_DOMAINS.map((domain) => state.physiology[domain.id])
      if (capacitySignals.some((value) => value < 1 || value > 4)) {
        toast.error('Rate every body-capacity card so the analysis is built from your real answers.')
        return
      }
    }

    setStep((current) => Math.min(TOTAL_STEPS, current + 1))
    scrollToTop()
  }

  const prevStep = () => {
    setStep((current) => Math.max(1, current - 1))
    scrollToTop()
  }

  const handleBaselineSubmit = () => {
    const validatedInput = toValidatedFitStartInput(state)
    if (!validatedInput) {
      toast.error('Finish the key goal and lifestyle questions first so CREEDA is not guessing.')
      return
    }

    const recs = recommendPathwaysForIndividual(validatedInput)
    setRecommendations(recs)
    setSelectedRecommendationId(recs[0]?.id || null)
    setStep(7)
    scrollToTop()
  }

  const handlePathwaySubmit = async () => {
    if (!selectedRecommendation) {
      toast.error('Choose the starting plan you want CREEDA to build for you.')
      return
    }

    const validatedInput = toValidatedFitStartInput(state)
    if (!validatedInput) {
      toast.error('Please finish the key onboarding inputs before starting your journey.')
      return
    }

    setIsSubmitting(true)

    const payload = {
      ...validatedInput,
      sport: {
        selectedSport: selectedRecommendation.mappedSport,
        selectedPathwayId: selectedRecommendation.id,
        selectedPathwayType: selectedRecommendation.type,
        selectedRecommendationTitle: selectedRecommendation.title,
        selectionRationale: selectedRecommendation.summary,
      },
      health_connection_preference: healthPreference,
      timeTakenMs: 0,
    }

    const res = await saveFitStartProfile(payload)
    if (res.success) {
      localStorage.removeItem(storageKey)
      toast.success('Your personal plan is ready')
      router.push('/individual/dashboard')
      return
    }

    toast.error(`Sync failed: ${res.error || 'Unknown error'}`)
    setIsSubmitting(false)
  }

  if (!isHydrated) return null

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-full border border-slate-800 mb-6">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">FitStart for healthier living</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            {activeCopy.title}
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">{activeCopy.subtitle}</p>
          <div className="mt-5 max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Used For</p>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              {activePurpose?.usedFor}
            </p>
            {activePurpose?.note && (
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {activePurpose.note}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-12">
          {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${
                  idx + 1 < step
                    ? 'bg-primary shadow-lg shadow-primary/20'
                    : idx + 1 === step
                      ? 'bg-white shadow-lg shadow-white/20'
                      : 'bg-slate-900'
                }`}
              />
              <div
                className={`text-[6px] font-bold text-center uppercase tracking-widest ${
                  idx + 1 === step ? 'text-white' : 'text-slate-600'
                }`}
              >
                Step {String(idx + 1).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative min-h-[700px] flex flex-col">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <LayoutGrid className="h-48 w-48 text-white" />
          </div>

          <div className="p-8 md:p-14 flex-1">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-10"
            >
                {step === 1 && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-3">
                        <Label htmlFor="fitstart-age" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Age
                        </Label>
                        <Input
                          id="fitstart-age"
                          type="number"
                          value={state.basic.age > 0 ? state.basic.age : ''}
                          onChange={(e) => setState({ ...state, basic: { ...state.basic, age: Number(e.target.value) } })}
                          placeholder="28"
                          className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary border-2 text-xl font-bold"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="fitstart-height" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Height (cm)
                        </Label>
                        <Input
                          id="fitstart-height"
                          type="number"
                          value={state.basic.heightCm > 0 ? state.basic.heightCm : ''}
                          onChange={(e) => setState({ ...state, basic: { ...state.basic, heightCm: Number(e.target.value) } })}
                          placeholder="170"
                          className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary border-2 text-xl font-bold"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="fitstart-weight" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Weight (kg)
                        </Label>
                        <Input
                          id="fitstart-weight"
                          type="number"
                          value={state.basic.weightKg > 0 ? state.basic.weightKg : ''}
                          onChange={(e) => setState({ ...state, basic: { ...state.basic, weightKg: Number(e.target.value) } })}
                          placeholder="70"
                          className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary border-2 text-xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        What best describes your normal day?
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {INDIVIDUAL_OCCUPATION_OPTIONS.map((option) => {
                          const active = state.basic.occupation === option.id

                          return (
                            <Button
                              key={option.id}
                              type="button"
                              variant={active ? 'default' : 'outline'}
                              onClick={() =>
                                setState({
                                  ...state,
                                  basic: {
                                    ...state.basic,
                                    occupation: option.id,
                                  },
                                })
                              }
                              className="h-auto min-h-20 rounded-2xl border-slate-800 px-5 py-4 text-left justify-start whitespace-normal"
                            >
                              <div className="space-y-1">
                                <div className="text-[11px] font-bold uppercase tracking-widest">
                                  {option.label}
                                </div>
                                <div className={`text-xs leading-relaxed ${active ? 'text-slate-900/75' : 'text-slate-400'}`}>
                                  {option.description}
                                </div>
                              </div>
                            </Button>
                          )
                        })}
                      </div>
                      {state.basic.occupation && (
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Selected: {formatIndividualOccupationLabel(state.basic.occupation)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gender</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {GENDER_OPTIONS.map((option) => (
                          <SegmentedOption
                            key={option}
                            active={state.basic.gender === option}
                            label={option}
                            onClick={() => setState({ ...state, basic: { ...state.basic, gender: option } })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">How active are your normal days?</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {ACTIVITY_LEVELS.map((option) => (
                          <SegmentedOption
                            key={option.id}
                            active={state.basic.activityLevel === option.id}
                            label={option.label}
                            onClick={() => setState({ ...state, basic: { ...state.basic, activityLevel: option.id as typeof state.basic.activityLevel } })}
                            className="h-16"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">When do you realistically have time?</Label>
                      <div className="flex flex-wrap gap-3">
                        {SCHEDULE_OPTIONS.map((option) => (
                          <SegmentedOption
                            key={option.id}
                            active={state.lifestyle.scheduleConstraints.includes(option.id)}
                            label={option.label}
                            onClick={() =>
                              setState({
                                ...state,
                                lifestyle: {
                                  ...state.lifestyle,
                                  scheduleConstraints: toggleArrayValue(state.lifestyle.scheduleConstraints, option.id),
                                },
                              })
                            }
                            className="px-5"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label htmlFor="fitstart-sedentary" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Sitting hours per day
                        </Label>
                        <Input
                          id="fitstart-sedentary"
                          type="number"
                          value={state.lifestyle.sedentaryHours >= 0 ? state.lifestyle.sedentaryHours : ''}
                          onChange={(e) => setState({ ...state, lifestyle: { ...state.lifestyle, sedentaryHours: Number(e.target.value) } })}
                          placeholder="7"
                          className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary border-2 text-xl font-bold"
                        />
                      </div>

                      <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">How organised is your eating?</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {NUTRITION_OPTS.map((option) => (
                            <SegmentedOption
                              key={option.id}
                              active={state.lifestyle.nutritionHabits === option.id}
                              label={option.label}
                              onClick={() =>
                                setState({
                                  ...state,
                                  lifestyle: {
                                    ...state.lifestyle,
                                    nutritionHabits: option.id as typeof state.lifestyle.nutritionHabits,
                                  },
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RECOVERY_SIGNAL_OPTIONS.map((item) => {
                      const value = state.physiology[item.key]
                      return (
                        <LikertRow
                          key={item.key}
                          label={item.label}
                          description={item.description}
                          value={value}
                          icon={item.icon}
                          onChange={(nextValue) =>
                            setState({
                              ...state,
                              physiology: {
                                ...state.physiology,
                                [item.key]: nextValue,
                              },
                            })
                          }
                        />
                      )
                    })}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Injury history</Label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {INJURY_OPTS.map((option) => (
                          <SegmentedOption
                            key={option.id}
                            active={state.physiology.injuryHistory === option.id}
                            label={option.label}
                            onClick={() =>
                              setState({
                                ...state,
                                physiology: {
                                  ...state.physiology,
                                  injuryHistory: option.id as typeof state.physiology.injuryHistory,
                                },
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mobility limitations</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {MOBILITY_OPTS.map((option) => (
                          <SegmentedOption
                            key={option.id}
                            active={state.physiology.mobilityLimitations === option.id}
                            label={option.label}
                            onClick={() =>
                              setState({
                                ...state,
                                physiology: {
                                  ...state.physiology,
                                  mobilityLimitations: option.id as typeof state.physiology.mobilityLimitations,
                                },
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">How much training experience do you have?</Label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {EXPERIENCE_OPTS.map((option) => (
                          <SegmentedOption
                            key={option.id}
                            active={state.physiology.trainingExperience === option.id}
                            label={option.label}
                            onClick={() =>
                              setState({
                                ...state,
                                physiology: {
                                  ...state.physiology,
                                  trainingExperience: option.id as typeof state.physiology.trainingExperience,
                                },
                              })
                            }
                            className="px-2"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {PHYSIOLOGY_DOMAINS.map((domain) => {
                      const score = state.physiology[domain.id]
                      return (
                        <div key={domain.id} className="rounded-[1.5rem] border border-slate-800 bg-slate-950/50 p-6 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-white">{domain.label}</Label>
                              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{domain.description}</p>
                            </div>
                          <span className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded-lg border border-primary/20">
                              {score > 0 ? SCALE_LABELS[Math.max(0, score - 1)] : 'Not answered'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((level) => (
                              <Button
                                key={level}
                                type="button"
                                variant={score === level ? 'default' : 'outline'}
                                onClick={() =>
                                  setState({
                                    ...state,
                                    physiology: {
                                      ...state.physiology,
                                      [domain.id]: level,
                                    },
                                  })
                                }
                                className="h-12 rounded-xl border-slate-800 text-[10px] font-bold"
                              >
                                {level}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Primary goal</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {GOAL_OPTIONS.map((option) => (
                          <Button
                            key={option.id}
                            type="button"
                            variant={state.goals.primaryGoal === option.id ? 'default' : 'outline'}
                            onClick={() =>
                              setState({
                                ...state,
                                goals: {
                                  ...state.goals,
                                  primaryGoal: option.id as typeof state.goals.primaryGoal,
                                },
                              })
                            }
                            className="h-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-slate-800 hover:border-primary/40 transition-all"
                          >
                            <option.icon className={`h-5 w-5 ${state.goals.primaryGoal === option.id ? 'text-slate-950' : 'text-slate-500'}`} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{option.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Time horizon</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {TIME_HORIZONS.map((option) => (
                            <SegmentedOption
                              key={option.id}
                              active={state.goals.timeHorizon === option.id}
                              label={option.label}
                              onClick={() =>
                                setState({
                                  ...state,
                                  goals: {
                                    ...state.goals,
                                    timeHorizon: option.id as typeof state.goals.timeHorizon,
                                  },
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Intensity preference</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {INTENSITY_OPTS.map((option) => (
                            <SegmentedOption
                              key={option.id}
                              active={state.goals.intensityPreference === option.id}
                              label={option.label}
                              onClick={() =>
                                setState({
                                  ...state,
                                  goals: {
                                    ...state.goals,
                                    intensityPreference: option.id as typeof state.goals.intensityPreference,
                                  },
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Equipment access</Label>
                      <div className="flex flex-wrap gap-3">
                        {EQUIPMENT_OPTIONS.map((option) => (
                          <SegmentedOption
                            key={option.id}
                            active={state.lifestyle.equipmentAccess.includes(option.id)}
                            label={option.label}
                            onClick={() =>
                              setState({
                                ...state,
                                lifestyle: {
                                  ...state.lifestyle,
                                  equipmentAccess: toggleArrayValue(state.lifestyle.equipmentAccess, option.id),
                                },
                              })
                            }
                            className="px-5"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div className="space-y-10">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        {recommendations.length} recommended starting plans
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {recommendations.map((rec) => {
                        const active = selectedRecommendationId === rec.id
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => setSelectedRecommendationId(rec.id)}
                            className={`text-left bg-slate-950/50 p-8 rounded-[2rem] border transition-all duration-300 relative overflow-hidden flex flex-col ${
                              active
                                ? 'border-primary shadow-xl shadow-primary/10'
                                : 'border-slate-800 hover:border-primary/40'
                            }`}
                          >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                              <Zap className="h-12 w-12" />
                            </div>

                            <div className="mb-6 flex items-center justify-between gap-3">
                              <div className="flex flex-wrap gap-2">
                                <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-widest">
                                  {RECOMMENDATION_TYPE_LABELS[rec.type]}
                                </div>
                                <div className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[9px] font-bold uppercase tracking-widest">
                                  Match {rec.score}
                                </div>
                              </div>
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${active ? 'bg-primary text-slate-950' : 'bg-slate-900 text-slate-300'}`}>
                                <ArrowRight className="h-5 w-5" />
                              </div>
                            </div>

                            <h3 className="text-xl font-bold text-white tracking-tight mb-2">{rec.title}</h3>
                            <p className="text-xs text-slate-400 mb-3 uppercase tracking-widest">{getRecommendationFocusLabel(rec)}</p>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">{rec.summary}</p>

                            <div className="mt-auto pt-6 border-t border-slate-800 space-y-2">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Why CREEDA suggested this</p>
                              <ul className="space-y-2">
                                {rec.why.map((reason) => (
                                  <li key={reason} className="text-xs text-slate-300 leading-relaxed">
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/50 p-6 space-y-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Optional device sync</p>
                        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                          Apple Health and Health Connect are optional. If you skip this now, CREEDA will still work from your onboarding and daily check-ins.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SegmentedOption
                          active={healthPreference === 'later'}
                          label="Connect later"
                          onClick={() => setHealthPreference('later')}
                          className="h-16"
                        />
                        <SegmentedOption
                          active={healthPreference === 'connect_now'}
                          label="I want device sync"
                          onClick={() => setHealthPreference('connect_now')}
                          className="h-16"
                        />
                      </div>
                    </div>
                  </div>
                )}
            </motion.div>

            <div className="flex items-center justify-between mt-auto pt-10 border-t border-slate-800">
              <Button
                type="button"
                onClick={prevStep}
                variant="outline"
                className={`h-14 px-8 rounded-2xl border-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all ${
                  step === 1 ? 'invisible' : ''
                }`}
              >
                <ArrowLeft className="mr-3 h-4 w-4" /> Previous
              </Button>

              {step === 7 ? (
                <Button
                  type="button"
                  onClick={handlePathwaySubmit}
                  disabled={!selectedRecommendation || isSubmitting}
                  className="h-16 px-12 rounded-2xl bg-primary text-slate-950 font-bold uppercase tracking-widest text-[10px] hover:bg-white shadow-xl shadow-primary/20 transition-all duration-500 disabled:opacity-50"
                >
                  Start my journey <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
              ) : step === 6 ? (
                <Button
                  type="button"
                  onClick={handleBaselineSubmit}
                  className="h-16 px-12 rounded-2xl bg-primary text-slate-950 font-bold uppercase tracking-widest text-[10px] hover:bg-white shadow-xl shadow-primary/20 transition-all duration-500"
                >
                  See my best paths <Zap className="ml-3 h-5 w-5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="h-16 px-12 rounded-2xl bg-white text-slate-950 font-bold uppercase tracking-widest text-[10px] hover:bg-primary transition-all duration-500"
                >
                  Next step <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em]">Creeda individual physiology engine</p>
        </div>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-20 w-20 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em]">Building your healthy-living plan</p>
          </div>
        </div>
      )}
    </div>
  )
}
