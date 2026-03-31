'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getRoleOnboardingRoute, isAppRole } from '@/lib/role_routes'

export default function VerificationSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirectRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      let onboardingPath = getRoleOnboardingRoute('athlete')
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        
        if (isAppRole(profile?.role)) {
          onboardingPath = getRoleOnboardingRoute(profile.role)
        }
      }

      setTimeout(() => {
        router.push(onboardingPath)
      }, 2000)
    }

    redirectRole()
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-india-green/10 text-india-green">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-orbitron)' }}>
        Verification Successful
      </h1>
      <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed font-medium">
        Your email has been verified.
      </p>
      <div className="flex items-center justify-center text-sm font-semibold text-primary/80 pt-4">
        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
        Redirecting you to onboarding...
      </div>
    </div>
  )
}
