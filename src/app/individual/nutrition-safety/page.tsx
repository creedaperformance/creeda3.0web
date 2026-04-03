import { redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/DashboardLayout'
import { NutritionSafetyEditor } from '@/components/nutrition/NutritionSafetyEditor'
import { getNutritionSafetySummary } from '@/lib/nutrition-safety'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function IndividualNutritionSafetyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/fitstart')
  if (profile.role !== 'individual') redirect(`/${profile.role}/dashboard`)
  if (!profile.onboarding_completed) redirect('/fitstart')

  const nutritionSafety = await getNutritionSafetySummary(supabase, user.id)

  return (
    <DashboardLayout type="individual" user={profile}>
      <NutritionSafetyEditor role="individual" initialSummary={nutritionSafety} />
    </DashboardLayout>
  )
}
