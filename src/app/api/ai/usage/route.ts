import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getQuotaSnapshot } from '@/lib/ai-coach/quotas'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const quota = await getQuotaSnapshot(supabase, user.id)
  return NextResponse.json({ quota })
}
