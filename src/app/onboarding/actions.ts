'use server'

import { revalidatePath } from 'next/cache'
import {
  OnboardingV2EventSchema,
  OnboardingV2SafetyGateSubmissionSchema,
} from '@creeda/schemas'

import {
  persistOnboardingV2SafetyGate,
  trackOnboardingV2EventForUser,
} from '@/lib/onboarding-v2/persistence'
import { createClient } from '@/lib/supabase/server'

export async function trackOnboardingV2Event(rawEvent: unknown) {
  const parsed = OnboardingV2EventSchema.safeParse(rawEvent)
  if (!parsed.success) {
    return { success: false as const, error: 'Invalid onboarding event.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'Authentication required.' }
  }

  return trackOnboardingV2EventForUser({
    supabase,
    userId: user.id,
    event: parsed.data,
  })
}

export async function submitOnboardingV2SafetyGate(rawPayload: unknown) {
  const parsed = OnboardingV2SafetyGateSubmissionSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return {
      success: false as const,
      error: 'Please complete the safety gate before continuing.',
      details: parsed.error.flatten(),
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'Please log in to continue onboarding.' }
  }

  const result = await persistOnboardingV2SafetyGate({
    supabase,
    userId: user.id,
    payload: parsed.data,
  })

  if (result.success) {
    revalidatePath('/onboarding')
    revalidatePath('/dashboard')
    revalidatePath(result.destination)
  }

  return result
}
