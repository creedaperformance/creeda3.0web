import { z } from 'zod'
import { SquadSetupSchema } from './coach'
import { IdentitySchema } from './identity'
import { ParqPlusSchema } from './medical-screening'
import { OrthopedicHistoryEntrySchema } from './orthopedic'
import { PersonaSchema, PersonaSourceSchema } from './persona'
import { TrainingLoadSnapshotSchema } from './training-load'

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

export const OnboardingV2SportSpecificitySchema = z.object({
  primary_sport: z.string().trim().min(2).max(60),
  position: z.string().trim().max(60).optional(),
  level: z
    .enum(['starter', 'recreational', 'competitive', 'academy', 'elite'])
    .default('recreational'),
})

export const OnboardingV2GoalAnchorSchema = z.object({
  primary_goal: z.enum([
    'general_fitness',
    'sport_performance',
    'strength_gain',
    'fat_loss',
    'return_to_play',
    'event_prep',
    'movement_quality',
  ]),
  goal_detail: z.string().trim().max(180).optional(),
  target_event_name: z.string().trim().max(80).optional(),
  target_event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const WearableProviderSchema = z.enum([
  'apple_health',
  'android_health_connect',
  'fitbit',
  'garmin',
  'none',
])

export const OnboardingV2WearablePreferenceSchema = z.object({
  preference: z.enum(['connect_now', 'later']),
  provider: WearableProviderSchema.default('none'),
})

export const OnboardingV2Phase1SubmissionSchema = z
  .object({
    phase: z.literal(1).default(1),
    persona: PersonaSchema,
    source: PersonaSourceSchema,
    identity: IdentitySchema,
    sport: OnboardingV2SportSpecificitySchema,
    goal: OnboardingV2GoalAnchorSchema,
    training_load: TrainingLoadSnapshotSchema.optional(),
    orthopedic_history: z.array(OrthopedicHistoryEntrySchema).max(5).default([]),
    wearable: OnboardingV2WearablePreferenceSchema,
    squad: SquadSetupSchema.optional(),
    completion_seconds: z.number().int().min(0).max(900),
  })
  .superRefine((payload, context) => {
    if (payload.persona !== 'coach' && !payload.training_load) {
      context.addIssue({
        code: 'custom',
        path: ['training_load'],
        message: 'Training load snapshot is required for athlete and individual onboarding.',
      })
    }

    if (payload.persona === 'coach' && !payload.squad) {
      context.addIssue({
        code: 'custom',
        path: ['squad'],
        message: 'Coach squad setup is required for coach onboarding.',
      })
    }
  })

export type OnboardingV2Event = z.infer<typeof OnboardingV2EventSchema>
export type OnboardingV2SafetyGateSubmission = z.infer<
  typeof OnboardingV2SafetyGateSubmissionSchema
>
export type OnboardingV2Phase1Submission = z.infer<
  typeof OnboardingV2Phase1SubmissionSchema
>
