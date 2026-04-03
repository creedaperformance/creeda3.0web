import { redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/DashboardLayout'
import { NutritionSafetyEditor } from '@/components/nutrition/NutritionSafetyEditor'
import { getRoleHomeRoute, getRoleOnboardingRoute, isAppRole } from '@/lib/auth_utils'
import { extractDiagnosticMedicalConditions, getNutritionSafetySummary } from '@/lib/nutrition-safety'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AthleteNutritionSafetyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const { data: diagnostic } = await supabase
    .from('diagnostics')
    .select('physical_status')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const physicalStatus =
    diagnostic?.physical_status && typeof diagnostic.physical_status === 'object'
      ? (diagnostic.physical_status as Record<string, unknown>)
      : null
  const nutritionSafety = await getNutritionSafetySummary(supabase, user.id, {
    fallbackMedicalConditions: extractDiagnosticMedicalConditions(physicalStatus),
  })

  return (
    <DashboardLayout type="athlete" user={profile}>
      <NutritionSafetyEditor role="athlete" initialSummary={nutritionSafety} />
    </DashboardLayout>
  )
}
