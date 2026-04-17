import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachVideoReports } from '@/lib/video-analysis/service'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can open the coach report feed.' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient()

  try {
    const reports = await getCoachVideoReports(supabase, auth.user.userId, 36)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      reports,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/coach/reports] failed',
      publicMessage: 'Failed to load coach reports.',
    })
  }
}
