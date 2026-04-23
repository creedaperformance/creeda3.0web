import { canStorePassage, isFullTextAllowed, resolveAccessPolicy } from '@/lib/research/access-policy'

describe('research access policy', () => {
  test('allows open access full text when open license is present', () => {
    const decision = resolveAccessPolicy({
      sourceKey: 'europe_pmc',
      isOpenAccess: true,
      license: 'CC-BY-4.0',
      fullTextUrl: 'https://example.org/full-text',
    })

    expect(decision.accessPolicy).toBe('open_access_fulltext_allowed')
    expect(isFullTextAllowed(decision)).toBe(true)
    expect(canStorePassage(decision)).toBe(true)
  })

  test('blocks full text when a pointer exists without reuse rights', () => {
    const decision = resolveAccessPolicy({
      sourceKey: 'crossref',
      isOpenAccess: false,
      license: 'all rights reserved',
      fullTextUrl: 'https://publisher.example/paper',
    })

    expect(decision.accessPolicy).toBe('blocked_fulltext')
    expect(isFullTextAllowed(decision)).toBe(false)
    expect(canStorePassage(decision)).toBe(false)
    expect(decision.reason).toBe('fulltext_present_without_reuse_rights')
  })

  test('falls back to metadata-only when no legal full text path exists', () => {
    const decision = resolveAccessPolicy({
      sourceKey: 'pubmed',
      isOpenAccess: false,
      license: null,
      fullTextUrl: null,
    })

    expect(decision.accessPolicy).toBe('metadata_only')
    expect(decision.reason).toBe('metadata_only_no_permitted_fulltext')
  })
})
