'use server'

import { revalidatePath } from 'next/cache'

import { verifyRole } from '@/lib/auth_utils'
import {
  individualSignalSchema,
  logIndividualSignalForUser,
} from '@/lib/individual-logging'
import { createClient } from '@/lib/supabase/server'

export async function completeIndividualOnboarding() {
  return {
    error: 'Individual onboarding now runs through /fitstart. Please complete FitStart first.',
  }
}

export async function logIndividualSignal(rawPayload: unknown) {
  try {
    const payload = individualSignalSchema.parse(rawPayload)
    const { user } = await verifyRole('individual')
    const supabase = await createClient()

    const response = await logIndividualSignalForUser({
      supabase,
      userId: user.id,
      payload,
    })

    if ('error' in response) {
      return response
    }

    revalidatePath('/individual')
    revalidatePath('/individual/dashboard')
    revalidatePath('/individual/logging')

    return response
  } catch (error: unknown) {
    console.error('[individual/logging] submission failed', error)

    return {
      error: error instanceof Error ? error.message : 'Failed to save your individual daily log.',
    }
  }
}
