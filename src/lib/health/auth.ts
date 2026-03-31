import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

export async function authenticateHealthApiRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing Bearer token.' },
        { status: 401 }
      ),
    }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid Bearer token.' },
        { status: 401 }
      ),
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      ),
    }
  }

  return { ok: true, userId: data.user.id }
}
