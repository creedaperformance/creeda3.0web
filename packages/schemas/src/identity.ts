import { z } from 'zod'

export const BiologicalSexSchema = z.enum([
  'male',
  'female',
  'intersex',
  'prefer_not_to_say',
])

export const DominanceSchema = z.enum(['left', 'right', 'ambidextrous'])

export const IdentitySchema = z.object({
  display_name: z.string().trim().min(1).max(40),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  biological_sex: BiologicalSexSchema,
  gender_identity: z.string().trim().max(40).optional(),
  height_cm: z.number().int().min(100).max(230),
  weight_kg: z.number().min(30).max(200),
  dominant_hand: DominanceSchema,
  dominant_leg: DominanceSchema,
})

export type Identity = z.infer<typeof IdentitySchema>
