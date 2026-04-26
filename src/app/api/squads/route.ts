import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const NewSquadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  sport: z.string().trim().min(2).max(60),
  level: z.string().trim().min(1).max(60),
  size_estimate: z.number().int().min(0).max(500).default(12),
  primary_focus: z
    .enum(['rehab', 'peak_velocity', 'avoid_burnout', 'in_season_maintenance', 'preseason_build'])
    .default('in_season_maintenance'),
  load_target_au: z.number().int().min(0).max(20000).optional(),
  alert_threshold_acwr: z.number().min(0.5).max(2.5).optional(),
})

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = NewSquadSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('squads')
    .insert({
      coach_id: user.id,
      name: parsed.data.name,
      sport: parsed.data.sport,
      level: parsed.data.level,
      size_estimate: parsed.data.size_estimate,
      primary_focus: parsed.data.primary_focus,
      load_target_au: parsed.data.load_target_au ?? null,
      alert_threshold_acwr: parsed.data.alert_threshold_acwr ?? 1.5,
    })
    .select('id, name, invite_code, sport, level, primary_focus')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'persist_failed', detail: error?.message ?? 'Could not create squad.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, squad: data })
}
