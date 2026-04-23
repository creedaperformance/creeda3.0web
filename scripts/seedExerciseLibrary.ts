import 'dotenv/config'

import path from 'node:path'

import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config()

import { createAdminClient } from '@/lib/supabase/admin'
import { allExerciseLibraryItems } from '@/lib/product/exercises/catalog'

function toExerciseRow(item: (typeof allExerciseLibraryItems)[number]) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    family: item.family,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    movement_pattern: item.movementPattern,
    training_intent: item.trainingIntent,
    primary_muscles: item.primaryMuscles,
    secondary_muscles: item.secondaryMuscles,
    joints_involved: item.jointsInvolved,
    difficulty: item.difficulty,
    experience_level_suitability: item.experienceLevelSuitability,
    equipment_required: item.equipmentRequired,
    environment: item.environment,
    unilateral_or_bilateral: item.unilateralOrBilateral,
    impact_level: item.impactLevel,
    intensity_profile: item.intensityProfile,
    estimated_duration_seconds: item.estimatedDurationSeconds,
    default_prescription: item.defaultPrescription,
    coaching_cues: item.coachingCues,
    instructions: item.instructions,
    common_mistakes: item.commonMistakes,
    regressions: item.regressions,
    progressions: item.progressions,
    substitutions: item.substitutions,
    contraindications: item.contraindications,
    injury_constraints: item.injuryConstraints,
    soreness_constraints: item.sorenessConstraints,
    fatigue_constraints: item.fatigueConstraints,
    readiness_suitability: item.readinessSuitability,
    goal_tags: item.goalTags,
    sport_tags: item.sportTags,
    position_tags: item.positionTags,
    fitstart_tags: item.fitStartTags,
    recovery_tags: item.recoveryTags,
    rehab_tags: item.rehabTags,
    movement_quality_tags: item.movementQualityTags,
    suitable_blocks: item.suitableBlocks,
    media: item.media,
    updated_at: new Date().toISOString(),
  }
}

async function main() {
  if (allExerciseLibraryItems.length < 400) {
    throw new Error(`Expected at least 400 exercises, found ${allExerciseLibraryItems.length}.`)
  }

  const client = createAdminClient()
  const rows = allExerciseLibraryItems.map(toExerciseRow)
  const chunkSize = 100

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize)
    const { error } = await client
      .from('exercise_library')
      .upsert(chunk, { onConflict: 'id' })

    if (error) {
      throw error
    }
  }

  const categoryCounts = allExerciseLibraryItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {})

  console.log(
    JSON.stringify(
      {
        seeded: allExerciseLibraryItems.length,
        categoryCounts,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('[seedExerciseLibrary] failed', error)
  process.exit(1)
})
