import { canStorePassage } from '@/lib/research/access-policy'
import { findingSchema } from '@/lib/research/schemas'
import {
  ensureKnownMetric,
  inferComparatorFromSentence,
  parsePercentage,
} from '@/lib/research/taxonomy'
import type { AccessPolicyDecision, ParsingResult, ResearchFindingInput } from '@/lib/research/types'

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function extractDirection(sentence: string) {
  if (/increase|elevat|higher|greater|raise/i.test(sentence)) return 'increases' as const
  if (/decrease|reduc|lower|drop|impair|worse/i.test(sentence)) return 'decreases' as const
  if (/mixed/i.test(sentence)) return 'mixed' as const
  return 'neutral' as const
}

function extractOutcomeMetric(sentence: string) {
  const candidates = [
    'fatigue risk',
    'fatigue',
    'readiness',
    'sprint performance',
    'performance decrement',
    'injury risk',
    'recovery',
    'training tolerance',
    'wellness',
  ]

  for (const candidate of candidates) {
    const metric = ensureKnownMetric(candidate, { preferOutcome: true })
    if (metric && new RegExp(candidate.replace(/\s+/g, '\\s+'), 'i').test(sentence)) {
      return metric
    }
  }

  if (/performance/i.test(sentence)) return 'performance_reduction'
  return null
}

function inferFindingType(subjectMetric: string, outcomeMetric: string, sentence: string) {
  if (/predict/i.test(sentence)) return 'prediction' as const
  if (/intervention|program|supplement|protocol/i.test(sentence)) return 'intervention_effect' as const
  if (/risk/i.test(sentence) || outcomeMetric === 'injury_risk' || outcomeMetric === 'fatigue_risk') {
    return 'risk_factor' as const
  }
  if (/</.test(sentence) || /under|less than|more than|greater than/i.test(sentence)) {
    return 'threshold' as const
  }
  return 'association' as const
}

function inferConfidenceText(sentence: string) {
  const effect = sentence.match(/\bp\s*[<=>]\s*0\.\d+\b/i)
  if (effect) return effect[0]
  if (/strong evidence/i.test(sentence)) return 'strong evidence'
  if (/moderate evidence/i.test(sentence)) return 'moderate evidence'
  if (/low certainty/i.test(sentence)) return 'low certainty'
  return null
}

function inferEffectSize(sentence: string) {
  const percentage = parsePercentage(sentence)
  if (percentage !== null) return `${percentage}%`

  const ratio = sentence.match(/\b(?:or|rr|hr)\s*[=:]?\s*(\d+(?:\.\d+)?)\b/i)
  if (ratio) return ratio[0]

  return null
}

function extractCandidateFinding(paperId: string, sentence: string): ResearchFindingInput | null {
  const subjectCandidates = [
    'sleep duration',
    'hrv',
    'training load',
    'acute load',
    'acute:chronic workload ratio',
    'hydration status',
    'dehydration',
    'dehydrated',
    'soreness',
    'mood',
    'illness flag',
    'illness',
  ]

  const subjectMetric = subjectCandidates
    .map((candidate) => ensureKnownMetric(candidate))
    .find((metric, index) => metric && new RegExp(subjectCandidates[index].replace(/[:]/g, '[:]?').replace(/\s+/g, '\\s+'), 'i').test(sentence))

  if (!subjectMetric) return null

  const comparator = inferComparatorFromSentence(sentence)
  const outcomeMetric = extractOutcomeMetric(sentence)

  if (!comparator || !outcomeMetric) return null

  const direction = extractDirection(sentence)
  const findingType = inferFindingType(subjectMetric, outcomeMetric, sentence)
  const findingText = `${subjectMetric} ${comparator} -> ${outcomeMetric} ${direction}`

  const candidate: ResearchFindingInput = {
    paperId,
    findingType,
    subjectMetric,
    comparator,
    outcomeMetric,
    direction,
    effectSize: inferEffectSize(sentence),
    confidenceText: inferConfidenceText(sentence),
    findingText,
    extractionMethod: 'rules',
    isHumanVerified: false,
  }

  return validateFinding(candidate) ? candidate : null
}

export function validateFinding(finding: ResearchFindingInput) {
  return findingSchema.safeParse(finding).success
}

export function rejectMalformedFinding(sentence: string, reason: string) {
  return {
    sentence,
    reason,
  }
}

export function extractFindingsFromText(args: {
  paperId: string
  text: string
  sectionName: string
  accessDecision: AccessPolicyDecision
}): ParsingResult {
  const sentences = splitIntoSentences(args.text)
  const findings: ResearchFindingInput[] = []
  const passages: ParsingResult['passages'] = []
  const rejected: ParsingResult['rejected'] = []

  let cursor = 0
  for (const sentence of sentences) {
    const start = args.text.indexOf(sentence, cursor)
    const end = start + sentence.length
    cursor = end

    const finding = extractCandidateFinding(args.paperId, sentence)
    if (!finding) {
      rejected.push(rejectMalformedFinding(sentence, 'No deterministic taxonomy-aligned finding extracted.'))
      continue
    }

    findings.push(finding)
    if (canStorePassage(args.accessDecision)) {
      passages.push({
        paperId: args.paperId,
        sectionName: args.sectionName,
        snippetText: sentence,
        charStart: Math.max(0, start),
        charEnd: Math.max(start, end),
        licenseOk: true,
      })
    }
  }

  return {
    findings,
    passages,
    rejected,
  }
}

export function parseAbstract(args: {
  paperId: string
  abstractText: string
  accessDecision: AccessPolicyDecision
}) {
  return extractFindingsFromText({
    paperId: args.paperId,
    text: args.abstractText,
    sectionName: 'abstract',
    accessDecision: args.accessDecision,
  })
}

export function parseFullText(args: {
  paperId: string
  fullText: string
  accessDecision: AccessPolicyDecision
}) {
  const sections = args.fullText.split(/\n{2,}/).filter(Boolean)
  const aggregate: ParsingResult = {
    findings: [],
    passages: [],
    rejected: [],
  }

  sections.forEach((section, index) => {
    const parsed = extractFindingsFromText({
      paperId: args.paperId,
      text: section,
      sectionName: index === 0 ? 'full_text' : `section_${index + 1}`,
      accessDecision: args.accessDecision,
    })
    aggregate.findings.push(...parsed.findings)
    aggregate.passages.push(...parsed.passages)
    aggregate.rejected.push(...parsed.rejected)
  })

  return aggregate
}
