import { redirect } from 'next/navigation'
import { OnboardingV2Phase2DaySchema, PersonaSchema, type OnboardingV2Phase2Day } from '@creeda/schemas'

import { createClient } from '@/lib/supabase/server'
import { Phase2OnboardingClient } from './Phase2OnboardingClient'

function completedDaysFrom(value: unknown): OnboardingV2Phase2Day[] {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const rawDays = record.completed_days
  if (!Array.isArray(rawDays)) return []
  return rawDays.filter((day): day is OnboardingV2Phase2Day => {
    const parsed = OnboardingV2Phase2DaySchema.safeParse(day)
    return parsed.success
  })
}

export default async function OnboardingV2Phase2Page(props: {
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
  const requestedDay = Array.isArray(searchParams?.day) ? searchParams.day[0] : searchParams?.day
  const day = OnboardingV2Phase2DaySchema.safeParse(requestedDay).success
    ? (requestedDay as OnboardingV2Phase2Day)
    : 'day1_aerobic'

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, persona, profile_calibration_pct')
    .eq('id', user.id)
    .maybeSingle()

  const personaParse = PersonaSchema.safeParse(profile?.persona ?? profile?.role)
  const persona = personaParse.success ? personaParse.data : 'individual'
  if (persona === 'coach') {
    redirect('/coach/dashboard')
  }

  const { data: adaptiveProfile } = await supabase
    .from('adaptive_form_profiles')
    .select('optional_fields')
    .eq('user_id', user.id)
    .eq('role', persona)
    .eq('flow_id', 'onboarding_v2_phase2')
    .maybeSingle()

  return (
    <Phase2OnboardingClient
      persona={persona}
      initialCalibrationPct={Number(profile?.profile_calibration_pct ?? 0)}
      initialDay={day}
      initialCompletedDays={completedDaysFrom(adaptiveProfile?.optional_fields)}
    />
  )
}
