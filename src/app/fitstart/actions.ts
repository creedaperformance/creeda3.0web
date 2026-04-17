'use server'

import { revalidatePath } from 'next/cache'

import { verifyRole } from '@/lib/auth_utils'
import { fitStartSaveSchema, saveFitStartProfileForUser } from '@/lib/fitstart'
import { createClient } from '@/lib/supabase/server'

export async function saveFitStartProfile(rawPayload: unknown) {
  try {
    const parsed = fitStartSaveSchema.safeParse(rawPayload)
    if (!parsed.success) {
      return {
        success: false,
        error: 'Please finish the key onboarding inputs before starting your journey.',
      }
    }

    const { user } = await verifyRole('individual')
    const supabase = await createClient()
    const result = await saveFitStartProfileForUser({
      supabase,
      userId: user.id,
      payload: parsed.data,
    })

    if (result.success) {
      revalidatePath('/fitstart')
      revalidatePath('/individual')
      revalidatePath('/individual/dashboard')
    }

    return result
  } catch (error: unknown) {
    console.error('[fitstart] save failed', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save your FitStart profile.',
    }
  }
}
