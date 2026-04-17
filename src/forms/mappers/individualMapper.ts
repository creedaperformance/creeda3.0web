import type { SaveFitStartPayload } from '@/lib/fitstart'
import type { IndividualSignalPayload } from '@/lib/individual-logging'

import type { IndividualDailyQuickInput } from '@/forms/schemas/individualDaily'
import type { IndividualOnboardingFastStart } from '@/forms/schemas/individualOnboarding'

type LegacyFitStartPayload = SaveFitStartPayload
type LegacyIndividualDailyPayload = IndividualSignalPayload

function clampDomain(value: number) {
  return Math.max(1, Math.min(4, Math.round(value)))
}

function mapOccupation(value: IndividualOnboardingFastStart['occupation']) {
  switch (value) {
    case 'desk_job':
      return 'desk'
    case 'shift_work':
      return 'shift'
    case 'active_job':
      return 'hybrid'
    case 'mixed_day':
    default:
      return 'hybrid'
  }
}

function inferScheduleConstraints(value: ReturnType<typeof mapOccupation>) {
  switch (value) {
    case 'shift':
      return ['shift_work']
    case 'desk':
      return ['after_work']
    default:
      return ['after_work', 'weekends_only']
  }
}

function inferTrainingExperience(activityLevel: IndividualOnboardingFastStart['activityLevel']) {
  if (activityLevel === 'active') return 'intermediate' as const
  if (activityLevel === 'moderate') return 'novice' as const
  return 'beginner' as const
}

function inferSedentaryHours(occupation: ReturnType<typeof mapOccupation>) {
  if (occupation === 'desk') return 9
  if (occupation === 'shift') return 6
  return 5
}

function inferPathway(goal: IndividualOnboardingFastStart['primaryGoal']) {
  switch (goal) {
    case 'fat_loss':
      return { selectedSport: 'Lean Build', selectedPathwayId: 'pathway_fat_loss', title: 'Lean Build' }
    case 'muscle_gain':
      return { selectedSport: 'Strength Build', selectedPathwayId: 'pathway_muscle_gain', title: 'Strength Build' }
    case 'endurance':
      return { selectedSport: 'Engine Build', selectedPathwayId: 'pathway_endurance', title: 'Engine Build' }
    case 'sport_specific':
      return { selectedSport: 'Sport Return', selectedPathwayId: 'pathway_sport_specific', title: 'Sport Return' }
    case 'general_fitness':
    default:
      return { selectedSport: 'General Fitness', selectedPathwayId: 'pathway_general_fitness', title: 'General Fitness' }
  }
}

function inferPhysiologySeed(activityLevel: IndividualOnboardingFastStart['activityLevel']) {
  if (activityLevel === 'active') return 3
  if (activityLevel === 'moderate') return 2.5
  return 2
}

function mapMobility(injuryStatus: IndividualOnboardingFastStart['injuryStatus']) {
  switch (injuryStatus) {
    case 'minor':
      return 'mild' as const
    case 'moderate':
      return 'moderate' as const
    case 'major':
    case 'chronic':
      return 'severe' as const
    case 'none':
    default:
      return 'none' as const
  }
}

export function mapAdaptiveIndividualOnboardingToLegacy(
  input: IndividualOnboardingFastStart
): LegacyFitStartPayload {
  const occupation = mapOccupation(input.occupation)
  const pathway = inferPathway(input.primaryGoal)
  const physiologySeed = inferPhysiologySeed(input.activityLevel)

  return {
    basic: {
      age: input.age,
      gender: input.gender,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      occupation,
      activityLevel: input.activityLevel,
    },
    physiology: {
      sleepQuality: 3,
      energyLevels: 3,
      stressLevels: 3,
      recoveryRate: 3,
      injuryHistory: input.injuryStatus,
      mobilityLimitations: mapMobility(input.injuryStatus),
      trainingExperience: inferTrainingExperience(input.activityLevel),
      endurance_capacity: clampDomain(physiologySeed + (input.primaryGoal === 'endurance' ? 1 : 0)),
      strength_capacity: clampDomain(physiologySeed + (input.primaryGoal === 'muscle_gain' ? 1 : 0)),
      explosive_power: clampDomain(physiologySeed),
      agility_control: clampDomain(physiologySeed),
      reaction_self_perception: clampDomain(physiologySeed),
      recovery_efficiency: clampDomain(physiologySeed),
      fatigue_resistance: clampDomain(physiologySeed),
      load_tolerance: clampDomain(physiologySeed),
      movement_robustness: clampDomain(physiologySeed - (input.injuryStatus === 'none' ? 0 : 1)),
      coordination_control: clampDomain(physiologySeed),
      reaction_time_ms: undefined,
    },
    lifestyle: {
      scheduleConstraints: inferScheduleConstraints(occupation),
      equipmentAccess: input.equipmentAccess,
      nutritionHabits: 'basic',
      sedentaryHours: inferSedentaryHours(occupation),
    },
    goals: {
      primaryGoal: input.primaryGoal,
      timeHorizon: input.timeHorizon,
      intensityPreference: input.intensityPreference,
    },
    sport: {
      selectedSport: pathway.selectedSport,
      selectedPathwayId: pathway.selectedPathwayId,
      selectedPathwayType: 'training',
      selectedRecommendationTitle: pathway.title,
      selectionRationale: 'Auto-selected from the user’s primary goal during fast start.',
    },
    timeTakenMs: 45000,
    health_connection_preference: 'later',
  }
}

export function mapAdaptiveIndividualDailyToLegacy(
  input: IndividualDailyQuickInput
): LegacyIndividualDailyPayload {
  return {
    sleep_quality: input.sleepQuality ?? (input.energy <= 2 ? 2 : 3),
    energy_level: input.energy,
    stress_level: input.stress,
    recovery_feel: Math.max(1, 6 - input.soreness),
    soreness_level: input.soreness,
    session_completion: input.sessionCompletion ?? 'missed',
    training_minutes: input.trainingMinutes ?? 0,
    session_rpe: input.sessionRPE ?? 0,
    steps: input.steps ?? 0,
    hydration_liters: input.hydrationLiters ?? 0,
    heat_level: input.heatLevel ?? '',
    humidity_level: input.humidityLevel ?? '',
    aqi_band: input.aqiBand ?? '',
    commute_minutes: 0,
    exam_stress_score: input.stress >= 4 ? 2 : 0,
    fasting_state: '',
    shift_work: false,
    session_notes: '',
  }
}

