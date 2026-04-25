import { NextRequest, NextResponse } from 'next/server'

import { formatDiagnosticRequestIssues, submitFollowUpsSchema } from '@/lib/diagnostics/api'
import { submitDiagnosticFollowUps } from '@/lib/diagnostics/service'
import { enforceJsonRequest, enforceTrustedMutationOrigin, handleApiError, jsonError } from '@/lib/security/http'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = enforceTrustedMutationOrigin(request)
  if (originError) return originError

  const contentTypeError = enforceJsonRequest(request, { maxBytes: 24 * 1024 })
  if (contentTypeError) return contentTypeError

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return jsonError(request, 401, 'Unauthorized.')

  try {
    const { id } = await params
    const body = submitFollowUpsSchema.parse(await request.json())
    const result = await submitDiagnosticFollowUps(supabase, {
      userId: user.id,
      sessionId: id,
      answers: body.answers.map((answer) => ({
        questionKey: answer.question_key,
        answerValue: answer.answer_value,
        answerType: answer.answer_type,
      })),
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const issues = formatDiagnosticRequestIssues(error)
    if (issues) {
      return jsonError(request, 400, 'Invalid diagnostic follow-up request.', { issues })
    }

    return handleApiError(request, error, {
      logLabel: '[api/diagnostic/sessions/[id]/followups] failed',
      publicMessage: 'Failed to save follow-up answers.',
    })
  }
}
