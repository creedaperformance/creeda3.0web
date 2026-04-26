import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { PushUnsubscribeBodySchema } from '@/lib/onboarding-v2/push'

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = PushUnsubscribeBodySchema.safeParse(rawBody)
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

  const { error } = await supabase
    .from('push_subscriptions')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('endpoint', parsed.data.endpoint)

  if (error) {
    return NextResponse.json(
      { error: 'persist_failed', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
