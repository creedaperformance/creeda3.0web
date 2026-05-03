import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { getMobileCommunityChallenges } from '@/lib/mobile/prototype-api'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete' && auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Community challenges are available for athlete and individual accounts only.' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient()

  try {
    const community = await getMobileCommunityChallenges(supabase, auth.user)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      community,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/community/challenges] failed',
      publicMessage: 'Failed to load community challenges.',
    })
  }
}
