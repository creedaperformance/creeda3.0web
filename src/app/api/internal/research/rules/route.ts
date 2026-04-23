import { jsonError, jsonResponse } from '@/lib/security/http'
import { authorizeResearchAdminRequest } from '@/lib/research/auth'
import { getResearchRules } from '@/lib/research/service'

export async function GET(request: Request) {
  try {
    if (!authorizeResearchAdminRequest(request)) {
      return jsonError(request, 401, 'Unauthorized.')
    }

    const rules = await getResearchRules()
    return jsonResponse(request, { ok: true, rules })
  } catch (error) {
    console.error('[internal/research/rules] failed', error)
    return jsonError(request, 500, 'Could not load research rules.')
  }
}
