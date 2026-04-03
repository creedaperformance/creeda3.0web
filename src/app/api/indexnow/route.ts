import { NextResponse } from 'next/server'
import { PUBLIC_URLS } from '@/lib/seo/public-urls'

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
]

function normalizeSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.creeda.in').replace(/\/+$/, '')
}

function getDefaultUrls(siteUrl: string) {
  return PUBLIC_URLS.map((entry) => `${siteUrl}${entry.path}`)
}

function filterAllowedUrls(candidateUrls: string[], siteUrl: string) {
  const base = new URL(siteUrl)
  return candidateUrls
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .filter((url) => {
      try {
        const parsed = new URL(url)
        return parsed.origin === base.origin
      } catch {
        return false
      }
    })
    .slice(0, 1000)
}

export async function POST(request: Request) {
  const apiToken = (process.env.INDEXNOW_API_TOKEN || '').trim()
  const indexNowKey = (process.env.INDEXNOW_KEY || '').trim()
  const siteUrl = normalizeSiteUrl()

  if (!indexNowKey) {
    return NextResponse.json(
      { ok: false, message: 'INDEXNOW_KEY is not configured.' },
      { status: 503 }
    )
  }

  if (apiToken) {
    const requestToken = request.headers.get('x-indexnow-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
    if (requestToken !== apiToken) {
      return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 })
    }
  }

  let requestedUrls: string[] | undefined
  try {
    const parsedBody = await request.json()
    if (Array.isArray(parsedBody?.urls)) {
      requestedUrls = parsedBody.urls.map((url: unknown) => String(url))
    }
  } catch {
    requestedUrls = undefined
  }

  const urls = filterAllowedUrls(requestedUrls || getDefaultUrls(siteUrl), siteUrl)
  if (!urls.length) {
    return NextResponse.json({ ok: false, message: 'No valid URLs to submit.' }, { status: 400 })
  }

  const host = new URL(siteUrl).host
  const payload = {
    host,
    key: indexNowKey,
    keyLocation: `${siteUrl}/indexnow.txt`,
    urlList: urls,
  }

  const results = await Promise.all(
    INDEXNOW_ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(payload),
        })
        return {
          endpoint,
          status: response.status,
          ok: response.ok,
        }
      } catch {
        return {
          endpoint,
          status: 0,
          ok: false,
        }
      }
    })
  )

  const success = results.some((item) => item.ok)
  return NextResponse.json({
    ok: success,
    submittedUrlCount: urls.length,
    endpoints: results,
  })
}
