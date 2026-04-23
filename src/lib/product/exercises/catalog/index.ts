import { strengthAndPowerCatalog } from './strength-power'
import { mobilityRecoveryRehabCatalog } from './mobility-recovery-rehab'
import { sportConditioningCatalog } from './sport-conditioning'
import type { ExerciseLibraryItem } from '@/lib/product/types'

function assertUniqueExercises(items: ExerciseLibraryItem[]) {
  const ids = new Set<string>()
  const slugs = new Set<string>()

  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate exercise id detected: ${item.id}`)
    }
    if (slugs.has(item.slug)) {
      throw new Error(`Duplicate exercise slug detected: ${item.slug}`)
    }
    ids.add(item.id)
    slugs.add(item.slug)
  }
}
export const allExerciseLibraryItems = [
  ...strengthAndPowerCatalog,
  ...mobilityRecoveryRehabCatalog,
  ...sportConditioningCatalog,
]

assertUniqueExercises(allExerciseLibraryItems)

export function findExerciseBySlug(slug: string) {
  return allExerciseLibraryItems.find((item) => item.slug === slug) || null
}
