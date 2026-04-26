import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { OnboardingV2SafetyGateSubmissionSchema } from '@creeda/schemas'

import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { persistOnboardingV2SafetyGate } from '@/lib/onboarding-v2/persistence'
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

  const parsed = OnboardingV2SafetyGateSubmissionSchema.safeParse({
    ...(rawPayload && typeof rawPayload === 'object' ? rawPayload : {}),
    source: 'mobile',
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid onboarding v2 safety payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const result = await persistOnboardingV2SafetyGate({
    supabase: admin,
    userId: auth.user.userId,
    payload: parsed.data,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error, details: result.details }, { status: 400 })
  }

  revalidatePath('/onboarding')
  revalidatePath('/dashboard')
  revalidatePath(result.destination)

  return NextResponse.json(result)
}
