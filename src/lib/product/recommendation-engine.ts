import {
  type ExerciseLibraryItem,
  type ExerciseRecommendation,
  type ExerciseRecommendationContext,
  type SessionBlockType,
  type SupportedSport,
} from '@/lib/product/types'
import { allExerciseLibraryItems } from '@/lib/product/exercises/catalog'

type GoalRule = {
  preferredIntents: string[]
  secondaryIntents: string[]
  avoidedIntents: string[]
  preferredCategories?: ExerciseLibraryItem['category'][]
}

const GOAL_RULES: Record<string, GoalRule> = {
  fat_loss: {
    preferredIntents: ['conditioning', 'aerobic_base', 'strength', 'repeat_effort'],
    secondaryIntents: ['mobility', 'recovery'],
    avoidedIntents: ['pure_power'],
    preferredCategories: ['conditioning', 'strength', 'warmup'],
  },
  muscle_gain: {
    preferredIntents: ['strength', 'hypertrophy', 'stability'],
    secondaryIntents: ['conditioning'],
    avoidedIntents: ['low_output_recovery_only'],
    preferredCategories: ['strength'],
  },
  strength: {
    preferredIntents: ['strength', 'power', 'stability'],
    secondaryIntents: ['mobility', 'injury_reduction'],
    avoidedIntents: ['long_steady_state'],
    preferredCategories: ['strength'],
  },
  endurance: {
    preferredIntents: ['conditioning', 'endurance', 'aerobic_base', 'repeat_effort'],
    secondaryIntents: ['mobility', 'recovery'],
    avoidedIntents: ['max_strength_only'],
    preferredCategories: ['conditioning', 'recovery'],
  },
  speed: {
    preferredIntents: ['speed', 'power', 'plyometrics'],
    secondaryIntents: ['strength', 'injury_reduction'],
    avoidedIntents: ['slow_fatigue_circuit'],
    preferredCategories: ['conditioning', 'strength'],
  },
  agility: {
    preferredIntents: ['agility', 'sport_drill', 'deceleration_control'],
    secondaryIntents: ['stability', 'speed'],
    avoidedIntents: ['slow_fatigue_circuit'],
    preferredCategories: ['conditioning', 'rehab'],
  },
  mobility: {
    preferredIntents: ['mobility', 'flexibility', 'movement_prep'],
    secondaryIntents: ['recovery', 'breathing'],
    avoidedIntents: ['max_strength_only'],
    preferredCategories: ['mobility', 'warmup', 'cooldown'],
  },
  flexibility: {
    preferredIntents: ['flexibility', 'mobility', 'recovery'],
    secondaryIntents: ['breathing'],
    avoidedIntents: ['max_strength_only'],
    preferredCategories: ['mobility', 'recovery', 'cooldown'],
  },
  return_to_play: {
    preferredIntents: ['rehab', 'return_to_play', 'stability', 'injury_reduction'],
    secondaryIntents: ['strength', 'sport_drill'],
    avoidedIntents: ['max_velocity_only'],
    preferredCategories: ['rehab', 'recovery', 'strength'],
  },
  rehab: {
    preferredIntents: ['rehab', 'stability', 'injury_reduction'],
    secondaryIntents: ['mobility', 'recovery'],
    avoidedIntents: ['max_velocity_only'],
    preferredCategories: ['rehab', 'recovery'],
  },
  injury_reduction: {
    preferredIntents: ['injury_reduction', 'stability', 'mobility'],
    secondaryIntents: ['strength', 'recovery'],
    avoidedIntents: ['high_risk_exposure'],
    preferredCategories: ['rehab', 'mobility', 'strength'],
  },
  athletic_performance: {
    preferredIntents: ['strength', 'power', 'speed', 'sport_drill'],
    secondaryIntents: ['conditioning', 'injury_reduction'],
    avoidedIntents: [],
    preferredCategories: ['strength', 'conditioning'],
  },
  match_readiness: {
    preferredIntents: ['sport_drill', 'speed', 'agility', 'conditioning'],
    secondaryIntents: ['mobility', 'recovery'],
    avoidedIntents: ['excessive_hypertrophy'],
    preferredCategories: ['conditioning', 'warmup', 'recovery'],
  },
  general_fitness: {
    preferredIntents: ['strength', 'conditioning', 'mobility'],
    secondaryIntents: ['recovery'],
    avoidedIntents: [],
    preferredCategories: ['strength', 'conditioning', 'mobility'],
  },
  body_recomposition: {
    preferredIntents: ['strength', 'conditioning', 'hypertrophy'],
    secondaryIntents: ['mobility', 'recovery'],
    avoidedIntents: [],
    preferredCategories: ['strength', 'conditioning'],
  },
}

const SPORT_MOVEMENT_PRIORITIES: Record<string, string[]> = {
  cricket: ['rotational_timing', 'run_up_rhythm', 'shoulder_resilience', 'reacceleration'],
  football: ['acceleration', 'deceleration_control', 'repeat_effort', 'hamstring_resilience'],
  badminton: ['court_reaction', 'ankle_stiffness', 'single_leg_control', 'overhead_endurance'],
  athletics: ['upright_mechanics', 'projection', 'stiffness', 'approach_rhythm'],
  general_fitness: ['session_readiness', 'movement_quality', 'repeat_effort'],
}

const POSITION_PRIORITIES: Record<string, string[]> = {
  'cricket:fast bowler': ['run_up_rhythm', 'shoulder_resilience', 'hamstring_return_to_play', 'hip_shoulder_separation'],
  'cricket:batter': ['rotational_timing', 'batting_base', 'reacceleration'],
  'cricket:wicketkeeper': ['low_stance', 'reaction', 'shoulder_resilience'],
  'cricket:spinner': ['hip_shoulder_separation', 'balance'],
  'football:goalkeeper': ['set_position', 'push_step', 'shoulder_resilience'],
  'football:defender': ['hip_turn', 'deceleration_control', 'collision_readiness'],
  'football:fullback': ['curve_run', 'repeat_sprint', 'recovery_run'],
  'football:midfielder': ['scan_and_move', 'repeat_effort'],
  'football:winger': ['curve_speed', 'one_v_one_cut'],
  'football:striker': ['box_burst', 'separation_run'],
  'badminton:singles': ['court_recovery', 'lunge_control', 'split_step'],
  'badminton:doubles': ['front_back_rotation', 'intercept_speed', 'split_step'],
  'athletics:sprinter': ['projection', 'upright_mechanics', 'stiffness'],
  'athletics:middle-distance': ['cadence', 'economy'],
  'athletics:jumper': ['approach_rhythm', 'penultimate_control', 'landing_control'],
  'athletics:thrower': ['hip_block', 'separation', 'shoulder_resilience'],
}

const NO_SPECIAL_EQUIPMENT = new Set([
  'bodyweight',
  'floor',
  'mat',
  'wall',
  'support',
  'chair',
  'open_space',
])

const EQUIPMENT_ALIASES: Record<string, string[]> = {
  band: ['resistance_band', 'mini_band', 'loop_band'],
  bench: ['box', 'step', 'chair'],
  box: ['bench', 'step'],
  cable: ['cable_machine'],
  cone: ['cones', 'marker'],
  cones: ['cone', 'markers'],
  dumbbell: ['dumbbells', 'db'],
  kettlebell: ['kettlebells', 'kb'],
  med_ball: ['medicine_ball'],
  medicine_ball: ['med_ball'],
  mini_hurdles: ['hurdles'],
  rack: ['squat_rack'],
}

const BLOCK_RULES: Record<
  SessionBlockType,
  {
    preferredCategories: ExerciseLibraryItem['category'][]
    preferredIntents: string[]
  }
> = {
  warmup: { preferredCategories: ['warmup', 'mobility'], preferredIntents: ['warmup', 'movement_prep', 'mobility'] },
  main: { preferredCategories: ['strength', 'conditioning'], preferredIntents: ['strength', 'power', 'speed', 'sport_drill'] },
  accessory: { preferredCategories: ['strength', 'rehab'], preferredIntents: ['stability', 'injury_reduction', 'hypertrophy', 'strength'] },
  conditioning: { preferredCategories: ['conditioning'], preferredIntents: ['conditioning', 'endurance', 'repeat_effort', 'agility'] },
  cooldown: { preferredCategories: ['cooldown', 'recovery', 'mobility'], preferredIntents: ['cooldown', 'recovery', 'breathing', 'mobility'] },
  recovery: { preferredCategories: ['recovery', 'cooldown', 'mobility'], preferredIntents: ['recovery', 'breathing', 'mobility', 'aerobic_base'] },
  rehab: { preferredCategories: ['rehab', 'recovery'], preferredIntents: ['rehab', 'return_to_play', 'stability', 'injury_reduction'] },
}

function normalizeGoal(goal: string) {
  const normalized = normalizeToken(goal)
  if (normalized === 'muscle_gain') return 'muscle_gain'
  if (normalized === 'fat_loss') return 'fat_loss'
  if (normalized === 'general_fitness') return 'general_fitness'
  if (normalized === 'body_recomposition') return 'body_recomposition'
  if (normalized === 'athletic_performance' || normalized === 'sport_specific') return 'athletic_performance'
  if (normalized === 'return_to_play') return 'return_to_play'
  if (normalized === 'injury_prevention') return 'injury_reduction'
  return normalized
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function overlaps(a: string[], b: string[]) {
  const right = b.map(normalizeToken)
  return a.some((item) => {
    const token = normalizeToken(item)
    return right.some((candidate) => token.includes(candidate) || candidate.includes(token))
  })
}

function getPositionPriorities(sport: SupportedSport, position?: string | null) {
  const normalizedPosition = normalizeToken(position || '')
  if (!normalizedPosition) return []

  for (const [key, priorities] of Object.entries(POSITION_PRIORITIES)) {
    const [keySport, keyPosition = ''] = key.split(':')
    if (keySport === sport && normalizeToken(keyPosition) === normalizedPosition) {
      return priorities
    }
  }

  return []
}

function equipmentMatches(requirement: string, available: string[]) {
  const normalized = normalizeToken(requirement)
  if (NO_SPECIAL_EQUIPMENT.has(normalized)) return true
  if (available.includes(normalized)) return true
  return (EQUIPMENT_ALIASES[normalized] || []).some((alias) => available.includes(alias))
}

function equipmentFilterMatches(requirement: string, filter: string) {
  const normalizedRequirement = normalizeToken(requirement)
  const normalizedFilter = normalizeToken(filter)
  return (
    normalizedRequirement === normalizedFilter ||
    (EQUIPMENT_ALIASES[normalizedRequirement] || []).includes(normalizedFilter) ||
    (EQUIPMENT_ALIASES[normalizedFilter] || []).includes(normalizedRequirement)
  )
}

function isEquipmentAvailable(exercise: ExerciseLibraryItem, context: ExerciseRecommendationContext) {
  const available = context.availableEquipment.map(normalizeToken)
  return exercise.equipmentRequired.every((requirement) => equipmentMatches(requirement, available))
}

function isEnvironmentAvailable(exercise: ExerciseLibraryItem, context: ExerciseRecommendationContext) {
  const available = context.availableEnvironment.map(normalizeToken)
  return exercise.environment.some((environment) => available.includes(normalizeToken(environment)))
}

function isUnsafeForContext(
  exercise: ExerciseLibraryItem,
  context: ExerciseRecommendationContext,
  blockType: SessionBlockType
) {
  const allPainSignals = [
    ...context.currentPainAreas,
    ...context.activeInjuries,
    ...context.painFlags,
    ...context.currentLimitations,
  ]

  const isTargetedRehab =
    blockType === 'rehab' &&
    (overlaps(exercise.rehabTags, [...context.currentPainAreas, ...context.rehabFocusAreas]) ||
      overlaps(exercise.fitStartTags, [...context.currentPainAreas, ...context.rehabFocusAreas]))

  if (!isTargetedRehab && overlaps(exercise.contraindications, allPainSignals)) {
    return `Avoided because ${exercise.name} conflicts with your current pain or acute restriction.`
  }

  if (!isTargetedRehab && overlaps(exercise.injuryConstraints, [...context.activeInjuries, ...context.currentPainAreas])) {
    return `Avoided because today's injury context makes ${exercise.name} too risky.`
  }

  if (context.readinessBand === 'low' && !exercise.readinessSuitability.includes('low')) {
    return `Avoided because ${exercise.name} is too expensive for low readiness.`
  }

  if (context.fatigueLevel === 'high' && exercise.impactLevel === 'high') {
    return `Avoided because high fatigue makes a high-impact exposure too costly today.`
  }

  if (context.sorenessAreas.length > 0 && overlaps(exercise.sorenessConstraints, context.sorenessAreas)) {
    return `Avoided because soreness is already high in the tissues this drill would stress.`
  }

  return null
}

export function recommendExercises(args: {
  context: ExerciseRecommendationContext
  blockType: SessionBlockType
  limit: number
  search?: string
}) {
  const context = args.context
  const normalizedGoal = normalizeGoal(context.goal)
  const goalRule = GOAL_RULES[normalizedGoal] || GOAL_RULES.general_fitness
  const blockRule = BLOCK_RULES[args.blockType]
  const sportPriorities = SPORT_MOVEMENT_PRIORITIES[context.sport] || []
  const positionPriorities = getPositionPriorities(context.sport, context.position)
  const searchTerm = args.search ? normalizeToken(args.search) : ''

  const results: ExerciseRecommendation[] = []

  for (const exercise of allExerciseLibraryItems) {
    if (!exercise.suitableBlocks.includes(args.blockType)) continue
    if (searchTerm && !normalizeToken(`${exercise.name} ${exercise.description} ${exercise.subcategory}`).includes(searchTerm)) {
      continue
    }
    if (!isEquipmentAvailable(exercise, context)) continue
    if (!isEnvironmentAvailable(exercise, context)) continue

    const safetyReason = isUnsafeForContext(exercise, context, args.blockType)
    if (safetyReason) continue

    let score = 10
    const explanation: string[] = []
    const suppressedReasons: string[] = []

    if (blockRule.preferredCategories.includes(exercise.category)) {
      score += 18
      explanation.push(`Selected because ${exercise.category} work fits the ${args.blockType} block.`)
    }

    const exerciseIntents = exercise.trainingIntent.map(normalizeToken)
    const preferredMatches = goalRule.preferredIntents.filter((intent) => exerciseIntents.includes(normalizeToken(intent)))
    const secondaryMatches = goalRule.secondaryIntents.filter((intent) => exerciseIntents.includes(normalizeToken(intent)))
    const avoidedMatches = goalRule.avoidedIntents.filter((intent) => exerciseIntents.includes(normalizeToken(intent)))

    if (preferredMatches.length > 0) {
      score += 22 + preferredMatches.length * 4
      explanation.push(`Selected because it directly supports your goal of ${normalizedGoal.replace(/_/g, ' ')}.`)
    } else if (secondaryMatches.length > 0) {
      score += 10 + secondaryMatches.length * 3
    }

    if (goalRule.preferredCategories?.includes(exercise.category)) {
      score += 10
    }

    if (
      args.blockType === 'rehab' &&
      context.currentPainAreas.length > 0 &&
      (overlaps(exercise.rehabTags, [...context.currentPainAreas, ...context.rehabFocusAreas]) ||
        overlaps(exercise.fitStartTags, context.currentPainAreas))
    ) {
      score += 16
      explanation.push(`Selected because it gives you a pain-aware path for ${context.currentPainAreas.join(', ').replace(/_/g, ' ')} pain.`)
    }

    if (avoidedMatches.length > 0) {
      score -= 25
      suppressedReasons.push(`Deprioritized because ${exercise.name} leans toward an intent we are avoiding for this goal.`)
    }

    if (exercise.sportTags.includes(context.sport)) {
      score += 14
      explanation.push(`Selected because it matches the demands of ${context.sport.replace(/_/g, ' ')}.`)
    }

    if ((exercise.positionTags || []).map(normalizeToken).includes(normalizeToken(context.position || ''))) {
      score += 10
      explanation.push(`Selected because it lines up with the ${context.position} role demands.`)
    }

    if (overlaps(exercise.movementQualityTags, sportPriorities)) {
      score += 12
    }
    if (overlaps(exercise.movementQualityTags, positionPriorities)) {
      score += 10
    }

    if (overlaps(exercise.fitStartTags, context.bodyRegionsToImprove)) {
      score += 10
      explanation.push(`Selected because it targets the body region or quality you asked to improve.`)
    }

    if (args.blockType === 'rehab' && overlaps(exercise.rehabTags, context.rehabFocusAreas)) {
      score += 20
      explanation.push(`Selected because you reported ${context.rehabFocusAreas.join(', ').replace(/_/g, ' ')} as an active rehab focus.`)
    }

    if (args.blockType === 'rehab' && overlaps(exercise.rehabTags, context.currentPainAreas)) {
      score += 18
      explanation.push(`Selected because it is a controlled way to train around ${context.currentPainAreas.join(', ').replace(/_/g, ' ')} pain.`)
    }


    if (args.blockType === 'recovery' && exercise.recoveryTags.length > 0) {
      score += 12
    }

    if (context.readinessBand === 'low' && exercise.impactLevel === 'low') {
      score += 10
      explanation.push(`Selected because your readiness is lower today and this keeps cost controlled.`)
    }

    if (context.preferredTrainingEnvironment && exercise.environment.map(normalizeToken).includes(normalizeToken(context.preferredTrainingEnvironment))) {
      score += 6
    }

    if (context.availableEquipment.length <= 2 && exercise.equipmentRequired.every((item) => ['bodyweight', 'band'].includes(normalizeToken(item)))) {
      score += 8
      explanation.push('Selected because it works with the equipment you actually have today.')
    }

    if (context.trainingAge === 'beginner' && exercise.difficulty === 'beginner') score += 8
    if (context.trainingAge === 'advanced' && exercise.difficulty === 'advanced') score += 6
    if (context.trainingAge === 'beginner' && exercise.difficulty === 'advanced') {
      score -= 12
      suppressedReasons.push('Advanced complexity was deprioritized for your current training age.')
    }

    if (context.complianceScore < 0.65 && exercise.estimatedDurationSeconds !== null && exercise.estimatedDurationSeconds <= 90) {
      score += 6
    }
    if (context.sessionDurationPreferenceMinutes <= 35 && exercise.estimatedDurationSeconds !== null && exercise.estimatedDurationSeconds <= 90) {
      score += 5
    }

    if (context.currentPainAreas.length > 0 && overlaps(exercise.rehabTags, context.currentPainAreas)) {
      score += 8
      explanation.push(`Selected because it gives you a safer way to train around ${context.currentPainAreas.join(', ').replace(/_/g, ' ')} discomfort.`)
    }

    results.push({
      exercise,
      score,
      explanation: explanation.slice(0, 4),
      suppressedReasons,
    })
  }

  return results
    .sort((left, right) => right.score - left.score || left.exercise.name.localeCompare(right.exercise.name))
    .slice(0, args.limit)
}

export function queryExercises(filters: {
  category?: ExerciseLibraryItem['category']
  sport?: SupportedSport
  equipment?: string
  goal?: string
  search?: string
  blockType?: SessionBlockType
}) {
  return allExerciseLibraryItems.filter((exercise) => {
    if (filters.category && exercise.category !== filters.category) return false
    if (filters.sport && !exercise.sportTags.includes(filters.sport)) return false
    if (filters.equipment && !exercise.equipmentRequired.some((item) => equipmentFilterMatches(item, filters.equipment || ''))) return false
    if (filters.goal) {
      const normalizedGoal = normalizeGoal(filters.goal)
      const rule = GOAL_RULES[normalizedGoal]
      if (rule && !rule.preferredIntents.some((intent) => exercise.trainingIntent.map(normalizeToken).includes(normalizeToken(intent)))) {
        return false
      }
    }
    if (filters.blockType && !exercise.suitableBlocks.includes(filters.blockType)) return false
    if (filters.search) {
      const haystack = normalizeToken(`${exercise.name} ${exercise.description} ${exercise.subcategory}`)
      if (!haystack.includes(normalizeToken(filters.search))) return false
    }
    return true
  })
}
