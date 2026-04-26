import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getIndividualDashboardSnapshot } from '@/lib/dashboard_decisions'
import { individualOnboardingFlow } from '@/forms/flows/individualFlow'
import { getAdaptiveProfileSummary } from '@/forms/storage'
import { getOnboardingV2Snapshot } from '@/lib/onboarding-v2/queries'
import { IndividualPerformanceView } from './IndividualPerformanceView'
import { CreedaProvider } from '@/lib/state_engine'

export default async function IndividualDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')
  if (profile.role !== 'individual') redirect(`/${profile.role}/dashboard`)
  if (!profile.onboarding_completed) redirect('/fitstart')

  const snapshot = await getIndividualDashboardSnapshot(supabase, user.id)
  const [adaptiveProfile, onboardingV2] = await Promise.all([
    getAdaptiveProfileSummary({
      supabase,
      userId: user.id,
      role: 'individual',
      flowId: individualOnboardingFlow.id,
    }),
    getOnboardingV2Snapshot(supabase, user.id),
  ])
  const individualProfile = snapshot.individualProfile

  const initialData = {
    userId: user.id,
    userType: 'individual' as const,
    readinessScore: snapshot.readinessScore || 0,
    individualProfile,
    diagnostic: individualProfile?.physiology_profile || null,
    historicalLogs: [], // Could be fetched if needed, but primary metrics are in individualProfile
    sport: snapshot.sport || 'General Fitness',
    primaryGoal: snapshot.primaryGoal || '',
  }

  return (
    <CreedaProvider initialData={initialData}>
      <IndividualPerformanceView
        profile={profile}
        snapshot={snapshot}
        adaptiveProfile={adaptiveProfile}
        onboardingV2={onboardingV2}
      />
    </CreedaProvider>
  )
}
