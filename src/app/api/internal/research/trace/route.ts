import { jsonError, jsonResponse } from '@/lib/security/http'
import { authorizeResearchAdminRequest } from '@/lib/research/auth'
import { getResearchBundles, traceBundleToPapers, traceRecommendationToBundle } from '@/lib/research/service'

export async function GET(request: Request) {
  try {
    if (!authorizeResearchAdminRequest(request)) {
      return jsonError(request, 401, 'Unauthorized.')
    }

    const url = new URL(request.url)
    const auditId = url.searchParams.get('auditId')
    const bundleId = url.searchParams.get('bundleId')
    const bundleKey = url.searchParams.get('bundleKey')

    if (auditId) {
      const trace = await traceRecommendationToBundle(auditId)
      return jsonResponse(request, { ok: true, trace })
    }

    if (bundleId) {
      const trace = await traceBundleToPapers(bundleId)
      return jsonResponse(request, { ok: true, trace })
    }

    if (bundleKey) {
      const bundles = await getResearchBundles()
      const matched = bundles.find((bundle) => bundle.bundleKey === bundleKey)
      if (!matched) {
        return jsonError(request, 404, 'Bundle not found.')
      }

      const trace = await traceBundleToPapers(matched.id)
      return jsonResponse(request, { ok: true, trace })
    }

    return jsonError(request, 400, 'Provide auditId, bundleId, or bundleKey.')
  } catch (error) {
    console.error('[internal/research/trace] failed', error)
    return jsonError(request, 500, 'Could not build research trace.')
  }
}
