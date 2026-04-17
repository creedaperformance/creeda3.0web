import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceTrustedMutationOrigin } from '@/lib/security/http'

export async function POST(request: Request) {
  const originViolation = enforceTrustedMutationOrigin(request)
  if (originViolation) return originViolation

  const supabase = await createClient()

  // Check if a user's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  response.headers.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}
