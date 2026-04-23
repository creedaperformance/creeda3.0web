import { jsonError, jsonResponse } from '@/lib/security/http'
import { authorizeResearchAdminRequest } from '@/lib/research/auth'
import { getResearchBundles } from '@/lib/research/service'

export async function GET(request: Request) {
  try {
    if (!authorizeResearchAdminRequest(request)) {
      return jsonError(request, 401, 'Unauthorized.')
    }

    const bundles = await getResearchBundles()
    return jsonResponse(request, { ok: true, bundles })
  } catch (error) {
    console.error('[internal/research/bundles] failed', error)
    return jsonError(request, 500, 'Could not load research bundles.')
  }
}
