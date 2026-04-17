import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonError } from '@/lib/security/http'

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

export async function authenticateHealthApiRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return {
      ok: false,
      response: jsonError(request, 401, 'Unauthorized.'),
    }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return {
      ok: false,
      response: jsonError(request, 401, 'Unauthorized.'),
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    return {
      ok: false,
      response: jsonError(request, 401, 'Unauthorized.'),
    }
  }

  return { ok: true, userId: data.user.id }
}
