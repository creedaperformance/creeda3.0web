import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

import { getPublicSupabaseEnv } from '@/lib/env'
import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import {
  enforceJsonRequest,
  enforceTrustedMutationOrigin,
  handleApiError,
  jsonError,
} from '@/lib/security/http'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null

  const token = authHeader.slice(7).trim()
  return token || null
}

function sanitizeNextPath(value: unknown) {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null

  return trimmed
}

export async function POST(request: NextRequest) {
  const originViolation = enforceTrustedMutationOrigin(request)
  if (originViolation) return originViolation

  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  const jsonRequestViolation = enforceJsonRequest(request)
  if (jsonRequestViolation) return jsonRequestViolation

  const accessToken = getBearerToken(request)
  if (!accessToken) {
    return jsonError(request, 401, 'Unauthorized.')
  }

  const body = (await request.json().catch(() => null)) as
    | {
        refreshToken?: string
        nextPath?: string
      }
    | null

  const refreshToken =
    typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : ''
  const nextPath = sanitizeNextPath(body?.nextPath)

  if (!refreshToken) {
    return jsonError(request, 400, 'Missing mobile refresh token.')
  }

  if (!nextPath) {
    return jsonError(request, 400, 'Invalid next path.')
  }

  const redirectUrl = new URL(nextPath, request.nextUrl.origin)
  const response = NextResponse.redirect(redirectUrl, { status: 303 })
  response.headers.set('Cache-Control', 'no-store')

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv()
  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/web-session] failed',
      publicMessage: 'Failed to establish web session for mobile analyzer.',
      status: 401,
    })
  }

  const requestId = request.headers.get('x-request-id')
  if (requestId) {
    response.headers.set('X-Request-Id', requestId)
  }

  return response
}
