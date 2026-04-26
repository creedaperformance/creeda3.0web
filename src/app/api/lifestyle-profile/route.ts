import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const LifestyleProfileSchema = z.object({
  profession: z.string().trim().max(80).optional(),
  work_pattern: z
    .enum([
      'desk_office',
      'desk_remote',
      'mixed',
      'on_feet',
      'physical_labour',
      'shift_work',
      'travel_heavy',
      'student',
      'unemployed',
      'retired',
      'other',
    ])
    .optional(),
  weekly_work_hours: z.number().int().min(0).max(120).optional(),
  desk_hours_per_day: z.number().int().min(0).max(24).optional(),
  primary_stressors: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  typical_wake_time_local: z.string().trim().max(8).optional(),
  typical_sleep_time_local: z.string().trim().max(8).optional(),
  typical_meals_per_day: z.number().int().min(0).max(8).optional(),
  meal_timing_pattern: z
    .enum(['regular', 'irregular', 'intermittent_fasting', 'shift_work_grazing'])
    .optional(),
  alcohol_drinks_per_week: z.number().int().min(0).max(50).optional(),
  smoking_status: z.enum(['never', 'former', 'occasional', 'daily']).optional(),
  caffeine_drinks_per_day: z.number().int().min(0).max(15).optional(),
  hydration_intent_litres: z.number().min(0).max(8).optional(),
  primary_motivator: z
    .enum([
      'energy',
      'mood',
      'longevity',
      'aesthetics',
      'sport_performance',
      'rehab',
      'social',
      'discipline',
      'medical_advice',
    ])
    .optional(),
  fitness_history: z.string().trim().max(280).optional(),
  exercise_environment: z.enum(['gym', 'home', 'outdoor', 'mixed']).optional(),
  available_days_per_week: z.number().int().min(0).max(7).optional(),
  available_minutes_per_session: z.number().int().min(10).max(240).optional(),
  has_gym_access: z.boolean().default(false),
  has_home_equipment: z.boolean().default(false),
  outdoor_safety_concerns: z.boolean().default(false),
  caregiver_role: z.boolean().default(false),
  social_support: z.string().trim().max(120).optional(),
})

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = LifestyleProfileSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { error } = await supabase.from('lifestyle_profile').upsert(
    {
      user_id: user.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return NextResponse.json({ error: 'persist_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
