'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate_limit'
import { LEGAL_POLICY_VERSION } from '@/lib/legal/constants'
import { persistLegalConsentBundle } from '@/lib/legal/compliance'

import { getRoleOnboardingRoute, isAppRole } from '@/lib/role_routes'

async function findCoachByLockerCode(supabase: Awaited<ReturnType<typeof createClient>>, code: string) {
  const normalizedCode = code.trim().toUpperCase()

  const { data: rpcCoach } = await supabase
    .rpc('find_profile_by_locker_code', { code: normalizedCode })
    .maybeSingle()

  const rpcCoachRecord = rpcCoach as { id?: string; full_name?: string } | null
  if (rpcCoachRecord?.id && rpcCoachRecord.full_name) {
    return { id: rpcCoachRecord.id, full_name: rpcCoachRecord.full_name }
  }

  const { data: scopedCoach } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('locker_code', normalizedCode)
    .eq('role', 'coach')
    .maybeSingle()

  if (scopedCoach?.id) return scopedCoach

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient()
    const { data: adminCoach } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('locker_code', normalizedCode)
      .eq('role', 'coach')
      .maybeSingle()

    if (adminCoach?.id) return adminCoach
  }

  return null
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Rate Limit: Max 3 signup attempts per hour per email
  const limiter = await rateLimit(`signup:${email.toLowerCase()}`, 3, 3600)
  if (!limiter.success) return { error: limiter.error }
  const fullName = formData.get('full_name') as string
  const role = formData.get('role') as string // 'athlete', 'coach', or 'individual'
  const coachLockerCode = formData.get('coach_locker_code') as string | null
  const legacyConsent = formData.get('consent') === 'on'
  const termsPrivacyConsent =
    formData.get('terms_privacy_consent') === 'on' ||
    (legacyConsent && !formData.has('terms_privacy_consent'))
  const medicalDisclaimerConsent = formData.get('medical_disclaimer_consent') === 'on'
  const dataProcessingConsent = formData.get('data_processing_consent') === 'on'
  const aiAcknowledgementConsent = formData.get('ai_acknowledgement_consent') === 'on'
  const marketingConsent = formData.get('marketing_consent') === 'on'

  if (!email || !password || !fullName || !role) {
    return { error: 'All fields are required' }
  }

  if (!termsPrivacyConsent || !medicalDisclaimerConsent || !dataProcessingConsent || !aiAcknowledgementConsent) {
    return { error: 'Please complete all required legal acknowledgements to continue.' }
  }

  const supabase = await createClient()
  const legacyTier = role === 'coach' ? 'Coach-Pro' : 'Athlete-Pro'

  // Validate coach locker codes when an athlete joins through a coach invite.
  if (role === 'athlete' && coachLockerCode) {
    const coach = await findCoachByLockerCode(supabase, coachLockerCode)
    if (!coach) {
      return { error: 'Invalid coach code. Please verify with your coach.' }
    }
  }
  const headersList = await headers()
  const host = headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || 'http'
  const origin = headersList.get('origin') || (host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL) || 'http://localhost:3000'
  const consentTimestamp = new Date().toISOString()
  const userAgent = headersList.get('user-agent')
  const requestIp = headersList.get('x-forwarded-for')

  const data = {
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/verification-success`,
      data: {
        full_name: fullName,
        role: role,
        // Keep the legacy field stable in auth metadata; access is no longer tier-gated.
        subscription_tier: legacyTier,
        coach_locker_code: coachLockerCode,
        legal_consent_at: consentTimestamp,
        medical_disclaimer_accepted_at: consentTimestamp,
        data_processing_consent_at: consentTimestamp,
        ai_acknowledgement_at: consentTimestamp,
        marketing_consent: marketingConsent,
        legal_policy_version: LEGAL_POLICY_VERSION,
        privacy_policy_version: LEGAL_POLICY_VERSION,
        consent_policy_version: LEGAL_POLICY_VERSION,
        consent_updated_at: consentTimestamp,
      },
    },
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  if (authData.user?.id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient()
    await persistLegalConsentBundle({
      supabase: admin,
      userId: authData.user.id,
      role: isAppRole(role) ? role : 'unknown',
      acceptedAt: consentTimestamp,
      policyVersion: LEGAL_POLICY_VERSION,
      source: 'signup',
      userAgent,
      requestIp,
      termsAccepted: termsPrivacyConsent,
      privacyAccepted: termsPrivacyConsent,
      medicalDisclaimerAccepted: medicalDisclaimerConsent,
      dataProcessingAccepted: dataProcessingConsent,
      aiDecisionSupportAccepted: aiAcknowledgementConsent,
      marketingAccepted: marketingConsent,
      metadata: {
        flow: 'signup',
      },
    })
  }

  revalidatePath('/', 'layout')
  
  if (authData.session) {
    if (isAppRole(role)) {
      redirect(getRoleOnboardingRoute(role))
    } else {
      redirect('/athlete/onboarding') // Fallback
    }
  } else {
    redirect('/verify-email')
  }
}

export async function verifyLockerCode(code: string) {
  const supabase = await createClient()

  const coach = await findCoachByLockerCode(supabase, code)
  if (!coach) {
    return { success: false, error: 'Invalid coach code' }
  }

  return { 
    success: true, 
    coach: {
      id: coach.id,
      name: coach.full_name,
    }
  }
}
