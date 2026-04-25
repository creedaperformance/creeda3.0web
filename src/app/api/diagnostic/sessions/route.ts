import { NextRequest, NextResponse } from 'next/server'

import { formatDiagnosticRequestIssues, startDiagnosticSessionSchema } from '@/lib/diagnostics/api'
import { startDiagnosticSession } from '@/lib/diagnostics/service'
import { enforceJsonRequest, enforceTrustedMutationOrigin, handleApiError, jsonError } from '@/lib/security/http'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const originError = enforceTrustedMutationOrigin(request)
  if (originError) return originError

  const contentTypeError = enforceJsonRequest(request, { maxBytes: 20 * 1024 })
  if (contentTypeError) return contentTypeError

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return jsonError(request, 401, 'Unauthorized.')

  try {
    const body = startDiagnosticSessionSchema.parse(await request.json())
    const result = await startDiagnosticSession(supabase, {
      userId: user.id,
      complaintText: body.complaint_text,
      sportContext: body.sport_context || null,
      userContext: body.user_context || null,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const issues = formatDiagnosticRequestIssues(error)
    if (issues) {
      return jsonError(request, 400, 'Invalid diagnostic request.', { issues })
    }

    return handleApiError(request, error, {
      logLabel: '[api/diagnostic/sessions] failed',
      publicMessage: 'Failed to start the movement diagnostic.',
    })
  }
}
