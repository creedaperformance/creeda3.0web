import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { OnboardingV2Phase2SubmissionSchema } from '@creeda/schemas'

import { persistOnboardingV2Phase2Day } from '@/lib/onboarding-v2/persistence'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = OnboardingV2Phase2SubmissionSchema.safeParse({
    ...(rawPayload && typeof rawPayload === 'object' ? rawPayload : {}),
    source: 'web',
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid onboarding v2 Phase 2 payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const result = await persistOnboardingV2Phase2Day({
    supabase,
    userId: user.id,
    payload: parsed.data,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error, details: result.details }, { status: 400 })
  }

  revalidatePath('/onboarding')
  revalidatePath('/onboarding/phase-2')
  revalidatePath('/dashboard')
  revalidatePath(result.destination)

  return NextResponse.json(result)
}
