import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRoleHomeRoute, isAppRole } from '@/lib/role_routes'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(keysToSet) {
          keysToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
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

  const path = request.nextUrl.pathname;

  const protectedRolePrefixes = [
    { prefix: '/athlete', role: 'athlete' },
    { prefix: '/coach', role: 'coach' },
    { prefix: '/individual', role: 'individual' },
  ] as const

  const matchedRolePrefix = protectedRolePrefixes.find(entry => path.startsWith(entry.prefix))

  if (matchedRolePrefix) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
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
