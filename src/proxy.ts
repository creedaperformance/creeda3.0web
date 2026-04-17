import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const MAX_API_REQUEST_BYTES = 10 * 1024 * 1024

function shouldDisableCache(pathname: string) {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/athlete') ||
    pathname.startsWith('/coach') ||
    pathname.startsWith('/individual') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/verify-email' ||
    pathname === '/forgot-password' ||
    pathname === '/verification-success'
  )
}

export async function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const pathname = request.nextUrl.pathname

  if (pathname.includes('..')) {
    return NextResponse.json(
      { error: 'Invalid request path.', requestId },
      { status: 400 }
    )
  }

  if (pathname.startsWith('/api/')) {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_API_REQUEST_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large.', requestId },
        { status: 413 }
      )
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  const response = await updateSession(request, requestHeaders)
  response.headers.set('X-Request-Id', requestId)

  if (shouldDisableCache(pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
  }

  return response
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
