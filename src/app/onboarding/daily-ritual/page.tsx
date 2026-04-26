import { redirect } from 'next/navigation'
import { PersonaSchema } from '@creeda/schemas'

import { createClient } from '@/lib/supabase/server'
import { DailyRitualClient } from './DailyRitualClient'

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

function completedDatesFrom(value: unknown) {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const dates = record.completed_dates
  if (!Array.isArray(dates)) return []
  return dates.filter((date): date is string => /^\d{4}-\d{2}-\d{2}$/.test(String(date)))
}

export default async function OnboardingV2DailyRitualPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
    .eq('flow_id', 'onboarding_v2_daily_ritual')
    .maybeSingle()

  const today = todayInIndia()
  const { data: readiness } = await supabase
    .from('readiness_scores')
    .select('score,directive,confidence_pct')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  return (
    <DailyRitualClient
      persona={persona}
      today={today}
      initialCalibrationPct={Number(profile?.profile_calibration_pct ?? 0)}
      completedDates={completedDatesFrom(adaptiveProfile?.optional_fields)}
      initialReadiness={
        readiness
          ? {
              score: Number(readiness.score ?? 0),
              directive: String(readiness.directive ?? ''),
              confidencePct: Number(readiness.confidence_pct ?? 0),
            }
          : null
      }
    />
  )
}
