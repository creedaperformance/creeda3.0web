import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { getMobileLearnDaily } from '@/lib/mobile/prototype-api'
import { handleApiError } from '@/lib/security/http'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete' && auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Daily learn content is available for athlete and individual accounts only.' },
      { status: 403 }
    )
  }

  try {
    const learn = await getMobileLearnDaily()

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      learn,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/learn/daily] failed',
      publicMessage: 'Failed to load daily learn content.',
    })
  }
}
