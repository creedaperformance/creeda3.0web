import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const JoinSchema = z.object({
  invite_code: z.string().trim().min(4).max(40),
  position: z.string().trim().max(60).optional(),
})

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = JoinSchema.safeParse(raw)
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

  const { data: squad } = await supabase
    .from('squads')
    .select('id, name, coach_id, sport, level')
    .eq('invite_code', parsed.data.invite_code.toUpperCase())
    .maybeSingle()
  if (!squad) {
    return NextResponse.json({ error: 'invalid_invite' }, { status: 404 })
  }

  const squadId = String((squad as { id: string }).id)
  const coachId = String((squad as { coach_id: string }).coach_id)
  if (coachId === user.id) {
    return NextResponse.json(
      { error: 'cannot_self_join', detail: 'You are already the coach of this squad.' },
      { status: 400 }
    )
  }

  const { error: upsertError } = await supabase
    .from('squad_memberships')
    .upsert(
      {
        squad_id: squadId,
        athlete_id: user.id,
        position: parsed.data.position?.trim() || null,
        status: 'active',
        share_level: 'full',
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'squad_id,athlete_id' }
    )

  if (upsertError) {
    return NextResponse.json(
      { error: 'persist_failed', detail: upsertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    squad: {
      id: squadId,
      name: (squad as { name?: string }).name ?? 'Squad',
      sport: (squad as { sport?: string }).sport ?? '',
      level: (squad as { level?: string }).level ?? '',
    },
  })
}
