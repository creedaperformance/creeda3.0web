import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getIndividualDashboardSnapshot } from '@/lib/dashboard_decisions'
import { IndividualDashboardClient } from './components/IndividualDashboardClient'
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
      <IndividualDashboardClient profile={profile} snapshot={snapshot} />
    </CreedaProvider>
  )
}
