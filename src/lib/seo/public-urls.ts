export type PublicUrlEntry = {
  path: string
  priority: number
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
}

export const PUBLIC_URLS: PublicUrlEntry[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/mission', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/disclaimer', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/consent', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/ai-transparency', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/data-ownership', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/sla', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/security', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/refund-policy', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/cookies', priority: 0.4, changeFrequency: 'monthly' },
]

