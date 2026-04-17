import { NextRequest, NextResponse } from 'next/server'

import { fitStartRecommendationSchema, getFitStartRecommendations } from '@/lib/fitstart'
import { authenticateMobileApiRequest } from '@/lib/mobile/auth'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Only individual accounts can request FitStart recommendations.' },
      { status: 403 }
    )
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = fitStartRecommendationSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid FitStart recommendation payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = getFitStartRecommendations(parsed.data)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
