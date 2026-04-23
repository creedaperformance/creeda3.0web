import { RESEARCH_BUNDLE_TEMPLATES } from '@/lib/research/config'
import { evidenceBundleSchema } from '@/lib/research/schemas'
import { computeBundleStrength } from '@/lib/research/scoring'
import type { BundleComputationResult, ResearchFindingInput } from '@/lib/research/types'

type BundlePaper = {
  id: string
  qualityScore: number | null
}

function dominantDirection(findings: ResearchFindingInput[]) {
  const counts = new Map<string, number>()
  for (const finding of findings) {
    counts.set(finding.direction, (counts.get(finding.direction) || 0) + 1)
  }

  const entries = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])
  return entries[0] || ['neutral', 0]
}

export function computeBundleConsistency(findings: ResearchFindingInput[]) {
  if (findings.length === 0) {
    return {
      consistencyScore: 0,
      contradictionCount: 0,
    }
  }

  const [, dominantCount] = dominantDirection(findings)
  const contradictionCount = findings.length - dominantCount
  const consistencyScore = Math.max(0, dominantCount / findings.length - contradictionCount * 0.05)

  return {
    consistencyScore: Number(consistencyScore.toFixed(3)),
    contradictionCount,
  }
}

export function attachSupportingPapers(args: {
  papers: BundlePaper[]
  findings: ResearchFindingInput[]
}) {
  const scoreByPaper = new Map<string, number>()
  for (const paper of args.papers) {
    scoreByPaper.set(paper.id, paper.qualityScore || 0)
  }

  const contributionWeights = Array.from(
    args.findings.reduce((map, finding) => {
      map.set(finding.paperId, (map.get(finding.paperId) || 0) + 1)
      return map
    }, new Map<string, number>())
  ).map(([paperId, count]) => ({
    paperId,
    contributionWeight: Number((count + (scoreByPaper.get(paperId) || 0) / 100).toFixed(3)),
  }))

  return contributionWeights.sort((left, right) => right.contributionWeight - left.contributionWeight)
}

export function buildEvidenceBundle(args: {
  bundleKey: string
  papers: BundlePaper[]
  findings: ResearchFindingInput[]
}) {
  const template = RESEARCH_BUNDLE_TEMPLATES.find((candidate) => candidate.bundleKey === args.bundleKey)
  if (!template) {
    throw new Error(`Unknown research evidence bundle template: ${args.bundleKey}`)
  }

  const matchedFindings = args.findings.filter((finding) => {
    if (template.domain === 'fatigue') {
      return finding.outcomeMetric === 'fatigue_risk'
    }
    if (template.domain === 'readiness') {
      return finding.outcomeMetric === 'readiness'
    }
    if (template.domain === 'hydration') {
      return finding.subjectMetric === 'hydration_status'
    }
    if (template.domain === 'illness') {
      return finding.subjectMetric === 'illness_flag'
    }
    if (template.domain === 'injury') {
      return finding.outcomeMetric === 'injury_risk'
    }
    return finding.outcomeMetric === 'recovery_quality'
  })

  const supportingPaperIds = Array.from(new Set(matchedFindings.map((finding) => finding.paperId)))
  const relevantPapers = args.papers.filter((paper) => supportingPaperIds.includes(paper.id))
  const { consistencyScore, contradictionCount } = computeBundleConsistency(matchedFindings)
  const strength = computeBundleStrength({
    paperScores: relevantPapers.map((paper) => paper.qualityScore || 0),
    consistencyScore,
    contradictionCount,
  })
  const contributionWeights = attachSupportingPapers({
    papers: relevantPapers,
    findings: matchedFindings,
  })

  const bundle: BundleComputationResult = {
    bundleKey: template.bundleKey,
    title: template.title,
    domain: template.domain,
    summary: template.summary,
    applicablePopulation: template.applicablePopulation,
    applicableSport: template.applicableSport,
    minPapersRequired: template.minPapersRequired,
    status: 'draft',
    evidenceStrength: strength.evidenceStrength,
    consistencyScore,
    contradictionCount,
    supportingPaperIds,
    contributionWeights,
  }

  evidenceBundleSchema.parse(bundle)
  return bundle
}

export function approveBundle(bundle: BundleComputationResult) {
  if (bundle.supportingPaperIds.length < bundle.minPapersRequired) {
    throw new Error(`Bundle ${bundle.bundleKey} does not meet the minimum paper requirement.`)
  }
  if (bundle.evidenceStrength === 'insufficient') {
    throw new Error(`Bundle ${bundle.bundleKey} is not strong enough to approve.`)
  }

  return {
    ...bundle,
    status: 'approved' as const,
  }
}

export function deprecateBundle(bundle: BundleComputationResult) {
  return {
    ...bundle,
    status: 'deprecated' as const,
  }
}
