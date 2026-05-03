import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { getMobileCoachAthleteDetail } from '@/lib/mobile/prototype-api'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can open athlete squad detail.' },
      { status: 403 }
    )
  }

  const { athleteId } = await params
  const supabase = createAdminClient()

  try {
    const athlete = await getMobileCoachAthleteDetail(supabase, auth.user, athleteId)
    if (!athlete) {
      return NextResponse.json(
        { error: 'Athlete not found or not connected to this coach.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      athlete,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/coach/squad/[athleteId]] failed',
      publicMessage: 'Failed to load athlete squad detail.',
    })
  }
}
