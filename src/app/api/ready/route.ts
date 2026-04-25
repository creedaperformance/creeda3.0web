import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getPublicSupabaseEnv, getSupabaseProjectRef } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

function summarizeDatabaseError(error: unknown) {
  if (error && typeof error === 'object') {
    const shaped = error as {
      code?: string
      status?: number
      message?: string
      name?: string
    }
    return {
      code: shaped.code || null,
      status: shaped.status || null,
      message: shaped.message || shaped.name || 'Unknown database error',
    }
  }

  return {
    code: null,
    status: null,
    message: String(error || 'Unknown database error'),
  }
}

async function checkDatabase() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv()
  const hasAdminCredentials = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  const projectRef = getSupabaseProjectRef(NEXT_PUBLIC_SUPABASE_URL)
  const supabase = hasAdminCredentials
    ? createAdminClient()
    : createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)

    if (error) {
      const normalizedMessage = error.message.toLowerCase()
      const permissionError =
        normalizedMessage.includes('permission denied') ||
        normalizedMessage.includes('row-level security') ||
        normalizedMessage.includes('not authenticated')

      if (!hasAdminCredentials && permissionError) {
        return {
          name: 'database',
          ok: true,
          message: 'Supabase connectivity verified.',
          projectRef,
          usingServiceRole: false,
        }
      }

      throw error
    }

    return {
      name: 'database',
      ok: true,
      message: 'Database connectivity verified.',
      projectRef,
      usingServiceRole: hasAdminCredentials,
    }
  } catch (error) {
    const diagnostics = summarizeDatabaseError(error)
    console.error('[api/ready][database] failed', {
      projectRef,
      usingServiceRole: hasAdminCredentials,
      diagnostics,
    })
    return {
      name: 'database',
      ok: false,
      message: 'Database readiness failed.',
      projectRef,
      usingServiceRole: hasAdminCredentials,
      diagnostics,
    }
  }
}

export async function GET() {
  const checks = []

  try {
    const env = getPublicSupabaseEnv()
    checks.push({
      name: 'env',
      ok: true,
      message: 'Required runtime environment variables are configured.',
      projectRef: getSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL),
    })
  } catch (error) {
    console.error('[api/ready][env] failed', error)
    checks.push({
      name: 'env',
      ok: false,
      message: 'Required runtime configuration is missing or invalid.',
    })
  }

  checks.push(await checkDatabase())

  const ok = checks.every((check) => check.ok)

  return NextResponse.json(
    {
      ok,
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
      },
    }
  )
}
