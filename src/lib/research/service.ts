import 'server-only'

import { Prisma } from '@prisma/client'

import { approveBundle, buildEvidenceBundle } from '@/lib/research/bundles'
import { canonicalizePaper, buildPaperDeduplicationKeys } from '@/lib/research/canonicalization'
import {
  getResearchEnv,
  getResearchQueryOverride,
  isOpenAlexEnabled,
  isSemanticScholarEnabled,
  RESEARCH_BUNDLE_TEMPLATES,
  RESEARCH_SOURCE_DEFAULTS,
} from '@/lib/research/config'
import { resolveAccessPolicy } from '@/lib/research/access-policy'
import { logResearchEvent } from '@/lib/research/logging'
import { parseAbstract, parseFullText } from '@/lib/research/parsing'
import { getResearchPrismaClient } from '@/lib/research/prisma'
import { evaluateRules } from '@/lib/research/rules'
import { evidenceBundleSchema, sourcePaperRecordSchema } from '@/lib/research/schemas'
import { computeEvidenceScore, assignEvidenceLevel } from '@/lib/research/scoring'
import { buildSourceRecord, fetchWithRetry, stripTags, toJsonValue } from '@/lib/research/sources/common'
import { CrossrefSourceAdapter } from '@/lib/research/sources/crossref'
import { EuropePmcSourceAdapter } from '@/lib/research/sources/europe-pmc'
import { OpenAlexSourceAdapter } from '@/lib/research/sources/openalex'
import { PubMedSourceAdapter } from '@/lib/research/sources/pubmed'
import { SemanticScholarSourceAdapter } from '@/lib/research/sources/semantic-scholar'
import type {
  DecisionAuditPayload,
  QueueJobResult,
  RuleRecord,
  SourcePaperRecord,
  SourceSyncMetrics,
  SyncCheckpointValue,
  UserSignalsInput,
} from '@/lib/research/types'

function hasSourceIdentifiers(record: SourcePaperRecord) {
  return buildPaperDeduplicationKeys(record).length > 0
}

async function ensureResearchSources(prisma = getResearchPrismaClient()) {
  const sourceEntries = Object.entries(RESEARCH_SOURCE_DEFAULTS) as Array<
    [keyof typeof RESEARCH_SOURCE_DEFAULTS, (typeof RESEARCH_SOURCE_DEFAULTS)[keyof typeof RESEARCH_SOURCE_DEFAULTS]]
  >

  const sources = await Promise.all(
    sourceEntries.map(([key, config]) =>
      prisma.researchSource.upsert({
        where: { key },
        update: {
          name: key.replace(/_/g, ' '),
          baseUrl: config.baseUrl,
          sourceType: config.sourceType,
          isActive: true,
        },
        create: {
          key,
          name: key.replace(/_/g, ' '),
          baseUrl: config.baseUrl,
          sourceType: config.sourceType,
          isActive: true,
        },
      })
    )
  )

  return Object.fromEntries(sources.map((source) => [source.key, source.id])) as Record<string, string>
}

async function loadCheckpoint(sourceId: string, checkpointKey: string, prisma = getResearchPrismaClient()) {
  const checkpoint = await prisma.researchSyncCheckpoint.findUnique({
    where: {
      sourceId_checkpointKey: {
        sourceId,
        checkpointKey,
      },
    },
  })

  return (checkpoint?.stateJson as SyncCheckpointValue | null) || null
}

async function saveCheckpoint(args: {
  sourceId: string
  checkpointKey: string
  value: SyncCheckpointValue
}, prisma = getResearchPrismaClient()) {
  await prisma.researchSyncCheckpoint.upsert({
    where: {
      sourceId_checkpointKey: {
        sourceId: args.sourceId,
        checkpointKey: args.checkpointKey,
      },
    },
    update: {
      cursor: args.value.cursor || null,
      stateJson: args.value as Prisma.InputJsonValue,
      lastAttemptedAt: new Date(),
      lastSuccessfulAt: new Date(),
    },
    create: {
      sourceId: args.sourceId,
      checkpointKey: args.checkpointKey,
      cursor: args.value.cursor || null,
      stateJson: args.value as Prisma.InputJsonValue,
      lastAttemptedAt: new Date(),
      lastSuccessfulAt: new Date(),
    },
  })
}

async function upsertSourceRecords(args: {
  sourceKey: keyof typeof RESEARCH_SOURCE_DEFAULTS
  records: SourcePaperRecord[]
}, prisma = getResearchPrismaClient()) {
  const sourceIds = await ensureResearchSources(prisma)
  const sourceId = sourceIds[args.sourceKey]
  let inserted = 0
  let updated = 0
  let duplicates = 0

  for (const record of args.records.map(buildSourceRecord)) {
    if (!record.externalId) continue
    const parsed = sourcePaperRecordSchema.parse(record)
    const existing = await prisma.researchPaperSourceRecord.findUnique({
      where: {
        sourceId_externalId: {
          sourceId,
          externalId: record.externalId,
        },
      },
    })

    await prisma.researchPaperSourceRecord.upsert({
      where: {
        sourceId_externalId: {
          sourceId,
          externalId: record.externalId,
        },
      },
      update: {
        sourceUrl: record.sourceUrl,
        payloadJson: toJsonValue(parsed),
        fetchedAt: new Date(),
      },
      create: {
        sourceId,
        externalId: record.externalId,
        sourceUrl: record.sourceUrl,
        payloadJson: toJsonValue(parsed),
        fetchedAt: new Date(),
      },
    })

    if (existing) {
      updated += 1
      duplicates += hasSourceIdentifiers(record) ? 1 : 0
    } else {
      inserted += 1
    }
  }

  return { inserted, updated, duplicates }
}

function groupPendingSourceRecords(
  rows: Array<{ id: string; payloadJson: Prisma.JsonValue }>
) {
  const groupByKey = new Map<string, { rows: typeof rows; records: SourcePaperRecord[] }>()
  const dedupeKeyToGroup = new Map<string, string>()

  for (const row of rows) {
    const parsed = sourcePaperRecordSchema.parse(row.payloadJson as Record<string, unknown>)
    const dedupeKeys = buildPaperDeduplicationKeys(parsed)
    const existingGroupId = dedupeKeys.find((key) => dedupeKeyToGroup.has(key))
    const groupId = existingGroupId || dedupeKeys[0] || `source-record:${row.id}`

    if (!groupByKey.has(groupId)) {
      groupByKey.set(groupId, { rows: [], records: [] })
    }

    const group = groupByKey.get(groupId)!
    group.rows.push(row)
    group.records.push(parsed)

    dedupeKeys.forEach((key) => dedupeKeyToGroup.set(key, groupId))
  }

  return Array.from(groupByKey.values())
}

function definedUpdate<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, candidate]) => candidate !== undefined && candidate !== null)
  )
}

async function upsertAuthorsAndTags(args: {
  paperId: string
  record: SourcePaperRecord
}, prisma = getResearchPrismaClient()) {
  await prisma.researchPaperAuthor.deleteMany({ where: { paperId: args.paperId } })
  await prisma.researchPaperTag.deleteMany({ where: { paperId: args.paperId } })

  for (let index = 0; index < (args.record.authors || []).length; index += 1) {
    const authorRecord = args.record.authors?.[index]
    if (!authorRecord) continue

    const author =
      (authorRecord.orcid
        ? await prisma.researchAuthor.findFirst({
            where: {
              orcid: authorRecord.orcid,
            },
          })
        : await prisma.researchAuthor.findFirst({
            where: {
              name: authorRecord.name,
              affiliation: authorRecord.affiliation || undefined,
            },
          })) ||
      (await prisma.researchAuthor.create({
        data: {
          name: authorRecord.name,
          orcid: authorRecord.orcid || undefined,
          affiliation: authorRecord.affiliation || undefined,
        },
      }))

    await prisma.researchPaperAuthor.create({
      data: {
        paperId: args.paperId,
        authorId: author.id,
        authorOrder: index + 1,
      },
    })
  }

  for (const tagRecord of args.record.tags || []) {
    const tag = await prisma.researchTag.upsert({
      where: {
        tagType_tagValue: {
          tagType: tagRecord.tagType,
          tagValue: tagRecord.tagValue,
        },
      },
      update: {},
      create: {
        tagType: tagRecord.tagType,
        tagValue: tagRecord.tagValue,
      },
    })

    await prisma.researchPaperTag.create({
      data: {
        paperId: args.paperId,
        tagId: tag.id,
      },
    }).catch(() => undefined)
  }
}

async function persistCanonicalGroup(args: {
  rows: Array<{ id: string; payloadJson: Prisma.JsonValue }>
  records: SourcePaperRecord[]
}, prisma = getResearchPrismaClient()) {
  const { canonicalPaper, provenance } = canonicalizePaper(args.records)
  const identifierFilters: Prisma.ResearchPaperWhereInput[] = []
  if (canonicalPaper.doi) identifierFilters.push({ doi: canonicalPaper.doi })
  if (canonicalPaper.pmid) identifierFilters.push({ pmid: canonicalPaper.pmid })
  if (canonicalPaper.pmcid) identifierFilters.push({ pmcid: canonicalPaper.pmcid })
  if (canonicalPaper.openalexId) identifierFilters.push({ openalexId: canonicalPaper.openalexId })
  if (canonicalPaper.semanticScholarId) identifierFilters.push({ semanticScholarId: canonicalPaper.semanticScholarId })

  const existingPaper =
    identifierFilters.length > 0
      ? await prisma.researchPaper.findFirst({
          where: { OR: identifierFilters },
        })
      : null

  const paper = existingPaper
    ? await prisma.researchPaper.update({
        where: { id: existingPaper.id },
        data: definedUpdate({
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
          isOpenAccess: canonicalPaper.isOpenAccess || undefined,
          license: canonicalPaper.license,
          accessPolicy: canonicalPaper.accessPolicy,
          accessPolicyReason: canonicalPaper.accessPolicyReason,
          accessPolicyAuditJson: canonicalPaper.accessPolicyAuditJson as Prisma.InputJsonValue,
          fullTextUrl: canonicalPaper.fullTextUrl,
          pdfUrl: canonicalPaper.pdfUrl,
          citationCount: canonicalPaper.citationCount || undefined,
          referenceCount: canonicalPaper.referenceCount || undefined,
          retractionStatus: canonicalPaper.retractionStatus,
          ingestionStatus: existingPaper.ingestionStatus === 'raw' ? 'normalized' : existingPaper.ingestionStatus,
        }),
      })
    : await prisma.researchPaper.create({
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
          ingestionStatus: 'normalized',
        },
      })

  const rowIdByExternal = new Map<string, string>()
  args.rows.forEach((row) => {
    const parsed = sourcePaperRecordSchema.parse(row.payloadJson as Record<string, unknown>)
    rowIdByExternal.set(`${parsed.sourceKey}:${parsed.externalId}`, row.id)
  })

  await prisma.researchPaperSourceRecord.updateMany({
    where: {
      id: {
        in: args.rows.map((row) => row.id),
      },
    },
    data: {
      paperId: paper.id,
    },
  })

  await prisma.researchPaperFieldProvenance.deleteMany({
    where: {
      sourceRecordId: {
        in: args.rows.map((row) => row.id),
      },
    },
  })

  if (provenance.length > 0) {
    await prisma.researchPaperFieldProvenance.createMany({
      data: provenance
        .map((entry) => {
          const sourceRecordId = rowIdByExternal.get(`${entry.sourceKey}:${entry.externalId}`)
          if (!sourceRecordId) return null
          return {
            paperId: paper.id,
            sourceRecordId,
            fieldName: entry.fieldName,
            fieldValue: entry.value,
            isSelected: entry.isSelected,
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
      skipDuplicates: true,
    })
  }

  await upsertAuthorsAndTags({ paperId: paper.id, record: args.records[0] }, prisma)

  return paper
}

export async function canonicalizeNewRecords(args?: { limit?: number }) {
  const prisma = getResearchPrismaClient()
  const pendingRows = await prisma.researchPaperSourceRecord.findMany({
    where: {
      paperId: null,
    },
    orderBy: { fetchedAt: 'asc' },
    take: args?.limit || 100,
    select: {
      id: true,
      payloadJson: true,
    },
  })

  const groups = groupPendingSourceRecords(pendingRows)
  let canonicalized = 0

  for (const group of groups) {
    await persistCanonicalGroup(group, prisma)
    canonicalized += 1
  }

  logResearchEvent('info', 'research.canonicalize.completed', {
    pendingRows: pendingRows.length,
    groups: groups.length,
  })

  return {
    canonicalized,
    groups: groups.length,
  }
}

async function fetchTextBody(url: string) {
  return fetchWithRetry(
    'research.fulltext.fetch',
    async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Full text fetch failed with status ${response.status}`)
      }
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/pdf') || /\.pdf($|\?)/i.test(url)) {
        return ''
      }
      return stripTags(await response.text()) || ''
    },
    2,
    300
  )
}

export async function parsePendingResearch(args?: { limit?: number }) {
  const prisma = getResearchPrismaClient()
  const papers = await prisma.researchPaper.findMany({
    where: {
      ingestionStatus: 'normalized',
    },
    take: args?.limit || 50,
  })

  let parsedCount = 0
  let findingsCreated = 0

  for (const paper of papers) {
    const accessDecision = resolveAccessPolicy({
      sourceKey: 'pubmed',
      isOpenAccess: paper.isOpenAccess,
      license: paper.license,
      fullTextUrl: paper.fullTextUrl,
      pdfUrl: paper.pdfUrl,
    })

    const aggregateFindings = []
    const aggregatePassages = []

    if (paper.abstract) {
      const parsed = parseAbstract({
        paperId: paper.id,
        abstractText: paper.abstract,
        accessDecision,
      })
      aggregateFindings.push(...parsed.findings)
      aggregatePassages.push(...parsed.passages)
    }

    if (accessDecision.isFullTextAllowed && paper.fullTextUrl) {
      const body = await fetchTextBody(paper.fullTextUrl)
      if (body.trim()) {
        const parsed = parseFullText({
          paperId: paper.id,
          fullText: body,
          accessDecision,
        })
        aggregateFindings.push(...parsed.findings)
        aggregatePassages.push(...parsed.passages)
      }
    }

    await prisma.researchFinding.deleteMany({ where: { paperId: paper.id } })
    await prisma.researchEvidencePassage.deleteMany({ where: { paperId: paper.id } })

    if (aggregateFindings.length > 0) {
      await prisma.researchFinding.createMany({
        data: aggregateFindings.map((finding) => ({
          paperId: finding.paperId,
          findingType: finding.findingType,
          subjectMetric: finding.subjectMetric,
          comparator: finding.comparator,
          outcomeMetric: finding.outcomeMetric,
          direction: finding.direction,
          effectSize: finding.effectSize,
          confidenceText: finding.confidenceText,
          findingText: finding.findingText,
          extractionMethod: finding.extractionMethod,
          isHumanVerified: false,
        })),
      })

      findingsCreated += aggregateFindings.length
    }

    if (aggregatePassages.length > 0) {
      await prisma.researchEvidencePassage.createMany({
        data: aggregatePassages,
      })
    }

    await prisma.researchPaper.update({
      where: { id: paper.id },
      data: {
        ingestionStatus: 'parsed',
        accessPolicy: accessDecision.accessPolicy,
        accessPolicyReason: accessDecision.reason,
        accessPolicyAuditJson: accessDecision.audit as Prisma.InputJsonValue,
      },
    })

    parsedCount += 1
  }

  return {
    parsedCount,
    findingsCreated,
  }
}

export async function scorePendingPapers(args?: { limit?: number }) {
  const prisma = getResearchPrismaClient()
  const papers = await prisma.researchPaper.findMany({
    where: {
      ingestionStatus: {
        in: ['parsed', 'reviewed'],
      },
      qualityScore: null,
    },
    include: {
      findings: true,
    },
    take: args?.limit || 50,
  })

  let scored = 0
  const replicationMap = new Map<string, number>()
  for (const paper of papers) {
    const keys = paper.findings.map((finding) => `${finding.subjectMetric}:${finding.outcomeMetric}`)
    keys.forEach((key) => replicationMap.set(key, (replicationMap.get(key) || 0) + 1))
  }

  for (const paper of papers) {
    const replicationCount = Math.max(
      1,
      ...paper.findings.map((finding) => replicationMap.get(`${finding.subjectMetric}:${finding.outcomeMetric}`) || 1)
    )

    const breakdown = computeEvidenceScore({
      studyType: paper.studyType || undefined,
      sampleSize: paper.sampleSize || undefined,
      publicationYear: paper.publicationYear || undefined,
      sport: paper.sport || undefined,
      population: paper.population || undefined,
      retractionStatus: paper.retractionStatus,
      replicationCount,
      targetSport: paper.sport || undefined,
      targetPopulation: paper.population || undefined,
    })

    await prisma.researchPaper.update({
      where: { id: paper.id },
      data: {
        qualityScore: breakdown.total,
        evidenceLevel: assignEvidenceLevel(breakdown.total),
      },
    })
    scored += 1
  }

  return {
    scored,
  }
}

export async function buildPendingBundles() {
  const prisma = getResearchPrismaClient()
  const papers = await prisma.researchPaper.findMany({
    where: {
      qualityScore: {
        not: null,
      },
      ingestionStatus: {
        in: ['parsed', 'reviewed'],
      },
    },
    include: {
      findings: true,
    },
  })

  const findings = papers.flatMap((paper) =>
    paper.findings.map((finding) => ({
      paperId: paper.id,
      findingType: finding.findingType,
      subjectMetric: finding.subjectMetric,
      comparator: finding.comparator,
      outcomeMetric: finding.outcomeMetric,
      direction: finding.direction,
      effectSize: finding.effectSize,
      confidenceText: finding.confidenceText,
      findingText: finding.findingText,
      extractionMethod: finding.extractionMethod,
      isHumanVerified: finding.isHumanVerified,
    }))
  )

  const built = []
  for (const template of RESEARCH_BUNDLE_TEMPLATES) {
    const draftBundle = buildEvidenceBundle({
      bundleKey: template.bundleKey,
      papers: papers.map((paper) => ({
        id: paper.id,
        qualityScore: paper.qualityScore,
      })),
      findings,
    })

    evidenceBundleSchema.parse(draftBundle)

    const bundle = await prisma.researchEvidenceBundle.upsert({
      where: { bundleKey: draftBundle.bundleKey },
      update: {
        title: draftBundle.title,
        domain: draftBundle.domain,
        summary: draftBundle.summary,
        applicablePopulation: draftBundle.applicablePopulation || undefined,
        applicableSport: draftBundle.applicableSport || undefined,
        minPapersRequired: draftBundle.minPapersRequired,
        evidenceStrength: draftBundle.evidenceStrength,
      },
      create: {
        bundleKey: draftBundle.bundleKey,
        title: draftBundle.title,
        domain: draftBundle.domain,
        summary: draftBundle.summary,
        applicablePopulation: draftBundle.applicablePopulation || undefined,
        applicableSport: draftBundle.applicableSport || undefined,
        minPapersRequired: draftBundle.minPapersRequired,
        evidenceStrength: draftBundle.evidenceStrength,
        status: 'draft',
      },
    })

    await prisma.researchBundlePaper.deleteMany({
      where: { bundleId: bundle.id },
    })
    if (draftBundle.contributionWeights.length > 0) {
      await prisma.researchBundlePaper.createMany({
        data: draftBundle.contributionWeights.map((entry) => ({
          bundleId: bundle.id,
          paperId: entry.paperId,
          contributionWeight: entry.contributionWeight,
        })),
      })
    }

    built.push({
      bundleId: bundle.id,
      bundleKey: bundle.bundleKey,
      evidenceStrength: draftBundle.evidenceStrength,
      supportingPapers: draftBundle.supportingPaperIds.length,
    })
  }

  return {
    built,
  }
}

export async function publishApprovedRules(args?: {
  ruleKeys?: string[]
  autoApproveBundles?: boolean
}) {
  const prisma = getResearchPrismaClient()

  if (args?.autoApproveBundles) {
    const draftBundles = await prisma.researchEvidenceBundle.findMany({
      where: { status: 'draft' },
      include: { papers: true },
    })

    for (const bundle of draftBundles) {
      if (
        bundle.evidenceStrength &&
        bundle.evidenceStrength !== 'insufficient' &&
        bundle.papers.length >= bundle.minPapersRequired
      ) {
        const approved = approveBundle({
          bundleKey: bundle.bundleKey,
          title: bundle.title,
          domain: bundle.domain,
          summary: bundle.summary,
          applicablePopulation: bundle.applicablePopulation,
          applicableSport: bundle.applicableSport,
          minPapersRequired: bundle.minPapersRequired,
          status: 'draft',
          evidenceStrength: bundle.evidenceStrength,
          consistencyScore: 1,
          contradictionCount: 0,
          supportingPaperIds: bundle.papers.map((paper) => paper.paperId),
          contributionWeights: bundle.papers.map((paper) => ({
            paperId: paper.paperId,
            contributionWeight: paper.contributionWeight,
          })),
        })

        await prisma.researchEvidenceBundle.update({
          where: { id: bundle.id },
          data: {
            status: approved.status,
          },
        })
      }
    }
  }

  const bundleIds = await prisma.researchEvidenceBundle.findMany({
    where: { status: 'approved' },
    select: { id: true },
  })

  const ruleWhere = args?.ruleKeys?.length
    ? {
        ruleKey: { in: args.ruleKeys },
        bundleId: { in: bundleIds.map((bundle) => bundle.id) },
      }
    : {
        bundleId: { in: bundleIds.map((bundle) => bundle.id) },
      }

  const result = await prisma.decisionRule.updateMany({
    where: ruleWhere,
    data: {
      status: 'approved',
    },
  })

  return {
    published: result.count,
  }
}

export async function writeDecisionAuditLog(payload: DecisionAuditPayload) {
  const prisma = getResearchPrismaClient()
  return prisma.decisionAuditLog.create({
    data: {
      userId: payload.userId,
      ruleId: payload.ruleId,
      bundleId: payload.bundleId,
      inputSnapshot: payload.inputSnapshot as Prisma.InputJsonValue,
      outputSnapshot: payload.outputSnapshot as Prisma.InputJsonValue,
      engineConfidence: payload.engineConfidence,
    },
  })
}

export async function traceBundleToPapers(bundleId: string) {
  const prisma = getResearchPrismaClient()
  return prisma.researchEvidenceBundle.findUnique({
    where: { id: bundleId },
    include: {
      papers: {
        include: {
          paper: {
            include: {
              findings: true,
              sourceRecords: true,
              fieldProvenance: true,
            },
          },
        },
      },
    },
  })
}

export async function traceRecommendationToBundle(auditId: string) {
  const prisma = getResearchPrismaClient()
  const audit = await prisma.decisionAuditLog.findUnique({
    where: { id: auditId },
    include: {
      rule: true,
      bundle: true,
    },
  })

  if (!audit) return null

  const bundleTrace = await traceBundleToPapers(audit.bundleId)
  return {
    audit,
    bundleTrace,
  }
}

export async function evaluateUserSignals(args: {
  userId: string
  input: UserSignalsInput
}) {
  const prisma = getResearchPrismaClient()
  const rules = await prisma.decisionRule.findMany({
    where: {
      status: 'approved',
      bundle: {
        status: 'approved',
      },
    },
    include: {
      bundle: true,
    },
  })

  const recommendations = evaluateRules({
    input: args.input,
    rules: rules.map(
      (rule): RuleRecord => ({
        id: rule.id,
        ruleKey: rule.ruleKey,
        bundleId: rule.bundleId,
        bundleKey: rule.bundle.bundleKey,
        logic: rule.logicJson as RuleRecord['logic'],
        output: rule.outputJson as unknown as RuleRecord['output'],
        status: rule.status,
        domain: rule.domain,
      })
    ),
    bundleStrengthByBundleId: Object.fromEntries(
      rules.map((rule) => [rule.bundleId, rule.bundle.evidenceStrength || 'limited'])
    ),
  })

  for (const recommendation of recommendations) {
    await writeDecisionAuditLog({
      userId: args.userId,
      ruleId: recommendation.ruleId,
      bundleId: recommendation.bundleId,
      inputSnapshot: args.input as Record<string, unknown>,
      outputSnapshot: recommendation as unknown as Record<string, unknown>,
      engineConfidence: recommendation.confidence,
    })
  }

  return recommendations
}

export async function syncPubMed(args?: { query?: string; limit?: number }): Promise<SourceSyncMetrics> {
  const prisma = getResearchPrismaClient()
  const sourceIds = await ensureResearchSources(prisma)
  const sourceId = sourceIds.pubmed
  const query = args?.query || getResearchQueryOverride()
  const limit = args?.limit || RESEARCH_SOURCE_DEFAULTS.pubmed.pageSize
  const checkpointKey = `query:${query}`
  const checkpoint = (await loadCheckpoint(sourceId, checkpointKey, prisma)) || { start: 0 }
  const adapter = new PubMedSourceAdapter()
  const result = await adapter.search({
    query,
    start: checkpoint.start || 0,
    pageSize: limit,
  })
  const persist = await upsertSourceRecords({ sourceKey: 'pubmed', records: result.records }, prisma)
  const nextCheckpoint = {
    start: result.nextStart,
    updatedAt: new Date().toISOString(),
  }
  await saveCheckpoint({ sourceId, checkpointKey, value: nextCheckpoint }, prisma)
  await canonicalizeNewRecords({ limit: result.records.length * 2 || limit })

  return {
    fetched: result.records.length,
    inserted: persist.inserted,
    updated: persist.updated,
    duplicates: persist.duplicates,
    checkpoint: nextCheckpoint,
  }
}

export async function syncCrossref(args?: { limit?: number }) {
  const prisma = getResearchPrismaClient()
  const limit = args?.limit || RESEARCH_SOURCE_DEFAULTS.crossref.pageSize
  const adapter = new CrossrefSourceAdapter()
  const candidatePapers = await prisma.researchPaper.findMany({
    where: {
      doi: { not: null },
      sourceRecords: {
        none: {
          source: {
            key: 'crossref',
          },
        },
      },
    },
    take: limit,
  })

  const records: SourcePaperRecord[] = []
  for (const paper of candidatePapers) {
    if (!paper.doi) continue
    const record = await adapter.enrichByDoi(paper.doi)
    if (record) records.push(record)
  }

  const persist = await upsertSourceRecords({ sourceKey: 'crossref', records }, prisma)
  await canonicalizeNewRecords({ limit: records.length * 2 || limit })
  return {
    fetched: records.length,
    inserted: persist.inserted,
    updated: persist.updated,
    duplicates: persist.duplicates,
    checkpoint: { updatedAt: new Date().toISOString() },
  }
}

export async function syncEuropePMC(args?: { query?: string; limit?: number }) {
  const prisma = getResearchPrismaClient()
  const sourceIds = await ensureResearchSources(prisma)
  const sourceId = sourceIds.europe_pmc
  const query = args?.query || getResearchQueryOverride()
  const limit = args?.limit || RESEARCH_SOURCE_DEFAULTS.europe_pmc.pageSize
  const checkpointKey = `query:${query}`
  const checkpoint = await loadCheckpoint(sourceId, checkpointKey, prisma)
  const adapter = new EuropePmcSourceAdapter()
  const result = await adapter.search({
    query,
    cursorMark: checkpoint?.cursor || '*',
    pageSize: limit,
  })
  const persist = await upsertSourceRecords({ sourceKey: 'europe_pmc', records: result.records }, prisma)
  const nextCheckpoint = {
    cursor: result.nextCursorMark,
    updatedAt: new Date().toISOString(),
  }
  await saveCheckpoint({ sourceId, checkpointKey, value: nextCheckpoint }, prisma)
  await canonicalizeNewRecords({ limit: result.records.length * 2 || limit })
  return {
    fetched: result.records.length,
    inserted: persist.inserted,
    updated: persist.updated,
    duplicates: persist.duplicates,
    checkpoint: nextCheckpoint,
  }
}

export async function syncOpenAlex(args?: { query?: string; limit?: number }) {
  if (!isOpenAlexEnabled()) {
    return {
      fetched: 0,
      inserted: 0,
      updated: 0,
      duplicates: 0,
      checkpoint: { updatedAt: new Date().toISOString() },
    }
  }

  const prisma = getResearchPrismaClient()
  const sourceIds = await ensureResearchSources(prisma)
  const sourceId = sourceIds.openalex
  const query = args?.query || getResearchQueryOverride()
  const checkpointKey = `query:${query}`
  const checkpoint = await loadCheckpoint(sourceId, checkpointKey, prisma)
  const adapter = new OpenAlexSourceAdapter(getResearchEnv().RESEARCH_OPENALEX_API_KEY)
  const page = checkpoint?.page || 1
  const result = await adapter.search({
    query,
    page,
    pageSize: args?.limit || RESEARCH_SOURCE_DEFAULTS.openalex.pageSize,
  })
  const persist = await upsertSourceRecords({ sourceKey: 'openalex', records: result.records }, prisma)
  const nextCheckpoint = {
    page: result.nextPage,
    updatedAt: new Date().toISOString(),
  }
  await saveCheckpoint({ sourceId, checkpointKey, value: nextCheckpoint }, prisma)
  await canonicalizeNewRecords({ limit: result.records.length * 2 || 25 })
  return {
    fetched: result.records.length,
    inserted: persist.inserted,
    updated: persist.updated,
    duplicates: persist.duplicates,
    checkpoint: nextCheckpoint,
  }
}

export async function syncSemanticScholar(args?: { query?: string; limit?: number }) {
  if (!isSemanticScholarEnabled()) {
    return {
      fetched: 0,
      inserted: 0,
      updated: 0,
      duplicates: 0,
      checkpoint: { updatedAt: new Date().toISOString() },
    }
  }

  const prisma = getResearchPrismaClient()
  const adapter = new SemanticScholarSourceAdapter(getResearchEnv().RESEARCH_SEMANTIC_SCHOLAR_API_KEY)
  const records = await adapter.search({
    query: args?.query || getResearchQueryOverride(),
    limit: args?.limit || RESEARCH_SOURCE_DEFAULTS.semantic_scholar.pageSize,
  })
  const persist = await upsertSourceRecords({ sourceKey: 'semantic_scholar', records }, prisma)
  await canonicalizeNewRecords({ limit: records.length * 2 || 10 })
  return {
    fetched: records.length,
    inserted: persist.inserted,
    updated: persist.updated,
    duplicates: persist.duplicates,
    checkpoint: { updatedAt: new Date().toISOString() },
  }
}

export async function runResearchSync(args?: {
  source?: 'pubmed' | 'crossref' | 'europe_pmc' | 'openalex' | 'semantic_scholar' | 'all'
  query?: string
  limit?: number
}) {
  const source = args?.source || 'all'
  const results: Record<string, unknown> = {}

  if (source === 'all' || source === 'pubmed') {
    results.pubmed = await syncPubMed({ query: args?.query, limit: args?.limit })
  }
  if (source === 'all' || source === 'crossref') {
    results.crossref = await syncCrossref({ limit: args?.limit })
  }
  if (source === 'all' || source === 'europe_pmc') {
    results.europe_pmc = await syncEuropePMC({ query: args?.query, limit: args?.limit })
  }
  if (source === 'all' || source === 'openalex') {
    results.openalex = await syncOpenAlex({ query: args?.query, limit: args?.limit })
  }
  if (source === 'all' || source === 'semantic_scholar') {
    results.semantic_scholar = await syncSemanticScholar({ query: args?.query, limit: args?.limit })
  }

  logResearchEvent('info', 'research.sync.completed', { source, results })
  return results
}

export async function getResearchPapers(args?: { status?: string; limit?: number }) {
  const prisma = getResearchPrismaClient()
  return prisma.researchPaper.findMany({
    where: args?.status
      ? {
          ingestionStatus: args.status as never,
        }
      : undefined,
    orderBy: {
      updatedAt: 'desc',
    },
    take: args?.limit || 50,
  })
}

export async function getResearchBundles() {
  const prisma = getResearchPrismaClient()
  return prisma.researchEvidenceBundle.findMany({
    include: {
      papers: true,
      decisionRules: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export async function getResearchRules() {
  const prisma = getResearchPrismaClient()
  return prisma.decisionRule.findMany({
    include: {
      bundle: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export async function publishApprovedRulesJob(): Promise<QueueJobResult> {
  const published = await publishApprovedRules({ autoApproveBundles: true })
  return {
    ok: true,
    message: 'Approved rules published.',
    metrics: published,
  }
}
