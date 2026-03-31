import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRoleHomeRoute, getRoleOnboardingRoute, isAppRole, type AppRole } from '@/lib/auth_utils'

export default async function DashboardController() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the role and onboarding status from the profile table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed, subscription_status')
    .eq('id', user.id)
    .maybeSingle()

  const fallbackRole = isAppRole(user.user_metadata?.role) ? user.user_metadata.role as AppRole : null

  if (!profile) {
    if (fallbackRole) {
      redirect(getRoleOnboardingRoute(fallbackRole))
    }
    redirect('/')
    return
  }

  if (!isAppRole(profile.role)) {
    redirect('/')
  }

  if (profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute(profile.role))
  }

  redirect(getRoleHomeRoute(profile.role))
}
