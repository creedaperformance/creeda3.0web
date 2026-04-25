import { NextRequest, NextResponse } from 'next/server'

import { analyzeDiagnosticSessionSchema, formatDiagnosticRequestIssues } from '@/lib/diagnostics/api'
import { analyzeDiagnosticSession } from '@/lib/diagnostics/service'
import { enforceJsonRequest, enforceTrustedMutationOrigin, handleApiError, jsonError } from '@/lib/security/http'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = enforceTrustedMutationOrigin(request)
  if (originError) return originError

  const contentTypeError = enforceJsonRequest(request, { maxBytes: 1024 * 1024 })
  if (contentTypeError) return contentTypeError

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return jsonError(request, 401, 'Unauthorized.')

  try {
    const { id } = await params
    const body = analyzeDiagnosticSessionSchema.parse(await request.json())
    const result = await analyzeDiagnosticSession(supabase, {
      userId: user.id,
      sessionId: id,
      testId: body.test_id,
      videoReference: body.video_reference || null,
      deviceMetadata: body.device_metadata || null,
      rawEnginePayload: body.raw_engine_payload,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const issues = formatDiagnosticRequestIssues(error)
    if (issues) {
      return jsonError(request, 400, 'Invalid diagnostic analysis request.', { issues })
    }

    return handleApiError(request, error, {
      logLabel: '[api/diagnostic/sessions/[id]/analyze] failed',
      publicMessage: 'Failed to analyze the diagnostic clip.',
    })
  }
}
