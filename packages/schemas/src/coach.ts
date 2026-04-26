import { z } from 'zod'

export const SquadSetupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  sport: z.string().trim().min(2).max(60),
  level: z.string().trim().min(2).max(60),
  size_estimate: z.number().int().min(0).max(500).optional(),
  primary_focus: z
    .enum(['rehab', 'peak_velocity', 'avoid_burnout', 'in_season_maintenance', 'preseason_build'])
    .optional(),
})

export type SquadSetup = z.infer<typeof SquadSetupSchema>
