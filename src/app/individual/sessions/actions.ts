'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { verifyRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'
import { saveExecutionSessionLog } from '@/lib/product/server'
import { trackProductEvent } from '@/lib/product/operating-system/analytics'
import type { ExecutionSession } from '@/lib/product/types'

const exerciseLogSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseSlug: z.string().min(1),
  blockType: z.string().min(1),
  prescribed: z.record(z.string(), z.unknown()),
  actual: z.record(z.string(), z.unknown()),
  completionStatus: z.enum(['completed', 'partial', 'skipped', 'substituted']),
  note: z.string().optional(),
  substitutionExerciseSlug: z.string().nullable().optional(),
})

const completeSessionSchema = z.object({
  sessionId: z.string().nullable(),
  session: z.custom<ExecutionSession>((value) => {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Record<string, unknown>
    return typeof candidate.id === 'string' && Array.isArray(candidate.blocks)
  }, 'Valid execution session payload is required.'),
  actualDurationMinutes: z.number().min(1).max(360),
  compliancePct: z.number().min(0).max(100),
  athleteNotes: z.string().max(4000).default(''),
  painFlags: z.array(z.string().min(1)).max(12).default([]),
  exerciseLogs: z.array(exerciseLogSchema).min(1),
})

export async function completeIndividualExecutionSession(
  input: z.infer<typeof completeSessionSchema>
) {
  const parsed = completeSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Session payload is invalid.' }
  }

  const { user } = await verifyRole('individual')
  const supabase = await createClient()

  try {
    const result = await saveExecutionSessionLog(supabase, {
      userId: user.id,
      sessionId: parsed.data.sessionId,
      session: parsed.data.session,
      actualDurationMinutes: parsed.data.actualDurationMinutes,
      compliancePct: parsed.data.compliancePct,
      athleteNotes: parsed.data.athleteNotes,
      painFlags: parsed.data.painFlags,
      exerciseLogs: parsed.data.exerciseLogs,
    })

    await trackProductEvent(supabase, {
      userId: user.id,
      eventName: 'workout_completed',
      surface: 'individual_guided_session',
      properties: {
        sessionId: result.sessionId,
        sessionLogId: result.sessionLogId,
        mode: parsed.data.session.mode,
        compliancePct: parsed.data.compliancePct,
        exerciseCount: parsed.data.exerciseLogs.length,
        painFlags: parsed.data.painFlags,
      },
    })

    revalidatePath('/individual/dashboard')
    revalidatePath('/individual/plans')
    revalidatePath('/individual/exercises')
    revalidatePath('/individual/sessions/today')

    return { success: true, sessionId: result.sessionId, sessionLogId: result.sessionLogId }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to save your session right now.'
    return { error: message }
  }
}
