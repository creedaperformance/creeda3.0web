import { RESEARCH_SOURCE_PRIORITY } from '@/lib/research/config'
import { resolveAccessPolicy } from '@/lib/research/access-policy'
import type { CanonicalPaperInput, FieldProvenanceRecord, SourcePaperRecord } from '@/lib/research/types'

function compareSourcePriority(left: SourcePaperRecord, right: SourcePaperRecord) {
  return RESEARCH_SOURCE_PRIORITY.indexOf(left.sourceKey) - RESEARCH_SOURCE_PRIORITY.indexOf(right.sourceKey)
}

function sortByPriority(records: SourcePaperRecord[]) {
  return [...records].sort(compareSourcePriority)
}

function chooseString(
  records: SourcePaperRecord[],
  picker: (record: SourcePaperRecord) => string | null | undefined
) {
  const sorted = sortByPriority(records)
  const candidates = sorted
    .map((record) => picker(record)?.trim())
    .filter((value): value is string => Boolean(value))
  if (candidates.length === 0) return null
  return candidates.sort((left, right) => right.length - left.length)[0]
}

function chooseNumber(
  records: SourcePaperRecord[],
  picker: (record: SourcePaperRecord) => number | null | undefined,
  strategy: 'first' | 'max' = 'first'
) {
  const sorted = sortByPriority(records)
  const values = sorted
    .map((record) => picker(record))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (values.length === 0) return null
  return strategy === 'max' ? Math.max(...values) : values[0]
}

function chooseRetractionStatus(records: SourcePaperRecord[]) {
  const severity = {
    none: 0,
    corrected: 1,
    expression_of_concern: 2,
    retracted: 3,
  } as const

  return sortByPriority(records)
    .map((record) => record.retractionStatus || 'none')
    .sort((left, right) => severity[right] - severity[left])[0]
}

function findSelectedRecord(records: SourcePaperRecord[], fieldName: string, selectedValue: string | number | boolean | null | undefined) {
  if (selectedValue === null || selectedValue === undefined) return null

  const normalizedTarget = String(selectedValue)
  return sortByPriority(records).find((record) => {
    const candidate =
      fieldName === 'doi'
        ? record.identifiers.doi
        : fieldName === 'pmid'
          ? record.identifiers.pmid
          : fieldName === 'pmcid'
            ? record.identifiers.pmcid
            : fieldName === 'openalexId'
              ? record.identifiers.openalexId
              : fieldName === 'semanticScholarId'
                ? record.identifiers.semanticScholarId
                : ((record as unknown as Record<string, unknown>)[fieldName] as string | number | boolean | null | undefined)
    return candidate !== null && candidate !== undefined && String(candidate) === normalizedTarget
  })
}

export function buildPaperDeduplicationKeys(record: Pick<SourcePaperRecord, 'identifiers'>) {
  const keys = [
    record.identifiers.doi ? `doi:${record.identifiers.doi.toLowerCase()}` : null,
    record.identifiers.pmid ? `pmid:${record.identifiers.pmid}` : null,
    record.identifiers.pmcid ? `pmcid:${record.identifiers.pmcid}` : null,
    record.identifiers.openalexId ? `openalex:${record.identifiers.openalexId}` : null,
    record.identifiers.semanticScholarId ? `semanticscholar:${record.identifiers.semanticScholarId}` : null,
  ]
  return keys.filter((value): value is string => Boolean(value))
}

export function mergePaperMetadata(records: SourcePaperRecord[]): {
  canonicalPaper: CanonicalPaperInput
  provenance: FieldProvenanceRecord[]
} {
  if (records.length === 0) {
    throw new Error('mergePaperMetadata requires at least one source record.')
  }

  const sorted = sortByPriority(records)
  const title = chooseString(sorted, (record) => record.title)
  if (!title) {
    throw new Error('Cannot canonicalize paper without a title.')
  }

  const accessDecision = resolveAccessPolicy({
    sourceKey: sorted[0].sourceKey,
    isOpenAccess: sorted.some((record) => Boolean(record.isOpenAccess)),
    license: chooseString(sorted, (record) => record.license),
    fullTextUrl: chooseString(sorted, (record) => record.fullTextUrl),
    pdfUrl: chooseString(sorted, (record) => record.pdfUrl),
  })

  const canonicalPaper: CanonicalPaperInput = {
    doi: chooseString(sorted, (record) => record.identifiers.doi),
    pmid: chooseString(sorted, (record) => record.identifiers.pmid),
    pmcid: chooseString(sorted, (record) => record.identifiers.pmcid),
    openalexId: chooseString(sorted, (record) => record.identifiers.openalexId),
    semanticScholarId: chooseString(sorted, (record) => record.identifiers.semanticScholarId),
    title,
    abstract: chooseString(sorted, (record) => record.abstract),
    publicationYear: chooseNumber(sorted, (record) => record.publicationYear),
    publicationDate: chooseString(sorted, (record) => record.publicationDate),
    journal: chooseString(sorted, (record) => record.journal),
    publisher: chooseString(sorted, (record) => record.publisher),
    studyType: sorted.map((record) => record.studyType).find(Boolean) || null,
    population: sorted.map((record) => record.population).find(Boolean) || null,
    sport: sorted.map((record) => record.sport).find(Boolean) || null,
    sexGroup: sorted.map((record) => record.sexGroup).find(Boolean) || null,
    ageGroup: sorted.map((record) => record.ageGroup).find(Boolean) || null,
    sampleSize: chooseNumber(sorted, (record) => record.sampleSize, 'max'),
    isOpenAccess: sorted.some((record) => Boolean(record.isOpenAccess)),
    license: chooseString(sorted, (record) => record.license),
    accessPolicy: accessDecision.accessPolicy,
    accessPolicyReason: accessDecision.reason,
    accessPolicyAuditJson: accessDecision.audit,
    fullTextUrl: chooseString(sorted, (record) => record.fullTextUrl),
    pdfUrl: chooseString(sorted, (record) => record.pdfUrl),
    citationCount: chooseNumber(sorted, (record) => record.citationCount, 'max'),
    referenceCount: chooseNumber(sorted, (record) => record.referenceCount, 'max'),
    retractionStatus: chooseRetractionStatus(sorted),
    ingestionStatus: 'normalized',
    authors: sorted.flatMap((record) => record.authors || []),
    tags: sorted.flatMap((record) => record.tags || []),
  }

  const fields = [
    'doi',
    'pmid',
    'pmcid',
    'openalexId',
    'semanticScholarId',
    'title',
    'abstract',
    'publicationYear',
    'publicationDate',
    'journal',
    'publisher',
    'studyType',
    'population',
    'sport',
    'sexGroup',
    'ageGroup',
    'sampleSize',
    'license',
    'fullTextUrl',
    'pdfUrl',
    'citationCount',
    'referenceCount',
    'retractionStatus',
  ] as const

  const provenance = fields.flatMap((fieldName) => {
    const selectedRecord = findSelectedRecord(sorted, fieldName, canonicalPaper[fieldName])
    return sorted.map((record) => {
      const selected =
        selectedRecord?.sourceKey === record.sourceKey && selectedRecord.externalId === record.externalId

      const value =
        fieldName === 'doi'
          ? record.identifiers.doi
          : fieldName === 'pmid'
            ? record.identifiers.pmid
            : fieldName === 'pmcid'
              ? record.identifiers.pmcid
              : fieldName === 'openalexId'
                ? record.identifiers.openalexId
                : fieldName === 'semanticScholarId'
                  ? record.identifiers.semanticScholarId
                  : ((record as unknown as Record<string, unknown>)[fieldName] as string | number | boolean | null | undefined)

      return {
        fieldName,
        sourceKey: record.sourceKey,
        externalId: record.externalId,
        value: value === null || value === undefined ? null : String(value),
        isSelected: Boolean(selected),
      }
    })
  })

  return {
    canonicalPaper,
    provenance,
  }
}

export function canonicalizePaper(records: SourcePaperRecord[]) {
  const dedupeKeys = Array.from(
    new Set(records.flatMap((record) => buildPaperDeduplicationKeys(record)))
  )

  const { canonicalPaper, provenance } = mergePaperMetadata(records)

  return {
    dedupeKeys,
    canonicalPaper,
    provenance,
  }
}

export function recordProvenance(records: SourcePaperRecord[]) {
  return canonicalizePaper(records).provenance
}
