import { canonicalizePaper, mergePaperMetadata, recordProvenance } from '@/lib/research/canonicalization'
import type { SourcePaperRecord } from '@/lib/research/types'

const pubmedRecord: SourcePaperRecord = {
  sourceKey: 'pubmed',
  externalId: 'pmid-1',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/1/',
  payloadJson: { source: 'pubmed' },
  identifiers: {
    doi: '10.1000/test',
    pmid: '1',
  },
  title: 'Sleep restriction and fatigue in elite athletes',
  abstract: 'Sleep duration under 6 h increased fatigue risk.',
  publicationYear: 2024,
  publicationDate: '2024-01-01',
  journal: 'PubMed Journal',
  publisher: 'NCBI',
  studyType: 'systematic_review',
  population: 'elite_athletes',
  sport: 'general',
  sexGroup: 'mixed',
  ageGroup: 'adult',
  sampleSize: 180,
  isOpenAccess: false,
  license: null,
  citationCount: 20,
  referenceCount: 15,
  retractionStatus: 'none',
  authors: [{ name: 'Author One' }],
}

const europePmcRecord: SourcePaperRecord = {
  sourceKey: 'europe_pmc',
  externalId: 'pmcid-1',
  sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1/',
  payloadJson: { source: 'europe_pmc' },
  identifiers: {
    doi: '10.1000/test',
    pmcid: 'PMC1',
  },
  title: 'Sleep restriction and fatigue in elite athletes',
  abstract:
    'Sleep duration under 6 h increased fatigue risk and reduced readiness during congested schedules.',
  publicationYear: 2024,
  publicationDate: '2024-01-01',
  journal: 'Open Journal',
  publisher: 'PMC',
  studyType: 'systematic_review',
  population: 'elite_athletes',
  sport: 'general',
  sexGroup: 'mixed',
  ageGroup: 'adult',
  sampleSize: 220,
  isOpenAccess: true,
  license: 'CC-BY-4.0',
  fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1/full-text',
  citationCount: 24,
  referenceCount: 18,
  retractionStatus: 'none',
  authors: [{ name: 'Author One' }],
}

describe('research canonicalization', () => {
  test('merges source metadata conservatively and preserves provenance', () => {
    const merged = mergePaperMetadata([pubmedRecord, europePmcRecord])

    expect(merged.canonicalPaper.doi).toBe('10.1000/test')
    expect(merged.canonicalPaper.pmid).toBe('1')
    expect(merged.canonicalPaper.pmcid).toBe('PMC1')
    expect(merged.canonicalPaper.abstract).toContain('reduced readiness')
    expect(merged.canonicalPaper.isOpenAccess).toBe(true)
    expect(merged.canonicalPaper.accessPolicy).toBe('open_access_fulltext_allowed')
    expect(merged.canonicalPaper.sampleSize).toBe(220)
  })

  test('builds dedupe keys and provenance entries without duplicating canonical papers', () => {
    const result = canonicalizePaper([pubmedRecord, europePmcRecord])
    const provenance = recordProvenance([pubmedRecord, europePmcRecord])

    expect(result.dedupeKeys).toEqual(expect.arrayContaining(['doi:10.1000/test', 'pmid:1', 'pmcid:PMC1']))
    expect(provenance.some((entry) => entry.fieldName === 'doi' && entry.isSelected)).toBe(true)
  })
})
