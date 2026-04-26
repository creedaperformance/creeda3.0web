import { redirect } from 'next/navigation'
import { PersonaSchema, type Persona } from '@creeda/schemas'

import { createClient } from '@/lib/supabase/server'
import { OnboardingV2Client } from './OnboardingV2Client'

function resolveInitialPersona(value: unknown, fallback: unknown): Persona {
  const parsedPersona = PersonaSchema.safeParse(value)
  if (parsedPersona.success) return parsedPersona.data

  const parsedFallback = PersonaSchema.safeParse(fallback)
  if (parsedFallback.success) return parsedFallback.data

  return 'individual'
}

export default async function OnboardingV2Page(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const searchParams = await props.searchParams
  const requestedPersona = Array.isArray(searchParams?.persona)
    ? searchParams?.persona[0]
    : searchParams?.persona
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, persona, profile_calibration_pct, onboarding_phase')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <OnboardingV2Client
      initialPersona={resolveInitialPersona(requestedPersona ?? profile?.persona, profile?.role)}
      initialCalibrationPct={Number(profile?.profile_calibration_pct ?? 0)}
      initialPhase={Number(profile?.onboarding_phase ?? 0)}
    />
  )
}
