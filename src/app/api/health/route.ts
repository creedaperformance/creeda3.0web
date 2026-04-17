import { NextResponse } from 'next/server'

import { getSiteUrl, getPublicSupabaseEnv } from '@/lib/env'

export async function GET() {
  try {
    getPublicSupabaseEnv()

    return NextResponse.json(
      {
        ok: true,
        service: 'creeda-app',
        environment: process.env.NODE_ENV || 'development',
        siteUrl: getSiteUrl(),
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('[api/health] failed', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Health check failed.',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        },
      }
    )
  }
}
