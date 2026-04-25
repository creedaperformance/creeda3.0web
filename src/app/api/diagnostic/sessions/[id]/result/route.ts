import { NextRequest, NextResponse } from 'next/server'

import { getDiagnosticResult } from '@/lib/diagnostics/service'
import { trackDiagnosticEvent } from '@/lib/diagnostics/events'
import { handleApiError, jsonError } from '@/lib/security/http'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return jsonError(request, 401, 'Unauthorized.')

  try {
    const { id } = await params
    const result = await getDiagnosticResult(supabase, {
      userId: user.id,
      sessionId: id,
    })

    await trackDiagnosticEvent(supabase, {
      userId: user.id,
      sessionId: id,
      eventName: 'result_viewed',
      properties: { status: result.session.status },
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/diagnostic/sessions/[id]/result] failed',
      publicMessage: 'Failed to load the diagnostic result.',
    })
  }
}
