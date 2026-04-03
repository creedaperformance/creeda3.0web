export const LEGAL_POLICY_VERSION = '2026.04.03'
export const LEGAL_LAST_UPDATED_LABEL = 'April 3, 2026'

export const CREEDA_LEGAL_ENTITY = 'CREEDA PERFORMANCE'
export const CREEDA_LEGAL_ENTITY_TYPE = 'Proprietorship'
export const CREEDA_OWNER_NAME = 'Kunal Jeetendra Varma'
export const CREEDA_REGISTERED_ADDRESS =
  '11, Rajshi Mansion, 4th Pasta Lane, Colaba, Mumbai - 400005, Maharashtra, India'
export const CREEDA_UDYAM_REGISTRATION_NUMBER = 'UDYAM-MH-19-0419703'
export const CREEDA_UDYAM_REGISTRATION_DATE = '05/03/2026'
export const CREEDA_SHOPS_ESTABLISHMENT_APPLICATION_ID = '891080299'
export const CREEDA_SHOPS_ESTABLISHMENT_NATURE = 'IT Software Development Office'
export const CREEDA_SUPPORT_EMAIL = 'creedaperformance@gmail.com'
export const CREEDA_PRIVACY_EMAIL = 'creedaperformance@gmail.com'
export const CREEDA_SUPPORT_PHONE = '+91 9769911923'
export const CREEDA_GRIEVANCE_OFFICER_NAME = 'Kunal Jeetendra Varma'
export const CREEDA_GRIEVANCE_OFFICER_DESIGNATION = 'Owner & Grievance Officer'
export const CREEDA_GRIEVANCE_RESPONSE_TIME = 'Within 7 business days'

export const CREEDA_SUBPROCESSORS = ['Supabase (backend infrastructure, database, and authentication)'] as const
export const CREEDA_DATA_HOSTING_REGIONS = {
  primary: 'India',
  secondary: 'Singapore',
  future: 'European Union (for GDPR users)',
} as const

export const CREEDA_SUPPORT_RESPONSE_TIMES = {
  freeUsers: '48-72 hours',
  premiumTeams: 'Within 24 hours',
  criticalIssues: '6-12 hours',
} as const

export const CREEDA_LEGAL_ENTITY_CLAUSE =
  'CREEDA PERFORMANCE, a proprietorship registered under applicable Indian laws, having its registered office at 11, Rajshi Mansion, 4th Pasta Lane, Colaba, Mumbai - 400005, Maharashtra, India (hereinafter referred to as "CREEDA", "we", "us", or "our").'

export const LEGAL_DOC_PATHS = {
  terms: '/terms',
  privacy: '/privacy',
  disclaimer: '/disclaimer',
  consent: '/consent',
  aiTransparency: '/ai-transparency',
  dataOwnership: '/data-ownership',
  sla: '/sla',
  security: '/security',
  cookies: '/cookies',
  refund: '/refund-policy',
} as const

export const LEGAL_POLICY_VERSIONS = {
  terms: LEGAL_POLICY_VERSION,
  privacy: LEGAL_POLICY_VERSION,
  disclaimer: LEGAL_POLICY_VERSION,
  consent: LEGAL_POLICY_VERSION,
  aiTransparency: LEGAL_POLICY_VERSION,
  dataOwnership: LEGAL_POLICY_VERSION,
  sla: LEGAL_POLICY_VERSION,
  security: LEGAL_POLICY_VERSION,
} as const

export const CORE_MEDICAL_DISCLAIMER =
  'CREEDA is a decision-support platform. It does not provide medical diagnosis, treatment, or emergency triage.'

export const CORE_DECISION_SUPPORT_NOTICE =
  'Use CREEDA guidance with qualified coach and clinician judgment, especially for pain, injury, illness, and return-to-play decisions.'

export const GDPR_RIGHTS = [
  'Access your personal data',
  'Correct inaccurate data',
  'Erase data (right to be forgotten, where applicable)',
  'Restrict processing',
  'Object to processing',
  'Data portability',
  'Withdraw consent',
] as const

export const DPDP_RIGHTS = [
  'Access summary of your personal data',
  'Correct and update personal data',
  'Erase personal data',
  'Withdraw consent',
  'Nominate a representative (where applicable)',
] as const

export const CONSENT_KEYS = {
  termsOfService: 'terms_of_service',
  privacyPolicy: 'privacy_policy',
  medicalDisclaimer: 'medical_disclaimer',
  dataProcessing: 'data_processing',
  aiDecisionSupport: 'ai_decision_support',
  guardianConsent: 'guardian_consent',
  marketingCommunications: 'marketing_communications',
} as const

export const DEFAULT_ROLE_LEGAL_PATHS = {
  athlete: '/athlete/legal',
  coach: '/coach/legal',
  individual: '/individual/legal',
} as const

export type AppRole = keyof typeof DEFAULT_ROLE_LEGAL_PATHS
export type LegalConsentKey = (typeof CONSENT_KEYS)[keyof typeof CONSENT_KEYS]
export type LegalDocumentKey = keyof typeof LEGAL_DOC_PATHS
