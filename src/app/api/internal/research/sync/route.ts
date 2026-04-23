import { enforceJsonRequest, jsonError, jsonResponse } from '@/lib/security/http'
import { authorizeResearchAdminRequest } from '@/lib/research/auth'
import { syncRequestSchema } from '@/lib/research/schemas'
import { runResearchSync } from '@/lib/research/service'

export async function POST(request: Request) {
  try {
    if (!authorizeResearchAdminRequest(request)) {
      return jsonError(request, 401, 'Unauthorized.')
    }

    const contentTypeError = enforceJsonRequest(request)
    if (contentTypeError) return contentTypeError

    const body = syncRequestSchema.parse(await request.json())
    const result = await runResearchSync(body)
    return jsonResponse(request, { ok: true, result })
  } catch (error) {
    console.error('[internal/research/sync] failed', error)
    return jsonError(request, 500, 'Research sync failed.')
  }
}
