import { NextRequest, NextResponse } from 'next/server'
import { authenticateHealthApiRequest } from '@/lib/health/auth'
import { inferSources, parseAndNormalizeHealthSyncPayload } from '@/lib/health/normalize'
import { SyncService } from '@/lib/health/sync-service'

export async function POST(request: NextRequest) {
  const auth = await authenticateHealthApiRequest(request)
  if (!auth.ok) return auth.response

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = parseAndNormalizeHealthSyncPayload(rawPayload)
  if (!parsed.ok) {
    return NextResponse.json(
      {
        error: 'Invalid payload.',
        details: parsed.error,
      },
      { status: 400 }
    )
  }

  if (parsed.payload.user_id && parsed.payload.user_id !== auth.userId) {
    return NextResponse.json(
      { error: 'user_id does not match authenticated user.' },
      { status: 403 }
    )
  }

  if (!parsed.payload.data.length) {
    return NextResponse.json({ error: 'No data available for sync.' }, { status: 422 })
  }

  const syncService = new SyncService()
  try {
    const syncResult = await syncService.upsertDailyMetrics(auth.userId, parsed.payload.data)
    const { hasApple, hasAndroid } = inferSources(parsed.payload.data)

    await syncService.updateConnectionState({
      userId: auth.userId,
      appleConnected: hasApple ? true : undefined,
      androidConnected: hasAndroid ? true : undefined,
      status: 'success',
      errorMessage: null,
    })

    return NextResponse.json({
      success: true,
      user_id: auth.userId,
      synced_rows: syncResult.syncedRows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync failure.'
    try {
      await syncService.updateConnectionState({
        userId: auth.userId,
        status: 'failed',
        errorMessage: message,
      })
    } catch {
      // Do not hide primary sync error if status persistence fails.
    }

    return NextResponse.json(
      {
        error: 'Health sync failed.',
        details: message,
      },
      { status: 500 }
    )
  }
}
