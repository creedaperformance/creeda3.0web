import { RESEARCH_SOURCE_DEFAULTS } from '@/lib/research/config'
import { buildSourceRecord, fetchWithRetry } from '@/lib/research/sources/common'
import type { SourcePaperRecord } from '@/lib/research/types'

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export class EuropePmcSourceAdapter {
  async search(args: {
    query: string
    cursorMark?: string
    pageSize?: number
  }): Promise<{
    records: SourcePaperRecord[]
    nextCursorMark: string | null
    hitCount: number
  }> {
    const pageSize = args.pageSize || RESEARCH_SOURCE_DEFAULTS.europe_pmc.pageSize
    const url = new URL(`${RESEARCH_SOURCE_DEFAULTS.europe_pmc.baseUrl}/search`)
    url.searchParams.set('query', args.query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('pageSize', String(pageSize))
    url.searchParams.set('resultType', 'core')
    url.searchParams.set('cursorMark', args.cursorMark || '*')

    const body = await fetchWithRetry(
      'europepmc.search',
      async () => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Europe PMC search failed with status ${response.status}`)
        }
        return response.json()
      },
      RESEARCH_SOURCE_DEFAULTS.europe_pmc.retryAttempts,
      RESEARCH_SOURCE_DEFAULTS.europe_pmc.minIntervalMs
    )

    const results = Array.isArray(body?.resultList?.result) ? body.resultList.result : []
    const records = results.map((result: Record<string, unknown>) => {
      const fullTextEntries = asArray(
        (((result.fullTextUrlList || {}) as Record<string, unknown>).fullTextUrl || {}) as Record<string, unknown> | Record<string, unknown>[]
      )
      const firstFullText = fullTextEntries[0]
      const authors = String(result.authorString || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name }))

      return buildSourceRecord({
        sourceKey: 'europe_pmc',
        externalId: String(result.id || result.pmid || result.pmcid || ''),
        sourceUrl: typeof result.fullTextUrl === 'string' ? result.fullTextUrl : null,
        payloadJson: result,
        identifiers: {
          doi: typeof result.doi === 'string' ? result.doi : null,
          pmid: typeof result.pmid === 'string' ? result.pmid : null,
          pmcid: typeof result.pmcid === 'string' ? result.pmcid : null,
        },
        title: typeof result.title === 'string' ? result.title : null,
        abstract: typeof result.abstractText === 'string' ? result.abstractText : null,
        publicationYear: Number(result.pubYear || 0) || null,
        publicationDate: typeof result.firstPublicationDate === 'string' ? result.firstPublicationDate : null,
        journal: typeof result.journalTitle === 'string' ? result.journalTitle : null,
        publisher: typeof result.pubType === 'string' ? result.pubType : 'Europe PMC',
        isOpenAccess: String(result.isOpenAccess || '').toUpperCase() === 'Y',
        license: typeof firstFullText?.license === 'string' ? firstFullText.license : null,
        fullTextUrl: typeof firstFullText?.url === 'string' ? firstFullText.url : null,
        pdfUrl:
          ((): string | null => {
            const pdfEntry = fullTextEntries.find(
              (entry) => String(entry.documentStyle || '').toLowerCase() === 'pdf'
            )
            return pdfEntry && typeof pdfEntry.url === 'string' ? pdfEntry.url : null
          })(),
        citationCount: Number(result.citedByCount || 0) || null,
        referenceCount: null,
        retractionStatus: String(result.retractionStatement || '').trim() ? 'corrected' : 'none',
        authors,
      })
    })

    return {
      records,
      nextCursorMark: typeof body.nextCursorMark === 'string' ? body.nextCursorMark : null,
      hitCount: Number(body.hitCount || 0),
    }
  }
}
