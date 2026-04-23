import { Prisma } from '@prisma/client'

import { buildEvidenceBundle } from '@/lib/research/bundles'
import { canonicalizePaper } from '@/lib/research/canonicalization'
import { getResearchPrismaClient } from '@/lib/research/prisma'
import { logResearchEvent } from '@/lib/research/logging'
import type { RuleRecord, SourcePaperRecord } from '@/lib/research/types'

export const starterPaperRecords: SourcePaperRecord[] = [
  {
    sourceKey: 'pubmed',
    externalId: 'seed-sleep-fatigue-2024',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/41227002/',
    payloadJson: { seed: true, topic: 'sleep-fatigue' },
    identifiers: { pmid: '41227002' },
    title: 'Sleep and athletic performance: recovery, readiness, and fatigue markers',
    abstract: 'Sleep duration under 6 h was associated with increased fatigue risk and reduced training quality in athletes.',
    publicationYear: 2024,
    publicationDate: '2024-01-01',
    journal: 'Sports Medicine Review',
    publisher: 'Seed Curation',
    studyType: 'systematic_review',
    population: 'elite_athletes',
    sport: 'general',
    sexGroup: 'mixed',
    ageGroup: 'adult',
    sampleSize: 420,
    isOpenAccess: true,
    license: 'CC-BY-4.0',
    fullTextUrl: 'https://example.org/open-access/sleep-fatigue',
    pdfUrl: null,
    citationCount: 38,
    referenceCount: 52,
    retractionStatus: 'none',
    authors: [{ name: 'Internal Seed Curation Team' }],
  },
  {
    sourceKey: 'pubmed',
    externalId: 'seed-hrv-readiness-2023',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/33388079/',
    payloadJson: { seed: true, topic: 'hrv-readiness' },
    identifiers: { pmid: '33388079' },
    title: 'Heart rate variability trends, soreness, and next-day readiness in competitive athletes',
    abstract: 'A downward trend in HRV and high soreness were linked to decreased readiness scores the following day.',
    publicationYear: 2023,
    publicationDate: '2023-01-01',
    journal: 'Journal of Applied Sports Science',
    publisher: 'Seed Curation',
    studyType: 'cohort',
    population: 'elite_athletes',
    sport: 'general',
    sexGroup: 'mixed',
    ageGroup: 'adult',
    sampleSize: 168,
    isOpenAccess: true,
    license: 'CC-BY-4.0',
    fullTextUrl: 'https://example.org/open-access/hrv-readiness',
    pdfUrl: null,
    citationCount: 25,
    referenceCount: 31,
    retractionStatus: 'none',
    authors: [{ name: 'Internal Seed Curation Team' }],
  },
  {
    sourceKey: 'europe_pmc',
    externalId: 'seed-hydration-performance-2022',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5753973/',
    payloadJson: { seed: true, topic: 'hydration-performance' },
    identifiers: { pmcid: 'PMC5753973' },
    title: 'Hydration status and repeated sprint performance in field athletes',
    abstract: 'Dehydrated athletes showed decreased sprint performance and slower repeat effort outputs.',
    publicationYear: 2022,
    publicationDate: '2022-01-01',
    journal: 'Performance Nutrition and Sport',
    publisher: 'Seed Curation',
    studyType: 'rct',
    population: 'elite_athletes',
    sport: 'football',
    sexGroup: 'mixed',
    ageGroup: 'adult',
    sampleSize: 82,
    isOpenAccess: true,
    license: 'CC-BY-4.0',
    fullTextUrl: 'https://example.org/open-access/hydration-performance',
    pdfUrl: null,
    citationCount: 18,
    referenceCount: 29,
    retractionStatus: 'none',
    authors: [{ name: 'Internal Seed Curation Team' }],
  },
  {
    sourceKey: 'crossref',
    externalId: 'seed-illness-recovery-2021',
    sourceUrl: 'https://doi.org/10.5555/illness-recovery-guidance',
    payloadJson: { seed: true, topic: 'illness-recovery' },
    identifiers: { doi: '10.5555/illness-recovery-guidance' },
    title: 'Illness symptoms, incomplete recovery, and training tolerance in athletes',
    abstract: 'When illness symptoms were present, recovery quality decreased and conservative training guidance improved tolerance.',
    publicationYear: 2021,
    publicationDate: '2021-01-01',
    journal: 'Clinical Sports Practice',
    publisher: 'Seed Curation',
    studyType: 'consensus_statement',
    population: 'general_adults',
    sport: 'general',
    sexGroup: 'mixed',
    ageGroup: 'adult',
    sampleSize: 120,
    isOpenAccess: false,
    license: null,
    fullTextUrl: null,
    pdfUrl: null,
    citationCount: 15,
    referenceCount: 24,
    retractionStatus: 'none',
    authors: [{ name: 'Internal Seed Curation Team' }],
  },
  {
    sourceKey: 'openalex',
    externalId: 'seed-load-injury-2020',
    sourceUrl: 'https://openalex.org/W1234567890',
    payloadJson: { seed: true, topic: 'load-injury' },
    identifiers: { openalexId: 'https://openalex.org/W1234567890' },
    title: 'Acute load spikes above chronic baseline and injury risk in team sport',
    abstract: 'An acute load spike above baseline was associated with increased injury risk during congested schedules.',
    publicationYear: 2020,
    publicationDate: '2020-01-01',
    journal: 'Team Sport Monitoring',
    publisher: 'Seed Curation',
    studyType: 'cohort',
    population: 'elite_athletes',
    sport: 'cricket',
    sexGroup: 'mixed',
    ageGroup: 'adult',
    sampleSize: 244,
    isOpenAccess: true,
    license: 'CC-BY-4.0',
    fullTextUrl: 'https://example.org/open-access/load-injury',
    pdfUrl: null,
    citationCount: 44,
    referenceCount: 37,
    retractionStatus: 'none',
    authors: [{ name: 'Internal Seed Curation Team' }],
  },
]

export const starterFindingSeeds = [
  {
    paperExternalId: 'seed-sleep-fatigue-2024',
    findingType: 'threshold',
    subjectMetric: 'sleep_duration',
    comparator: 'lt_6h',
    outcomeMetric: 'fatigue_risk',
    direction: 'increases',
    findingText: 'sleep_duration lt_6h -> fatigue_risk increases',
  },
  {
    paperExternalId: 'seed-hrv-readiness-2023',
    findingType: 'association',
    subjectMetric: 'hrv',
    comparator: 'downward_trend',
    outcomeMetric: 'readiness',
    direction: 'decreases',
    findingText: 'hrv downward_trend -> readiness decreases',
  },
  {
    paperExternalId: 'seed-hrv-readiness-2023',
    findingType: 'association',
    subjectMetric: 'soreness',
    comparator: 'high',
    outcomeMetric: 'readiness',
    direction: 'decreases',
    findingText: 'soreness high -> readiness decreases',
  },
  {
    paperExternalId: 'seed-hydration-performance-2022',
    findingType: 'risk_factor',
    subjectMetric: 'hydration_status',
    comparator: 'dehydrated',
    outcomeMetric: 'sprint_performance',
    direction: 'decreases',
    findingText: 'hydration_status dehydrated -> sprint_performance decreases',
  },
  {
    paperExternalId: 'seed-illness-recovery-2021',
    findingType: 'risk_factor',
    subjectMetric: 'illness_flag',
    comparator: 'present',
    outcomeMetric: 'recovery_quality',
    direction: 'decreases',
    findingText: 'illness_flag present -> recovery_quality decreases',
  },
  {
    paperExternalId: 'seed-load-injury-2020',
    findingType: 'risk_factor',
    subjectMetric: 'acute_load',
    comparator: 'spike_above_baseline',
    outcomeMetric: 'injury_risk',
    direction: 'increases',
    findingText: 'acute_load spike_above_baseline -> injury_risk increases',
  },
] as const

export const starterRuleSeeds: Array<{
  ruleKey: string
  name: string
  bundleKey: string
  logic: RuleRecord['logic']
  output: RuleRecord['output']
  status: RuleRecord['status']
  domain: RuleRecord['domain']
}> = [
  {
    ruleKey: 'fatigue_sleep_load_low_hrv_v1',
    name: 'Fatigue Risk From Low Sleep, High Load, And Low HRV',
    bundleKey: 'fatigue_sleep_load_v1',
    domain: 'fatigue',
    status: 'approved',
    logic: {
      all: [
        { field: 'sleep_hours', operator: 'lt', value: 6 },
        { field: 'acute_load', operator: 'gte', value: 8 },
        { field: 'hrv_delta_pct', operator: 'lte', value: -8 },
      ],
    },
    output: {
      domain: 'fatigue',
      severity: 'high',
      internalCode: 'fatigue.high.recovery_day',
      headline: 'Recovery is reduced today. Keep training light.',
      body: 'Fatigue is building. Protect the quality of your next hard day.',
      actions: ['lower training intensity', 'prioritize sleep', 'increase recovery focus'],
    },
  },
  {
    ruleKey: 'readiness_hrv_soreness_mood_v1',
    name: 'Readiness Reduced From HRV, Soreness, And Mood',
    bundleKey: 'readiness_hrv_soreness_mood_v1',
    domain: 'readiness',
    status: 'approved',
    logic: {
      all: [
        { field: 'hrv_delta_pct', operator: 'lte', value: -5 },
        { field: 'soreness', operator: 'gte', value: 7 },
      ],
      any: [{ field: 'mood', operator: 'lte', value: 4 }],
    },
    output: {
      domain: 'readiness',
      severity: 'high',
      internalCode: 'readiness.low.monitor',
      headline: 'Readiness is down today. Reduce the load.',
      body: 'Your body is not set up for a hard push right now.',
      actions: ['keep the session simple', 'reduce explosive volume', 'check recovery inputs tonight'],
    },
  },
  {
    ruleKey: 'hydration_status_guidance_v1',
    name: 'Hydration Guidance',
    bundleKey: 'hydration_status_performance_v1',
    domain: 'hydration',
    status: 'approved',
    logic: {
      any: [
        { field: 'hydration_status', operator: 'eq', value: 'low' },
        { field: 'hydration_status', operator: 'eq', value: 'dehydrated' },
      ],
    },
    output: {
      domain: 'hydration',
      severity: 'moderate',
      internalCode: 'hydration.rehydrate.before_session',
      headline: 'Hydration is below target. Rehydrate before your next session.',
      body: 'Performance will be better when fluid levels come back up.',
      actions: ['drink fluids now', 'add electrolytes if needed', 'delay hard work until rehydrated'],
    },
  },
  {
    ruleKey: 'illness_conservative_guidance_v1',
    name: 'Conservative Guidance During Illness',
    bundleKey: 'illness_recovery_redflags_v1',
    domain: 'illness',
    status: 'approved',
    logic: {
      all: [{ field: 'illness_flag', operator: 'truthy' }],
    },
    output: {
      domain: 'illness',
      severity: 'high',
      internalCode: 'illness.conservative.training',
      headline: 'Recovery comes first today. Keep training conservative.',
      body: 'When illness is active, pushing hard can set recovery back.',
      actions: ['switch to recovery work', 'watch symptoms closely', 'avoid hard intensity today'],
    },
  },
  {
    ruleKey: 'injury_load_spike_warning_v1',
    name: 'Injury Risk Warning From Load Spike',
    bundleKey: 'injury_risk_load_spike_v1',
    domain: 'injury',
    status: 'approved',
    logic: {
      all: [{ field: 'acute_chronic_ratio', operator: 'gte', value: 1.3 }],
    },
    output: {
      domain: 'injury',
      severity: 'high',
      internalCode: 'injury.load_spike.caution',
      headline: 'Load is spiking. Pull back before it becomes a problem.',
      body: 'The jump from baseline is too large for a normal hard session.',
      actions: ['reduce volume today', 'avoid extra intensity', 'return gradually toward baseline'],
    },
  },
]

export function getStarterResearchSeed() {
  return {
    paperRecords: starterPaperRecords,
    findingSeeds: starterFindingSeeds,
    ruleSeeds: starterRuleSeeds,
  }
}

export async function seedResearchIntelligence() {
  const prisma = getResearchPrismaClient()

  const seededPapers: Array<{
    id: string
    externalId: string
    qualityScore: number
  }> = []

  await prisma.$transaction(async (tx) => {
    for (const sourceRecord of starterPaperRecords) {
      const { canonicalPaper } = canonicalizePaper([sourceRecord])
      const seedIdentifierFilters: Prisma.ResearchPaperWhereInput[] = []
      if (canonicalPaper.pmid) seedIdentifierFilters.push({ pmid: canonicalPaper.pmid })
      if (canonicalPaper.doi) seedIdentifierFilters.push({ doi: canonicalPaper.doi })
      if (canonicalPaper.pmcid) seedIdentifierFilters.push({ pmcid: canonicalPaper.pmcid })
      if (canonicalPaper.openalexId) seedIdentifierFilters.push({ openalexId: canonicalPaper.openalexId })
      if (canonicalPaper.semanticScholarId) {
        seedIdentifierFilters.push({ semanticScholarId: canonicalPaper.semanticScholarId })
      }
      const existingPaper = await tx.researchPaper.findFirst({
        where: {
          OR: seedIdentifierFilters,
        },
      })

      const paper = existingPaper
        ? await tx.researchPaper.update({
            where: { id: existingPaper.id },
            data: {
              title: canonicalPaper.title,
              abstract: canonicalPaper.abstract,
              publicationYear: canonicalPaper.publicationYear || undefined,
              publicationDate: canonicalPaper.publicationDate ? new Date(canonicalPaper.publicationDate) : undefined,
              journal: canonicalPaper.journal,
              publisher: canonicalPaper.publisher,
              studyType: canonicalPaper.studyType || undefined,
              population: canonicalPaper.population || undefined,
              sport: canonicalPaper.sport || undefined,
              sexGroup: canonicalPaper.sexGroup || undefined,
              ageGroup: canonicalPaper.ageGroup || undefined,
              sampleSize: canonicalPaper.sampleSize || undefined,
              isOpenAccess: canonicalPaper.isOpenAccess,
              license: canonicalPaper.license,
              accessPolicy: canonicalPaper.accessPolicy,
              accessPolicyReason: canonicalPaper.accessPolicyReason,
              accessPolicyAuditJson: canonicalPaper.accessPolicyAuditJson as Prisma.InputJsonValue,
              fullTextUrl: canonicalPaper.fullTextUrl,
              pdfUrl: canonicalPaper.pdfUrl,
              citationCount: canonicalPaper.citationCount || undefined,
              referenceCount: canonicalPaper.referenceCount || undefined,
              retractionStatus: canonicalPaper.retractionStatus,
              ingestionStatus: 'reviewed',
              qualityScore: 72,
              evidenceLevel: 'high',
            },
          })
        : await tx.researchPaper.create({
            data: {
              doi: canonicalPaper.doi,
              pmid: canonicalPaper.pmid,
              pmcid: canonicalPaper.pmcid,
              openalexId: canonicalPaper.openalexId,
              semanticScholarId: canonicalPaper.semanticScholarId,
              title: canonicalPaper.title,
              abstract: canonicalPaper.abstract,
              publicationYear: canonicalPaper.publicationYear || undefined,
              publicationDate: canonicalPaper.publicationDate ? new Date(canonicalPaper.publicationDate) : undefined,
              journal: canonicalPaper.journal,
              publisher: canonicalPaper.publisher,
              studyType: canonicalPaper.studyType || undefined,
              population: canonicalPaper.population || undefined,
              sport: canonicalPaper.sport || undefined,
              sexGroup: canonicalPaper.sexGroup || undefined,
              ageGroup: canonicalPaper.ageGroup || undefined,
              sampleSize: canonicalPaper.sampleSize || undefined,
              isOpenAccess: canonicalPaper.isOpenAccess,
              license: canonicalPaper.license,
              accessPolicy: canonicalPaper.accessPolicy,
              accessPolicyReason: canonicalPaper.accessPolicyReason,
              accessPolicyAuditJson: canonicalPaper.accessPolicyAuditJson as Prisma.InputJsonValue,
              fullTextUrl: canonicalPaper.fullTextUrl,
              pdfUrl: canonicalPaper.pdfUrl,
              citationCount: canonicalPaper.citationCount || undefined,
              referenceCount: canonicalPaper.referenceCount || undefined,
              retractionStatus: canonicalPaper.retractionStatus,
              ingestionStatus: 'reviewed',
              qualityScore: 72,
              evidenceLevel: 'high',
            },
          })

      seededPapers.push({
        id: paper.id,
        externalId: sourceRecord.externalId,
        qualityScore: paper.qualityScore || 72,
      })
    }

    await tx.researchFinding.deleteMany({
      where: {
        paperId: {
          in: seededPapers.map((paper) => paper.id),
        },
      },
    })

    for (const finding of starterFindingSeeds) {
      const paper = seededPapers.find((entry) => entry.externalId === finding.paperExternalId)
      if (!paper) continue

      await tx.researchFinding.create({
        data: {
          paperId: paper.id,
          findingType: finding.findingType,
          subjectMetric: finding.subjectMetric,
          comparator: finding.comparator,
          outcomeMetric: finding.outcomeMetric,
          direction: finding.direction,
          findingText: finding.findingText,
          extractionMethod: 'reviewer',
          isHumanVerified: true,
        },
      })
    }

    const findings = await tx.researchFinding.findMany({
      where: {
        paperId: {
          in: seededPapers.map((paper) => paper.id),
        },
      },
      select: {
        paperId: true,
        findingType: true,
        subjectMetric: true,
        comparator: true,
        outcomeMetric: true,
        direction: true,
        findingText: true,
      },
    })

    for (const template of ['fatigue_sleep_load_v1', 'readiness_hrv_soreness_mood_v1', 'hydration_status_performance_v1', 'illness_recovery_redflags_v1', 'injury_risk_load_spike_v1'] as const) {
      const bundleDraft = buildEvidenceBundle({
        bundleKey: template,
        papers: seededPapers,
        findings: findings.map((finding) => ({
          ...finding,
          effectSize: null,
          confidenceText: null,
          extractionMethod: 'reviewer',
          isHumanVerified: true,
        })),
      })

      const bundle = await tx.researchEvidenceBundle.upsert({
        where: { bundleKey: bundleDraft.bundleKey },
        update: {
          title: bundleDraft.title,
          domain: bundleDraft.domain,
          summary: bundleDraft.summary,
          applicablePopulation: bundleDraft.applicablePopulation || undefined,
          applicableSport: bundleDraft.applicableSport || undefined,
          minPapersRequired: bundleDraft.minPapersRequired,
          evidenceStrength: bundleDraft.evidenceStrength,
          status: bundleDraft.supportingPaperIds.length >= bundleDraft.minPapersRequired ? 'approved' : 'draft',
        },
        create: {
          bundleKey: bundleDraft.bundleKey,
          title: bundleDraft.title,
          domain: bundleDraft.domain,
          summary: bundleDraft.summary,
          applicablePopulation: bundleDraft.applicablePopulation || undefined,
          applicableSport: bundleDraft.applicableSport || undefined,
          minPapersRequired: bundleDraft.minPapersRequired,
          evidenceStrength: bundleDraft.evidenceStrength,
          status: bundleDraft.supportingPaperIds.length >= bundleDraft.minPapersRequired ? 'approved' : 'draft',
        },
      })

      await tx.researchBundlePaper.deleteMany({ where: { bundleId: bundle.id } })
      if (bundleDraft.contributionWeights.length > 0) {
        await tx.researchBundlePaper.createMany({
          data: bundleDraft.contributionWeights.map((entry) => ({
            bundleId: bundle.id,
            paperId: entry.paperId,
            contributionWeight: entry.contributionWeight,
          })),
          skipDuplicates: true,
        })
      }
    }

    const bundles = await tx.researchEvidenceBundle.findMany({
      where: {
        bundleKey: {
          in: starterRuleSeeds.map((rule) => rule.bundleKey),
        },
      },
      select: {
        id: true,
        bundleKey: true,
      },
    })

    for (const rule of starterRuleSeeds) {
      const bundle = bundles.find((entry) => entry.bundleKey === rule.bundleKey)
      if (!bundle) continue

      await tx.decisionRule.upsert({
        where: { ruleKey: rule.ruleKey },
        update: {
          name: rule.name,
          domain: rule.domain,
          logicJson: rule.logic as Prisma.InputJsonValue,
          outputJson: rule.output as unknown as Prisma.InputJsonValue,
          bundleId: bundle.id,
          status: rule.status,
        },
        create: {
          ruleKey: rule.ruleKey,
          name: rule.name,
          domain: rule.domain,
          logicJson: rule.logic as Prisma.InputJsonValue,
          outputJson: rule.output as unknown as Prisma.InputJsonValue,
          bundleId: bundle.id,
          status: rule.status,
        },
      })
    }
  })

  logResearchEvent('info', 'research.seed.completed', {
    papers: starterPaperRecords.length,
    findings: starterFindingSeeds.length,
    rules: starterRuleSeeds.length,
  })

  return {
    papers: starterPaperRecords.length,
    findings: starterFindingSeeds.length,
    rules: starterRuleSeeds.length,
  }
}
