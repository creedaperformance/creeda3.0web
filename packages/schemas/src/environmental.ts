import { z } from 'zod'

export const EnvironmentalContextSchema = z.object({
  primary_training_city: z.string().trim().min(1).max(80),
  primary_training_lat: z.number().min(-90).max(90).optional(),
  primary_training_lng: z.number().min(-180).max(180).optional(),
  altitude_meters: z.number().int().min(-500).max(9000).optional(),
  indoor_outdoor_split_pct: z.number().int().min(0).max(100).optional(),
  sleep_environment: z.enum(['ac', 'fan_only', 'open_windows', 'shared_room']).optional(),
  commute_minutes: z.number().int().min(0).max(300).optional(),
  commute_mode: z.string().trim().max(60).optional(),
  travel_frequency: z.enum(['rarely', 'monthly', 'biweekly', 'weekly']).optional(),
  current_high_stress_phase: z.boolean().default(false),
  high_stress_reason: z.string().trim().max(160).optional(),
  caregiving_responsibilities: z.boolean().default(false),
})

export type EnvironmentalContext = z.infer<typeof EnvironmentalContextSchema>
