export type AcademyType = 'independent' | 'school' | 'college' | 'academy' | 'club' | 'federation'
export type AcademyAgeBand = 'mixed' | 'u12' | 'u14' | 'u16' | 'u18' | 'senior'
export type GuardianConsentStatus = 'unknown' | 'pending' | 'confirmed' | 'coach_confirmed' | 'declined'
export type ParentHandoffPreference = 'whatsapp' | 'email' | 'coach_led' | 'none'

export interface AcademyTeamProfile {
  academyName: string | null
  academyType: AcademyType | null
  academyCity: string | null
  ageBandFocus: AcademyAgeBand
  parentHandoffEnabled: boolean
  lowCostMode: boolean
}

export interface GuardianProfileSummary {
  athleteId: string
  guardianName: string | null
  guardianRelationship: string | null
  guardianPhone: string | null
  guardianEmail: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  consentStatus: GuardianConsentStatus
  handoffPreference: ParentHandoffPreference
  lastHandoffSentAt: string | null
  notes: string | null
  isComplete: boolean
  handoffReady: boolean
  statusLabel: string
  nextAction: string
}

function normalizeText(value: unknown) {
  const normalized = String(value || '').trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeAcademyType(value: unknown): AcademyType | null {
  const normalized = String(value || '').trim().toLowerCase()
  if (
    normalized === 'independent' ||
    normalized === 'school' ||
    normalized === 'college' ||
    normalized === 'academy' ||
    normalized === 'club' ||
    normalized === 'federation'
  ) {
    return normalized
  }
  return null
}

function normalizeAgeBand(value: unknown): AcademyAgeBand {
  const normalized = String(value || '').trim().toLowerCase()
  if (
    normalized === 'u12' ||
    normalized === 'u14' ||
    normalized === 'u16' ||
    normalized === 'u18' ||
    normalized === 'senior'
  ) {
    return normalized
  }
  return 'mixed'
}

function normalizeConsentStatus(
  value: unknown,
  guardianConsentConfirmed?: boolean | null
): GuardianConsentStatus {
  const normalized = String(value || '').trim().toLowerCase()
  if (
    normalized === 'unknown' ||
    normalized === 'pending' ||
    normalized === 'confirmed' ||
    normalized === 'coach_confirmed' ||
    normalized === 'declined'
  ) {
    return normalized
  }
  if (guardianConsentConfirmed) return 'coach_confirmed'
  return 'unknown'
}

function normalizeHandoffPreference(value: unknown): ParentHandoffPreference {
  const normalized = String(value || '').trim().toLowerCase()
  if (
    normalized === 'whatsapp' ||
    normalized === 'email' ||
    normalized === 'coach_led' ||
    normalized === 'none'
  ) {
    return normalized
  }
  return 'whatsapp'
}

export function calculateAgeFromDateOfBirth(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null
  const parsed = new Date(dateOfBirth)
  if (Number.isNaN(parsed.getTime())) return null

  const now = new Date()
  let age = now.getUTCFullYear() - parsed.getUTCFullYear()
  const monthDelta = now.getUTCMonth() - parsed.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < parsed.getUTCDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

export function isJuniorAthlete(dateOfBirth: string | null | undefined) {
  const age = calculateAgeFromDateOfBirth(dateOfBirth)
  return typeof age === 'number' ? age < 18 : false
}

export function createAcademyTeamProfile(record?: Record<string, unknown> | null): AcademyTeamProfile {
  return {
    academyName: normalizeText(record?.academy_name),
    academyType: normalizeAcademyType(record?.academy_type),
    academyCity: normalizeText(record?.academy_city),
    ageBandFocus: normalizeAgeBand(record?.age_band_focus),
    parentHandoffEnabled: Boolean(record?.parent_handoff_enabled),
    lowCostMode: record?.low_cost_mode === false ? false : true,
  }
}

export function createGuardianProfileSummary(args: {
  athleteId: string
  record?: Record<string, unknown> | null
  guardianConsentConfirmed?: boolean | null
}): GuardianProfileSummary {
  const guardianName = normalizeText(args.record?.guardian_name)
  const guardianRelationship = normalizeText(args.record?.guardian_relationship)
  const guardianPhone = normalizeText(args.record?.guardian_phone)
  const guardianEmail = normalizeText(args.record?.guardian_email)
  const emergencyContactName = normalizeText(args.record?.emergency_contact_name)
  const emergencyContactPhone = normalizeText(args.record?.emergency_contact_phone)
  const consentStatus = normalizeConsentStatus(
    args.record?.consent_status,
    args.guardianConsentConfirmed
  )
  const handoffPreference = normalizeHandoffPreference(args.record?.handoff_preference)
  const lastHandoffSentAt = normalizeText(args.record?.last_handoff_sent_at)
  const notes = normalizeText(args.record?.notes)

  const hasGuardianContact = Boolean(guardianPhone || guardianEmail)
  const hasEmergencyContact = Boolean(emergencyContactName && emergencyContactPhone)
  const isComplete = Boolean(guardianName && guardianRelationship && hasGuardianContact && hasEmergencyContact)
  const handoffReady =
    isComplete &&
    handoffPreference !== 'none' &&
    (consentStatus === 'confirmed' || consentStatus === 'coach_confirmed')

  let statusLabel = 'Guardian context missing'
  let nextAction =
    'Add guardian and emergency-contact details before using junior-athlete handoff workflows.'

  if (consentStatus === 'declined') {
    statusLabel = 'Guardian follow-up blocked'
    nextAction =
      'Do not use parent handoff until guardian consent is clarified by the athlete, family, or organization.'
  } else if (handoffReady) {
    statusLabel = lastHandoffSentAt ? 'Handoff ready and active' : 'Handoff ready'
    nextAction = lastHandoffSentAt
      ? 'Refresh the parent summary when the athlete’s plan, restrictions, or school/travel load changes.'
      : 'Coach can share a parent handoff summary now.'
  } else if (args.guardianConsentConfirmed || consentStatus === 'confirmed') {
    statusLabel = 'Consent present, contact incomplete'
    nextAction =
      'Guardian consent is recorded, but contact details still need to be completed for handoff and emergency clarity.'
  } else if (consentStatus === 'pending') {
    statusLabel = 'Guardian consent pending'
    nextAction =
      'Confirm guardian consent and add the best contact route before using junior-athlete workflows.'
  }

  return {
    athleteId: args.athleteId,
    guardianName,
    guardianRelationship,
    guardianPhone,
    guardianEmail,
    emergencyContactName,
    emergencyContactPhone,
    consentStatus,
    handoffPreference,
    lastHandoffSentAt,
    notes,
    isComplete,
    handoffReady,
    statusLabel,
    nextAction,
  }
}

export function buildParentHandoffMessage(args: {
  athleteName: string
  teamName: string
  academyName?: string | null
  sport?: string | null
  readinessLabel?: string | null
  nextAction?: string | null
  restrictions?: string[]
}) {
  const introSource = args.academyName || args.teamName
  const sportLine = args.sport ? `Sport focus: ${args.sport}.` : null
  const readinessLine = args.readinessLabel ? `Today in Creeda: ${args.readinessLabel}.` : null
  const actionLine = args.nextAction ? `Coach focus: ${args.nextAction}.` : null
  const restrictionsLine =
    args.restrictions && args.restrictions.length > 0
      ? `Restrictions right now: ${args.restrictions.join(', ')}.`
      : null

  return [
    `Hello, this is a Creeda parent handoff summary from ${introSource}.`,
    `${args.athleteName} is being tracked inside the daily performance and recovery workflow.`,
    sportLine,
    readinessLine,
    actionLine,
    restrictionsLine,
    'Please reply to the coach if there is illness, school stress, travel, fasting, sleep disruption, or anything else that changes the athlete’s day.',
  ]
    .filter(Boolean)
    .join(' ')
}
