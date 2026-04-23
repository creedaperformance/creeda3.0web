import type {
  ExecutionMode,
  ExecutionSession,
  ExecutionSessionBlock,
  ExerciseRecommendationContext,
  SessionBlockType,
} from '@/lib/product/types'
import { clamp } from '@/lib/product/types'
import { findExerciseBySlug } from '@/lib/product/exercises/catalog'
import { recommendExercises } from '@/lib/product/recommendation-engine'

type SessionBuilderArgs = {
  athleteId: string
  context: ExerciseRecommendationContext
  mode: ExecutionMode
  date: string
  source: string
}

type BlockBlueprint = {
  type: SessionBlockType
  count: number
  intensity: string
  title: string
  notes: string
}

const MODE_TITLES: Record<ExecutionMode, string> = {
  train_hard: 'Train Hard',
  train_light: 'Train Light',
  recovery: 'Recovery Session',
  rehab: 'Rehab Session',
}

const MODE_BLOCK_BLUEPRINTS: Record<ExecutionMode, BlockBlueprint[]> = {
  train_hard: [
    { type: 'warmup', count: 4, intensity: 'prep', title: 'Warmup', notes: 'Prime the key joints and patterns before loading.' },
    { type: 'main', count: 4, intensity: 'high', title: 'Main Work', notes: 'Lead with the highest-value strength, speed, or sport outputs.' },
    { type: 'accessory', count: 3, intensity: 'moderate', title: 'Accessory', notes: 'Reinforce qualities that support performance without diluting the main stimulus.' },
    { type: 'conditioning', count: 2, intensity: 'high', title: 'Conditioning', notes: 'Finish with specific energy-system work if readiness still supports it.' },
    { type: 'cooldown', count: 2, intensity: 'low', title: 'Cooldown', notes: 'Shift out of work mode and start recovery immediately.' },
  ],
  train_light: [
    { type: 'warmup', count: 4, intensity: 'prep', title: 'Warmup', notes: 'Prepare the body, but keep cost low.' },
    { type: 'main', count: 3, intensity: 'moderate', title: 'Main Work', notes: 'Keep quality high while trimming volume and impact.' },
    { type: 'accessory', count: 2, intensity: 'moderate', title: 'Accessory', notes: 'Choose resilient, low-friction support work.' },
    { type: 'recovery', count: 2, intensity: 'low', title: 'Recovery', notes: 'Build the downshift into the session rather than leaving it optional.' },
    { type: 'cooldown', count: 2, intensity: 'low', title: 'Cooldown', notes: 'Exit the session calm and organized.' },
  ],
  recovery: [
    { type: 'warmup', count: 3, intensity: 'prep', title: 'Movement Reset', notes: 'Use low-friction prep to wake up stiff areas.' },
    { type: 'recovery', count: 4, intensity: 'low', title: 'Recovery Flow', notes: 'Prioritize circulation, mobility, breathing, and tissue calm.' },
    { type: 'cooldown', count: 2, intensity: 'low', title: 'Downshift', notes: 'Finish more recovered than when you started.' },
  ],
  rehab: [
    { type: 'warmup', count: 3, intensity: 'prep', title: 'Protected Warmup', notes: 'Prime the area without provoking symptoms.' },
    { type: 'rehab', count: 4, intensity: 'low', title: 'Rehab Block', notes: 'Own position, tempo, and symptom response before progressing.' },
    { type: 'recovery', count: 2, intensity: 'low', title: 'Recovery Block', notes: 'Layer in downregulation so the next-day response stays quiet.' },
    { type: 'cooldown', count: 2, intensity: 'low', title: 'Cooldown', notes: 'Finish calm and pain-aware.' },
  ],
}

function selectMode(context: ExerciseRecommendationContext, requestedMode: ExecutionMode): ExecutionMode {
  if (context.readinessBand === 'low' && context.currentPainAreas.length > 0) return 'rehab'
  if (context.activeInjuries.length > 0 && requestedMode === 'train_hard' && context.currentPainAreas.length > 0) return 'rehab'
  if (context.activeInjuries.length > 0 && requestedMode === 'train_hard') return 'train_light'
  if (context.readinessBand === 'low' && requestedMode === 'train_hard') return 'train_light'
  return requestedMode
}

function tuneBlueprintForDuration(
  blueprint: BlockBlueprint[],
  context: ExerciseRecommendationContext,
  mode: ExecutionMode
) {
  const target = context.sessionDurationPreferenceMinutes
  const tuned = blueprint.map((item) => ({ ...item }))

  if (target <= 30) {
    return tuned
      .filter((item) => {
        if (mode === 'recovery' || mode === 'rehab') return true
        return item.type !== 'conditioning'
      })
      .map((item) => ({
        ...item,
        count:
          item.type === 'main'
            ? Math.min(item.count, 2)
            : item.type === 'warmup' || item.type === 'cooldown'
              ? Math.min(item.count, 2)
              : Math.min(item.count, 1),
        notes: `${item.notes} Kept compact for your short-session preference.`,
      }))
  }

  if (target <= 45) {
    return tuned.map((item) => ({
      ...item,
      count:
        item.type === 'main'
          ? Math.max(2, item.count - 1)
          : item.type === 'conditioning' || item.type === 'accessory'
            ? Math.max(1, item.count - 1)
            : item.count,
    }))
  }

  if (target >= 75 && mode === 'train_hard') {
    return tuned.map((item) => ({
      ...item,
      count: item.type === 'main' || item.type === 'accessory' ? item.count + 1 : item.count,
    }))
  }

  return tuned
}

function shouldInjectRehab(context: ExerciseRecommendationContext, mode: ExecutionMode) {
  return mode === 'rehab' || context.activeInjuries.length > 0 || context.rehabFocusAreas.length > 0 || context.currentPainAreas.length > 0
}

function buildBlock(args: {
  type: SessionBlockType
  count: number
  context: ExerciseRecommendationContext
  title: string
  notes: string
  intensity: string
}) {
  const recommendations = recommendExercises({
    context: args.context,
    blockType: args.type,
    limit: Math.max(args.count + 2, 4),
  })

  const selected = recommendations.slice(0, args.count)

  const exercises = selected.map((entry) => {
    const substitutionPool = recommendations
      .filter((candidate) => candidate.exercise.family === entry.exercise.family && candidate.exercise.slug !== entry.exercise.slug)
      .slice(0, 2)
      .map((candidate) => candidate.exercise.slug)

    return {
      exerciseId: entry.exercise.id,
      exerciseSlug: entry.exercise.slug,
      name: entry.exercise.name,
      category: entry.exercise.category,
      subcategory: entry.exercise.subcategory,
      instructions: entry.exercise.instructions,
      coachingCues: entry.exercise.coachingCues,
      commonMistakes: entry.exercise.commonMistakes,
      media: entry.exercise.media,
      prescribed: entry.exercise.defaultPrescription,
      substitutions: substitutionPool.length > 0 ? substitutionPool : entry.exercise.substitutions.slice(0, 2),
      explanation: entry.explanation,
      painCaution: entry.exercise.injuryConstraints,
    }
  })

  return {
    id: `${args.type}:${exercises.map((item) => item.exerciseSlug).join('|')}`,
    type: args.type,
    title: args.title,
    notes: args.notes,
    intensity: args.intensity,
    exercises,
  } satisfies ExecutionSessionBlock
}

function estimateDurationMinutes(blocks: ExecutionSessionBlock[]) {
  const seconds = blocks.reduce((total, block) => {
    return total + block.exercises.reduce((blockTotal, exercise) => {
      const prescription = exercise.prescribed
      const repsDuration = prescription.durationSeconds || 40
      const setSeconds = prescription.sets * (repsDuration + prescription.restSeconds)
      return blockTotal + setSeconds
    }, 0)
  }, 0)

  return clamp(Math.round(seconds / 60), 18, 120)
}

function buildFocus(context: ExerciseRecommendationContext, mode: ExecutionMode) {
  if (mode === 'rehab') {
    return `Targeted rehab around ${[...context.currentPainAreas, ...context.rehabFocusAreas].slice(0, 2).join(' + ').replace(/_/g, ' ')} with symptom-aware loading.`
  }
  if (mode === 'recovery') {
    return `Recovery-first work to protect adaptation after a ${context.readinessBand} readiness day.`
  }
  return `${MODE_TITLES[mode]} built around ${context.goal.replace(/_/g, ' ')} with ${context.sport.replace(/_/g, ' ')} relevance and ${context.preferredTrainingEnvironment} constraints.`
}

function buildReasons(context: ExerciseRecommendationContext, mode: ExecutionMode, blocks: ExecutionSessionBlock[]) {
  const reasons = [
    `Today's mode is ${MODE_TITLES[mode].toLowerCase()} because readiness is ${context.readinessScore}/100 and fatigue is ${context.fatigueLevel}.`,
    `Exercise selection is shaped by your goal of ${context.goal.replace(/_/g, ' ')} and your ${context.sport.replace(/_/g, ' ')} context${context.position ? ` as a ${context.position}` : ''}.`,
    context.availableEquipment.length <= 2
      ? 'Selections bias toward low-friction options because your equipment access is limited today.'
      : `Selections assume access to ${context.availableEquipment.join(', ').replace(/_/g, ' ')}.`,
  ]

  if (context.currentPainAreas.length > 0) {
    reasons.push(`Pain-aware filtering is active for ${context.currentPainAreas.join(', ').replace(/_/g, ' ')}.`)
  }
  if (blocks.some((block) => block.type === 'rehab')) {
    reasons.push('A rehab block was injected automatically because injury or pain context is active.')
  }
  if (blocks.some((block) => block.type === 'recovery')) {
    reasons.push('A recovery block is included so the session does not end without a deliberate downshift.')
  }
  if (context.skillGaps?.length) {
    reasons.push(`Recent video analysis is biasing skill work toward ${context.skillGaps.slice(0, 3).join(', ').replace(/_/g, ' ')}.`)
  }
  if (context.latestVideoStatus && context.latestVideoStatus !== 'clean') {
    reasons.push(`The latest movement score was ${context.latestVideoScore ?? 'not scored'} and is marked ${context.latestVideoStatus}, so technique quality is protected before load increases.`)
  }

  return reasons
}

export function buildExecutionSession(args: SessionBuilderArgs): ExecutionSession {
  const mode = selectMode(args.context, args.mode)
  const blueprint = tuneBlueprintForDuration(MODE_BLOCK_BLUEPRINTS[mode], args.context, mode)

  if (shouldInjectRehab(args.context, mode) && !blueprint.some((item) => item.type === 'rehab')) {
    blueprint.splice(Math.min(blueprint.length - 1, 2), 0, {
      type: 'rehab',
      count: 2,
      intensity: 'low',
      title: 'Rehab Block',
      notes: 'Injected automatically because pain, injury, or rehab focus is active.',
    })
  }

  if ((args.context.readinessBand !== 'high' || args.context.sleepQuality === 'poor') && !blueprint.some((item) => item.type === 'recovery')) {
    blueprint.push({
      type: 'recovery',
      count: 2,
      intensity: 'low',
      title: 'Recovery Block',
      notes: 'Added because today calls for lower-cost recovery support.',
    })
  }

  const blocks = blueprint.map((item) =>
    buildBlock({
      type: item.type,
      count: item.count,
      context: args.context,
      title: item.title,
      notes: item.notes,
      intensity: item.intensity,
    })
  )

  const duration = estimateDurationMinutes(blocks)
  const headline =
    mode === 'rehab'
      ? 'Rebuild with precision and keep the symptom response quiet.'
      : mode === 'recovery'
        ? 'Move enough to recover better tomorrow.'
        : mode === 'train_light'
          ? 'Keep quality high while trimming cost.'
          : 'Use the full performance window while it is open.'

  return {
    id: `session:${args.athleteId}:${args.date}:${mode}`,
    athleteId: args.athleteId,
    date: args.date,
    mode,
    source: args.source,
    title: MODE_TITLES[mode],
    summary: {
      focus: buildFocus(args.context, mode),
      expectedDurationMinutes: duration,
      difficulty: mode === 'train_hard' ? 'high' : mode === 'train_light' ? 'moderate' : 'low',
      completionTarget:
        mode === 'train_hard'
          ? 'Hit the main lifts and finish the recovery block.'
          : mode === 'train_light'
            ? 'Own the quality, not the quantity.'
            : 'Finish the whole flow without provoking pain or rushing.',
      skillFocus: args.context.skillGaps?.slice(0, 4),
    },
    readiness: {
      band: args.context.readinessBand,
      score: args.context.readinessScore,
    },
    explainability: {
      headline,
      reasons: buildReasons(args.context, mode, blocks),
      warnings: [
        ...(args.context.currentPainAreas.length > 0
          ? [`Stop or swap any exercise that increases ${args.context.currentPainAreas.join(', ').replace(/_/g, ' ')} pain during or after the set.`]
          : []),
        ...(args.context.sleepQuality === 'poor'
          ? ['Sleep quality is low, so volume is biased conservative even if motivation feels high.']
          : []),
      ],
    },
    blocks,
  }
}

export function resolveSubstitutionName(slug: string) {
  return findExerciseBySlug(slug)?.name || slug.replace(/-/g, ' ')
}
