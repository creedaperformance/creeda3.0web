import { redirect } from 'next/navigation'

import { GuardianProfileEditor } from '@/components/academy/GuardianProfileEditor'
import { DashboardLayout } from '@/components/DashboardLayout'
import { getRoleHomeRoute, getRoleOnboardingRoute, isAppRole } from '@/lib/auth_utils'
import {
  calculateAgeFromDateOfBirth,
  createGuardianProfileSummary,
} from '@/lib/academy/workflows'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AthleteFamilyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email, onboarding_completed, date_of_birth, guardian_consent_confirmed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const { data: guardianRow } = await supabase
    .from('athlete_guardian_profiles')
    .select('athlete_id, guardian_name, guardian_relationship, guardian_phone, guardian_email, emergency_contact_name, emergency_contact_phone, consent_status, handoff_preference, last_handoff_sent_at, notes')
    .eq('athlete_id', user.id)
    .maybeSingle()

  const athleteAge = calculateAgeFromDateOfBirth(profile.date_of_birth || null)
  const initialSummary = createGuardianProfileSummary({
    athleteId: user.id,
    record: guardianRow as Record<string, unknown> | null,
    guardianConsentConfirmed: Boolean(profile.guardian_consent_confirmed),
  })

  return (
    <DashboardLayout type="athlete" user={profile}>
      <GuardianProfileEditor
        isJuniorAthlete={typeof athleteAge === 'number' ? athleteAge < 18 : false}
        athleteAge={athleteAge}
        initialSummary={initialSummary}
      />
    </DashboardLayout>
  )
}
