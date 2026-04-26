import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  authorizeCronRequest,
  dispatchDailyRitualReminders,
} from '@/lib/onboarding-v2/reminder-sender'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function run(headers: Headers) {
  if (!authorizeCronRequest(headers)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'missing_supabase',
        error: err instanceof Error ? err.message : 'admin_client_unavailable',
      },
      { status: 503 }
    )
  }

  const result = await dispatchDailyRitualReminders(supabase)
  const status = result.ok ? 200 : result.reason === 'missing_vapid' ? 503 : 500
  return NextResponse.json(result, { status })
}

export async function POST(request: Request) {
  return run(request.headers)
}

// Vercel Cron sends GET requests with x-vercel-cron headers.
export async function GET(request: Request) {
  return run(request.headers)
}
