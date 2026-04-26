import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ManualImportRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resting_hr: z.number().int().min(20).max(160).optional(),
  hrv_ms: z.number().min(0).max(300).optional(),
  sleep_hours: z.number().min(0).max(16).optional(),
  steps: z.number().int().min(0).max(120000).optional(),
  active_energy_kcal: z.number().int().min(0).max(20000).optional(),
  workout_minutes: z.number().int().min(0).max(600).optional(),
  workout_load_au: z.number().int().min(0).max(20000).optional(),
})

const ManualImportSchema = z.object({
  provider: z.enum(['manual', 'apple_health', 'health_connect', 'garmin', 'whoop', 'strava', 'fitbit', 'oura', 'polar']).default('manual'),
  rows: z.array(ManualImportRowSchema).min(1).max(180),
})

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = ManualImportSchema.safeParse(raw)
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

  const { provider, rows } = parsed.data

  // Ensure a wearable_connections row exists for this provider.
  await supabase
    .from('wearable_connections')
    .upsert(
      {
        user_id: user.id,
        provider,
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        metadata: { import_method: 'manual_csv', last_import_rows: rows.length },
      },
      { onConflict: 'user_id,provider' }
    )

  // Map manual rows into training_load_history so ACWR + readiness can use them.
  const trainingRows = rows.flatMap((row) => {
    if (!row.workout_minutes && !row.workout_load_au) return []
    return [
      {
        user_id: user.id,
        source: 'wearable_sync',
        date: row.date,
        sessions_count: 1,
        total_duration_minutes: row.workout_minutes ?? 0,
        average_rpe: row.workout_load_au && row.workout_minutes
          ? Math.min(10, Math.max(1, row.workout_load_au / row.workout_minutes))
          : null,
        notes: `wearable_manual_import:${provider}`,
      },
    ]
  })

  if (trainingRows.length > 0) {
    await supabase
      .from('training_load_history')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'wearable_sync')
      .ilike('notes', `wearable_manual_import:${provider}%`)

    await supabase.from('training_load_history').insert(trainingRows)
  }

  // Persist resting-HR + HRV samples into capacity_tests so the engine can use
  // them as latest values in readiness recompute.
  const capacityRows = rows.flatMap((row) => {
    const out: Array<Record<string, unknown>> = []
    if (typeof row.resting_hr === 'number') {
      out.push({
        user_id: user.id,
        test_type: 'resting_hr',
        test_method: 'wearable',
        raw_value: row.resting_hr,
        unit: 'bpm',
        derived_metrics: { source: provider },
        performed_at: `${row.date}T07:00:00Z`,
      })
    }
    if (typeof row.hrv_ms === 'number') {
      out.push({
        user_id: user.id,
        test_type: 'hrv_ppg',
        test_method: 'wearable',
        raw_value: row.hrv_ms,
        unit: 'ms',
        derived_metrics: { source: provider },
        performed_at: `${row.date}T07:00:00Z`,
      })
    }
    return out
  })

  if (capacityRows.length > 0) {
    await supabase.from('capacity_tests').insert(capacityRows)
  }

  return NextResponse.json({
    ok: true,
    rows_imported: rows.length,
    training_rows_inserted: trainingRows.length,
    capacity_rows_inserted: capacityRows.length,
  })
}
