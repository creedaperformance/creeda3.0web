import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type AppRole, getRoleHomeRoute, isAppRole } from '@/lib/role_routes'

export { getRoleHomeRoute, getRoleOnboardingRoute, isAppRole } from '@/lib/role_routes'
export type { AppRole } from '@/lib/role_routes'

/**
 * Verifies that the current user has the required role.
 * If not, it redirects to the appropriate dashboard or login page.
 * Use this in Server Components and Server Actions.
 */
export async function verifyRole(requiredRole: AppRole) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== requiredRole) {
    if (isAppRole(profile?.role)) {
      redirect(getRoleHomeRoute(profile.role))
    }

    redirect('/login')
  }

  return { user, profile }
}

/**
 * Checks if a username is already taken by another user.
 * Case-insensitive check.
 */
export async function isUsernameTaken(username: string, excludeUserId?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
  
  if (excludeUserId) {
    query = query.neq('id', excludeUserId)
  }

  const { data, error } = await query.maybeSingle()
  
  if (error) {
    console.error('Error checking username uniqueness:', error)
    return false // Fallback to safe
  }

  return !!data
}
