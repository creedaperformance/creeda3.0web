import {
  buildNutritionFramework,
  buildTrainingFramework,
} from '@/lib/engine/Prescription/SportsScienceKnowledge'

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)))

type ActivityLevel = 'sedentary' | 'moderate' | 'active'
type NutritionHabit = 'poor' | 'basic' | 'good' | 'structured'
type InjuryHistory = 'none' | 'minor' | 'moderate' | 'major' | 'chronic'
type MobilityLimitations = 'none' | 'mild' | 'moderate' | 'severe'
type TrainingExperience = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'experienced'
type GoalType = 'fat_loss' | 'muscle_gain' | 'endurance' | 'general_fitness' | 'sport_specific'
type TimeHorizon = '4_weeks' | '8_weeks' | '12_weeks' | 'long_term'
type IntensityPreference = 'low' | 'moderate' | 'high'
type RecommendationType = 'sport' | 'training' | 'lifestyle'

export type NormalIndividualFitStartInput = {
  basic: {
    age: number
    gender: string
    heightCm: number
    weightKg: number
    occupation: string
    activityLevel: ActivityLevel
  }
  physiology: {
    sleepQuality: number
    energyLevels: number
    stressLevels: number
    recoveryRate: number
    injuryHistory: InjuryHistory
    mobilityLimitations: MobilityLimitations
    trainingExperience: TrainingExperience
    endurance_capacity: number
    strength_capacity: number
    explosive_power: number
    agility_control: number
    reaction_self_perception: number
    recovery_efficiency: number
    fatigue_resistance: number
    load_tolerance: number
    movement_robustness: number
    coordination_control: number
    reaction_time_ms?: number
  }
  lifestyle: {
    scheduleConstraints: string[]
    equipmentAccess: string[]
    nutritionHabits: NutritionHabit
    sedentaryHours: number
  }
  goals: {
    primaryGoal: GoalType
    timeHorizon: TimeHorizon
    intensityPreference: IntensityPreference
  }
  sport: {
    selectedSport: string
    selectedPathwayId?: string
    selectedPathwayType?: RecommendationType
    selectedRecommendationTitle?: string
    selectionRationale?: string
  }
}

export type IndividualCurrentState = {
  readinessScore: number
  strengthProfile: number
  enduranceLevel: number
  mobilityStatus: number
  recoveryCapacity: number
  bodyCompositionIndex: number
  fatigueIndex: number
}

export type IndividualPeakState = {
  targetEndurance: number
  targetStrength: number
  targetMobility: number
  targetRecoveryEfficiency: number
  targetReadiness: number
  targetBodyComposition: {
    currentBmi: number
    targetBmi: number
    targetWeightKg: number
  }
}

export type GapItem = {
  pillar: string
  current: number
  target: number
  gap: number
  priority: 'low' | 'medium' | 'high'
}

export type IndividualGapAnalysis = {
  gaps: GapItem[]
  primaryGap: GapItem
  riskAreas: string[]
}

export type WeeklyDayPlan = {
  day: string
  focus: string
  type: 'training' | 'recovery' | 'mobility'
  intensity: 'low' | 'moderate' | 'high'
  durationMinutes: number
}

export type IndividualPlanEngine = {
  trainingPlan: {
    trainingDaysPerWeek: number
    weeklyStructure: WeeklyDayPlan[]
    sportSpecificDrills: string[]
  }
  recoveryPlan: {
    sleepTargetHours: number
    interventions: string[]
    deloadLogic: string
  }
  lifestylePlan: {
    stepTarget: number
    hydrationLiters: number
    movementBreakEveryMinutes: number
    habitGoals: string[]
  }
  progressionLogic: {
    loadIncreasePerWeekPct: number
    adaptiveRules: string[]
  }
}

export type IndividualJourneyState = {
  journeyStartDate: string
  projectedPeakDate: string
  currentWeek: number
  totalWeeks: number
  completedSessions: number
  missedSessions: number
  adherenceScore: number
  streakCount: number
  progressToPeakPct: number
}

export type DailyGuidance = {
  todayFocus: string
  intensity: 'low' | 'moderate' | 'high'
  readinessScore: number
  sessionDurationMinutes: number
  whatToDo: string[]
  recoveryActions: string[]
  adaptationNote: string
}

export type WeeklyFeedback = {
  averageReadiness: number
  adherencePct: number
  trend: 'improving' | 'stable' | 'declining'
  improvements: string[]
  adjustments: string[]
}

export type PeakProjection = {
  currentLevelScore: number
  projectedPeakScore: number
  weeksRemaining: number
  projectedPeakDate: string
  visualMilestones: Array<{ label: string; progressPct: number }>
}

export type FitStartComputation = {
  currentState: IndividualCurrentState
  peakState: IndividualPeakState
  gapAnalysis: IndividualGapAnalysis
  planEngine: IndividualPlanEngine
  journeyState: IndividualJourneyState
  dailyGuidance: DailyGuidance
  weeklyFeedback: WeeklyFeedback
  peakProjection: PeakProjection
  recommendations: IndividualPathRecommendation[]
}

export type IndividualPathRecommendation = {
  id: string
  type: RecommendationType
  title: string
  mappedSport: string
  score: number
  summary: string
  why: string[]
}

export type DeviceRecoverySignal = {
  available: boolean
  metricDate: string | null
  freshnessDays: number
  source: 'apple' | 'android' | 'mixed' | 'unknown'
  influenceWeight: number
  recoveryPulse: number
  sleepScore: number
  activityScore: number
  heartRateScore: number
  hrvScore: number
  steps: number | null
  sleepHours: number | null
  heartRateAvg: number | null
  hrv: number | null
}

const ACTIVITY_SCORES: Record<ActivityLevel, number> = {
  sedentary: 38,
  moderate: 56,
  active: 72,
}

const EXPERIENCE_SCORES: Record<TrainingExperience, number> = {
  beginner: 30,
  novice: 45,
  intermediate: 60,
  advanced: 74,
  experienced: 84,
}

const INJURY_PENALTY: Record<InjuryHistory, number> = {
  none: 0,
  minor: 4,
  moderate: 10,
  major: 16,
  chronic: 22,
}

const MOBILITY_SCORES: Record<MobilityLimitations, number> = {
  none: 86,
  mild: 72,
  moderate: 58,
  severe: 40,
}

const NUTRITION_SCORES: Record<NutritionHabit, number> = {
  poor: 40,
  basic: 55,
  good: 70,
  structured: 82,
}

const GOAL_TARGET_MODIFIERS: Record<GoalType, { endurance: number; strength: number; mobility: number; recovery: number; readiness: number }> = {
  fat_loss: { endurance: 10, strength: 4, mobility: 6, recovery: 4, readiness: 4 },
  muscle_gain: { endurance: 2, strength: 12, mobility: 4, recovery: 6, readiness: 5 },
  endurance: { endurance: 14, strength: 3, mobility: 4, recovery: 8, readiness: 6 },
  general_fitness: { endurance: 7, strength: 7, mobility: 7, recovery: 6, readiness: 5 },
  sport_specific: { endurance: 8, strength: 8, mobility: 7, recovery: 7, readiness: 6 },
}

type SportDemandProfile = {
  endurance: number
  strength: number
  mobility: number
  recovery: number
  readiness: number
  drills: string[]
}

const SPORT_DEMANDS: Record<string, SportDemandProfile> = {
  football: {
    endurance: 82,
    strength: 68,
    mobility: 74,
    recovery: 74,
    readiness: 80,
    drills: ['Repeated sprint sets (6 x 20m)', 'Change-of-direction ladder', 'Ball control under fatigue'],
  },
  running: {
    endurance: 88,
    strength: 55,
    mobility: 68,
    recovery: 72,
    readiness: 78,
    drills: ['Tempo intervals', 'Cadence drills', 'Stride mechanics block'],
  },
  gym: {
    endurance: 60,
    strength: 86,
    mobility: 68,
    recovery: 74,
    readiness: 80,
    drills: ['Compound lift progression', 'Accessory hypertrophy circuit', 'Core bracing protocol'],
  },
  swimming: {
    endurance: 84,
    strength: 64,
    mobility: 78,
    recovery: 75,
    readiness: 79,
    drills: ['Technique-focused laps', 'Pull buoy strength sets', 'Breath-control intervals'],
  },
  cycling: {
    endurance: 86,
    strength: 62,
    mobility: 64,
    recovery: 72,
    readiness: 78,
    drills: ['Zone 2 endurance ride', 'Threshold intervals', 'Low cadence strength blocks'],
  },
  basketball: {
    endurance: 74,
    strength: 70,
    mobility: 75,
    recovery: 76,
    readiness: 81,
    drills: ['Repeated jump mechanics', 'Lateral acceleration sets', 'Ball-handling under pressure'],
  },
  tennis: {
    endurance: 72,
    strength: 66,
    mobility: 80,
    recovery: 73,
    readiness: 79,
    drills: ['Footwork shadow sets', 'Serve + first ball pattern', 'Reactive agility work'],
  },
  yoga: {
    endurance: 58,
    strength: 55,
    mobility: 88,
    recovery: 84,
    readiness: 76,
    drills: ['Breath-driven mobility flow', 'Single-leg stability balance', 'Core and posture holds'],
  },
  'general fitness': {
    endurance: 70,
    strength: 70,
    mobility: 72,
    recovery: 72,
    readiness: 78,
    drills: ['Mixed cardio block', 'Full-body strength circuit', 'Mobility and breath reset'],
  },
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function normalizeSportKey(rawSport: string) {
  const normalized = rawSport.trim().toLowerCase()
  if (!normalized) return 'general fitness'
  if (normalized.includes('football')) return 'football'
  if (normalized.includes('run')) return 'running'
  if (normalized.includes('gym') || normalized.includes('strength')) return 'gym'
  if (normalized.includes('swim')) return 'swimming'
  if (normalized.includes('cycle') || normalized.includes('bike')) return 'cycling'
  if (normalized.includes('basket')) return 'basketball'
  if (normalized.includes('tennis') || normalized.includes('padel')) return 'tennis'
  if (normalized.includes('yoga')) return 'yoga'
  return normalized in SPORT_DEMANDS ? normalized : 'general fitness'
}

function resolvePathwayType(input: NormalIndividualFitStartInput): RecommendationType {
  if (input.sport.selectedPathwayType) return input.sport.selectedPathwayType
  if (input.goals.primaryGoal === 'general_fitness' || input.goals.primaryGoal === 'fat_loss') return 'lifestyle'
  if (input.goals.primaryGoal === 'muscle_gain') return 'training'
  return 'sport'
}

function formatSportLabel(rawSport: string) {
  const normalized = normalizeSportKey(rawSport)
  if (normalized === 'general fitness') return 'General fitness'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function bmi(heightCm: number, weightKg: number) {
  const heightM = Math.max(1.2, heightCm / 100)
  return Number((weightKg / (heightM * heightM)).toFixed(1))
}

function horizonWeeks(horizon: TimeHorizon) {
  if (horizon === '4_weeks') return 4
  if (horizon === '8_weeks') return 8
  if (horizon === '12_weeks') return 12
  return 24
}

function weeksToDate(weeks: number) {
  const now = new Date()
  now.setDate(now.getDate() + weeks * 7)
  return now.toISOString().slice(0, 10)
}

function mapLikertToScore(value: number) {
  const bounded = Math.max(1, Math.min(5, value))
  return bounded * 20
}

function mapDomainToScore(value: number) {
  const bounded = Math.max(1, Math.min(4, value))
  return ((bounded - 1) / 3) * 60 + 40
}

function deriveCurrentState(input: NormalIndividualFitStartInput): IndividualCurrentState {
  const activityScore = ACTIVITY_SCORES[input.basic.activityLevel]
  const experienceScore = EXPERIENCE_SCORES[input.physiology.trainingExperience]
  const mobilityBase = MOBILITY_SCORES[input.physiology.mobilityLimitations]
  const nutritionScore = NUTRITION_SCORES[input.lifestyle.nutritionHabits]
  const injuryPenalty = INJURY_PENALTY[input.physiology.injuryHistory]
  const equipmentBonus = input.lifestyle.equipmentAccess.includes('gym') ? 8 : input.lifestyle.equipmentAccess.includes('bodyweight') ? 4 : 0
  const sedentaryPenalty = Math.max(0, input.lifestyle.sedentaryHours - 7) * 1.6

  const readinessRaw =
    mapLikertToScore(input.physiology.sleepQuality) * 0.14 +
    mapLikertToScore(input.physiology.energyLevels) * 0.14 +
    (100 - mapLikertToScore(input.physiology.stressLevels)) * 0.11 +
    mapLikertToScore(input.physiology.recoveryRate) * 0.1 +
    mapDomainToScore(input.physiology.recovery_efficiency) * 0.16 +
    mapDomainToScore(input.physiology.fatigue_resistance) * 0.14 +
    mapDomainToScore(input.physiology.load_tolerance) * 0.09 +
    nutritionScore * 0.12 -
    injuryPenalty -
    sedentaryPenalty * 0.3

  const strengthRaw =
    mapDomainToScore(input.physiology.strength_capacity) * 0.64 +
    mapDomainToScore(input.physiology.explosive_power) * 0.16 +
    experienceScore * 0.12 +
    activityScore * 0.08 +
    equipmentBonus +
    (input.goals.primaryGoal === 'muscle_gain' ? 6 : 0) -
    injuryPenalty * 0.45

  const enduranceRaw =
    mapDomainToScore(input.physiology.endurance_capacity) * 0.64 +
    mapDomainToScore(input.physiology.fatigue_resistance) * 0.14 +
    activityScore * 0.12 +
    mapLikertToScore(input.physiology.recoveryRate) * 0.1 -
    sedentaryPenalty

  const mobilityRaw =
    mobilityBase * 0.42 +
    mapDomainToScore(input.physiology.movement_robustness) * 0.28 +
    mapDomainToScore(input.physiology.agility_control) * 0.16 +
    mapDomainToScore(input.physiology.coordination_control) * 0.14 -
    injuryPenalty * 0.35 +
    (input.lifestyle.scheduleConstraints.includes('shift_work') ? -5 : 0)

  const recoveryRaw =
    mapLikertToScore(input.physiology.sleepQuality) * 0.24 +
    mapLikertToScore(input.physiology.recoveryRate) * 0.18 +
    (100 - mapLikertToScore(input.physiology.stressLevels)) * 0.14 +
    mapDomainToScore(input.physiology.recovery_efficiency) * 0.22 +
    mapDomainToScore(input.physiology.load_tolerance) * 0.12 +
    nutritionScore * 0.1 -
    injuryPenalty * 0.4

  const bmiNow = bmi(input.basic.heightCm, input.basic.weightKg)
  const compositionIndex = clamp(100 - Math.abs(23 - bmiNow) * 8)

  return {
    readinessScore: clamp(readinessRaw),
    strengthProfile: clamp(strengthRaw),
    enduranceLevel: clamp(enduranceRaw),
    mobilityStatus: clamp(mobilityRaw),
    recoveryCapacity: clamp(recoveryRaw),
    bodyCompositionIndex: compositionIndex,
    fatigueIndex: clamp(100 - readinessRaw + injuryPenalty + sedentaryPenalty * 1.5),
  }
}

function scoreSportFit(current: IndividualCurrentState, demand: SportDemandProfile) {
  const distance =
    Math.abs(current.enduranceLevel - demand.endurance) * 0.3 +
    Math.abs(current.strengthProfile - demand.strength) * 0.25 +
    Math.abs(current.mobilityStatus - demand.mobility) * 0.15 +
    Math.abs(current.recoveryCapacity - demand.recovery) * 0.2 +
    Math.abs(current.readinessScore - demand.readiness) * 0.1

  return clamp(100 - distance, 20, 98)
}

export function recommendPathwaysForIndividual(input: NormalIndividualFitStartInput): IndividualPathRecommendation[] {
  const current = deriveCurrentState(input)
  const recommendations: IndividualPathRecommendation[] = []

  const sportEntries = Object.entries(SPORT_DEMANDS)
    .filter(([sport]) => sport !== 'general fitness')
    .map(([sport, demand]) => {
      let score = scoreSportFit(current, demand)
      const lowerSport = sport.toLowerCase()

      if (input.goals.primaryGoal === 'endurance' && ['running', 'cycling', 'swimming'].includes(lowerSport)) score += 8
      if (input.goals.primaryGoal === 'muscle_gain' && lowerSport === 'gym') score += 10
      if (input.goals.primaryGoal === 'sport_specific' && !['gym', 'yoga'].includes(lowerSport)) score += 6
      if (lowerSport === 'swimming' && !input.lifestyle.equipmentAccess.includes('pool')) score -= 14
      if (lowerSport === 'gym' && !input.lifestyle.equipmentAccess.includes('gym')) score -= 10
      if (input.lifestyle.scheduleConstraints.includes('weekends_only') && ['running', 'cycling'].includes(lowerSport)) score -= 4

      return { sport, score: clamp(score, 20, 99), demand }
    })
    .sort((a, b) => b.score - a.score)

  for (const entry of sportEntries.slice(0, 2)) {
    const title = entry.sport.charAt(0).toUpperCase() + entry.sport.slice(1)
    recommendations.push({
      id: `sport_${entry.sport.replace(/\s+/g, '_')}`,
      type: 'sport',
      title,
      mappedSport: title,
      score: entry.score,
      summary: `${title} aligns with your current physiology and goal trajectory.`,
      why: [
        `Demand fit score ${entry.score}/100 based on readiness, strength, endurance, and mobility.`,
        `Primary focus: endurance ${entry.demand.endurance}, strength ${entry.demand.strength}, mobility ${entry.demand.mobility}.`,
      ],
    })
  }

  const strengthTrackScore = clamp(
    58 +
      (input.goals.primaryGoal === 'muscle_gain' ? 22 : 0) +
      (input.goals.intensityPreference === 'high' ? 6 : 0) +
      (input.lifestyle.equipmentAccess.includes('gym') ? 10 : 2) +
      (current.strengthProfile < 62 ? 6 : 0),
    35,
    98
  )

  recommendations.push({
    id: 'track_strength_foundation',
    type: 'training',
    title: 'Strength and Energy Track',
    mappedSport: 'Strength Training',
    score: strengthTrackScore,
    summary: 'Build strength, posture, and work capacity before layering harder fitness or sport goals.',
    why: [
      'Best when strength, confidence, and body control are your main limiters.',
      'Builds resilience for daily life and makes the next phase safer.',
    ],
  })

  const lifestyleTrackScore = clamp(
    54 +
      (current.recoveryCapacity < 60 ? 14 : 0) +
      (input.physiology.stressLevels >= 4 ? 10 : 0) +
      (input.lifestyle.sedentaryHours >= 8 ? 8 : 0) +
      (input.goals.primaryGoal === 'general_fitness' ? 8 : 0),
    35,
    95
  )

  recommendations.push({
    id: 'track_lifestyle_reset',
    type: 'lifestyle',
    title: 'Healthy Lifestyle Reset',
    mappedSport: 'Healthy Living',
    score: lifestyleTrackScore,
    summary: 'Prioritize sleep, movement, recovery, and routine consistency before harder loading.',
    why: [
      'Best for restoring energy, rhythm, and sustainable weekly habits.',
      'Creates the base needed to get healthier before pushing harder.',
    ],
  })

  return recommendations.sort((a, b) => b.score - a.score).slice(0, 4)
}

function derivePeakState(input: NormalIndividualFitStartInput): IndividualPeakState {
  const sportKey = normalizeSportKey(input.sport.selectedSport)
  const sportDemand = SPORT_DEMANDS[sportKey]
  const goalMod = GOAL_TARGET_MODIFIERS[input.goals.primaryGoal]
  const intensityBoost = input.goals.intensityPreference === 'high' ? 6 : input.goals.intensityPreference === 'moderate' ? 3 : 0

  const targetEndurance = clamp(sportDemand.endurance + goalMod.endurance + intensityBoost)
  const targetStrength = clamp(sportDemand.strength + goalMod.strength + intensityBoost)
  const targetMobility = clamp(sportDemand.mobility + goalMod.mobility)
  const targetRecovery = clamp(sportDemand.recovery + goalMod.recovery)
  const targetReadiness = clamp(sportDemand.readiness + goalMod.readiness + Math.round(intensityBoost * 0.7))

  const currentBmi = bmi(input.basic.heightCm, input.basic.weightKg)
  const bmiDelta =
    input.goals.primaryGoal === 'fat_loss' ? -2.2 :
    input.goals.primaryGoal === 'muscle_gain' ? 1.1 :
    input.goals.primaryGoal === 'endurance' ? -1.1 : -0.4
  const targetBmi = Number(Math.max(19.5, Math.min(27, currentBmi + bmiDelta)).toFixed(1))
  const targetWeightKg = Number((targetBmi * Math.pow(input.basic.heightCm / 100, 2)).toFixed(1))

  return {
    targetEndurance,
    targetStrength,
    targetMobility,
    targetRecoveryEfficiency: targetRecovery,
    targetReadiness,
    targetBodyComposition: {
      currentBmi,
      targetBmi,
      targetWeightKg,
    },
  }
}

function buildGapAnalysis(
  input: NormalIndividualFitStartInput,
  current: IndividualCurrentState,
  peak: IndividualPeakState
): IndividualGapAnalysis {
  const gaps: GapItem[] = [
    {
      pillar: 'Endurance',
      current: current.enduranceLevel,
      target: peak.targetEndurance,
      gap: Math.max(0, peak.targetEndurance - current.enduranceLevel),
      priority: 'low',
    },
    {
      pillar: 'Strength',
      current: current.strengthProfile,
      target: peak.targetStrength,
      gap: Math.max(0, peak.targetStrength - current.strengthProfile),
      priority: 'low',
    },
    {
      pillar: 'Mobility',
      current: current.mobilityStatus,
      target: peak.targetMobility,
      gap: Math.max(0, peak.targetMobility - current.mobilityStatus),
      priority: 'low',
    },
    {
      pillar: 'Recovery',
      current: current.recoveryCapacity,
      target: peak.targetRecoveryEfficiency,
      gap: Math.max(0, peak.targetRecoveryEfficiency - current.recoveryCapacity),
      priority: 'low',
    },
    {
      pillar: 'Readiness',
      current: current.readinessScore,
      target: peak.targetReadiness,
      gap: Math.max(0, peak.targetReadiness - current.readinessScore),
      priority: 'low',
    },
  ]

  const scored = gaps
    .map((item) => ({
      ...item,
      priority: (item.gap >= 20 ? 'high' : item.gap >= 10 ? 'medium' : 'low') as GapItem['priority'],
    }))
    .sort((a, b) => b.gap - a.gap)

  const riskAreas: string[] = []
  if (input.physiology.injuryHistory === 'major' || input.physiology.injuryHistory === 'chronic') {
    riskAreas.push('Injury recurrence risk: prioritize movement quality and gradual loading.')
  }
  if (current.recoveryCapacity < 50 && input.goals.intensityPreference === 'high') {
    riskAreas.push('Overload risk: intensity preference exceeds present recovery capacity.')
  }
  if (input.lifestyle.sedentaryHours >= 9) {
    riskAreas.push('Lifestyle inertia risk: high sedentary hours can suppress adaptation.')
  }
  if (current.mobilityStatus < 55) {
    riskAreas.push('Mobility bottleneck: reduced movement quality can limit comfort, confidence, and progress.')
  }
  if (riskAreas.length === 0) {
    riskAreas.push('Low current risk: focus on consistency, recovery, and steady progression.')
  }

  return {
    gaps: scored,
    primaryGap: scored[0],
    riskAreas,
  }
}

function generateWeeklyStructure(
  input: NormalIndividualFitStartInput,
  current: IndividualCurrentState
): WeeklyDayPlan[] {
  const pathwayType = resolvePathwayType(input)
  const sportLabel = formatSportLabel(input.sport.selectedSport)
  const baseDays = input.goals.intensityPreference === 'high' ? 5 : input.goals.intensityPreference === 'moderate' ? 4 : 3
  const readinessLimit = current.readinessScore < 50 ? Math.min(baseDays, 3) : baseDays
  const trainingDays = clamp(readinessLimit, 2, 6)
  const durationBase = input.goals.intensityPreference === 'high' ? 70 : input.goals.intensityPreference === 'moderate' ? 55 : 45

  const templates: Array<Omit<WeeklyDayPlan, 'day'>> =
    pathwayType === 'lifestyle'
      ? [
          { focus: 'Brisk walk and movement foundation', type: 'training', intensity: 'moderate', durationMinutes: Math.max(35, durationBase - 10) },
          { focus: 'Easy aerobic conditioning', type: 'training', intensity: 'low', durationMinutes: Math.max(30, durationBase - 15) },
          { focus: 'Mobility and posture reset', type: 'mobility', intensity: 'low', durationMinutes: 30 },
          { focus: 'Bodyweight strength basics', type: 'training', intensity: 'moderate', durationMinutes: Math.max(35, durationBase - 5) },
          { focus: 'Walking recovery and breathwork', type: 'recovery', intensity: 'low', durationMinutes: 30 },
          { focus: 'Long easy walk, cycle, or swim', type: 'training', intensity: 'moderate', durationMinutes: Math.max(40, durationBase) },
          { focus: 'Recovery reset', type: 'recovery', intensity: 'low', durationMinutes: 30 },
        ]
      : pathwayType === 'training'
        ? [
            { focus: 'Strength and movement foundation', type: 'training', intensity: 'moderate', durationMinutes: durationBase },
            { focus: 'Aerobic conditioning', type: 'training', intensity: 'moderate', durationMinutes: durationBase - 5 },
            { focus: 'Mobility and tissue quality', type: 'mobility', intensity: 'low', durationMinutes: 35 },
            { focus: 'Full-body strength build', type: 'training', intensity: 'high', durationMinutes: durationBase },
            { focus: 'Hybrid strength and conditioning', type: 'training', intensity: 'moderate', durationMinutes: durationBase },
            { focus: 'Work-capacity intervals', type: 'training', intensity: 'high', durationMinutes: durationBase - 10 },
            { focus: 'Recovery reset', type: 'recovery', intensity: 'low', durationMinutes: 30 },
          ]
        : [
            { focus: 'Strength and movement foundation', type: 'training', intensity: 'moderate', durationMinutes: durationBase },
            { focus: 'Aerobic conditioning', type: 'training', intensity: 'moderate', durationMinutes: durationBase - 5 },
            { focus: 'Mobility and tissue quality', type: 'mobility', intensity: 'low', durationMinutes: 35 },
            { focus: `${sportLabel} entry skills and coordination`, type: 'training', intensity: 'high', durationMinutes: durationBase },
            { focus: 'Hybrid strength-conditioning', type: 'training', intensity: 'moderate', durationMinutes: durationBase },
            { focus: 'Endurance intervals', type: 'training', intensity: 'high', durationMinutes: durationBase - 10 },
            { focus: 'Recovery reset', type: 'recovery', intensity: 'low', durationMinutes: 30 },
          ]

  return WEEK_DAYS.map((day, index) => {
    const template = templates[index]
    if (index >= trainingDays && template.type === 'training') {
      return { day, focus: 'Recovery reset', type: 'recovery', intensity: 'low', durationMinutes: 30 }
    }
    if (current.recoveryCapacity < 45 && template.intensity === 'high') {
      return { ...template, day, intensity: 'moderate', durationMinutes: Math.max(35, template.durationMinutes - 15) }
    }
    return { ...template, day }
  })
}

function derivePlan(
  input: NormalIndividualFitStartInput,
  current: IndividualCurrentState,
  peak: IndividualPeakState
): IndividualPlanEngine {
  const pathwayType = resolvePathwayType(input)
  const sportKey = normalizeSportKey(input.sport.selectedSport)
  const sportDemand = SPORT_DEMANDS[sportKey]
  const weeklyStructure = generateWeeklyStructure(input, current)
  const trainingDaysPerWeek = weeklyStructure.filter(item => item.type === 'training').length
  const trainingFramework = buildTrainingFramework({
    goal: input.goals.primaryGoal,
    activityLevel: input.basic.activityLevel,
    pathwayType,
    readinessScore: current.readinessScore,
    trainingExperience: input.physiology.trainingExperience,
    sedentaryHours: input.lifestyle.sedentaryHours,
  })
  const nutritionFramework = buildNutritionFramework({
    goal: input.goals.primaryGoal,
    activityLevel: input.basic.activityLevel,
    weightKg: input.basic.weightKg,
    heightCm: input.basic.heightCm,
    age: input.basic.age,
    biologicalSex: input.basic.gender,
    pathwayType,
  })

  const sleepTargetHours = trainingFramework.sleepTargetHours
  const hydrationLiters = nutritionFramework.hydrationLiters
  const stepTarget = trainingFramework.dailyStepTarget

  const gapMagnitude = peak.targetReadiness - current.readinessScore
  const loadIncrease = Math.min(
    trainingFramework.progressionCapPct,
    gapMagnitude > 25 ? 5 : gapMagnitude > 12 ? 6 : 7
  )
  const sportSpecificDrills =
    pathwayType === 'sport'
      ? sportDemand.drills
      : pathwayType === 'training'
        ? ['Full-body strength pattern practice', 'Core bracing and posture work', 'Simple interval conditioning']
        : ['10-minute mobility flow', 'Brisk walk with nasal breathing', 'Simple bodyweight movement circuit']
  const recoveryInterventions =
    pathwayType === 'lifestyle'
      ? [
          '10-minute walk after dinner or your largest meal',
          'Mobility break after long sitting blocks',
          'Protein-and-fibre focus in one main meal each day',
        ]
      : [
          '10-minute downregulation breathwork after harder sessions',
          'Mobility reset on lower-load days',
          'Protein-focused evening meal for tissue repair',
        ]
  const habitGoals =
    pathwayType === 'lifestyle'
      ? [
          `Hit ${stepTarget.toLocaleString()} steps on 5+ days/week`,
          `Sleep ${sleepTargetHours.toFixed(1)}h average`,
          `Break up sitting every ${input.lifestyle.sedentaryHours >= 8 ? 45 : 60} minutes`,
        ]
      : pathwayType === 'training'
        ? [
            `Hit ${stepTarget.toLocaleString()} steps on 5+ days/week`,
            `Sleep ${sleepTargetHours.toFixed(1)}h average`,
            'Complete your planned strength and movement days before adding extra work',
          ]
        : [
            `Hit ${stepTarget.toLocaleString()} steps on 5+ days/week`,
            `Sleep ${sleepTargetHours.toFixed(1)}h average`,
            'Complete your planned movement days before adding extra intensity',
          ]
  const adaptiveRules =
    pathwayType === 'lifestyle'
      ? [
          'If two movement days are missed, restart with the shortest planned block and rebuild consistency.',
          'If readiness rises above 80 for 3 straight days, add one longer movement block that week.',
          'If stress stays high, keep the routine simple and hold volume steady for 48 hours.',
        ]
      : [
          'If one planned session is missed, redistribute volume across the next 2 sessions by +10% max.',
          'If readiness rises above 80 for 3 straight days, unlock one higher-demand block.',
          'If stress remains high, maintain volume and reduce intensity for 48 hours.',
        ]

  return {
    trainingPlan: {
      trainingDaysPerWeek,
      weeklyStructure,
      sportSpecificDrills,
    },
    recoveryPlan: {
      sleepTargetHours: Number(sleepTargetHours.toFixed(1)),
      interventions: recoveryInterventions,
      deloadLogic: 'Trigger deload week when readiness < 45 for 2 consecutive days or soreness remains high for 3 days.',
    },
    lifestylePlan: {
      stepTarget,
      hydrationLiters,
      movementBreakEveryMinutes: input.lifestyle.sedentaryHours >= 8 ? 45 : 60,
      habitGoals,
    },
    progressionLogic: {
      loadIncreasePerWeekPct: loadIncrease,
      adaptiveRules,
    },
  }
}

function deriveJourneyState(input: NormalIndividualFitStartInput, current: IndividualCurrentState, peak: IndividualPeakState): IndividualJourneyState {
  const totalWeeks = horizonWeeks(input.goals.timeHorizon)
  const progressToPeakPct = clamp((current.readinessScore / Math.max(1, peak.targetReadiness)) * 100)
  return {
    journeyStartDate: new Date().toISOString().slice(0, 10),
    projectedPeakDate: weeksToDate(totalWeeks),
    currentWeek: 1,
    totalWeeks,
    completedSessions: 0,
    missedSessions: 0,
    adherenceScore: 100,
    streakCount: 0,
    progressToPeakPct,
  }
}

export function generateDailyGuidance(args: {
  currentState: IndividualCurrentState
  planEngine: IndividualPlanEngine
  journeyState: IndividualJourneyState
  today?: Date
}): DailyGuidance {
  const today = args.today || new Date()
  const dayName = WEEK_DAYS[(today.getDay() + 6) % 7]
  const dayPlan = args.planEngine.trainingPlan.weeklyStructure.find(item => item.day === dayName) || args.planEngine.trainingPlan.weeklyStructure[0]
  let intensity = dayPlan.intensity
  let adaptationNote = 'Consistency plan active.'
  let sessionDuration = dayPlan.durationMinutes
  const readinessScore = clamp(args.currentState.readinessScore)

  if (readinessScore < 45) {
    intensity = 'low'
    sessionDuration = Math.max(25, sessionDuration - 20)
    adaptationNote = 'Recovery override active: keep today restorative and light.'
  } else if (readinessScore < 62 && intensity === 'high') {
    intensity = 'moderate'
    sessionDuration = Math.max(35, sessionDuration - 10)
    adaptationNote = 'Controlled day override: keep quality high and strain modest.'
  } else if (readinessScore > 82 && dayPlan.type === 'training') {
    adaptationNote = 'High-readiness day: lean into your main session with confidence and quality.'
  }

  const whatToDo = [
    `${dayPlan.focus} (${sessionDuration} min, ${intensity} intensity).`,
    `Main focus today: ${readinessScore < 55 ? 'recovery quality and easy movement' : 'steady capacity-building without breaking recovery'}.`,
    'Log a quick reflection so CREEDA can track your trend.',
  ]

  const recoveryActions = [
    `Sleep window target: ${args.planEngine.recoveryPlan.sleepTargetHours}h`,
    'Hydrate steadily through the day and finish the evening with light mobility.',
    'If soreness spikes, replace your next harder block with easy movement or walking.',
  ]

  return {
    todayFocus: dayPlan.focus,
    intensity,
    readinessScore,
    sessionDurationMinutes: sessionDuration,
    whatToDo,
    recoveryActions,
    adaptationNote,
  }
}

export function generateWeeklyFeedback(params: {
  readinessHistory: number[]
  plannedSessions: number
  completedSessions: number
}): WeeklyFeedback {
  const history = params.readinessHistory.filter(item => Number.isFinite(item))
  const averageReadiness = history.length
    ? Math.round(history.reduce((sum, value) => sum + value, 0) / history.length)
    : 50
  const adherencePct = clamp((params.completedSessions / Math.max(1, params.plannedSessions)) * 100)
  const start = history[history.length - 1] || averageReadiness
  const end = history[0] || averageReadiness
  const delta = end - start
  const trend: WeeklyFeedback['trend'] = delta > 4 ? 'improving' : delta < -4 ? 'declining' : 'stable'

  const improvements: string[] = []
  if (trend === 'improving') improvements.push('Readiness trend is climbing week-over-week.')
  if (averageReadiness >= 70) improvements.push('Your body is handling the week well enough to keep progressing.')
  if (adherencePct >= 80) improvements.push('Consistency is strong, so CREEDA can safely move you forward.')
  if (improvements.length === 0) improvements.push('Foundation established; consistency this week remains the priority.')

  const adjustments: string[] = []
  if (adherencePct < 70) adjustments.push('Reduce plan complexity and lock in minimum effective movement first.')
  if (averageReadiness < 55) adjustments.push('Use a 48-hour recovery bias and reduce demanding work.')
  if (trend === 'declining') adjustments.push('Trigger a lighter 3-4 day reset before progressing again.')
  if (adjustments.length === 0) adjustments.push('Maintain current progression and add one more quality movement block only if recovery stays stable.')

  return {
    averageReadiness,
    adherencePct,
    trend,
    improvements,
    adjustments,
  }
}

export function generatePeakProjection(args: {
  journeyState: IndividualJourneyState
  currentState: IndividualCurrentState
  peakState: IndividualPeakState
}): PeakProjection {
  const projectedPeakScore = args.peakState.targetReadiness
  const currentLevelScore = args.currentState.readinessScore
  const remaining = Math.max(0, projectedPeakScore - currentLevelScore)
  const weeksRemaining = Math.max(1, Math.round((remaining / 3.5)))
  const projectedPeakDate = weeksToDate(weeksRemaining)

  return {
    currentLevelScore,
    projectedPeakScore,
    weeksRemaining,
    projectedPeakDate,
    visualMilestones: [
      { label: 'Routine Locked', progressPct: 30 },
      { label: 'Capacity Building', progressPct: 60 },
      { label: 'Peak Self', progressPct: 100 },
    ],
  }
}

export function computeFitStartJourney(input: NormalIndividualFitStartInput): FitStartComputation {
  const recommendations = recommendPathwaysForIndividual(input)
  const currentState = deriveCurrentState(input)
  const peakState = derivePeakState(input)
  const gapAnalysis = buildGapAnalysis(input, currentState, peakState)
  const planEngine = derivePlan(input, currentState, peakState)
  const journeyState = deriveJourneyState(input, currentState, peakState)
  const dailyGuidance = generateDailyGuidance({ currentState, planEngine, journeyState })
  const weeklyFeedback = generateWeeklyFeedback({
    readinessHistory: [currentState.readinessScore],
    plannedSessions: planEngine.trainingPlan.trainingDaysPerWeek,
    completedSessions: 0,
  })
  const peakProjection = generatePeakProjection({ journeyState, currentState, peakState })

  return {
    currentState,
    peakState,
    gapAnalysis,
    planEngine,
    journeyState,
    dailyGuidance,
    weeklyFeedback,
    peakProjection,
    recommendations,
  }
}

export function recomputeDailyJourney(args: {
  baseInput: NormalIndividualFitStartInput
  currentState: IndividualCurrentState
  journeyState: IndividualJourneyState
  planEngine: IndividualPlanEngine
  dailySignal: {
    sleepQuality: number
    energyLevel: number
    stressLevel: number
    recoveryFeel: number
    sorenessLevel: number
    completedSession: boolean
    missedSession: boolean
  }
  deviceSignal?: DeviceRecoverySignal | null
  readinessHistory: number[]
}): {
  currentState: IndividualCurrentState
  journeyState: IndividualJourneyState
  dailyGuidance: DailyGuidance
  weeklyFeedback: WeeklyFeedback
  peakProjection: PeakProjection
  adaptation: {
    manualRecoveryPulse: number
    blendedRecoveryPulse: number
    deviceInfluencePct: number
    usedDeviceSignal: boolean
  }
} {
  const recoveryPulse =
    mapLikertToScore(args.dailySignal.sleepQuality) * 0.26 +
    mapLikertToScore(args.dailySignal.energyLevel) * 0.24 +
    (100 - mapLikertToScore(args.dailySignal.stressLevel)) * 0.2 +
    mapLikertToScore(args.dailySignal.recoveryFeel) * 0.2 +
    (100 - mapLikertToScore(args.dailySignal.sorenessLevel)) * 0.1

  const boundedManualRecoveryPulse = clamp(recoveryPulse)
  const rawDeviceInfluence = args.deviceSignal?.available ? Number(args.deviceSignal.influenceWeight) : 0
  const deviceInfluence = Math.max(0, Math.min(0.45, Number.isFinite(rawDeviceInfluence) ? rawDeviceInfluence : 0))
  const hasDeviceContribution = Boolean(args.deviceSignal?.available && deviceInfluence > 0)
  const blendedRecoveryPulse = hasDeviceContribution
    ? (boundedManualRecoveryPulse * (1 - deviceInfluence)) + ((args.deviceSignal?.recoveryPulse ?? boundedManualRecoveryPulse) * deviceInfluence)
    : boundedManualRecoveryPulse

  const nextReadiness = clamp((args.currentState.readinessScore * 0.55) + (blendedRecoveryPulse * 0.45))
  const fatigueShift = clamp(100 - blendedRecoveryPulse)
  const nextState: IndividualCurrentState = {
    ...args.currentState,
    readinessScore: nextReadiness,
    recoveryCapacity: clamp((args.currentState.recoveryCapacity * 0.6) + (blendedRecoveryPulse * 0.4)),
    fatigueIndex: fatigueShift,
  }

  const nextJourney: IndividualJourneyState = {
    ...args.journeyState,
    completedSessions: args.journeyState.completedSessions + (args.dailySignal.completedSession ? 1 : 0),
    missedSessions: args.journeyState.missedSessions + (args.dailySignal.missedSession ? 1 : 0),
    streakCount: args.dailySignal.completedSession ? args.journeyState.streakCount + 1 : 0,
  }
  const totalDone = nextJourney.completedSessions + nextJourney.missedSessions
  nextJourney.adherenceScore = clamp((nextJourney.completedSessions / Math.max(1, totalDone)) * 100)
  nextJourney.progressToPeakPct = clamp((nextReadiness / 90) * 100)
  nextJourney.currentWeek = Math.max(1, Math.ceil(totalDone / 7))

  const dailyGuidance = generateDailyGuidance({
    currentState: nextState,
    journeyState: nextJourney,
    planEngine: args.planEngine,
  })

  const weeklyFeedback = generateWeeklyFeedback({
    readinessHistory: [nextReadiness, ...args.readinessHistory].slice(0, 7),
    plannedSessions: args.planEngine.trainingPlan.trainingDaysPerWeek,
    completedSessions: nextJourney.completedSessions,
  })

  const peakState = derivePeakState(args.baseInput)
  const peakProjection = generatePeakProjection({
    currentState: nextState,
    journeyState: nextJourney,
    peakState,
  })

  return {
    currentState: nextState,
    journeyState: nextJourney,
    dailyGuidance,
    weeklyFeedback,
    peakProjection,
    adaptation: {
      manualRecoveryPulse: Number(boundedManualRecoveryPulse.toFixed(1)),
      blendedRecoveryPulse: Number(blendedRecoveryPulse.toFixed(1)),
      deviceInfluencePct: Math.round(deviceInfluence * 100),
      usedDeviceSignal: hasDeviceContribution,
    },
  }
}
