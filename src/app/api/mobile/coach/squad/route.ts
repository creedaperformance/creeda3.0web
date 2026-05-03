import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { getMobileCoachSquad } from '@/lib/mobile/prototype-api'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can open the squad hub.' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient()

  try {
    const squad = await getMobileCoachSquad(supabase, auth.user)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      squad,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/coach/squad] failed',
      publicMessage: 'Failed to load coach squad.',
    })
  }
}
