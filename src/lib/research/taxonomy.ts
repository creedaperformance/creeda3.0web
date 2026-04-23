const metricKeys = [
  'sleep_duration',
  'sleep_quality',
  'hrv',
  'acute_load',
  'chronic_load',
  'acute_chronic_ratio',
  'soreness',
  'mood',
  'hydration_status',
  'illness_flag',
  'fatigue_risk',
  'readiness',
  'sprint_performance',
  'injury_risk',
  'recovery_quality',
  'performance_reduction',
  'training_tolerance',
  'wellness',
] as const

const comparatorKeys = [
  'lt_6h',
  'downward_trend',
  'high',
  'low',
  'rising',
  'falling',
  'spike_above_baseline',
  'present',
  'absent',
  'poor',
  'low_target',
  'reduced',
  'elevated',
  'lte_neg_8_pct',
  'baseline',
  'mixed',
  'unknown',
  'dehydrated',
] as const

const sports = [
  'general',
  'football',
  'cricket',
  'basketball',
  'badminton',
  'athletics',
  'hockey',
  'kabaddi',
  'rugby',
  'tennis',
  'swimming',
  'cycling',
  'combat',
  'mixed',
  'other',
] as const

const ageGroups = ['youth', 'adult', 'masters', 'mixed', 'unknown'] as const
const populations = [
  'elite_athletes',
  'youth_athletes',
  'general_adults',
  'recreational_athletes',
  'clinical_rehab',
  'female_athletes',
  'male_athletes',
  'indian_athletes',
  'mixed',
  'other',
] as const
const studyTypes = [
  'meta_analysis',
  'systematic_review',
  'rct',
  'cohort',
  'case_control',
  'cross_sectional',
  'review',
  'narrative_review',
  'consensus_statement',
  'guideline',
  'case_series',
  'qualitative',
  'mechanistic',
  'diagnostic_validation',
  'other',
] as const
const sexGroups = ['male', 'female', 'mixed', 'unknown'] as const
const sourceKeys = ['pubmed', 'crossref', 'europe_pmc', 'openalex', 'semantic_scholar'] as const
const domains = ['fatigue', 'readiness', 'hydration', 'injury', 'recovery', 'illness'] as const
const findingTypes = ['association', 'threshold', 'intervention_effect', 'risk_factor', 'prediction'] as const
const findingDirections = ['increases', 'decreases', 'mixed', 'neutral'] as const
const tagTypes = ['metric', 'outcome', 'intervention', 'sport', 'body_system', 'risk', 'population'] as const
const ingestionStatuses = ['raw', 'normalized', 'parsed', 'reviewed', 'rejected'] as const
const accessPolicies = ['metadata_only', 'open_access_fulltext_allowed', 'licensed_fulltext_allowed', 'blocked_fulltext'] as const
const retractionStatuses = ['none', 'corrected', 'retracted', 'expression_of_concern'] as const
const bundleStatuses = ['draft', 'approved', 'deprecated'] as const
const ruleStatuses = ['draft', 'approved', 'disabled'] as const
const bundleStrengths = ['insufficient', 'limited', 'moderate', 'strong', 'very_strong'] as const
const evidenceLevels = ['excluded', 'very_low', 'low', 'moderate', 'high', 'very_high'] as const

export type ResearchMetricKey = (typeof metricKeys)[number]
export type ResearchComparatorKey = (typeof comparatorKeys)[number]
export type ResearchSport = (typeof sports)[number]
export type ResearchAgeGroup = (typeof ageGroups)[number]
export type ResearchPopulation = (typeof populations)[number]
export type ResearchStudyType = (typeof studyTypes)[number]
export type ResearchSexGroup = (typeof sexGroups)[number]
export type ResearchSourceKey = (typeof sourceKeys)[number]
export type ResearchDomain = (typeof domains)[number]
export type ResearchFindingType = (typeof findingTypes)[number]
export type ResearchFindingDirection = (typeof findingDirections)[number]
export type ResearchTagType = (typeof tagTypes)[number]
export type ResearchIngestionStatus = (typeof ingestionStatuses)[number]
export type ResearchAccessPolicy = (typeof accessPolicies)[number]
export type ResearchRetractionStatus = (typeof retractionStatuses)[number]
export type ResearchBundleStatus = (typeof bundleStatuses)[number]
export type ResearchRuleStatus = (typeof ruleStatuses)[number]
export type ResearchBundleStrength = (typeof bundleStrengths)[number]
export type ResearchEvidenceLevel = (typeof evidenceLevels)[number]

export const researchMetricKeys = [...metricKeys]
export const researchComparatorKeys = [...comparatorKeys]
export const researchSports = [...sports]
export const researchAgeGroups = [...ageGroups]
export const researchPopulations = [...populations]
export const researchStudyTypes = [...studyTypes]
export const researchSexGroups = [...sexGroups]
export const researchSourceKeys = [...sourceKeys]
export const researchDomains = [...domains]
export const researchFindingTypes = [...findingTypes]
export const researchFindingDirections = [...findingDirections]
export const researchTagTypes = [...tagTypes]
export const researchIngestionStatuses = [...ingestionStatuses]
export const researchAccessPolicies = [...accessPolicies]
export const researchRetractionStatuses = [...retractionStatuses]
export const researchBundleStatuses = [...bundleStatuses]
export const researchRuleStatuses = [...ruleStatuses]
export const researchBundleStrengths = [...bundleStrengths]
export const researchEvidenceLevels = [...evidenceLevels]

export const normalizationDictionary = {
  metrics: {
    hrv: ['heart rate variability', 'hrv', 'vagal indices', 'vagal index'],
    sleep_duration: ['sleep duration', 'time in bed', 'total sleep time', 'sleep hours', 'sleep'],
    sleep_quality: ['sleep quality', 'sleep efficiency', 'sleep disturbance'],
    acute_load: ['training load', 'session load', 'acute load', 'weekly load'],
    chronic_load: ['chronic load', 'rolling load', 'baseline load'],
    acute_chronic_ratio: ['acute chronic ratio', 'acute:chronic workload ratio', 'acwr'],
    readiness: ['readiness', 'preparedness', 'training readiness'],
    fatigue_risk: ['neuromuscular fatigue', 'fatigue risk', 'fatigue build-up'],
    performance_reduction: ['performance decrement', 'performance reduction', 'reduced performance'],
    sprint_performance: ['sprint performance', 'sprint output', 'sprint ability'],
    injury_risk: ['injury risk', 'injury likelihood', 'injury incidence'],
    hydration_status: ['hydration status', 'dehydration', 'dehydrated', 'hypohydration', 'fluid deficit'],
    soreness: ['soreness', 'muscle soreness', 'doms'],
    mood: ['mood', 'mood state', 'affect'],
    recovery_quality: ['recovery', 'recovery quality', 'recovery status'],
    illness_flag: ['illness', 'illness flag', 'symptom flag', 'upper respiratory symptoms'],
    training_tolerance: ['training tolerance', 'session tolerance'],
    wellness: ['wellness', 'well-being', 'wellbeing'],
  },
  comparators: {
    lt_6h: ['<6h', 'under 6 h', 'less than 6 h', 'below 6 h', 'under six hours'],
    downward_trend: ['downward trend', 'decline from baseline', 'reduced from baseline', 'falling trend'],
    high: ['high', 'elevated', 'greater', 'large'],
    low: ['low', 'reduced', 'suppressed'],
    rising: ['rising', 'upward trend', 'increasing'],
    falling: ['falling', 'declining'],
    spike_above_baseline: ['load spike', 'spike above baseline', 'acute spike', 'workload spike'],
    present: ['present', 'true', 'detected'],
    absent: ['absent', 'false', 'not present'],
    poor: ['poor', 'suboptimal', 'below target'],
    low_target: ['below target', 'low target', 'under target'],
    reduced: ['reduced', 'lower'],
    elevated: ['elevated', 'increased'],
    lte_neg_8_pct: ['<= -8%', 'drop of at least 8%', '8% decrease'],
    baseline: ['baseline', 'usual'],
    mixed: ['mixed'],
    dehydrated: ['dehydrated', 'hypohydrated'],
  },
  sports: {
    cricket: ['cricket', 'bowler', 'batter', 'wicketkeeper', 'ipl'],
    football: ['football', 'soccer'],
    basketball: ['basketball'],
    badminton: ['badminton'],
    athletics: ['athletics', 'track', 'running', 'sprinter'],
    hockey: ['hockey', 'field hockey'],
    kabaddi: ['kabaddi'],
    rugby: ['rugby'],
    tennis: ['tennis'],
    swimming: ['swimming'],
    cycling: ['cycling'],
    combat: ['combat', 'boxing', 'wrestling', 'mma', 'judo'],
    general: ['athlete', 'sport', 'sports', 'team sport'],
  },
  ageGroups: {
    youth: ['youth', 'junior', 'adolescent', 'teen'],
    adult: ['adult', 'college age', 'senior player'],
    masters: ['masters', 'older athlete'],
    mixed: ['mixed ages', 'mixed'],
  },
  populations: {
    elite_athletes: ['elite athletes', 'professional athletes', 'high-performance athletes'],
    youth_athletes: ['youth athletes', 'adolescent athletes', 'junior athletes'],
    general_adults: ['general adults', 'healthy adults', 'adults'],
    recreational_athletes: ['recreational athletes', 'amateur athletes'],
    clinical_rehab: ['rehabilitation', 'clinical', 'return to sport'],
    female_athletes: ['female athletes', 'women athletes'],
    male_athletes: ['male athletes', 'men athletes'],
    indian_athletes: ['indian athletes', 'india', 'indian sport'],
    mixed: ['mixed cohort', 'mixed population'],
  },
  studyTypes: {
    meta_analysis: ['meta-analysis', 'meta analysis'],
    systematic_review: ['systematic review'],
    rct: ['randomized controlled trial', 'randomised controlled trial', 'rct'],
    cohort: ['cohort'],
    case_control: ['case-control', 'case control'],
    cross_sectional: ['cross-sectional', 'cross sectional'],
    review: ['review article', 'review'],
    narrative_review: ['narrative review'],
    consensus_statement: ['consensus statement', 'position stand'],
    guideline: ['guideline', 'consensus guideline'],
    case_series: ['case series'],
    qualitative: ['qualitative'],
    mechanistic: ['mechanistic'],
    diagnostic_validation: ['validation study', 'diagnostic validation'],
  },
} as const

type NormalizationTableValue = Partial<Record<string, readonly string[]>>

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function exactOrContainedMatch(
  table: NormalizationTableValue,
  value: string
) {
  const normalized = normalizeToken(value)
  if (!normalized) return null

  for (const [canonical, aliases] of Object.entries(table)) {
    const allCandidates = [canonical, ...(aliases || [])]
    if (
      allCandidates.some((candidate) => {
        const normalizedCandidate = normalizeToken(candidate)
        return (
          normalized === normalizedCandidate ||
          normalized.includes(normalizedCandidate) ||
          normalizedCandidate.includes(normalized)
        )
      })
    ) {
      return canonical
    }
  }

  return null
}

export function normalizeMetric(value: string, context?: { preferOutcome?: boolean }) {
  const normalized = exactOrContainedMatch(normalizationDictionary.metrics, value)
  if (!normalized) return null
  if (normalized === 'fatigue_risk' && context?.preferOutcome && /performance decrement|reduced performance/i.test(value)) {
    return 'performance_reduction'
  }
  return normalized as ResearchMetricKey
}

export function normalizeComparator(value: string) {
  const normalized = exactOrContainedMatch(normalizationDictionary.comparators, value)
  return (normalized || null) as ResearchComparatorKey | null
}

export function normalizeSport(value: string) {
  const normalized = exactOrContainedMatch(normalizationDictionary.sports, value)
  return (normalized || null) as ResearchSport | null
}

export function normalizeAgeGroup(value: string) {
  const normalized = exactOrContainedMatch(normalizationDictionary.ageGroups, value)
  return (normalized || null) as ResearchAgeGroup | null
}

export function normalizePopulation(value: string) {
  const normalized = exactOrContainedMatch(normalizationDictionary.populations, value)
  return (normalized || null) as ResearchPopulation | null
}

export function normalizeStudyType(value: string) {
  const normalized = exactOrContainedMatch(normalizationDictionary.studyTypes, value)
  return (normalized || null) as ResearchStudyType | null
}

export function normalizeSexGroup(value: string): ResearchSexGroup | null {
  const token = normalizeToken(value)
  if (!token) return null
  if (token.includes('female') || token.includes('women')) return 'female'
  if (token.includes('male') || token.includes('men')) return 'male'
  if (token.includes('mixed')) return 'mixed'
  return 'unknown'
}

export function parseHours(value: string) {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

export function parsePercentage(value: string) {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*%/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

export function parseSampleSize(value: string) {
  const match = value.match(/\b(?:n\s*=\s*|sample size\s*[:=]?\s*)(\d{1,5})\b/i)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

export function inferComparatorFromSentence(sentence: string): ResearchComparatorKey | null {
  const hours = parseHours(sentence)
  if (hours !== null && hours < 6) return 'lt_6h'

  const pct = parsePercentage(sentence)
  if (pct !== null && pct <= -8) return 'lte_neg_8_pct'

  const normalized = normalizeComparator(sentence)
  if (normalized) return normalized

  if (/dehydrat|hypohydrat/i.test(sentence)) return 'dehydrated'
  if (/illness|symptom|sick/i.test(sentence)) return 'present'
  return null
}

export function ensureKnownMetric(value: string, context?: { preferOutcome?: boolean }) {
  return normalizeMetric(value, context)
}
