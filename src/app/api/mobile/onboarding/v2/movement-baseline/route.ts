import { NextResponse } from 'next/server'

import { OnboardingV2MovementBaselineSubmissionSchema } from '@creeda/schemas'
import { persistOnboardingV2MovementBaseline } from '@/lib/onboarding-v2/persistence'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = OnboardingV2MovementBaselineSubmissionSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', details: parsed.error.flatten() },
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

  const result = await persistOnboardingV2MovementBaseline({
    supabase,
    userId: user.id,
    payload: parsed.data,
  })
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, ...result })
}
