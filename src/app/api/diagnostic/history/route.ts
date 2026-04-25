import { NextRequest, NextResponse } from 'next/server'

import { listDiagnosticHistory } from '@/lib/diagnostics/service'
import { handleApiError, jsonError } from '@/lib/security/http'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return jsonError(request, 401, 'Unauthorized.')

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 12)
    const history = await listDiagnosticHistory(supabase, { userId: user.id, limit })
    return NextResponse.json({ success: true, history })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/diagnostic/history] failed',
      publicMessage: 'Failed to load diagnostic history.',
    })
  }
}
