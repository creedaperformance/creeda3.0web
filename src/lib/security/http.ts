import { NextResponse } from 'next/server'

import { resolveTrustedOriginFromRequest } from '@/lib/security/request'

const MAX_API_REQUEST_BYTES = 10 * 1024 * 1024

type RequestLike = Request | { headers: Headers; url?: string }

function getRequestHeaders(request: RequestLike) {
  return request.headers
}

function getRequestId(request: RequestLike) {
  return getRequestHeaders(request).get('x-request-id') || undefined
}

function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return {
    message: String(error),
  }
}

function applySecurityResponseMetadata(
  response: NextResponse,
  request: RequestLike,
  options?: {
    cacheControl?: string
  }
) {
  const requestId = getRequestId(request)
  if (requestId) {
    response.headers.set('X-Request-Id', requestId)
  }

  response.headers.set(
    'Cache-Control',
    options?.cacheControl || 'no-store, no-cache, max-age=0, must-revalidate'
  )
  response.headers.set('Pragma', 'no-cache')

  return response
}

export function jsonResponse(
  request: RequestLike,
  body: Record<string, unknown>,
  init?: ResponseInit,
  options?: {
    cacheControl?: string
  }
) {
  const response = NextResponse.json(body, init)
  return applySecurityResponseMetadata(response, request, options)
}

export function jsonError(
  request: RequestLike,
  status: number,
  message: string,
  extras?: Record<string, unknown>
) {
  const requestId = getRequestId(request)
  return jsonResponse(
    request,
    {
      error: message,
      ...(requestId ? { requestId } : {}),
      ...(extras || {}),
    },
    { status }
  )
}

export function handleApiError(
  request: RequestLike,
  error: unknown,
  options: {
    logLabel: string
    publicMessage: string
    status?: number
  }
) {
  console.error(options.logLabel, {
    requestId: getRequestId(request),
    error: summarizeError(error),
  })

  return jsonError(request, options.status || 500, options.publicMessage)
}

export function enforceJsonRequest(
  request: RequestLike,
  options?: {
    maxBytes?: number
  }
) {
  const contentType = getRequestHeaders(request).get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonError(request, 415, 'Unsupported content type. Expected application/json.')
  }

  const contentLengthHeader = getRequestHeaders(request).get('content-length')
  if (!contentLengthHeader) return null

  const contentLength = Number(contentLengthHeader)
  if (!Number.isFinite(contentLength)) return null

  const maxBytes = options?.maxBytes || MAX_API_REQUEST_BYTES
  if (contentLength > maxBytes) {
    return jsonError(request, 413, 'Payload too large.')
  }

  return null
}

export function enforceTrustedMutationOrigin(request: Request) {
  const method = (request as { method?: string }).method?.toUpperCase() || 'GET'
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null
  }

  const origin = request.headers.get('origin')
  if (!origin) return null

  const trustedOrigin = resolveTrustedOriginFromRequest({
    headers: request.headers,
    nextUrl: new URL(request.url),
  })

  if (origin !== trustedOrigin) {
    return jsonError(request, 403, 'Invalid request origin.')
  }

  return null
}
