import 'server-only'

import { z } from 'zod'

export const PushSubscriptionPayloadSchema = z.object({
  endpoint: z.string().url('A valid push endpoint URL is required.').max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  expirationTime: z.number().int().nullable().optional(),
})

export type PushSubscriptionPayload = z.infer<typeof PushSubscriptionPayloadSchema>

export const PushSubscribeBodySchema = z.object({
  subscription: PushSubscriptionPayloadSchema,
  reminder_kind: z.enum(['daily_ritual', 'phase2_progress']).default('daily_ritual'),
  reminder_local_hour: z.number().int().min(0).max(23).default(7),
  reminder_timezone: z.string().min(1).max(60).default('Asia/Kolkata'),
  user_agent: z.string().max(280).optional(),
})

export type PushSubscribeBody = z.infer<typeof PushSubscribeBodySchema>

export const PushUnsubscribeBodySchema = z.object({
  endpoint: z.string().url().max(2048),
})

export type PushUnsubscribeBody = z.infer<typeof PushUnsubscribeBodySchema>
