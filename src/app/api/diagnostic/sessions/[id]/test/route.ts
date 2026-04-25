import { NextRequest, NextResponse } from 'next/server'

import { getDiagnosticPrescribedTest } from '@/lib/diagnostics/service'
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
    const test = await getDiagnosticPrescribedTest(supabase, {
      userId: user.id,
      sessionId: id,
    })

    return NextResponse.json({
      success: true,
      test,
      camera: {
        defaultCamera: 'back',
        requiredView: test?.requiredView || 'front',
        oneAngleOnly: true,
      },
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/diagnostic/sessions/[id]/test] failed',
      publicMessage: 'Failed to load the prescribed movement test.',
    })
  }
}
