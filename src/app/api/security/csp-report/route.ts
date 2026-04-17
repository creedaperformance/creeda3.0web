import { NextRequest, NextResponse } from 'next/server'

import { jsonError } from '@/lib/security/http'

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonError(request, 415, 'Unsupported content type. Expected application/json.')
  }

  try {
    const payload = await request.json()
    console.warn('[security/csp-report] violation', {
      requestId: request.headers.get('x-request-id') || undefined,
      report: payload,
    })

    return NextResponse.json(
      { ok: true },
      {
        status: 202,
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        },
      }
    )
  } catch {
    return jsonError(request, 400, 'Invalid CSP report payload.')
  }
}
