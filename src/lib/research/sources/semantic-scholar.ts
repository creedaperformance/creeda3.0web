import { RESEARCH_SOURCE_DEFAULTS } from '@/lib/research/config'
import { buildSourceRecord, fetchWithRetry } from '@/lib/research/sources/common'
import type { SourcePaperRecord } from '@/lib/research/types'

export class SemanticScholarSourceAdapter {
  constructor(private readonly apiKey?: string | null) {}

  async search(args: { query: string; limit?: number }): Promise<SourcePaperRecord[]> {
    const limit = args.limit || RESEARCH_SOURCE_DEFAULTS.semantic_scholar.pageSize
    const url = new URL(`${RESEARCH_SOURCE_DEFAULTS.semantic_scholar.baseUrl}/paper/search`)
    url.searchParams.set('query', args.query)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('fields', 'paperId,title,abstract,year,venue,externalIds,citationCount,referenceCount,authors,openAccessPdf,isOpenAccess')

    const body = await fetchWithRetry(
      'semanticScholar.search',
      async () => {
        const response = await fetch(url, {
          headers: this.apiKey
            ? {
                'x-api-key': this.apiKey,
              }
            : undefined,
        })
        if (!response.ok) {
          throw new Error(`Semantic Scholar search failed with status ${response.status}`)
        }
        return response.json()
      },
      RESEARCH_SOURCE_DEFAULTS.semantic_scholar.retryAttempts,
      RESEARCH_SOURCE_DEFAULTS.semantic_scholar.minIntervalMs
    )

    return Array.isArray(body?.data)
      ? body.data.map((item: Record<string, unknown>) =>
          buildSourceRecord({
            sourceKey: 'semantic_scholar',
            externalId: String(item.paperId || ''),
            sourceUrl: item.openAccessPdf && typeof (item.openAccessPdf as Record<string, unknown>).url === 'string'
              ? (item.openAccessPdf as Record<string, unknown>).url as string
              : null,
            payloadJson: item,
            identifiers: {
              doi: typeof (item.externalIds as Record<string, unknown> | undefined)?.DOI === 'string'
                ? (item.externalIds as Record<string, unknown>).DOI as string
                : null,
              semanticScholarId: String(item.paperId || ''),
            },
            title: typeof item.title === 'string' ? item.title : null,
            abstract: typeof item.abstract === 'string' ? item.abstract : null,
            publicationYear: Number(item.year || 0) || null,
            publicationDate: null,
            journal: typeof item.venue === 'string' ? item.venue : null,
            publisher: 'Semantic Scholar',
            isOpenAccess: Boolean(item.isOpenAccess),
            license: null,
            fullTextUrl: item.openAccessPdf && typeof (item.openAccessPdf as Record<string, unknown>).url === 'string'
              ? (item.openAccessPdf as Record<string, unknown>).url as string
              : null,
            pdfUrl: item.openAccessPdf && typeof (item.openAccessPdf as Record<string, unknown>).url === 'string'
              ? (item.openAccessPdf as Record<string, unknown>).url as string
              : null,
            citationCount: typeof item.citationCount === 'number' ? item.citationCount : null,
            referenceCount: typeof item.referenceCount === 'number' ? item.referenceCount : null,
            retractionStatus: 'none',
            authors: Array.isArray(item.authors)
              ? item.authors
                  .map((author) => {
                    const name = String((author as Record<string, unknown>).name || '').trim()
                    if (!name) return null
                    return { name }
                  })
                  .filter((author): author is NonNullable<typeof author> => Boolean(author))
              : [],
          })
        )
      : []
  }
}
