import { XMLParser } from 'fast-xml-parser'

import { RESEARCH_SOURCE_DEFAULTS } from '@/lib/research/config'
import { buildSourceRecord, fetchWithRetry } from '@/lib/research/sources/common'
import type { SourcePaperRecord } from '@/lib/research/types'

type PubMedSearchResult = {
  records: SourcePaperRecord[]
  nextStart: number
  totalCount: number
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

function extractYear(pubDate: Record<string, unknown> | undefined) {
  const year = pubDate?.Year
  if (typeof year === 'string' && /^\d{4}$/.test(year)) return Number(year)
  const medlineDate = typeof pubDate?.MedlineDate === 'string' ? pubDate.MedlineDate : ''
  const match = medlineDate.match(/\b(19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

function extractArticleIds(articleIdList: unknown) {
  const articleIds = Array.isArray(articleIdList) ? articleIdList : articleIdList ? [articleIdList] : []
  const identifiers: Record<string, string | null> = {
    doi: null,
    pmcid: null,
  }

  for (const articleId of articleIds) {
    if (!articleId || typeof articleId !== 'object') continue
    const value = String((articleId as Record<string, unknown>)['#text'] || '').trim()
    const idType = String((articleId as Record<string, unknown>).IdType || '').toLowerCase()
    if (!value || !idType) continue
    if (idType === 'doi') identifiers.doi = value
    if (idType === 'pmc') identifiers.pmcid = value
  }

  return identifiers
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function mapPubMedArticle(article: Record<string, unknown>): SourcePaperRecord {
  const medlineCitation = (article.MedlineCitation || {}) as Record<string, unknown>
  const pubmedData = (article.PubmedData || {}) as Record<string, unknown>
  const pmid = String((medlineCitation.PMID as Record<string, unknown> | string | undefined) || '').replace(/\D+/g, '')
  const articleNode = ((medlineCitation.Article || {}) as Record<string, unknown>)
  const journalNode = ((articleNode.Journal || {}) as Record<string, unknown>)
  const pubDate = ((journalNode.JournalIssue || {}) as Record<string, unknown>).PubDate as Record<string, unknown> | undefined
  const abstractText = asArray(
    ((articleNode.Abstract || {}) as Record<string, unknown>).AbstractText as string | string[] | undefined
  )
    .map((entry) => (typeof entry === 'string' ? entry : String((entry as Record<string, unknown>)['#text'] || '')))
    .join(' ')
    .trim()

  const identifiers = extractArticleIds(((pubmedData.ArticleIdList || {}) as Record<string, unknown>).ArticleId)
  const authors = asArray(
    (((articleNode.AuthorList || {}) as Record<string, unknown>).Author as Record<string, unknown> | Record<string, unknown>[] | undefined)
  )
    .map((author) => {
      const lastName = String(author.LastName || '').trim()
      const foreName = String(author.ForeName || author.Initials || '').trim()
      const affiliation = asArray(
        (((author.AffiliationInfo || {}) as Record<string, unknown>).Affiliation as string | string[] | undefined)
      )[0]

      const name = [foreName, lastName].filter(Boolean).join(' ').trim()
      if (!name) return null
      return {
        name,
        affiliation: typeof affiliation === 'string' ? affiliation : null,
      }
    })
    .filter((author): author is NonNullable<typeof author> => Boolean(author))

  return buildSourceRecord({
    sourceKey: 'pubmed',
    externalId: pmid,
    sourceUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null,
    payloadJson: article,
    identifiers: {
      doi: identifiers.doi,
      pmid,
      pmcid: identifiers.pmcid,
    },
    title: String(articleNode.ArticleTitle || '').trim() || null,
    abstract: abstractText || null,
    publicationYear: extractYear(pubDate),
    publicationDate: null,
    journal: String(journalNode.Title || '').trim() || null,
    publisher: 'NCBI / PubMed',
    isOpenAccess: Boolean(identifiers.pmcid),
    license: identifiers.pmcid ? 'open access status to be verified via Europe PMC' : null,
    fullTextUrl: identifiers.pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${identifiers.pmcid}/` : null,
    pdfUrl: null,
    retractionStatus: /retracted/i.test(String(articleNode.ArticleTitle || '')) ? 'retracted' : 'none',
    authors,
  })
}

export class PubMedSourceAdapter {
  async search(args: {
    query: string
    start?: number
    pageSize?: number
  }): Promise<PubMedSearchResult> {
    const start = args.start || 0
    const pageSize = args.pageSize || RESEARCH_SOURCE_DEFAULTS.pubmed.pageSize
    const searchUrl = new URL(`${RESEARCH_SOURCE_DEFAULTS.pubmed.baseUrl}/esearch.fcgi`)
    searchUrl.searchParams.set('db', 'pubmed')
    searchUrl.searchParams.set('retmode', 'json')
    searchUrl.searchParams.set('retmax', String(pageSize))
    searchUrl.searchParams.set('retstart', String(start))
    searchUrl.searchParams.set('term', args.query)

    const searchBody = await fetchWithRetry(
      'pubmed.search',
      async () => {
        const response = await fetch(searchUrl)
        if (!response.ok) {
          throw new Error(`PubMed search failed with status ${response.status}`)
        }
        return response.json()
      },
      RESEARCH_SOURCE_DEFAULTS.pubmed.retryAttempts,
      RESEARCH_SOURCE_DEFAULTS.pubmed.minIntervalMs
    )

    const ids: string[] = Array.isArray(searchBody?.esearchresult?.idlist)
      ? searchBody.esearchresult.idlist.map(String)
      : []
    if (ids.length === 0) {
      return {
        records: [],
        nextStart: start + pageSize,
        totalCount: Number(searchBody?.esearchresult?.count || 0),
      }
    }

    const fetchUrl = new URL(`${RESEARCH_SOURCE_DEFAULTS.pubmed.baseUrl}/efetch.fcgi`)
    fetchUrl.searchParams.set('db', 'pubmed')
    fetchUrl.searchParams.set('retmode', 'xml')
    fetchUrl.searchParams.set('id', ids.join(','))

    const xml = await fetchWithRetry(
      'pubmed.efetch',
      async () => {
        const response = await fetch(fetchUrl)
        if (!response.ok) {
          throw new Error(`PubMed efetch failed with status ${response.status}`)
        }
        return response.text()
      },
      RESEARCH_SOURCE_DEFAULTS.pubmed.retryAttempts,
      RESEARCH_SOURCE_DEFAULTS.pubmed.minIntervalMs
    )

    const parsed = xmlParser.parse(xml) as Record<string, unknown>
    const articles = asArray(
      (((parsed.PubmedArticleSet || {}) as Record<string, unknown>).PubmedArticle || {}) as Record<string, unknown> | Record<string, unknown>[]
    )

    return {
      records: articles.map(mapPubMedArticle),
      nextStart: start + pageSize,
      totalCount: Number(searchBody?.esearchresult?.count || 0),
    }
  }
}
