import { CrossrefSourceAdapter } from '@/lib/research/sources/crossref'
import { EuropePmcSourceAdapter } from '@/lib/research/sources/europe-pmc'
import { PubMedSourceAdapter } from '@/lib/research/sources/pubmed'

describe('research source adapters', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetAllMocks()
  })

  test('PubMed search fetches PMIDs and normalizes records', async () => {
    const fetchMock = jest.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          esearchresult: {
            count: '1',
            idlist: ['123456'],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <PubmedArticleSet>
            <PubmedArticle>
              <MedlineCitation>
                <PMID>123456</PMID>
                <Article>
                  <ArticleTitle>Sleep restriction and fatigue</ArticleTitle>
                  <Abstract>
                    <AbstractText>Sleep duration under 6 h increased fatigue risk.</AbstractText>
                  </Abstract>
                  <Journal>
                    <Title>Seed Journal</Title>
                    <JournalIssue>
                      <PubDate>
                        <Year>2024</Year>
                      </PubDate>
                    </JournalIssue>
                  </Journal>
                </Article>
              </MedlineCitation>
              <PubmedData>
                <ArticleIdList>
                  <ArticleId IdType="doi">10.1000/test</ArticleId>
                  <ArticleId IdType="pmc">PMC123</ArticleId>
                </ArticleIdList>
              </PubmedData>
            </PubmedArticle>
          </PubmedArticleSet>
        `,
      })

    global.fetch = fetchMock as typeof fetch
    const adapter = new PubMedSourceAdapter()
    const result = await adapter.search({
      query: 'sleep athlete',
      start: 0,
      pageSize: 5,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0].identifiers.pmid).toBe('123456')
    expect(result.records[0].identifiers.doi).toBe('10.1000/test')
    expect(result.records[0].identifiers.pmcid).toBe('PMC123')
  })

  test('Crossref enrichment pulls license and abstract metadata', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          DOI: '10.1000/test',
          title: ['Hydration and sprint performance'],
          abstract: '<jats:p>Dehydrated athletes showed lower sprint output.</jats:p>',
          URL: 'https://doi.org/10.1000/test',
          publisher: 'Crossref Journal',
          license: [{ URL: 'https://creativecommons.org/licenses/by/4.0/' }],
          author: [{ given: 'A', family: 'Researcher' }],
        },
      }),
    }) as typeof fetch

    const adapter = new CrossrefSourceAdapter()
    const record = await adapter.enrichByDoi('10.1000/test')

    expect(record?.license).toContain('creativecommons.org')
    expect(record?.abstract).toContain('Dehydrated athletes')
    expect(record?.isOpenAccess).toBe(true)
  })

  test('Europe PMC search returns OA links when permitted', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hitCount: 1,
        nextCursorMark: 'AoIIPzM=',
        resultList: {
          result: [
            {
              id: 'EPMC1',
              doi: '10.1000/europepmc',
              pmid: '55555',
              pmcid: 'PMC55555',
              title: 'Hydration and recovery',
              abstractText: 'Dehydrated athletes showed decreased sprint performance.',
              pubYear: '2022',
              firstPublicationDate: '2022-01-01',
              journalTitle: 'Europe PMC Journal',
              isOpenAccess: 'Y',
              fullTextUrlList: {
                fullTextUrl: [
                  {
                    url: 'https://example.org/full-text',
                    license: 'CC-BY-4.0',
                    documentStyle: 'html',
                  },
                ],
              },
            },
          ],
        },
      }),
    }) as typeof fetch

    const adapter = new EuropePmcSourceAdapter()
    const result = await adapter.search({
      query: 'hydration athlete',
    })

    expect(result.records[0].isOpenAccess).toBe(true)
    expect(result.records[0].fullTextUrl).toBe('https://example.org/full-text')
  })
})
