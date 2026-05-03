import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { getMobileTrackerTrends } from '@/lib/mobile/prototype-api'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete' && auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Tracker trends are available for athlete and individual accounts only.' },
      { status: 403 }
    )
  }

  const range = Number(request.nextUrl.searchParams.get('range') || 7)
  const supabase = createAdminClient()

  try {
    const tracker = await getMobileTrackerTrends(supabase, auth.user, range)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      tracker,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/tracker/trends] failed',
      publicMessage: 'Failed to load tracker trends.',
    })
  }
}
