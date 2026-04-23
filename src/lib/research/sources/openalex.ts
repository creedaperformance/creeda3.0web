import { RESEARCH_SOURCE_DEFAULTS } from '@/lib/research/config'
import { buildSourceRecord, fetchWithRetry } from '@/lib/research/sources/common'
import type { SourcePaperRecord } from '@/lib/research/types'

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export class OpenAlexSourceAdapter {
  constructor(private readonly apiKey?: string | null) {}

  async search(args: {
    query: string
    page?: number
    pageSize?: number
  }): Promise<{
    records: SourcePaperRecord[]
    nextPage: number
  }> {
    const page = args.page || 1
    const pageSize = args.pageSize || RESEARCH_SOURCE_DEFAULTS.openalex.pageSize
    const url = new URL(`${RESEARCH_SOURCE_DEFAULTS.openalex.baseUrl}/works`)
    url.searchParams.set('search', args.query)
    url.searchParams.set('page', String(page))
    url.searchParams.set('per-page', String(pageSize))
    if (this.apiKey) {
      url.searchParams.set('api_key', this.apiKey)
    }

    const body = await fetchWithRetry(
      'openalex.search',
      async () => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`OpenAlex search failed with status ${response.status}`)
        }
        return response.json()
      },
      RESEARCH_SOURCE_DEFAULTS.openalex.retryAttempts,
      RESEARCH_SOURCE_DEFAULTS.openalex.minIntervalMs
    )

    const results = Array.isArray(body?.results) ? body.results : []
    return {
      records: results.map((result: Record<string, unknown>) => {
        const openAccess = (result.open_access || {}) as Record<string, unknown>
        const primaryLocation = (result.primary_location || {}) as Record<string, unknown>
        const source = (primaryLocation.source || {}) as Record<string, unknown>
        return buildSourceRecord({
          sourceKey: 'openalex',
          externalId: String(result.id || ''),
          sourceUrl: typeof result.id === 'string' ? result.id : null,
          payloadJson: result,
          identifiers: {
            doi: typeof result.doi === 'string' ? result.doi.replace(/^https:\/\/doi.org\//i, '') : null,
            openalexId: typeof result.id === 'string' ? result.id : null,
          },
          title: typeof result.title === 'string' ? result.title : null,
          abstract: null,
          publicationYear: Number(result.publication_year || 0) || null,
          publicationDate: typeof result.publication_date === 'string' ? result.publication_date : null,
          journal: typeof source.display_name === 'string' ? source.display_name : null,
          publisher: typeof source.host_organization_name === 'string' ? source.host_organization_name : 'OpenAlex',
          isOpenAccess: Boolean(openAccess.is_oa),
          license: typeof openAccess.license === 'string' ? openAccess.license : null,
          fullTextUrl: typeof openAccess.oa_url === 'string' ? openAccess.oa_url : null,
          pdfUrl: null,
          citationCount: typeof result.cited_by_count === 'number' ? result.cited_by_count : null,
          referenceCount: Array.isArray(result.referenced_works) ? result.referenced_works.length : null,
          retractionStatus: Boolean(result.is_retracted) ? 'retracted' : 'none',
          authors: asArray(result.authorships as Record<string, unknown> | Record<string, unknown>[] | undefined)
            .map((authorship) => {
              const author = (authorship.author || {}) as Record<string, unknown>
              const name = String(author.display_name || '').trim()
              if (!name) return null
              return {
                name,
                affiliation: asArray(authorship.institutions as Array<Record<string, unknown>> | undefined)
                  .map((institution) => String(institution.display_name || '').trim())
                  .filter(Boolean)
                  .join('; ') || null,
                orcid: typeof author.orcid === 'string' ? author.orcid : null,
              }
            })
            .filter((author): author is NonNullable<typeof author> => Boolean(author)),
        })
      }),
      nextPage: page + 1,
    }
  }
}
