import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

import {
  CONSENT_KEYS,
  type LegalConsentKey,
  LEGAL_DOC_PATHS,
  LEGAL_POLICY_VERSION,
} from '@/lib/legal/constants'

type SupportedRole = 'athlete' | 'coach' | 'individual' | 'unknown'
type ConsentSource = 'signup' | 'onboarding' | 'settings' | 'api' | 'admin' | 'app'

type ConsentBundleArgs = {
  supabase: SupabaseClient
  userId: string
  role: SupportedRole
  acceptedAt?: string
  policyVersion?: string
  source?: ConsentSource
  userAgent?: string | null
  requestIp?: string | null
  termsAccepted: boolean
  privacyAccepted: boolean
  medicalDisclaimerAccepted: boolean
  dataProcessingAccepted: boolean
  aiDecisionSupportAccepted: boolean
  marketingAccepted?: boolean
  guardianConsentAccepted?: boolean
  metadata?: Record<string, unknown>
}

type ConsentEventArgs = {
  supabase: SupabaseClient
  userId: string
  role: SupportedRole
  consentKey: LegalConsentKey
  accepted: boolean
  source?: ConsentSource
  policyVersion?: string
  userAgent?: string | null
  requestIp?: string | null
  metadata?: Record<string, unknown>
}

function isMissingLegalInfraError(error: PostgrestError | null): boolean {
  if (!error) return false
  const code = String(error.code || '').toLowerCase()
  const message = String(error.message || '').toLowerCase()
  return (
    code === '42p01' ||
    code === '42703' ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('column')
  )
}

function consentDocumentPath(consentKey: LegalConsentKey): string {
  if (consentKey === CONSENT_KEYS.termsOfService) return LEGAL_DOC_PATHS.terms
  if (consentKey === CONSENT_KEYS.privacyPolicy) return LEGAL_DOC_PATHS.privacy
  if (consentKey === CONSENT_KEYS.medicalDisclaimer) return LEGAL_DOC_PATHS.disclaimer
  if (consentKey === CONSENT_KEYS.dataProcessing) return LEGAL_DOC_PATHS.privacy
  if (consentKey === CONSENT_KEYS.aiDecisionSupport) return LEGAL_DOC_PATHS.aiTransparency
  if (consentKey === CONSENT_KEYS.guardianConsent) return LEGAL_DOC_PATHS.consent
  return LEGAL_DOC_PATHS.consent
}

function toLegalEventRow(args: {
  userId: string
  role: SupportedRole
  consentKey: LegalConsentKey
  accepted: boolean
  source: ConsentSource
  policyVersion: string
  timestamp: string
  userAgent?: string | null
  requestIp?: string | null
  metadata?: Record<string, unknown>
}) {
  return {
    user_id: args.userId,
    role: args.role,
    consent_key: args.consentKey,
    accepted: args.accepted,
    policy_version: args.policyVersion,
    policy_document_path: consentDocumentPath(args.consentKey),
    lawful_basis: 'consent',
    jurisdiction: 'global',
    source: args.source,
    request_ip: args.requestIp || null,
    user_agent: args.userAgent || null,
    metadata: args.metadata || {},
    effective_at: args.timestamp,
  }
}

export async function persistSingleLegalConsentEvent(args: ConsentEventArgs) {
  const timestamp = new Date().toISOString()
  const source = args.source || 'app'
  const policyVersion = args.policyVersion || LEGAL_POLICY_VERSION

  const { error } = await args.supabase.from('user_legal_consents').insert(
    toLegalEventRow({
      userId: args.userId,
      role: args.role,
      consentKey: args.consentKey,
      accepted: args.accepted,
      source,
      policyVersion,
      timestamp,
      userAgent: args.userAgent,
      requestIp: args.requestIp,
      metadata: args.metadata,
    })
  )

  if (error && !isMissingLegalInfraError(error)) {
    console.error('[legal] failed to persist consent event', error)
  }
}

export async function persistLegalConsentBundle(args: ConsentBundleArgs) {
  const acceptedAt = args.acceptedAt || new Date().toISOString()
  const policyVersion = args.policyVersion || LEGAL_POLICY_VERSION
  const source = args.source || 'app'
  const marketingAccepted = Boolean(args.marketingAccepted)
  const guardianConsentAccepted = Boolean(args.guardianConsentAccepted)

  const profileUpdate: Record<string, unknown> = {
    legal_policy_version: policyVersion,
    privacy_policy_version: policyVersion,
    consent_policy_version: policyVersion,
    consent_updated_at: acceptedAt,
    marketing_consent: marketingAccepted,
    marketing_consent_at: marketingAccepted ? acceptedAt : null,
  }

  if (args.termsAccepted && args.privacyAccepted) {
    profileUpdate.legal_consent_at = acceptedAt
  }
  if (args.medicalDisclaimerAccepted) {
    profileUpdate.medical_disclaimer_accepted_at = acceptedAt
  }
  if (args.dataProcessingAccepted) {
    profileUpdate.data_processing_consent_at = acceptedAt
  }
  if (args.aiDecisionSupportAccepted) {
    profileUpdate.ai_acknowledgement_at = acceptedAt
  }
  if (guardianConsentAccepted) {
    profileUpdate.guardian_consent_confirmed = true
  }

  const { error: profileError } = await args.supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', args.userId)

  if (profileError && !isMissingLegalInfraError(profileError)) {
    console.error('[legal] failed to update profile consent snapshot', profileError)
  }

  const consentRows = [
    toLegalEventRow({
      userId: args.userId,
      role: args.role,
      consentKey: CONSENT_KEYS.termsOfService,
      accepted: args.termsAccepted,
      source,
      policyVersion,
      timestamp: acceptedAt,
      userAgent: args.userAgent,
      requestIp: args.requestIp,
      metadata: args.metadata,
    }),
    toLegalEventRow({
      userId: args.userId,
      role: args.role,
      consentKey: CONSENT_KEYS.privacyPolicy,
      accepted: args.privacyAccepted,
      source,
      policyVersion,
      timestamp: acceptedAt,
      userAgent: args.userAgent,
      requestIp: args.requestIp,
      metadata: args.metadata,
    }),
    toLegalEventRow({
      userId: args.userId,
      role: args.role,
      consentKey: CONSENT_KEYS.medicalDisclaimer,
      accepted: args.medicalDisclaimerAccepted,
      source,
      policyVersion,
      timestamp: acceptedAt,
      userAgent: args.userAgent,
      requestIp: args.requestIp,
      metadata: args.metadata,
    }),
    toLegalEventRow({
      userId: args.userId,
      role: args.role,
      consentKey: CONSENT_KEYS.dataProcessing,
      accepted: args.dataProcessingAccepted,
      source,
      policyVersion,
      timestamp: acceptedAt,
      userAgent: args.userAgent,
      requestIp: args.requestIp,
      metadata: args.metadata,
    }),
    toLegalEventRow({
      userId: args.userId,
      role: args.role,
      consentKey: CONSENT_KEYS.aiDecisionSupport,
      accepted: args.aiDecisionSupportAccepted,
      source,
      policyVersion,
      timestamp: acceptedAt,
      userAgent: args.userAgent,
      requestIp: args.requestIp,
      metadata: args.metadata,
    }),
    toLegalEventRow({
      userId: args.userId,
      role: args.role,
      consentKey: CONSENT_KEYS.marketingCommunications,
      accepted: marketingAccepted,
      source,
      policyVersion,
      timestamp: acceptedAt,
      userAgent: args.userAgent,
      requestIp: args.requestIp,
      metadata: args.metadata,
    }),
    ...(guardianConsentAccepted
      ? [
          toLegalEventRow({
            userId: args.userId,
            role: args.role,
            consentKey: CONSENT_KEYS.guardianConsent,
            accepted: true,
            source,
            policyVersion,
            timestamp: acceptedAt,
            userAgent: args.userAgent,
            requestIp: args.requestIp,
            metadata: args.metadata,
          }),
        ]
      : []),
  ]

  const { error: consentError } = await args.supabase.from('user_legal_consents').insert(consentRows)
  if (consentError && !isMissingLegalInfraError(consentError)) {
    console.error('[legal] failed to persist consent bundle', consentError)
  }
}

