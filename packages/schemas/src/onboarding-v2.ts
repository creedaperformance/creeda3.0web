import { z } from 'zod'
import { ParqPlusSchema } from './medical-screening'
import { PersonaSchema, PersonaSourceSchema } from './persona'

export const OnboardingV2EventNameSchema = z.enum([
  'onb.screen.viewed',
  'onb.screen.completed',
  'onb.screen.abandoned',
  'onb.field.error',
])

export const OnboardingV2EventSchema = z.object({
  event_name: OnboardingV2EventNameSchema,
  persona: PersonaSchema.optional(),
  phase: z.number().int().min(0).max(3),
  screen: z.string().trim().min(1).max(80),
  source: PersonaSourceSchema,
  completion_seconds: z.number().int().min(0).max(900).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const OnboardingV2SafetyGateSubmissionSchema = z.object({
  persona: PersonaSchema,
  source: PersonaSourceSchema,
  parq: ParqPlusSchema,
  completion_seconds: z.number().int().min(0).max(900),
})

export type OnboardingV2Event = z.infer<typeof OnboardingV2EventSchema>
export type OnboardingV2SafetyGateSubmission = z.infer<
  typeof OnboardingV2SafetyGateSubmissionSchema
>
