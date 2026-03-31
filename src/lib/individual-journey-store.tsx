'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'creeda_individual_journey_v1'

export type JourneyRole = 'athlete' | 'individual' | 'coach'
export type ActivityLevel = 'sedentary' | 'moderate' | 'active'
export type GoalOption = 'fat_loss' | 'muscle_gain' | 'fitness' | 'sport_performance'
export type SportOption =
  | 'football'
  | 'running'
  | 'gym'
  | 'swimming'
  | 'cycling'
  | 'basketball'
  | 'tennis'
  | 'yoga'
  | 'general_fitness'

export type OnboardingState = {
  basic: {
    age: number
    gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say'
    heightCm: number
    weightKg: number
    occupation: 'student' | 'desk' | 'shift' | 'manual' | 'caregiver' | 'hybrid'
  }
  lifestyle: {
    activityLevel: ActivityLevel
    sittingHours: number
    gymAccess: boolean
  }
  physiology: {
    sleep: number
    energy: number
    stress: number
    soreness: number
    recovery: number
  }
  injuryMobility: string[]
  goals: GoalOption[]
  sport: SportOption
  timeHorizonWeeks: 4 | 8 | 12
  intensityPreference: number
}

export type SessionItem = {
  id: string
  title: string
  type: 'Warmup' | 'Training' | 'Recovery'
  durationMin: number
  intensity: 'Low' | 'Moderate' | 'High'
}

export type WeeklyPlanDay = {
  key: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  label: string
  focus: string
  sessions: SessionItem[]
}

export type AnalysisOutput = {
  readinessScore: number
  metrics: {
    energy: number
    recovery: number
    mobility: number
  }
  strengths: string[]
  limitations: string[]
  peakProjection: {
    currentScore: number
    targetScore: number
    progressPct: number
    strengthGainPct: number
    enduranceGainPct: number
    fatigueDropPct: number
    timelineWeeks: number
  }
  plan: {
    weekly: WeeklyPlanDay[]
    todayKey: WeeklyPlanDay['key']
  }
  insights: string[]
  weeklyReview: {
    improvements: string[]
    suggestions: string[]
  }
}

type DailyCheckinInput = {
  energy: number
  sleep: number
  soreness: number
}

type JourneyState = {
  selectedRole: JourneyRole | null
  onboarding: OnboardingState
  analysis: AnalysisOutput | null
  dailyCheckins: Array<DailyCheckinInput & { at: string }>
}

type JourneyContextValue = {
  state: JourneyState
  setRole: (role: JourneyRole) => void
  updateBasic: (payload: Partial<OnboardingState['basic']>) => void
  updateLifestyle: (payload: Partial<OnboardingState['lifestyle']>) => void
  updatePhysiologyMetric: (key: keyof OnboardingState['physiology'], value: number) => void
  toggleInjuryMobility: (item: string) => void
  toggleGoal: (goal: GoalOption) => void
  setSport: (sport: SportOption) => void
  setTimeHorizon: (weeks: 4 | 8 | 12) => void
  setIntensityPreference: (value: number) => void
  runAnalysis: () => AnalysisOutput
  submitDailyCheckin: (input: DailyCheckinInput) => void
  resetJourney: () => void
}

const JourneyContext = createContext<JourneyContextValue | null>(null)

const defaultOnboarding: OnboardingState = {
  basic: {
    age: 28,
    gender: 'prefer_not_to_say',
    heightCm: 170,
    weightKg: 70,
    occupation: 'desk',
  },
  lifestyle: {
    activityLevel: 'moderate',
    sittingHours: 7,
    gymAccess: true,
  },
  physiology: {
    sleep: 3,
    energy: 3,
    stress: 3,
    soreness: 2,
    recovery: 3,
  },
  injuryMobility: [],
  goals: ['fitness'],
  sport: 'general_fitness',
  timeHorizonWeeks: 12,
  intensityPreference: 6,
}

const defaultState: JourneyState = {
  selectedRole: null,
  onboarding: defaultOnboarding,
  analysis: null,
  dailyCheckins: [],
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function mapSportLabel(sport: SportOption) {
  switch (sport) {
    case 'football':
      return 'Football'
    case 'running':
      return 'Running'
    case 'gym':
      return 'Gym'
    case 'swimming':
      return 'Swimming'
    case 'cycling':
      return 'Cycling'
    case 'basketball':
      return 'Basketball'
    case 'tennis':
      return 'Tennis'
    case 'yoga':
      return 'Yoga'
    default:
      return 'General Fitness'
  }
}

function getTodayKey(): WeeklyPlanDay['key'] {
  const days: WeeklyPlanDay['key'][] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days[new Date().getDay()]
}

function createWeeklyPlan(onboarding: OnboardingState, readinessScore: number): WeeklyPlanDay[] {
  const sportName = mapSportLabel(onboarding.sport)
  const trainingIntensity: SessionItem['intensity'] =
    onboarding.intensityPreference >= 8 ? 'High' : onboarding.intensityPreference >= 5 ? 'Moderate' : 'Low'
  const recoveryBias = readinessScore < 55

  const baseTrainingDuration = onboarding.intensityPreference >= 8 ? 60 : onboarding.intensityPreference >= 5 ? 50 : 40
  const adjustedDuration = recoveryBias ? Math.max(30, baseTrainingDuration - 15) : baseTrainingDuration

  const week: WeeklyPlanDay[] = [
    {
      key: 'mon',
      label: 'Mon',
      focus: `Build ${sportName} foundation`,
      sessions: [
        { id: 'mon-warmup', title: 'Mobility Activation', type: 'Warmup', durationMin: 10, intensity: 'Low' },
        { id: 'mon-train', title: `${sportName} Skill + Conditioning`, type: 'Training', durationMin: adjustedDuration, intensity: trainingIntensity },
        { id: 'mon-rec', title: 'Breath Reset', type: 'Recovery', durationMin: 10, intensity: 'Low' },
      ],
    },
    {
      key: 'tue',
      label: 'Tue',
      focus: 'Recovery + movement quality',
      sessions: [
        { id: 'tue-warmup', title: 'Joint Prep', type: 'Warmup', durationMin: 8, intensity: 'Low' },
        { id: 'tue-train', title: 'Low-impact Aerobic Block', type: 'Training', durationMin: 30, intensity: 'Low' },
        { id: 'tue-rec', title: 'Sleep Primer Routine', type: 'Recovery', durationMin: 12, intensity: 'Low' },
      ],
    },
    {
      key: 'wed',
      label: 'Wed',
      focus: 'Strength + power',
      sessions: [
        { id: 'wed-warmup', title: 'Dynamic Warmup', type: 'Warmup', durationMin: 10, intensity: 'Low' },
        { id: 'wed-train', title: 'Strength Session', type: 'Training', durationMin: adjustedDuration, intensity: trainingIntensity },
        { id: 'wed-rec', title: 'Cooldown + Stretch', type: 'Recovery', durationMin: 12, intensity: 'Low' },
      ],
    },
    {
      key: 'thu',
      label: 'Thu',
      focus: 'Technique and consistency',
      sessions: [
        { id: 'thu-warmup', title: 'Neural Prep', type: 'Warmup', durationMin: 8, intensity: 'Low' },
        { id: 'thu-train', title: `${sportName} Technique`, type: 'Training', durationMin: 35, intensity: 'Moderate' },
        { id: 'thu-rec', title: 'Mobility Flow', type: 'Recovery', durationMin: 10, intensity: 'Low' },
      ],
    },
    {
      key: 'fri',
      label: 'Fri',
      focus: 'Performance day',
      sessions: [
        { id: 'fri-warmup', title: 'Activation Set', type: 'Warmup', durationMin: 10, intensity: 'Low' },
        {
          id: 'fri-train',
          title: recoveryBias ? 'Controlled Performance Session' : 'Peak Performance Session',
          type: 'Training',
          durationMin: adjustedDuration,
          intensity: recoveryBias ? 'Moderate' : trainingIntensity,
        },
        { id: 'fri-rec', title: 'Recovery Protocol', type: 'Recovery', durationMin: 12, intensity: 'Low' },
      ],
    },
    {
      key: 'sat',
      label: 'Sat',
      focus: 'Longer conditioning block',
      sessions: [
        { id: 'sat-warmup', title: 'Mobility Warmup', type: 'Warmup', durationMin: 8, intensity: 'Low' },
        { id: 'sat-train', title: 'Endurance Builder', type: 'Training', durationMin: recoveryBias ? 35 : 50, intensity: 'Moderate' },
        { id: 'sat-rec', title: 'Guided Cooldown', type: 'Recovery', durationMin: 10, intensity: 'Low' },
      ],
    },
    {
      key: 'sun',
      label: 'Sun',
      focus: 'Regeneration',
      sessions: [
        { id: 'sun-warmup', title: 'Easy Mobility', type: 'Warmup', durationMin: 8, intensity: 'Low' },
        { id: 'sun-train', title: 'Active Recovery Walk', type: 'Training', durationMin: 25, intensity: 'Low' },
        { id: 'sun-rec', title: 'Sleep + Hydration Focus', type: 'Recovery', durationMin: 12, intensity: 'Low' },
      ],
    },
  ]

  return week
}

function buildAnalysis(onboarding: OnboardingState): AnalysisOutput {
  const positive =
    onboarding.physiology.sleep +
    onboarding.physiology.energy +
    onboarding.physiology.recovery
  const negative =
    onboarding.physiology.stress +
    onboarding.physiology.soreness

  const baseReadiness = (positive * 14) - (negative * 7)
  const activityAdjust = onboarding.lifestyle.activityLevel === 'active' ? 8 : onboarding.lifestyle.activityLevel === 'moderate' ? 4 : -4
  const sittingAdjust = Math.max(-10, 8 - onboarding.lifestyle.sittingHours)
  const gymAdjust = onboarding.lifestyle.gymAccess ? 3 : 0
  const injuryPenalty = onboarding.injuryMobility.length * 4
  const goalMomentum = onboarding.goals.length * 2
  const intensityAdjust = onboarding.intensityPreference - 5

  const readinessScore = clamp(baseReadiness + 36 + activityAdjust + sittingAdjust + gymAdjust + goalMomentum + intensityAdjust - injuryPenalty)
  const energy = clamp((onboarding.physiology.energy * 18) + activityAdjust + 15)
  const recovery = clamp((onboarding.physiology.recovery * 17) + (onboarding.physiology.sleep * 6) - (onboarding.physiology.stress * 5))
  const mobility = clamp(78 - injuryPenalty - (onboarding.physiology.soreness * 6) + (onboarding.lifestyle.gymAccess ? 5 : 0))

  const strengths: string[] = []
  if (energy >= 70) strengths.push('Strong daily energy availability')
  if (recovery >= 70) strengths.push('Good recovery response')
  if (mobility >= 70) strengths.push('Solid movement quality baseline')
  if (onboarding.goals.includes('sport_performance')) strengths.push('Clear performance-oriented intent')
  if (strengths.length === 0) strengths.push('Consistency potential is high with simple daily execution')

  const limitations: string[] = []
  if (energy < 55) limitations.push('Energy fluctuations are limiting training quality')
  if (recovery < 55) limitations.push('Recovery capacity needs support')
  if (mobility < 55) limitations.push('Mobility constraints can reduce output and confidence')
  if (onboarding.lifestyle.sittingHours >= 9) limitations.push('High sitting hours are slowing adaptation')
  if (limitations.length === 0) limitations.push('No major blockers detected, focus on progression discipline')

  const targetScore = clamp(readinessScore + 18 + onboarding.goals.length * 2)
  const progressPct = clamp((readinessScore / Math.max(1, targetScore)) * 100)
  const timelineWeeks = onboarding.timeHorizonWeeks

  const weekly = createWeeklyPlan(onboarding, readinessScore)
  const sportName = mapSportLabel(onboarding.sport)

  return {
    readinessScore,
    metrics: {
      energy,
      recovery,
      mobility,
    },
    strengths,
    limitations,
    peakProjection: {
      currentScore: readinessScore,
      targetScore,
      progressPct,
      strengthGainPct: clamp(10 + onboarding.intensityPreference * 2, 8, 30),
      enduranceGainPct: clamp(12 + (onboarding.timeHorizonWeeks / 2), 10, 28),
      fatigueDropPct: clamp(18 + (onboarding.physiology.recovery * 2), 12, 35),
      timelineWeeks,
    },
    plan: {
      weekly,
      todayKey: getTodayKey(),
    },
    insights: [
      `Your ${sportName} plan should prioritize ${readinessScore < 60 ? 'recovery consistency' : 'quality intensity'} this week.`,
      onboarding.lifestyle.sittingHours > 8
        ? 'Break up sitting every 45 minutes to unlock better training readiness.'
        : 'Current lifestyle load supports steady progression.',
      onboarding.goals.includes('fat_loss')
        ? 'Maintain a moderate calorie deficit and protect protein intake to preserve performance.'
        : onboarding.goals.includes('muscle_gain')
          ? 'Progressive overload + sleep quality will be your main growth levers.'
          : 'Stacking small daily wins will accelerate your peak trajectory.',
    ],
    weeklyReview: {
      improvements: [
        'Readiness trend stabilized across the week.',
        'Recovery choices are supporting better training consistency.',
      ],
      suggestions: [
        recovery < 60 ? 'Add a dedicated recovery block mid-week.' : 'Keep recovery cadence unchanged.',
        readinessScore < 60 ? 'Increase intensity gradually after two stable check-ins.' : 'Increase one training block intensity next week.',
      ],
    },
  }
}

function isJourneyState(value: unknown): value is JourneyState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as JourneyState
  return !!candidate.onboarding && typeof candidate.onboarding === 'object'
}

function loadInitialState(): JourneyState {
  if (typeof window === 'undefined') return defaultState

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    if (!isJourneyState(parsed)) return defaultState
    return parsed
  } catch {
    return defaultState
  }
}

export function IndividualJourneyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JourneyState>(() => loadInitialState())

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setRole = useCallback((role: JourneyRole) => {
    setState((prev) => ({ ...prev, selectedRole: role }))
  }, [])

  const updateBasic = useCallback((payload: Partial<OnboardingState['basic']>) => {
    setState((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        basic: { ...prev.onboarding.basic, ...payload },
      },
    }))
  }, [])

  const updateLifestyle = useCallback((payload: Partial<OnboardingState['lifestyle']>) => {
    setState((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        lifestyle: { ...prev.onboarding.lifestyle, ...payload },
      },
    }))
  }, [])

  const updatePhysiologyMetric = useCallback((key: keyof OnboardingState['physiology'], value: number) => {
    setState((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        physiology: {
          ...prev.onboarding.physiology,
          [key]: Math.max(1, Math.min(5, Math.round(value))),
        },
      },
    }))
  }, [])

  const toggleInjuryMobility = useCallback((item: string) => {
    setState((prev) => {
      const set = new Set(prev.onboarding.injuryMobility)
      if (item === 'None') {
        return {
          ...prev,
          onboarding: { ...prev.onboarding, injuryMobility: [] },
        }
      }

      if (set.has(item)) set.delete(item)
      else set.add(item)
      return {
        ...prev,
        onboarding: {
          ...prev.onboarding,
          injuryMobility: Array.from(set),
        },
      }
    })
  }, [])

  const toggleGoal = useCallback((goal: GoalOption) => {
    setState((prev) => {
      const hasGoal = prev.onboarding.goals.includes(goal)
      const nextGoals = hasGoal
        ? prev.onboarding.goals.filter((item) => item !== goal)
        : [...prev.onboarding.goals, goal]

      return {
        ...prev,
        onboarding: {
          ...prev.onboarding,
          goals: nextGoals.length ? nextGoals : prev.onboarding.goals,
        },
      }
    })
  }, [])

  const setSport = useCallback((sport: SportOption) => {
    setState((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        sport,
      },
    }))
  }, [])

  const setTimeHorizon = useCallback((weeks: 4 | 8 | 12) => {
    setState((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        timeHorizonWeeks: weeks,
      },
    }))
  }, [])

  const setIntensityPreference = useCallback((value: number) => {
    setState((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        intensityPreference: Math.max(1, Math.min(10, Math.round(value))),
      },
    }))
  }, [])

  const runAnalysis = useCallback(() => {
    let output: AnalysisOutput = buildAnalysis(state.onboarding)
    setState((prev) => {
      output = buildAnalysis(prev.onboarding)
      return {
        ...prev,
        analysis: output,
      }
    })
    return output
  }, [state.onboarding])

  const submitDailyCheckin = useCallback((input: DailyCheckinInput) => {
    setState((prev) => {
      const checkins = [...prev.dailyCheckins, { ...input, at: new Date().toISOString() }].slice(-14)
      const analysisBase = prev.analysis || buildAnalysis(prev.onboarding)

      const readinessShift = clamp(
        (input.energy * 8) + (input.sleep * 7) - (input.soreness * 6) + (analysisBase.readinessScore * 0.55),
        25,
        98
      )

      const nextAnalysis: AnalysisOutput = {
        ...analysisBase,
        readinessScore: readinessShift,
        peakProjection: {
          ...analysisBase.peakProjection,
          currentScore: readinessShift,
          progressPct: clamp((readinessShift / Math.max(1, analysisBase.peakProjection.targetScore)) * 100),
        },
        insights: [
          `Today: prioritize ${readinessShift < 55 ? 'recovery quality' : 'planned intensity'} to keep momentum.`,
          ...analysisBase.insights.slice(0, 2),
        ],
      }

      return {
        ...prev,
        analysis: nextAnalysis,
        dailyCheckins: checkins,
      }
    })
  }, [])

  const resetJourney = useCallback(() => {
    setState(defaultState)
  }, [])

  const value = useMemo<JourneyContextValue>(() => ({
    state,
    setRole,
    updateBasic,
    updateLifestyle,
    updatePhysiologyMetric,
    toggleInjuryMobility,
    toggleGoal,
    setSport,
    setTimeHorizon,
    setIntensityPreference,
    runAnalysis,
    submitDailyCheckin,
    resetJourney,
  }), [
    state,
    setRole,
    updateBasic,
    updateLifestyle,
    updatePhysiologyMetric,
    toggleInjuryMobility,
    toggleGoal,
    setSport,
    setTimeHorizon,
    setIntensityPreference,
    runAnalysis,
    submitDailyCheckin,
    resetJourney,
  ])

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
}

export function useJourneyStore() {
  const context = useContext(JourneyContext)
  if (!context) {
    throw new Error('useJourneyStore must be used inside IndividualJourneyProvider')
  }
  return context
}
