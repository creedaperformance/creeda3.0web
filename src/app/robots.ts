import type { MetadataRoute } from 'next'
import { PUBLIC_URLS } from '@/lib/seo/public-urls'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.creeda.in').replace(/\/+$/, '')
const crawlablePaths = [
  ...PUBLIC_URLS.map(({ path }) => path),
  '/llms.txt',
  '/sitemap.xml',
  '/indexnow.txt',
]

const privateDisallowRules = [
  '/athlete/',
  '/coach/',
  '/individual/',
  '/dashboard/',
  '/join/',
  '/fitstart',
  '/welcome',
  '/role-selection',
  '/onboarding/',
  '/daily-checkin',
  '/weekly-review',
  '/analysis',
  '/peak',
  '/plan',
  '/results',
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
        allow: crawlablePaths,
        disallow: privateDisallowRules,
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'],
        allow: crawlablePaths,
        disallow: privateDisallowRules,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
