import { RESEARCH_SOURCE_DEFAULTS } from '@/lib/research/config'
import { buildSourceRecord, fetchWithRetry, stripTags } from '@/lib/research/sources/common'
import type { SourcePaperRecord } from '@/lib/research/types'

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export class CrossrefSourceAdapter {
  async enrichByDoi(doi: string): Promise<SourcePaperRecord | null> {
    const url = new URL(`${RESEARCH_SOURCE_DEFAULTS.crossref.baseUrl}/works/${encodeURIComponent(doi)}`)

    const body = await fetchWithRetry(
      'crossref.enrich',
      async () => {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
          },
        })
        if (response.status === 404) return null
        if (!response.ok) {
          throw new Error(`Crossref enrich failed with status ${response.status}`)
        }
        return response.json()
      },
      RESEARCH_SOURCE_DEFAULTS.crossref.retryAttempts,
      RESEARCH_SOURCE_DEFAULTS.crossref.minIntervalMs
    )

    if (!body) return null

    const message = body.message as Record<string, unknown>
    const licenseEntry = asArray(message.license as Record<string, unknown> | Record<string, unknown>[] | undefined)[0]
    const relation = (message.relation || {}) as Record<string, unknown>

    return buildSourceRecord({
      sourceKey: 'crossref',
      externalId: String(message.DOI || doi),
      sourceUrl: typeof message.URL === 'string' ? message.URL : null,
      payloadJson: message,
      identifiers: {
        doi: String(message.DOI || doi),
      },
      title: asArray(message.title as string | string[] | undefined)[0] || null,
      abstract: stripTags(typeof message.abstract === 'string' ? message.abstract : null),
      publicationYear: Number(((message.issued as Record<string, unknown> | undefined)?.['date-parts'] as number[][] | undefined)?.[0]?.[0] || 0) || null,
      publicationDate: null,
      journal: asArray(message['container-title'] as string | string[] | undefined)[0] || null,
      publisher: typeof message.publisher === 'string' ? message.publisher : null,
      isOpenAccess: Boolean(licenseEntry),
      license: typeof licenseEntry?.URL === 'string' ? licenseEntry.URL : null,
      fullTextUrl: typeof message.URL === 'string' ? message.URL : null,
      pdfUrl: null,
      citationCount: typeof message['is-referenced-by-count'] === 'number' ? message['is-referenced-by-count'] : null,
      referenceCount: Array.isArray(message.reference) ? message.reference.length : null,
      retractionStatus:
        relation['is-retracted-by'] || relation['updates']
          ? 'corrected'
          : 'none',
      authors: asArray(message.author as Record<string, unknown> | Record<string, unknown>[] | undefined)
        .map((author) => {
          const given = String(author.given || '').trim()
          const family = String(author.family || '').trim()
          const name = [given, family].filter(Boolean).join(' ').trim()
          if (!name) return null
          return {
            name,
            affiliation: asArray(author.affiliation as Array<Record<string, unknown>> | undefined)
              .map((entry) => String(entry.name || '').trim())
              .filter(Boolean)
              .join('; ') || null,
            orcid: typeof author.ORCID === 'string' ? author.ORCID : null,
          }
        })
        .filter((author): author is NonNullable<typeof author> => Boolean(author)),
    })
  }
}
