import { z } from 'zod'

import type { ResearchBundleStrength, ResearchDomain, ResearchSourceKey } from '@/lib/research/taxonomy'

export const RESEARCH_SOURCE_PRIORITY: readonly ResearchSourceKey[] = [
  'europe_pmc',
  'crossref',
  'pubmed',
  'openalex',
  'semantic_scholar',
] as const

export const RESEARCH_SOURCE_DEFAULTS: Record<
  ResearchSourceKey,
  {
    baseUrl: string
    sourceType: 'metadata_api' | 'fulltext_api' | 'enrichment_api'
    pageSize: number
    retryAttempts: number
    minIntervalMs: number
  }
> = {
  pubmed: {
    baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
    sourceType: 'metadata_api',
    pageSize: 25,
    retryAttempts: 3,
    minIntervalMs: 350,
  },
  crossref: {
    baseUrl: 'https://api.crossref.org',
    sourceType: 'metadata_api',
    pageSize: 20,
    retryAttempts: 3,
    minIntervalMs: 250,
  },
  europe_pmc: {
    baseUrl: 'https://www.ebi.ac.uk/europepmc/webservices/rest',
    sourceType: 'fulltext_api',
    pageSize: 25,
    retryAttempts: 3,
    minIntervalMs: 250,
  },
  openalex: {
    baseUrl: 'https://api.openalex.org',
    sourceType: 'enrichment_api',
    pageSize: 25,
    retryAttempts: 3,
    minIntervalMs: 300,
  },
  semantic_scholar: {
    baseUrl: 'https://api.semanticscholar.org/graph/v1',
    sourceType: 'enrichment_api',
    pageSize: 10,
    retryAttempts: 2,
    minIntervalMs: 500,
  },
}

export const RESEARCH_DEFAULT_QUERY =
  '("sleep" OR "HRV" OR "training load" OR "fatigue" OR "hydration" OR "recovery") AND ("athlete" OR "football" OR "cricket" OR "sport")'

export const RESEARCH_QUEUE_NAMES = {
  sync: 'research-sync',
  parse: 'research-parse',
  score: 'research-score',
  bundle: 'research-bundle',
  publish: 'research-publish',
} as const

export const RESEARCH_RULE_PRIORITY: Record<ResearchDomain, number> = {
  illness: 100,
  injury: 95,
  fatigue: 85,
  readiness: 75,
  hydration: 65,
  recovery: 55,
}

export const RESEARCH_CONFIDENCE_BY_BUNDLE: Record<ResearchBundleStrength, number> = {
  insufficient: 0.15,
  limited: 0.45,
  moderate: 0.64,
  strong: 0.8,
  very_strong: 0.92,
}

export const RESEARCH_SCORE_WEIGHTS = {
  studyType: 40,
  sampleSize: 15,
  recency: 15,
  sportMatch: 10,
  populationMatch: 10,
  replication: 10,
} as const

export const RESEARCH_STUDY_TYPE_WEIGHTS = {
  meta_analysis: 40,
  systematic_review: 38,
  rct: 34,
  cohort: 28,
  case_control: 24,
  cross_sectional: 20,
  guideline: 28,
  consensus_statement: 20,
  review: 16,
  narrative_review: 12,
  case_series: 10,
  qualitative: 8,
  mechanistic: 12,
  diagnostic_validation: 18,
  other: 10,
} as const

export const RESEARCH_RETRACTION_PENALTIES = {
  none: 0,
  corrected: 10,
  expression_of_concern: 25,
  retracted: 100,
} as const

export const RESEARCH_FULLTEXT_OPEN_LICENSE_PATTERNS = [
  /cc[- ]?by/i,
  /cc[- ]?0/i,
  /creative commons/i,
  /cc[- ]?by[- ]?sa/i,
  /cc[- ]?by[- ]?nc/i,
] as const

export const RESEARCH_FULLTEXT_LICENSED_PATTERNS = [
  /text and data mining/i,
  /reuse permitted/i,
  /licensed reuse/i,
  /publisher permitted/i,
] as const

export const RESEARCH_BUNDLE_TEMPLATES = [
  {
    bundleKey: 'fatigue_sleep_load_v1',
    title: 'Fatigue From Sleep And Load',
    domain: 'fatigue',
    summary: 'Low sleep plus acute loading signals elevate fatigue risk and reduce the quality of hard training days.',
    applicablePopulation: 'elite_athletes',
    applicableSport: 'general',
    minPapersRequired: 2,
  },
  {
    bundleKey: 'readiness_hrv_soreness_mood_v1',
    title: 'Readiness From HRV, Soreness, And Mood',
    domain: 'readiness',
    summary: 'Downward recovery signals paired with soreness or low mood reduce readiness for high-quality work.',
    applicablePopulation: 'elite_athletes',
    applicableSport: 'general',
    minPapersRequired: 2,
  },
  {
    bundleKey: 'hydration_status_performance_v1',
    title: 'Hydration And Performance',
    domain: 'hydration',
    summary: 'Hydration shortfalls reduce performance quality and increase the need for rehydration before demanding work.',
    applicablePopulation: 'general_adults',
    applicableSport: 'general',
    minPapersRequired: 2,
  },
  {
    bundleKey: 'illness_recovery_redflags_v1',
    title: 'Illness Recovery Red Flags',
    domain: 'illness',
    summary: 'Illness markers combined with poor recovery call for conservative training decisions and watchful follow-up.',
    applicablePopulation: 'general_adults',
    applicableSport: 'general',
    minPapersRequired: 2,
  },
  {
    bundleKey: 'injury_risk_load_spike_v1',
    title: 'Injury Risk From Load Spikes',
    domain: 'injury',
    summary: 'Acute loading spikes above baseline raise injury risk and justify conservative adjustments.',
    applicablePopulation: 'elite_athletes',
    applicableSport: 'general',
    minPapersRequired: 2,
  },
] as const satisfies Array<{
  bundleKey: string
  title: string
  domain: ResearchDomain
  summary: string
  applicablePopulation: string
  applicableSport: string
  minPapersRequired: number
}>

const researchEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required for research intelligence.'),
  RESEARCH_INTERNAL_API_TOKEN: z.string().min(1).optional(),
  RESEARCH_REDIS_URL: z.string().url().optional(),
  RESEARCH_OPENALEX_API_KEY: z.string().min(1).optional(),
  RESEARCH_SEMANTIC_SCHOLAR_API_KEY: z.string().min(1).optional(),
  RESEARCH_ENABLE_OPENALEX: z.enum(['true', 'false']).optional(),
  RESEARCH_ENABLE_SEMANTIC_SCHOLAR: z.enum(['true', 'false']).optional(),
  RESEARCH_ENABLE_SEMANTIC_RETRIEVAL: z.enum(['true', 'false']).optional(),
  RESEARCH_CONTACT_EMAIL: z.string().email().optional(),
  RESEARCH_PUBMED_QUERY: z.string().min(1).optional(),
})

export type ResearchEnv = z.infer<typeof researchEnvSchema>

export function getResearchEnv() {
  return researchEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    RESEARCH_INTERNAL_API_TOKEN: process.env.RESEARCH_INTERNAL_API_TOKEN,
    RESEARCH_REDIS_URL: process.env.RESEARCH_REDIS_URL,
    RESEARCH_OPENALEX_API_KEY: process.env.RESEARCH_OPENALEX_API_KEY,
    RESEARCH_SEMANTIC_SCHOLAR_API_KEY: process.env.RESEARCH_SEMANTIC_SCHOLAR_API_KEY,
    RESEARCH_ENABLE_OPENALEX: process.env.RESEARCH_ENABLE_OPENALEX,
    RESEARCH_ENABLE_SEMANTIC_SCHOLAR: process.env.RESEARCH_ENABLE_SEMANTIC_SCHOLAR,
    RESEARCH_ENABLE_SEMANTIC_RETRIEVAL: process.env.RESEARCH_ENABLE_SEMANTIC_RETRIEVAL,
    RESEARCH_CONTACT_EMAIL: process.env.RESEARCH_CONTACT_EMAIL,
    RESEARCH_PUBMED_QUERY: process.env.RESEARCH_PUBMED_QUERY,
  })
}

export function isOpenAlexEnabled() {
  return process.env.RESEARCH_ENABLE_OPENALEX === 'true'
}

export function isSemanticScholarEnabled() {
  return process.env.RESEARCH_ENABLE_SEMANTIC_SCHOLAR === 'true'
}

export function isSemanticRetrievalEnabled() {
  return process.env.RESEARCH_ENABLE_SEMANTIC_RETRIEVAL === 'true'
}

export function getResearchQueryOverride() {
  return process.env.RESEARCH_PUBMED_QUERY?.trim() || RESEARCH_DEFAULT_QUERY
}
