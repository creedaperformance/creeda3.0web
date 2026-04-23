'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { verifyRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'
import {
  assignCoachExecutionSession,
  saveCoachSessionFeedback,
} from '@/lib/product/server'
import { trackProductEvent } from '@/lib/product/operating-system/analytics'
import type { ExecutionMode } from '@/lib/product/types'

const assignSchema = z.object({
  athleteId: z.string().uuid(),
  mode: z.enum(['train_hard', 'train_light', 'recovery', 'rehab']).optional(),
  message: z.string().max(2000).optional(),
  date: z.string().optional(),
})

const feedbackSchema = z.object({
  athleteId: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  message: z.string().min(3).max(2000),
  feedbackType: z.enum(['assignment_note', 'completion_review', 'warning', 'encouragement']).optional(),
})

export async function assignCoachSession(input: z.infer<typeof assignSchema>) {
  const parsed = assignSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Assignment payload is invalid.' }
  }

  const { user } = await verifyRole('coach')
  const supabase = await createClient()

  try {
    const result = await assignCoachExecutionSession(supabase, {
      coachId: user.id,
      athleteId: parsed.data.athleteId,
      date: parsed.data.date,
      mode: parsed.data.mode as ExecutionMode | undefined,
      message: parsed.data.message,
    })

    await trackProductEvent(supabase, {
      userId: user.id,
      eventName: 'coach_session_assigned',
      surface: 'coach_execution',
      properties: {
        athleteId: parsed.data.athleteId,
        sessionId: result.sessionId,
        mode: parsed.data.mode || 'system_recommended',
      },
    })

    revalidatePath('/coach/dashboard')
    revalidatePath('/coach/execution')
    revalidatePath('/athlete/dashboard')
    revalidatePath('/athlete/plans')
    revalidatePath('/athlete/sessions/today')

    return { success: true, sessionId: result.sessionId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to assign a session right now.'
    return { error: message }
  }
}

export async function addCoachFeedback(input: z.infer<typeof feedbackSchema>) {
  const parsed = feedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Feedback payload is invalid.' }
  }

  const { user } = await verifyRole('coach')
  const supabase = await createClient()

  try {
    const result = await saveCoachSessionFeedback(supabase, {
      coachId: user.id,
      athleteId: parsed.data.athleteId,
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
      feedbackType: parsed.data.feedbackType,
    })

    await trackProductEvent(supabase, {
      userId: user.id,
      eventName: 'coach_feedback_added',
      surface: 'coach_execution',
      properties: {
        athleteId: parsed.data.athleteId,
        sessionId: parsed.data.sessionId,
        feedbackId: result.id,
        feedbackType: parsed.data.feedbackType || 'completion_review',
      },
    })

    revalidatePath('/coach/execution')
    revalidatePath('/athlete/sessions/today')
    revalidatePath('/athlete/plans')

    return { success: true, feedbackId: result.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save coach feedback right now.'
    return { error: message }
  }
}
