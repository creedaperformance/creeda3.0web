import type {
  Environment,
  ExerciseCategory,
  ExerciseLibraryItem,
  ExercisePrescriptionDefaults,
  ReadinessBand,
  SessionBlockType,
  SupportedSport,
} from '@/lib/product/types'
import {
  exerciseLibraryItemSchema,
  uniqueStrings,
} from '@/lib/product/types'
import { exerciseMediaOverrides } from '@/lib/product/exercises/media-overrides.generated'

type ExerciseSeed = Omit<ExerciseLibraryItem, 'id' | 'media'> & {
  id?: string
  media?: Partial<ExerciseLibraryItem['media']>
}

type ExerciseSeriesBase = Omit<ExerciseSeed, 'slug' | 'name'>
type ExerciseSeriesVariant = {
  slug: string
  name: string
} & Partial<ExerciseSeed>

const GENERATED_MEDIA_ROOT = '/api/exercises/media'

export function createExercise(seed: ExerciseSeed): ExerciseLibraryItem {
  const id = seed.id || `exercise:${seed.slug}`
  const mediaOverride = exerciseMediaOverrides[seed.slug]
  const generatedImageUrls = [
    `${GENERATED_MEDIA_ROOT}/${seed.slug}/demo.svg`,
    `${GENERATED_MEDIA_ROOT}/${seed.slug}/setup.svg`,
  ]
  const media = {
    imageUrls: mediaOverride?.imageUrls?.length
      ? mediaOverride.imageUrls
      : seed.media?.imageUrls?.length
        ? seed.media.imageUrls
      : generatedImageUrls,
    videoUrl:
      mediaOverride?.videoUrl ||
      seed.media?.videoUrl ||
      generatedImageUrls[0],
    slowMotionUrl:
      mediaOverride?.slowMotionUrl ??
      seed.media?.slowMotionUrl ??
      null,
    demoMode:
      mediaOverride?.demoMode ||
      seed.media?.demoMode ||
      'image_sequence',
    source:
      mediaOverride?.source ||
      seed.media?.source ||
      'generated',
    license:
      mediaOverride?.license ??
      seed.media?.license ??
      'Creeda generated exercise demo',
    attributionLabel:
      mediaOverride?.attributionLabel ??
      seed.media?.attributionLabel ??
      'Creeda exercise media',
    attributionUrl:
      mediaOverride?.attributionUrl ??
      seed.media?.attributionUrl ??
      null,
    techniqueNote:
      mediaOverride?.techniqueNote ??
      seed.media?.techniqueNote ??
      null,
  }

  const item: ExerciseLibraryItem = {
    ...seed,
    id,
    media,
    trainingIntent: uniqueStrings(seed.trainingIntent),
    primaryMuscles: uniqueStrings(seed.primaryMuscles),
    secondaryMuscles: uniqueStrings(seed.secondaryMuscles),
    jointsInvolved: uniqueStrings(seed.jointsInvolved),
    experienceLevelSuitability: [...new Set(seed.experienceLevelSuitability)],
    equipmentRequired: uniqueStrings(seed.equipmentRequired),
    environment: [...new Set(seed.environment)] as Environment[],
    coachingCues: uniqueStrings(seed.coachingCues),
    instructions: uniqueStrings(seed.instructions),
    commonMistakes: uniqueStrings(seed.commonMistakes),
    regressions: uniqueStrings(seed.regressions),
    progressions: uniqueStrings(seed.progressions),
    substitutions: uniqueStrings(seed.substitutions),
    contraindications: uniqueStrings(seed.contraindications),
    injuryConstraints: uniqueStrings(seed.injuryConstraints),
    sorenessConstraints: uniqueStrings(seed.sorenessConstraints),
    fatigueConstraints: uniqueStrings(seed.fatigueConstraints),
    readinessSuitability: [...new Set(seed.readinessSuitability)] as ReadinessBand[],
    goalTags: uniqueStrings(seed.goalTags),
    sportTags: [...new Set(seed.sportTags)] as SupportedSport[],
    positionTags: uniqueStrings(seed.positionTags),
    fitStartTags: uniqueStrings(seed.fitStartTags),
    recoveryTags: uniqueStrings(seed.recoveryTags),
    rehabTags: uniqueStrings(seed.rehabTags),
    movementQualityTags: uniqueStrings(seed.movementQualityTags),
    suitableBlocks: [...new Set(seed.suitableBlocks)] as SessionBlockType[],
    defaultPrescription: normalizePrescription(seed.defaultPrescription),
  }

  return exerciseLibraryItemSchema.parse(item)
}

export function makeSeries(base: ExerciseSeriesBase, variants: ExerciseSeriesVariant[]) {
  return variants.map((variant) =>
    createExercise({
      ...base,
      ...variant,
      trainingIntent: mergeArrays(base.trainingIntent, variant.trainingIntent),
      primaryMuscles: mergeArrays(base.primaryMuscles, variant.primaryMuscles),
      secondaryMuscles: mergeArrays(base.secondaryMuscles, variant.secondaryMuscles),
      jointsInvolved: mergeArrays(base.jointsInvolved, variant.jointsInvolved),
      experienceLevelSuitability: mergeArrays(base.experienceLevelSuitability, variant.experienceLevelSuitability),
      equipmentRequired: mergeArrays(base.equipmentRequired, variant.equipmentRequired),
      environment: mergeArrays(base.environment, variant.environment) as Environment[],
      coachingCues: mergeArrays(base.coachingCues, variant.coachingCues),
      instructions: mergeArrays(base.instructions, variant.instructions),
      commonMistakes: mergeArrays(base.commonMistakes, variant.commonMistakes),
      regressions: mergeArrays(base.regressions, variant.regressions),
      progressions: mergeArrays(base.progressions, variant.progressions),
      substitutions: mergeArrays(base.substitutions, variant.substitutions),
      contraindications: mergeArrays(base.contraindications, variant.contraindications),
      injuryConstraints: mergeArrays(base.injuryConstraints, variant.injuryConstraints),
      sorenessConstraints: mergeArrays(base.sorenessConstraints, variant.sorenessConstraints),
      fatigueConstraints: mergeArrays(base.fatigueConstraints, variant.fatigueConstraints),
      readinessSuitability: mergeArrays(base.readinessSuitability, variant.readinessSuitability) as ReadinessBand[],
      goalTags: mergeArrays(base.goalTags, variant.goalTags),
      sportTags: mergeArrays(base.sportTags, variant.sportTags) as SupportedSport[],
      positionTags: mergeArrays(base.positionTags, variant.positionTags),
      fitStartTags: mergeArrays(base.fitStartTags, variant.fitStartTags),
      recoveryTags: mergeArrays(base.recoveryTags, variant.recoveryTags),
      rehabTags: mergeArrays(base.rehabTags, variant.rehabTags),
      movementQualityTags: mergeArrays(base.movementQualityTags, variant.movementQualityTags),
      suitableBlocks: mergeArrays(base.suitableBlocks, variant.suitableBlocks) as SessionBlockType[],
      defaultPrescription: {
        ...base.defaultPrescription,
        ...(variant.defaultPrescription || {}),
      },
      media: {
        ...base.media,
        ...(variant.media || {}),
      },
    })
  )
}

function normalizePrescription(prescription: ExercisePrescriptionDefaults): ExercisePrescriptionDefaults {
  return {
    ...prescription,
    restSeconds: prescription.restSeconds,
    durationSeconds: prescription.durationSeconds ?? undefined,
    reps: prescription.reps,
  }
}

function mergeArrays<T>(base: readonly T[], addition?: readonly T[]) {
  return [...new Set([...(base || []), ...((addition || []) as readonly T[])])]
}

export function warmupBase(args: {
  family: string
  subcategory: string
  movementPattern: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  jointsInvolved: string[]
  sportTags?: SupportedSport[]
  positionTags?: string[]
  fitStartTags?: string[]
  movementQualityTags?: string[]
  description: string
}): Omit<ExerciseLibraryItem, 'id' | 'slug' | 'name' | 'media'> {
  return {
    family: args.family,
    description: args.description,
    category: 'warmup' as ExerciseCategory,
    subcategory: args.subcategory,
    movementPattern: args.movementPattern,
    trainingIntent: ['warmup', 'movement_prep', 'mobility'],
    primaryMuscles: args.primaryMuscles,
    secondaryMuscles: args.secondaryMuscles,
    jointsInvolved: args.jointsInvolved,
    difficulty: 'beginner' as const,
    experienceLevelSuitability: ['beginner', 'intermediate', 'advanced'],
    equipmentRequired: ['bodyweight'],
    environment: ['gym', 'home', 'field', 'court', 'track'] as Environment[],
    unilateralOrBilateral: 'mixed' as const,
    impactLevel: 'low' as const,
    intensityProfile: 'low' as const,
    estimatedDurationSeconds: 90,
    defaultPrescription: {
      sets: 1,
      reps: '6-10/side',
      durationSeconds: 90,
      restSeconds: 20,
      intensity: 'prep',
      rpe: 3,
    },
    coachingCues: ['Move with control before chasing range.', 'Let the drill prepare the pattern you want later in the session.'],
    instructions: [
      'Set up in a pain-free starting position.',
      'Move through the full drill slowly for quality reps.',
      'Breathe steadily and stop before joint pinch or sharp discomfort.',
    ],
    commonMistakes: ['Rushing the drill without owning positions.', 'Forcing end range before tissue is ready.'],
    regressions: [],
    progressions: [],
    substitutions: [],
    contraindications: [],
    injuryConstraints: [],
    sorenessConstraints: [],
    fatigueConstraints: [],
    readinessSuitability: ['low', 'moderate', 'high'],
    goalTags: ['movement_quality', 'injury_reduction'],
    sportTags: args.sportTags || ['general_fitness'],
    positionTags: args.positionTags || [],
    fitStartTags: args.fitStartTags || [],
    recoveryTags: ['warmup_readiness'],
    rehabTags: [],
    movementQualityTags: args.movementQualityTags || [],
    suitableBlocks: ['warmup'],
  }
}
