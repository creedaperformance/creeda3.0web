import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseLike = Pick<SupabaseClient, 'from'>

export type ProductEventName =
  | 'onboarding_completed'
  | 'device_connection_attempted'
  | 'device_mock_sync_completed'
  | 'daily_checkin_completed'
  | 'workout_started'
  | 'workout_completed'
  | 'coach_session_assigned'
  | 'coach_feedback_added'
  | 'challenge_joined'
  | 'streak_retained'
  | 'recommendation_used'

export async function trackProductEvent(supabase: SupabaseLike, args: {
  userId?: string | null
  eventName: ProductEventName
  surface: string
  properties?: Record<string, unknown>
}) {
  const { error } = await supabase.from('product_analytics_events').insert({
    user_id: args.userId || null,
    event_name: args.eventName,
    surface: args.surface,
    properties_json: args.properties || {},
  })

  if (error && !isMissingTableError(error)) {
    console.warn('[product analytics] insert skipped', error.message || error)
  }
}

export async function recordRecommendationAudit(supabase: SupabaseLike, args: {
  userId: string
  actorId?: string | null
  actorRole?: 'system' | 'athlete' | 'individual' | 'coach' | 'admin'
  surface: string
  recommendationType: string
  decision: string
  reasons: string[]
  provenance?: Record<string, unknown>
  confidencePct: number
}) {
  const { error } = await supabase.from('recommendation_audit_events').insert({
    user_id: args.userId,
    actor_id: args.actorId || null,
    actor_role: args.actorRole || 'system',
    surface: args.surface,
    recommendation_type: args.recommendationType,
    decision: args.decision,
    reasons: args.reasons,
    provenance_json: args.provenance || {},
    confidence_pct: args.confidencePct,
  })

  if (error && !isMissingTableError(error)) {
    console.warn('[recommendation audit] insert skipped', error.message || error)
  }
}

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
