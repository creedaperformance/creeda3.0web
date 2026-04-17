import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateHealthApiRequest } from '@/lib/health/auth'
import { SyncService } from '@/lib/health/sync-service'
import { enforceJsonRequest, handleApiError, jsonError, jsonResponse } from '@/lib/security/http'

const updateConnectionSchema = z.object({
  source: z.enum(['apple', 'android']).optional(),
  connected: z.boolean().optional(),
  connection_preference: z.enum(['connect_now', 'later']).optional(),
  permission_state: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['never', 'success', 'failed']).optional(),
  error: z.string().max(300).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateHealthApiRequest(request)
  if (!auth.ok) return auth.response

  const syncService = new SyncService()
  try {
    const connection = await syncService.fetchConnectionState(auth.userId)
    return jsonResponse(request, {
      success: true,
      user_id: auth.userId,
      connection: connection || null,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/v1/health/connection][GET] failed',
      publicMessage: 'Failed to fetch connection state.',
    })
  }
}

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

  const parsed = updateConnectionSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return jsonError(request, 400, 'Invalid payload.', {
      details: parsed.error.flatten(),
    })
  }

  const payload = parsed.data
  const syncService = new SyncService()

  try {
    await syncService.updateConnectionState({
      userId: auth.userId,
      appleConnected:
        payload.source === 'apple' && typeof payload.connected === 'boolean'
          ? payload.connected
          : undefined,
      androidConnected:
        payload.source === 'android' && typeof payload.connected === 'boolean'
          ? payload.connected
          : undefined,
      connectionPreference: payload.connection_preference,
      permissionState: payload.permission_state,
      status: payload.status,
      errorMessage: payload.error ?? undefined,
    })

    const connection = await syncService.fetchConnectionState(auth.userId)
    return jsonResponse(request, {
      success: true,
      user_id: auth.userId,
      connection: connection || null,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/v1/health/connection][POST] failed',
      publicMessage: 'Failed to update connection state.',
    })
  }
}
