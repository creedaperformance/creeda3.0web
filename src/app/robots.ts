import type { MetadataRoute } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.creeda.in').replace(/\/+$/, '')

const privateDisallowRules = [
  '/athlete/',
  '/coach/',
  '/individual/',
  '/dashboard/',
  '/login',
  '/signup',
  '/verify-email',
  '/forgot-password',
  '/verification-success',
  '/api/',
  '/auth/',
  '/test-results/',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/features', '/mission', '/terms', '/privacy', '/disclaimer', '/consent', '/ai-transparency', '/data-ownership', '/sla', '/security', '/cookies', '/refund-policy', '/llms.txt', '/sitemap.xml', '/indexnow.txt'],
        disallow: privateDisallowRules,
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'],
        allow: ['/', '/features', '/mission', '/terms', '/privacy', '/disclaimer', '/consent', '/ai-transparency', '/data-ownership', '/sla', '/security', '/cookies', '/refund-policy', '/llms.txt', '/sitemap.xml', '/indexnow.txt'],
        disallow: privateDisallowRules,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
