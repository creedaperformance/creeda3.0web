import { z } from 'zod'

export const DailyCheckInSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  energy: z.number().int().min(1).max(5),
  body_feel: z.number().int().min(1).max(5),
  mental_load: z.number().int().min(1).max(5),
  sleep_hours_self: z.number().min(0).max(16).optional(),
  sleep_quality_self: z.number().int().min(1).max(10).optional(),
  pain_locations: z.array(z.string().trim().min(1).max(60)).default([]),
  pain_scores: z.record(z.string(), z.number().int().min(0).max(10)).default({}),
  completion_seconds: z.number().int().min(0).max(180).optional(),
  source: z.enum(['mobile', 'web']),
})

export type DailyCheckIn = z.infer<typeof DailyCheckInSchema>
