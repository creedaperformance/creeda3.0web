import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { jsonError, jsonResponse } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

const updateMobileProfileSchema = z.object({
  full_name: z.string().min(2, 'Name is too short.').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(20, 'Username must be 20 characters or fewer.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may contain only letters, numbers, and underscores.')
    .optional(),
  mobile_number: z.string().optional(),
  avatar_url: z.string().url().nullable().optional(),
})

function revalidateProfilePaths() {
  revalidatePath('/athlete')
  revalidatePath('/coach')
  revalidatePath('/dashboard')
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = updateMobileProfileSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return jsonError(request, 400, 'Invalid profile payload.', {
      details: parsed.error.flatten(),
    })
  }

  const payload = parsed.data
  const updates: Record<string, unknown> = {}

  if (payload.full_name !== undefined) {
    updates.full_name = payload.full_name.trim()
  }

  if (payload.username !== undefined) {
    const normalizedUsername = payload.username.trim().toLowerCase()
    const admin = createAdminClient()
    const { data: existingUsername, error: usernameError } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', normalizedUsername)
      .neq('id', auth.user.userId)
      .maybeSingle()

    if (usernameError) {
      return NextResponse.json(
        { error: 'Unable to validate username right now.' },
        { status: 500 }
      )
    }

    if (existingUsername) {
      return NextResponse.json(
        { error: 'This username is already taken.' },
        { status: 409 }
      )
    }

    updates.username = normalizedUsername
  }

  if (payload.mobile_number !== undefined) {
    const normalizedMobile = payload.mobile_number.trim()
    if (
      normalizedMobile &&
      !/^\+?[0-9]{10,15}$/.test(normalizedMobile.replace(/\s/g, ''))
    ) {
      return NextResponse.json(
        { error: 'Invalid mobile number format.' },
        { status: 400 }
      )
    }

    updates.mobile_number = normalizedMobile
  }

  if (payload.avatar_url !== undefined) {
    updates.avatar_url = payload.avatar_url
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', auth.user.userId)

  if (error) {
    return jsonError(request, 400, 'Unable to update profile right now.')
  }

  revalidateProfilePaths()

  return jsonResponse(request, {
    success: true,
    profile: {
      ...auth.user.profile,
      fullName:
        typeof updates.full_name === 'string' ? updates.full_name : auth.user.profile.fullName,
      username:
        typeof updates.username === 'string'
          ? updates.username
          : auth.user.profile.username,
      mobileNumber:
        typeof updates.mobile_number === 'string'
          ? updates.mobile_number
          : auth.user.profile.mobileNumber,
      avatarUrl:
        updates.avatar_url !== undefined
          ? (updates.avatar_url as string | null)
          : auth.user.profile.avatarUrl,
    },
  })
}
