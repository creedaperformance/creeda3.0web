import type {
  ResearchAccessPolicy,
  ResearchAgeGroup,
  ResearchBundleStatus,
  ResearchBundleStrength,
  ResearchComparatorKey,
  ResearchDomain,
  ResearchEvidenceLevel,
  ResearchFindingDirection,
  ResearchFindingType,
  ResearchIngestionStatus,
  ResearchMetricKey,
  ResearchPopulation,
  ResearchRetractionStatus,
  ResearchRuleStatus,
  ResearchSexGroup,
  ResearchSourceKey,
  ResearchSport,
  ResearchStudyType,
  ResearchTagType,
} from '@/lib/research/taxonomy'

export interface SourceAuthorRecord {
  name: string
  orcid?: string | null
  affiliation?: string | null
}

export interface SourceTagRecord {
  tagType: ResearchTagType
  tagValue: string
}

export interface SourcePaperRecord {
  sourceKey: ResearchSourceKey
  externalId: string
  sourceUrl?: string | null
  payloadJson: Record<string, unknown>
  identifiers: {
    doi?: string | null
    pmid?: string | null
    pmcid?: string | null
    openalexId?: string | null
    semanticScholarId?: string | null
  }
  title?: string | null
  abstract?: string | null
  publicationYear?: number | null
  publicationDate?: string | null
  journal?: string | null
  publisher?: string | null
  studyType?: ResearchStudyType | null
  population?: ResearchPopulation | null
  sport?: ResearchSport | null
  sexGroup?: ResearchSexGroup | null
  ageGroup?: ResearchAgeGroup | null
  sampleSize?: number | null
  isOpenAccess?: boolean | null
  license?: string | null
  fullTextUrl?: string | null
  pdfUrl?: string | null
  citationCount?: number | null
  referenceCount?: number | null
  retractionStatus?: ResearchRetractionStatus | null
  authors?: SourceAuthorRecord[]
  tags?: SourceTagRecord[]
}

export interface CanonicalPaperInput {
  doi?: string | null
  pmid?: string | null
  pmcid?: string | null
  openalexId?: string | null
  semanticScholarId?: string | null
  title: string
  abstract?: string | null
  publicationYear?: number | null
  publicationDate?: string | null
  journal?: string | null
  publisher?: string | null
  studyType?: ResearchStudyType | null
  population?: ResearchPopulation | null
  sport?: ResearchSport | null
  sexGroup?: ResearchSexGroup | null
  ageGroup?: ResearchAgeGroup | null
  sampleSize?: number | null
  isOpenAccess: boolean
  license?: string | null
  accessPolicy: ResearchAccessPolicy
  accessPolicyReason: string
  accessPolicyAuditJson: Record<string, unknown>
  fullTextUrl?: string | null
  pdfUrl?: string | null
  citationCount?: number | null
  referenceCount?: number | null
  retractionStatus: ResearchRetractionStatus
  qualityScore?: number | null
  evidenceLevel?: ResearchEvidenceLevel | null
  ingestionStatus: ResearchIngestionStatus
  authors: SourceAuthorRecord[]
  tags: SourceTagRecord[]
}

export interface FieldProvenanceRecord {
  fieldName: string
  sourceKey: ResearchSourceKey
  externalId: string
  value: string | null
  isSelected: boolean
}

export interface AccessPolicyDecision {
  accessPolicy: ResearchAccessPolicy
  reason: string
  isFullTextAllowed: boolean
  canStorePassage: boolean
  audit: Record<string, unknown>
}

export interface ResearchFindingInput {
  paperId: string
  findingType: ResearchFindingType
  subjectMetric: ResearchMetricKey
  comparator: ResearchComparatorKey
  outcomeMetric: ResearchMetricKey
  direction: ResearchFindingDirection
  effectSize?: string | null
  confidenceText?: string | null
  findingText: string
  extractionMethod: 'llm' | 'rules' | 'reviewer'
  isHumanVerified?: boolean
}

export interface EvidencePassageInput {
  paperId: string
  sectionName: string
  snippetText: string
  charStart: number
  charEnd: number
  licenseOk: boolean
}

export interface ParsingResult {
  findings: ResearchFindingInput[]
  passages: EvidencePassageInput[]
  rejected: Array<{
    reason: string
    sentence: string
  }>
}

export interface PaperScoreBreakdown {
  studyType: number
  sampleSize: number
  recency: number
  sportMatch: number
  populationMatch: number
  replication: number
  penalty: number
  total: number
}

export interface BundleComputationResult {
  bundleKey: string
  title: string
  domain: ResearchDomain
  summary: string
  applicablePopulation?: ResearchPopulation | null
  applicableSport?: ResearchSport | null
  minPapersRequired: number
  status: ResearchBundleStatus
  evidenceStrength: ResearchBundleStrength
  consistencyScore: number
  contradictionCount: number
  supportingPaperIds: string[]
  contributionWeights: Array<{
    paperId: string
    contributionWeight: number
  }>
}

export interface UserSignalsInput {
  sleep_hours?: number | null
  hrv_delta_pct?: number | null
  acute_load?: number | null
  chronic_load?: number | null
  soreness?: number | null
  mood?: number | null
  hydration_status?: 'low' | 'ok' | 'good' | 'dehydrated' | null
  illness_flag?: boolean | null
  sport?: ResearchSport | null
  age_group?: ResearchAgeGroup | null
  population?: ResearchPopulation | null
}

export interface RuleCondition {
  field:
    | 'sleep_hours'
    | 'hrv_delta_pct'
    | 'acute_load'
    | 'chronic_load'
    | 'acute_chronic_ratio'
    | 'soreness'
    | 'mood'
    | 'hydration_status'
    | 'illness_flag'
    | 'sport'
    | 'age_group'
    | 'population'
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq' | 'between' | 'in' | 'truthy' | 'falsy'
  value?: number | string | boolean
  values?: Array<number | string>
  min?: number
  max?: number
}

export interface DecisionRuleLogic {
  context?: {
    sports?: ResearchSport[]
    ageGroups?: ResearchAgeGroup[]
    populations?: ResearchPopulation[]
  }
  all?: RuleCondition[]
  any?: RuleCondition[]
  none?: RuleCondition[]
}

export interface DecisionRuleOutput {
  domain: ResearchDomain
  severity: 'low' | 'moderate' | 'high'
  headline: string
  body: string
  actions: string[]
  internalCode: string
}

export interface RankedRecommendation {
  ruleId: string
  ruleKey: string
  bundleId: string
  bundleKey: string
  domain: ResearchDomain
  severity: 'low' | 'moderate' | 'high'
  headline: string
  body: string
  actions: string[]
  confidence: number
  rank: number
}

export interface DecisionAuditPayload {
  userId: string
  ruleId: string
  bundleId: string
  inputSnapshot: Record<string, unknown>
  outputSnapshot: Record<string, unknown>
  engineConfidence: number
}

export interface SyncCheckpointValue {
  cursor?: string | null
  start?: number
  page?: number
  seenExternalIds?: string[]
  updatedAt?: string
}

export interface SourceSyncMetrics {
  fetched: number
  inserted: number
  updated: number
  duplicates: number
  checkpoint: SyncCheckpointValue
}

export interface QueueJobResult {
  ok: boolean
  message: string
  metrics?: Record<string, unknown>
}

export interface RuleRecord {
  id: string
  ruleKey: string
  bundleId: string
  bundleKey: string
  logic: DecisionRuleLogic
  output: DecisionRuleOutput
  status: ResearchRuleStatus
  domain: ResearchDomain
}
