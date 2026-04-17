'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import {
  athleteOnboardingSchema,
  submitAthleteOnboardingForUser,
} from '@/lib/athlete-onboarding'
import { verifyRole } from '@/lib/auth_utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function submitDiagnosticForm(rawData: unknown) {
  const parsed = athleteOnboardingSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please complete every required athlete onboarding field before continuing.',
    }
  }

  const { user } = await verifyRole('athlete')
  const supabase = await createClient()
  const admin = createAdminClient()
  const requestHeaders = await headers()

  const result = await submitAthleteOnboardingForUser({
    supabase,
    adminLookupSupabase: admin,
    userId: user.id,
    payload: parsed.data,
    auditMeta: {
      userAgent: requestHeaders.get('user-agent'),
      requestIp: requestHeaders.get('x-forwarded-for'),
    },
  })

  if ('error' in result) {
    return result
  }

  revalidatePath('/athlete')
  revalidatePath('/athlete/dashboard')
  revalidatePath('/athlete/onboarding')

  return result
}
