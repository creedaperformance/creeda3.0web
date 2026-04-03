import { redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/DashboardLayout'
import { LegalControlsPanel } from '@/components/legal/LegalControlsPanel'
import { createClient } from '@/lib/supabase/server'

export default async function IndividualLegalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, role, email, legal_policy_version, privacy_policy_version, consent_policy_version, legal_consent_at, medical_disclaimer_accepted_at, data_processing_consent_at, ai_acknowledgement_at, marketing_consent, consent_updated_at'
    )
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'individual') redirect(`/${profile.role}/dashboard`)

  return (
    <DashboardLayout type="individual" user={profile}>
      <div className="max-w-4xl mx-auto py-6">
        <h1 className="text-3xl font-black tracking-tight text-white">Legal & Privacy</h1>
        <p className="mt-2 text-sm text-white/60">
          Manage consent settings and submit access, export, deletion, or consent withdrawal requests.
        </p>
        <div className="mt-6">
          <LegalControlsPanel role="individual" profile={profile} />
        </div>
      </div>
    </DashboardLayout>
  )
}

