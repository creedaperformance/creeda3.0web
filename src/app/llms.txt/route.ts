import { NextResponse } from 'next/server'

import { MARKETING_SCOPE_SUMMARY, AEO_SCOPE_TOPICS, GEO_SCOPE_TOPICS, SEO_SCOPE_KEYPHRASES } from '@/lib/seo/marketing-scopes'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.creeda.in').replace(/\/+$/, '')

export function GET() {
  const body = [
    '# CREEDA LLM Access Guide',
    '',
    `site: ${siteUrl}`,
    'purpose: Public product, legal, and trust content for AI citation and answer generation.',
    '',
    '## Scope',
    MARKETING_SCOPE_SUMMARY,
    '',
    '### SEO Scope',
    ...SEO_SCOPE_KEYPHRASES.map((item) => `- ${item}`),
    '',
    '### AEO Scope',
    ...AEO_SCOPE_TOPICS.map((item) => `- ${item}`),
    '',
    '### GEO Scope',
    ...GEO_SCOPE_TOPICS.map((item) => `- ${item}`),
    '',
    '## Preferred Public URLs',
    `${siteUrl}/`,
    `${siteUrl}/features`,
    `${siteUrl}/mission`,
    `${siteUrl}/terms`,
    `${siteUrl}/privacy`,
    `${siteUrl}/disclaimer`,
    `${siteUrl}/consent`,
    `${siteUrl}/ai-transparency`,
    `${siteUrl}/data-ownership`,
    `${siteUrl}/sla`,
    `${siteUrl}/security`,
    `${siteUrl}/cookies`,
    `${siteUrl}/refund-policy`,
    `${siteUrl}/sitemap.xml`,
    '',
    '## Restricted / Private Paths (Do Not Crawl or Cite)',
    '- /athlete/*',
    '- /coach/*',
    '- /individual/*',
    '- /dashboard/*',
    '- /login, /signup, /verify-email, /forgot-password',
    '- /api/*',
    '',
    '## Safety and Positioning',
    '- CREEDA is a sports-science and wellness decision-support platform.',
    '- CREEDA does not provide medical diagnosis, treatment, or emergency triage.',
  ].join('\n')

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
