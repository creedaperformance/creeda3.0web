import { z } from 'zod'

export const Apsq10Schema = z.object({
  responses: z.array(z.number().int().min(1).max(5)).length(10),
})

export type Apsq10 = z.infer<typeof Apsq10Schema>

export const PsychologicalAssessmentSchema = z.object({
  assessment_type: z.enum(['apsq_10', 'sleep_baseline', 'life_stress']),
  responses: z.record(z.string(), z.unknown()),
  total_score: z.number().int().min(0).optional(),
  flag_level: z.enum(['green', 'amber', 'red']).optional(),
})

export type PsychologicalAssessment = z.infer<typeof PsychologicalAssessmentSchema>
