import type { MetadataRoute } from 'next'
import { PUBLIC_URLS } from '@/lib/seo/public-urls'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.creeda.in').replace(/\/+$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return PUBLIC_URLS.map((entry) => ({
    url: `${siteUrl}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))
}
