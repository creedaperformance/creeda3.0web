'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getRoleOnboardingRoute, isAppRole } from '@/lib/role_routes'

export function AuthListener() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Verify if they have a completed profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profile && profile.onboarding_completed === false) {
           const isAlreadyOnOnboarding =
             window.location.pathname.startsWith('/onboarding') ||
             window.location.pathname.startsWith('/fitstart') ||
             window.location.pathname.includes('/onboarding')
           
          if (!isAlreadyOnOnboarding && isAppRole(profile.role)) {
            router.push(getRoleOnboardingRoute(profile.role))
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  return null
}
