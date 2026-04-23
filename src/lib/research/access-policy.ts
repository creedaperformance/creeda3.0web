import {
  RESEARCH_FULLTEXT_LICENSED_PATTERNS,
  RESEARCH_FULLTEXT_OPEN_LICENSE_PATTERNS,
} from '@/lib/research/config'
import type { AccessPolicyDecision } from '@/lib/research/types'

type AccessPolicyArgs = {
  sourceKey: string
  isOpenAccess?: boolean | null
  license?: string | null
  fullTextUrl?: string | null
  pdfUrl?: string | null
}

function normalizeLicense(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null
}

function matchesPattern(patterns: readonly RegExp[], value: string | null) {
  if (!value) return false
  return patterns.some((pattern) => pattern.test(value))
}

export function resolveAccessPolicy(args: AccessPolicyArgs): AccessPolicyDecision {
  const normalizedLicense = normalizeLicense(args.license)
  const hasFullTextPointer = Boolean(args.fullTextUrl || args.pdfUrl)
  const openLicense = matchesPattern(RESEARCH_FULLTEXT_OPEN_LICENSE_PATTERNS, normalizedLicense)
  const licensedReuse = matchesPattern(RESEARCH_FULLTEXT_LICENSED_PATTERNS, normalizedLicense)

  if ((args.isOpenAccess && openLicense) || (args.sourceKey === 'europe_pmc' && args.isOpenAccess && hasFullTextPointer)) {
    return {
      accessPolicy: 'open_access_fulltext_allowed',
      reason: 'open_access_license_detected',
      isFullTextAllowed: true,
      canStorePassage: true,
      audit: {
        sourceKey: args.sourceKey,
        isOpenAccess: Boolean(args.isOpenAccess),
        license: normalizedLicense,
        hasFullTextPointer,
      },
    }
  }

  if (licensedReuse && hasFullTextPointer) {
    return {
      accessPolicy: 'licensed_fulltext_allowed',
      reason: 'explicit_reuse_license_detected',
      isFullTextAllowed: true,
      canStorePassage: true,
      audit: {
        sourceKey: args.sourceKey,
        isOpenAccess: Boolean(args.isOpenAccess),
        license: normalizedLicense,
        hasFullTextPointer,
      },
    }
  }

  if (hasFullTextPointer) {
    return {
      accessPolicy: 'blocked_fulltext',
      reason: 'fulltext_present_without_reuse_rights',
      isFullTextAllowed: false,
      canStorePassage: false,
      audit: {
        sourceKey: args.sourceKey,
        isOpenAccess: Boolean(args.isOpenAccess),
        license: normalizedLicense,
        hasFullTextPointer,
      },
    }
  }

  return {
    accessPolicy: 'metadata_only',
    reason: 'metadata_only_no_permitted_fulltext',
    isFullTextAllowed: false,
    canStorePassage: false,
    audit: {
      sourceKey: args.sourceKey,
      isOpenAccess: Boolean(args.isOpenAccess),
      license: normalizedLicense,
      hasFullTextPointer,
    },
  }
}

export function isFullTextAllowed(decision: Pick<AccessPolicyDecision, 'accessPolicy' | 'isFullTextAllowed'>) {
  return decision.isFullTextAllowed || decision.accessPolicy === 'open_access_fulltext_allowed' || decision.accessPolicy === 'licensed_fulltext_allowed'
}

export function canStorePassage(decision: Pick<AccessPolicyDecision, 'canStorePassage'>) {
  return Boolean(decision.canStorePassage)
}
