import { NextRequest, NextResponse } from 'next/server'

import { createVideoUploadSchema, formatDiagnosticRequestIssues } from '@/lib/diagnostics/api'
import { createDiagnosticVideoCapture } from '@/lib/diagnostics/service'
import { enforceJsonRequest, enforceTrustedMutationOrigin, handleApiError, jsonError } from '@/lib/security/http'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = enforceTrustedMutationOrigin(request)
  if (originError) return originError

  const contentTypeError = enforceJsonRequest(request, { maxBytes: 32 * 1024 })
  if (contentTypeError) return contentTypeError

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return jsonError(request, 401, 'Unauthorized.')

  try {
    const { id } = await params
    const body = createVideoUploadSchema.parse(await request.json())
    const result = await createDiagnosticVideoCapture(supabase, {
      userId: user.id,
      sessionId: id,
      testId: body.test_id,
      cameraUsed: body.camera_used,
      deviceMetadata: body.device_metadata || null,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const issues = formatDiagnosticRequestIssues(error)
    if (issues) {
      return jsonError(request, 400, 'Invalid diagnostic video request.', { issues })
    }

    return handleApiError(request, error, {
      logLabel: '[api/diagnostic/sessions/[id]/video-upload] failed',
      publicMessage: 'Failed to create the video capture session.',
    })
  }
}
