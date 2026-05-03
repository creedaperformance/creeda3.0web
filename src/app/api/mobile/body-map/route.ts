import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { getMobileBodyMap } from '@/lib/mobile/prototype-api'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete' && auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Body map is available for athlete and individual accounts only.' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient()

  try {
    const bodyMap = await getMobileBodyMap(supabase, auth.user)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      bodyMap,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/body-map] failed',
      publicMessage: 'Failed to load body map.',
    })
  }
}
