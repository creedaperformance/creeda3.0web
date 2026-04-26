import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { PushSubscribeBodySchema } from '@/lib/onboarding-v2/push'

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = PushSubscribeBodySchema.safeParse(rawBody)
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

  const { subscription, reminder_kind, reminder_local_hour, reminder_timezone, user_agent } =
    parsed.data

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      reminder_kind,
      reminder_local_hour,
      reminder_timezone,
      user_agent: user_agent ?? request.headers.get('user-agent')?.slice(0, 280) ?? null,
      active: true,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' }
  )

  if (error) {
    return NextResponse.json(
      { error: 'persist_failed', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
