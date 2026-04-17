import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { handleApiError, jsonError, jsonResponse } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(auth.user.userId)

    if (error) {
      return jsonError(request, 400, 'Unable to delete this account right now.')
    }

    revalidatePath('/athlete')
    revalidatePath('/coach')
    revalidatePath('/dashboard')

    return jsonResponse(request, { success: true })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/account] failed',
      publicMessage: 'A system error occurred while deleting this account.',
    })
  }
}
