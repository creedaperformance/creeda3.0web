import { jsonError, jsonResponse } from '@/lib/security/http'
import { authorizeResearchAdminRequest } from '@/lib/research/auth'
import { getResearchPapers } from '@/lib/research/service'
import { researchPaperFilterSchema } from '@/lib/research/schemas'

export async function GET(request: Request) {
  try {
    if (!authorizeResearchAdminRequest(request)) {
      return jsonError(request, 401, 'Unauthorized.')
    }

    const url = new URL(request.url)
    const filters = researchPaperFilterSchema.parse({
      status: url.searchParams.get('status') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    })

    const papers = await getResearchPapers(filters)
    return jsonResponse(request, { ok: true, papers })
  } catch (error) {
    console.error('[internal/research/papers] failed', error)
    return jsonError(request, 500, 'Could not load research papers.')
  }
}
