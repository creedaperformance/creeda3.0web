import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRoleHomeRoute, isAppRole } from '@/lib/role_routes'
import { getPublicSupabaseEnv } from '@/lib/env'

const protectedRolePrefixes = [
  { prefix: '/athlete', role: 'athlete' },
  { prefix: '/coach', role: 'coach' },
  { prefix: '/individual', role: 'individual' },
] as const

const authRequiredPrefixes = [
  '/admin',
  '/dashboard',
  '/fitstart',
  '/newspapers',
  '/onboarding',
]

let loggedMissingSupabaseEnv = false

function buildNextResponse(request: NextRequest, requestHeaders?: Headers) {
  return requestHeaders
    ? NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    : NextResponse.next({
        request,
      })
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

function requiresAuth(path: string) {
  return (
    protectedRolePrefixes.some((entry) => path.startsWith(entry.prefix)) ||
    authRequiredPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  )
}

function readPublicSupabaseEnvForMiddleware() {
  try {
    return getPublicSupabaseEnv()
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }

    if (!loggedMissingSupabaseEnv) {
      loggedMissingSupabaseEnv = true
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[supabase/middleware] Auth session refresh skipped in local dev: ${message}`)
    }

    return null
  }
}

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const path = request.nextUrl.pathname
  const publicSupabaseEnv = readPublicSupabaseEnvForMiddleware()

  if (!publicSupabaseEnv) {
    if (requiresAuth(path)) {
      return redirectToLogin(request)
    }

    return buildNextResponse(request, requestHeaders)
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicSupabaseEnv

  let supabaseResponse = buildNextResponse(request, requestHeaders)

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(keysToSet) {
          keysToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = buildNextResponse(request, requestHeaders)
          keysToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const matchedRolePrefix = protectedRolePrefixes.find(entry => path.startsWith(entry.prefix))

  if (matchedRolePrefix) {
    if (!user) {
      return redirectToLogin(request)
    }
    
    // Role Authorization: Ensure athletes can't see coach tools and vice-versa
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile && isAppRole(profile.role) && profile.role !== matchedRolePrefix.role) {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHomeRoute(profile.role)
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from auth pages
  if (path === '/login' || path === '/signup') {
    if (user) {
      // We would ideally fetch the role here to redirect to the correct dashboard,
      // but to minimize middleware latency, we'll redirect to a generic /dashboard route
      // which will then redirect them based on their profile role.
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
