'use server'

import { revalidatePath } from 'next/cache'
import {
  OnboardingV2EventSchema,
  OnboardingV2DailyRitualSubmissionSchema,
  OnboardingV2Phase1SubmissionSchema,
  OnboardingV2Phase2SubmissionSchema,
  OnboardingV2SafetyGateSubmissionSchema,
} from '@creeda/schemas'

import {
  persistOnboardingV2DailyRitual,
  persistOnboardingV2Phase1,
  persistOnboardingV2Phase2Day,
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

export async function submitOnboardingV2Phase1(rawPayload: unknown) {
  const parsed = OnboardingV2Phase1SubmissionSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return {
      success: false as const,
      error: 'Please complete the Phase 1 profile before continuing.',
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

  const result = await persistOnboardingV2Phase1({
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

export async function submitOnboardingV2Phase2Day(rawPayload: unknown) {
  const parsed = OnboardingV2Phase2SubmissionSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return {
      success: false as const,
      error: 'Please complete this Phase 2 diagnostic day before continuing.',
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

  const result = await persistOnboardingV2Phase2Day({
    supabase,
    userId: user.id,
    payload: parsed.data,
  })

  if (result.success) {
    revalidatePath('/onboarding')
    revalidatePath('/onboarding/phase-2')
    revalidatePath('/dashboard')
    revalidatePath(result.destination)
  }

  return result
}

export async function submitOnboardingV2DailyRitual(rawPayload: unknown) {
  const parsed = OnboardingV2DailyRitualSubmissionSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return {
      success: false as const,
      error: 'Please complete the daily ritual before continuing.',
      details: parsed.error.flatten(),
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "Please log in to save today's ritual." }
  }

  const result = await persistOnboardingV2DailyRitual({
    supabase,
    userId: user.id,
    payload: parsed.data,
  })

  if (result.success) {
    revalidatePath('/onboarding')
    revalidatePath('/onboarding/daily-ritual')
    revalidatePath('/dashboard')
    revalidatePath(result.destination)
  }

  return result
}
