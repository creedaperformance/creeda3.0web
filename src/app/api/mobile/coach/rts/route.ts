import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { getMobileCoachRts } from '@/lib/mobile/prototype-api'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can open return-to-training records.' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient()

  try {
    const rts = await getMobileCoachRts(supabase, auth.user)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      rts,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/coach/rts] failed',
      publicMessage: 'Failed to load return-to-training records.',
    })
  }
}
