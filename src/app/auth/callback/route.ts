import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { resolveTrustedOriginFromRequest, sanitizeInternalRedirectPath } from '@/lib/security/request'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const nextPath = sanitizeInternalRedirectPath(
    searchParams.get('next'),
    '/verification-success'
  )
  const trustedOrigin = resolveTrustedOriginFromRequest({
    headers: request.headers,
    nextUrl: url,
  })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${trustedOrigin}${nextPath}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${trustedOrigin}/login?error=Could%20not%20authenticate%20user`
  )
}
