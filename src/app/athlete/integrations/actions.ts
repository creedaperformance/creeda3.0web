'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { verifyRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'
import { connectMockProvider } from '@/lib/product/operating-system/server'
import { trackProductEvent } from '@/lib/product/operating-system/analytics'

const simulateSchema = z.object({
  provider: z.enum(['apple_health', 'health_connect', 'google_fit', 'garmin', 'fitbit', 'manual_import']),
})

export async function simulateIntegrationSync(formData: FormData): Promise<void> {
  const parsed = simulateSchema.safeParse({
    provider: formData.get('provider'),
  })

  if (!parsed.success) {
    console.warn('[integrations] unsupported provider selected')
    return
  }

  const { user } = await verifyRole('athlete')
  const supabase = await createClient()

  await trackProductEvent(supabase, {
    userId: user.id,
    eventName: 'device_connection_attempted',
    surface: 'athlete_integrations',
    properties: {
      provider: parsed.data.provider,
      mode: 'mock_connector',
    },
  })

  try {
    await connectMockProvider(supabase, user.id, parsed.data.provider)
    revalidatePath('/athlete/integrations')
    revalidatePath('/athlete/dashboard')
    revalidatePath('/athlete/plans')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to simulate this connection right now.'
    console.warn('[integrations] failed to simulate sync', message)
  }
}
