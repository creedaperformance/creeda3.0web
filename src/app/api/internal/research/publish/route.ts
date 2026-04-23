import { enforceJsonRequest, jsonError, jsonResponse } from '@/lib/security/http'
import { authorizeResearchAdminRequest } from '@/lib/research/auth'
import { publishRuleRequestSchema } from '@/lib/research/schemas'
import { publishApprovedRules } from '@/lib/research/service'

export async function POST(request: Request) {
  try {
    if (!authorizeResearchAdminRequest(request)) {
      return jsonError(request, 401, 'Unauthorized.')
    }

    const contentTypeError = enforceJsonRequest(request)
    if (contentTypeError) return contentTypeError

    const body = publishRuleRequestSchema.parse(await request.json())
    const result = await publishApprovedRules(body)
    return jsonResponse(request, { ok: true, result })
  } catch (error) {
    console.error('[internal/research/publish] failed', error)
    return jsonError(request, 500, 'Could not publish rules.')
  }
}
