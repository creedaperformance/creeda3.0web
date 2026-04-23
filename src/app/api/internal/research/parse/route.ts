import { enforceJsonRequest, jsonError, jsonResponse } from '@/lib/security/http'
import { authorizeResearchAdminRequest } from '@/lib/research/auth'
import { parseRequestSchema } from '@/lib/research/schemas'
import { parsePendingResearch, scorePendingPapers, buildPendingBundles } from '@/lib/research/service'

export async function POST(request: Request) {
  try {
    if (!authorizeResearchAdminRequest(request)) {
      return jsonError(request, 401, 'Unauthorized.')
    }

    const contentTypeError = enforceJsonRequest(request)
    if (contentTypeError) return contentTypeError

    const body = parseRequestSchema.parse(await request.json())
    const parsed = await parsePendingResearch(body)
    const scored = await scorePendingPapers(body)
    const bundles = await buildPendingBundles()
    return jsonResponse(request, {
      ok: true,
      parsed,
      scored,
      bundles,
    })
  } catch (error) {
    console.error('[internal/research/parse] failed', error)
    return jsonError(request, 500, 'Research parsing failed.')
  }
}
