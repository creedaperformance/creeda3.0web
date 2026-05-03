import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { getMobileSportDashboard } from '@/lib/mobile/prototype-api'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sportId: string }> }
) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete') {
    return NextResponse.json(
      { error: 'Sport dashboard is available for athlete accounts only.' },
      { status: 403 }
    )
  }

  const { sportId } = await params
  const supabase = createAdminClient()

  try {
    const dashboard = await getMobileSportDashboard(supabase, auth.user, sportId)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      dashboard,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/dashboard/sport/[sportId]] failed',
      publicMessage: 'Failed to load sport dashboard.',
    })
  }
}
