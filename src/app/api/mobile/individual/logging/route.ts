import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import {
  individualSignalSchema,
  logIndividualSignalForUser,
} from '@/lib/individual-logging'
import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Only individual accounts can submit this daily log.' },
      { status: 403 }
    )
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = individualSignalSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const response = await logIndividualSignalForUser({
    supabase,
    userId: auth.user.userId,
    payload: parsed.data,
  })

  if ('error' in response) {
    return NextResponse.json({ error: response.error }, { status: 500 })
  }

  revalidatePath('/individual')
  revalidatePath('/individual/dashboard')
  revalidatePath('/individual/logging')

  return NextResponse.json(response)
}
