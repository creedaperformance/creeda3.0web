'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { verifyRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'
import { getCoachVideoReportById } from '@/lib/video-analysis/service'
import { postCoachVideoComment } from '@/lib/video-analysis/comments'
import { trackProductEvent } from '@/lib/product/operating-system/analytics'

const schema = z.object({
  reportId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
})

export async function postCoachReportComment(
  input: z.infer<typeof schema>
): Promise<{ success: true; id: string } | { error: string }> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Comment payload is invalid.' }
  }

  const { user } = await verifyRole('coach')
  const supabase = await createClient()

  const report = await getCoachVideoReportById(supabase, user.id, parsed.data.reportId)
  if (!report) {
    return { error: 'Report not found or you do not coach this athlete.' }
  }

  const result = await postCoachVideoComment(supabase, {
    reportId: parsed.data.reportId,
    coachId: user.id,
    athleteId: report.userId,
    body: parsed.data.body,
  })

  if ('error' in result) {
    return { error: result.error }
  }

  await trackProductEvent(supabase, {
    userId: user.id,
    eventName: 'coach_feedback_added',
    surface: 'coach_video_review',
    properties: {
      athleteId: report.userId,
      reportId: parsed.data.reportId,
      commentId: result.id,
    },
  })

  revalidatePath(`/coach/reports/${parsed.data.reportId}`)
  revalidatePath(`/athlete/scan/report/${parsed.data.reportId}`)
  revalidatePath('/coach/dashboard')
  revalidatePath('/athlete/dashboard')

  return { success: true, id: result.id }
}
