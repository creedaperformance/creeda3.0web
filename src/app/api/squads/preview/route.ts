import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getSquadByInviteCode } from '@/lib/squads/queries'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')?.trim().toUpperCase() ?? ''
  if (!code) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }

  const supabase = await createClient()
  const squad = await getSquadByInviteCode(supabase, code)
  if (!squad) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ squad })
}
