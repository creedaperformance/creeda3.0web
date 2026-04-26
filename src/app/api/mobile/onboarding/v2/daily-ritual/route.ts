import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { OnboardingV2DailyRitualSubmissionSchema } from '@creeda/schemas'

import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { persistOnboardingV2DailyRitual } from '@/lib/onboarding-v2/persistence'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = OnboardingV2DailyRitualSubmissionSchema.safeParse({
    ...(rawPayload && typeof rawPayload === 'object' ? rawPayload : {}),
    source: 'mobile',
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid onboarding v2 daily ritual payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  if (auth.user.profile.role === 'coach') {
    return NextResponse.json(
      { error: 'Daily ritual is available for athlete and individual accounts.' },
      { status: 403 }
    )
  }

  const admin = createAdminClient()
  const result = await persistOnboardingV2DailyRitual({
    supabase: admin,
    userId: auth.user.userId,
    payload: {
      ...parsed.data,
      persona: auth.user.profile.role === 'athlete' ? 'athlete' : 'individual',
    },
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error, details: result.details }, { status: 400 })
  }

  revalidatePath('/onboarding')
  revalidatePath('/onboarding/daily-ritual')
  revalidatePath('/dashboard')
  revalidatePath(result.destination)

  return NextResponse.json(result)
}
