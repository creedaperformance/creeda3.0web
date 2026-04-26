import { NextResponse } from 'next/server'

import { getCronSecret, isAiEnabled } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildWeeklyNewspaper,
  getCurrentWeekStartIso,
  persistNewspaper,
} from '@/lib/newspaper/build'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_USERS_PER_RUN = 100

export async function POST(request: Request) {
  const cronSecret = getCronSecret()
  const auth = request.headers.get('authorization') ?? ''
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!isAiEnabled()) {
    return NextResponse.json({ ok: false, reason: 'ai_disabled' }, { status: 503 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: 'admin_client_unavailable', detail: (error as Error).message },
      { status: 503 }
    )
  }

  const weekStart = getCurrentWeekStartIso()

  // Pull users who logged at least 1 daily check-in in the last 14 days OR
  // have an active onboarding phase ≥ 1. Caps to MAX_USERS_PER_RUN to stay
  // inside the cron 5-min budget. The cron is scheduled hourly during
  // Monday morning IST so multiple invocations cover the full base.
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14)

  const { data: candidates } = await admin
    .from('profiles')
    .select('id')
    .gte('updated_at', fourteenDaysAgo.toISOString())
    .order('updated_at', { ascending: false })
    .limit(MAX_USERS_PER_RUN)

  const candidateIds = Array.isArray(candidates)
    ? candidates.map((row: { id: string }) => row.id)
    : []
  if (candidateIds.length === 0) {
    return NextResponse.json({ ok: true, considered: 0, generated: 0 })
  }

  // Skip users who already have a newspaper for this week.
  const { data: existingRows } = await admin
    .from('weekly_newspapers')
    .select('user_id')
    .eq('week_start_date', weekStart)
    .in('user_id', candidateIds)

  const alreadyGenerated = new Set(
    (existingRows ?? []).map((row: { user_id: string }) => row.user_id)
  )
  const todo = candidateIds.filter((id) => !alreadyGenerated.has(id))

  let generated = 0
  let failed = 0

  for (const userId of todo) {
    try {
      const result = await buildWeeklyNewspaper({
        supabase: admin,
        userId,
        weekStartIso: weekStart,
      })
      await persistNewspaper(admin, {
        userId,
        weekStartIso: weekStart,
        payload: result.payload,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costCents: result.costCents,
      })
      generated += 1
    } catch (error) {
      failed += 1
      console.warn('[newspaper] generation failed for', userId, error)
    }
  }

  return NextResponse.json({
    ok: true,
    week_start: weekStart,
    considered: candidateIds.length,
    skipped_already_generated: alreadyGenerated.size,
    generated,
    failed,
  })
}
