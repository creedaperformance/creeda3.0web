import { z } from 'zod'

export const OrthopedicHistoryEntrySchema = z.object({
  body_region: z.string().trim().min(2).max(80),
  severity: z.enum(['annoying', 'limited_1_2_weeks', 'limited_1_2_months', 'surgery_required']),
  occurred_at_estimate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currently_symptomatic: z.boolean().default(false),
  current_pain_score: z.number().int().min(0).max(10).optional(),
  has_seen_clinician: z.boolean().default(false),
  clinician_type: z.enum(['physio', 'orthopedist', 'sports_doctor', 'gp', 'other', 'none']).optional(),
  notes: z.string().trim().max(500).optional(),
})

export type OrthopedicHistoryEntry = z.infer<typeof OrthopedicHistoryEntrySchema>
