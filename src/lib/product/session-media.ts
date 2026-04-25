import { findExerciseBySlug } from '@/lib/product/exercises/catalog'
import type { ExecutionSession, ExerciseMedia } from '@/lib/product/types'

function isFallbackMediaUrl(value: string | null | undefined) {
  return Boolean(value?.includes('/media/exercises/fallback/'))
}
function mediaNeedsHydration(media: ExerciseMedia | null | undefined) {
  if (!media) return true
  if (!media.videoUrl || isFallbackMediaUrl(media.videoUrl)) return true
  if (!media.imageUrls?.length) return true
  if (media.imageUrls.some(isFallbackMediaUrl)) return true
  return media.source === 'placeholder'
}

export function hydrateExecutionSessionExerciseMedia(session: ExecutionSession): ExecutionSession {
  let changed = false

  const blocks = session.blocks.map((block) => {
    const exercises = block.exercises.map((exercise) => {
      if (!mediaNeedsHydration(exercise.media)) return exercise

      const catalogExercise = findExerciseBySlug(exercise.exerciseSlug)
      if (!catalogExercise || mediaNeedsHydration(catalogExercise.media)) return exercise

      changed = true
      return {
        ...exercise,
        media: catalogExercise.media,
      }
    })

    return exercises === block.exercises ? block : { ...block, exercises }
  })

  return changed ? { ...session, blocks } : session
}
