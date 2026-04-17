import { NextRequest, NextResponse } from 'next/server'
import { authenticateHealthApiRequest } from '@/lib/health/auth'
import { inferSources, parseAndNormalizeHealthSyncPayload } from '@/lib/health/normalize'
import { SyncService } from '@/lib/health/sync-service'
import { enforceJsonRequest, handleApiError, jsonError, jsonResponse } from '@/lib/security/http'

export async function POST(request: NextRequest) {
  const auth = await authenticateHealthApiRequest(request)
  if (!auth.ok) return auth.response

  const jsonRequestViolation = enforceJsonRequest(request)
  if (jsonRequestViolation) return jsonRequestViolation

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return jsonError(request, 400, 'Invalid JSON payload.')
  }

  const parsed = parseAndNormalizeHealthSyncPayload(rawPayload)
  if (!parsed.ok) {
    return jsonError(request, 400, 'Invalid payload.', { details: parsed.error })
  }

  if (parsed.payload.user_id && parsed.payload.user_id !== auth.userId) {
    return jsonError(request, 403, 'user_id does not match authenticated user.')
  }

  if (!parsed.payload.data.length) {
    return jsonError(request, 422, 'No data available for sync.')
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

    return jsonResponse(request, {
      success: true,
      user_id: auth.userId,
      synced_rows: syncResult.syncedRows,
    })
  } catch (error) {
    try {
      await syncService.updateConnectionState({
        userId: auth.userId,
        status: 'failed',
        errorMessage: 'Health sync failed.',
      })
    } catch {
      // Do not hide primary sync error if status persistence fails.
    }

    return handleApiError(request, error, {
      logLabel: '[api/v1/health/sync] failed',
      publicMessage: 'Health sync failed.',
    })
  }
}
