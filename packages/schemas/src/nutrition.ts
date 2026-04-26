import { z } from 'zod'

export const DietPatternSchema = z.enum([
  'vegetarian',
  'eggetarian',
  'pescatarian',
  'omnivore',
  'vegan',
  'jain',
])

export const NutritionProfileSchema = z.object({
  diet_pattern: DietPatternSchema,
  protein_portions_per_day: z.number().min(0).max(12).optional(),
  estimated_protein_grams: z.number().min(0).max(400).optional(),
  water_cups_per_day: z.number().int().min(0).max(30).optional(),
  caffeine_mg_per_day: z.number().int().min(0).max(1200).optional(),
  pre_workout_pattern: z.enum(['carb_heavy', 'mixed', 'minimal', 'fasted']).optional(),
  allergies: z.array(z.string().trim().min(1).max(60)).default([]),
  supplements: z.array(z.string().trim().min(1).max(60)).default([]),
  known_deficiencies: z.array(z.string().trim().min(1).max(60)).default([]),
})

export type NutritionProfile = z.infer<typeof NutritionProfileSchema>
