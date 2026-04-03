import { redirect } from 'next/navigation'

import { ObjectiveTestingLab } from '@/components/objective-tests/ObjectiveTestingLab'
import { createClient } from '@/lib/supabase/server'
import { normalizeObjectiveTestSession, type ObjectiveTestSession } from '@/lib/objective-tests/reaction'

export const dynamic = 'force-dynamic'

export default async function IndividualTestsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/fitstart')
  if (profile.role !== 'individual') redirect(`/${profile.role}/dashboard`)
  if (!profile.onboarding_completed) redirect('/fitstart')

  const { data: sessions } = await supabase
    .from('objective_test_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(48)

  const initialSessions = (sessions || [])
    .map(normalizeObjectiveTestSession)
    .filter((session): session is ObjectiveTestSession => Boolean(session))

  return (
    <ObjectiveTestingLab
      role="individual"
      profile={profile}
      initialSessions={initialSessions}
    />
  )
}
