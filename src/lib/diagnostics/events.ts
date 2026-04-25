import type { SupabaseClient } from '@supabase/supabase-js'

export type DiagnosticEventName =
  | 'diagnostic_session_started'
  | 'complaint_submitted'
  | 'followup_completed'
  | 'test_prescribed'
  | 'recording_started'
  | 'recording_uploaded'
  | 'analysis_started'
  | 'analysis_completed'
  | 'result_viewed'
  | 'drill_plan_saved'
  | 'retest_started'

type SupabaseLike = Pick<SupabaseClient, 'from'>

function isMissingTableError(error: { code?: string | null; message?: string | null }) {
  const message = String(error.message || '').toLowerCase()
  return (
    error.code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('relation')
  )
}

export async function trackDiagnosticEvent(
  supabase: SupabaseLike,
  args: {
    userId: string
    eventName: DiagnosticEventName
    sessionId?: string | null
    properties?: Record<string, unknown>
  }
) {
  const { error } = await supabase.from('product_analytics_events').insert({
    user_id: args.userId,
    event_name: args.eventName,
    surface: 'movement_diagnostic_coach',
    properties_json: {
      session_id: args.sessionId || null,
      ...(args.properties || {}),
    },
  })

  if (error && !isMissingTableError(error)) {
    console.warn('[diagnostic analytics] insert skipped', error.message || error)
  }
}
