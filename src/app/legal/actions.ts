'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { CONSENT_KEYS, LEGAL_POLICY_VERSION } from '@/lib/legal/constants'
import { persistSingleLegalConsentEvent } from '@/lib/legal/compliance'

type RightsRequestType =
  | 'access'
  | 'correction'
  | 'deletion'
  | 'portability'
  | 'restrict_processing'
  | 'object_processing'
  | 'withdraw_consent'
  | 'nominate_representative'
  | 'grievance'

type RightsJurisdiction = 'india_dpdp' | 'gdpr' | 'global' | 'other'

export async function submitDataRightsRequest(input: {
  requestType: RightsRequestType
  jurisdiction: RightsJurisdiction
  details?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Could not verify your profile. Please try again.' }
  }

  const sanitizedDetails = String(input.details || '').trim().slice(0, 2000)

  const { error } = await supabase.from('data_rights_requests').insert({
    user_id: user.id,
    role: profile.role || 'unknown',
    request_type: input.requestType,
    jurisdiction: input.jurisdiction,
    details: sanitizedDetails || null,
    requested_via: 'in_app',
    contact_email: profile.email || user.email || null,
  })

  if (error) {
    if (String(error.code || '').toLowerCase() === '42p01') {
      return { error: 'Legal infrastructure migration is not applied yet. Please run the latest SQL migration.' }
    }
    return { error: 'Failed to submit request. Please try again.' }
  }

  return { success: true }
}

export async function updateMarketingConsent(marketingConsent: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Could not verify your profile. Please try again.' }
  }

  const nowIso = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      marketing_consent: marketingConsent,
      marketing_consent_at: marketingConsent ? nowIso : null,
      consent_updated_at: nowIso,
    })
    .eq('id', user.id)

  if (updateError) {
    return { error: 'Failed to save marketing preference. Please try again.' }
  }

  const headersList = await headers()
  await persistSingleLegalConsentEvent({
    supabase,
    userId: user.id,
    role: profile.role || 'unknown',
    consentKey: CONSENT_KEYS.marketingCommunications,
    accepted: marketingConsent,
    source: 'settings',
    policyVersion: LEGAL_POLICY_VERSION,
    userAgent: headersList.get('user-agent'),
    requestIp: headersList.get('x-forwarded-for'),
    metadata: {
      origin: 'legal-center',
    },
  })

  revalidatePath('/athlete/legal')
  revalidatePath('/coach/legal')
  revalidatePath('/individual/legal')

  return { success: true }
}

