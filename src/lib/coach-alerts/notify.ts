import 'server-only'

import webpush from 'web-push'

import { createAdminClient } from '@/lib/supabase/admin'
import { getVapidServerConfig } from '@/lib/env'

type SupabaseLike = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => any
}

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return true
  const vapid = getVapidServerConfig()
  if (!vapid) return false
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
  vapidConfigured = true
  return true
}

async function sendPushNotification(args: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  payload: { title: string; body: string; url: string }
}): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  if (!ensureVapid()) return { ok: false, error: 'vapid_not_configured' }
  try {
    await webpush.sendNotification(
      { endpoint: args.endpoint, keys: args.keys },
      JSON.stringify(args.payload)
    )
    return { ok: true }
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    const gone = status === 404 || status === 410
    return { ok: false, gone, error: (error as Error).message ?? `push_${status}` }
  }
}

export type AthleteRedFlag = {
  level: 'critical' | 'warning'
  reason: string
}

const RECENT_DEDUPE_HOURS = 12

/**
 * Detects red flags from a freshly persisted readiness/check-in event,
 * looks up squads the athlete belongs to, and pushes to each coach's
 * active push subscription. Dedupes — the same coach won't get more than
 * one push per athlete per 12 hours.
 *
 * Always best-effort. Errors are logged, never thrown.
 */
export async function notifyCoachesOfAthleteRedFlag(args: {
  athleteUserId: string
  flags: AthleteRedFlag[]
  trigger: 'daily_ritual' | 'readiness_recompute' | 'movement_baseline'
}) {
  if (args.flags.length === 0) return { sent: 0, skipped: 0 }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    console.warn('[coach-alerts] admin client unavailable', error)
    return { sent: 0, skipped: 0 }
  }

  const supabase = admin as unknown as SupabaseLike

  const { data: athleteRow } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', args.athleteUserId)
    .maybeSingle()
  const athleteName =
    (athleteRow as { full_name?: string } | null)?.full_name ??
    (athleteRow as { username?: string } | null)?.username ??
    'an athlete'

  const { data: memberships } = await supabase
    .from('squad_memberships')
    .select('squad_id')
    .eq('athlete_id', args.athleteUserId)
    .neq('status', 'left')
  if (!Array.isArray(memberships) || memberships.length === 0) {
    return { sent: 0, skipped: 0 }
  }
  const squadIds = memberships.map((m) => String((m as { squad_id: string }).squad_id))

  const { data: squads } = await supabase
    .from('squads')
    .select('id, coach_id, name')
    .in('id', squadIds)
  if (!Array.isArray(squads)) return { sent: 0, skipped: 0 }

  const coachIds = Array.from(new Set(squads.map((s) => String((s as { coach_id: string }).coach_id))))

  // Dedupe: skip if a coach got an alert for this athlete in the last 12h.
  const sinceIso = new Date(Date.now() - RECENT_DEDUPE_HOURS * 3600 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('coach_alerts')
    .select('coach_id')
    .eq('athlete_id', args.athleteUserId)
    .gte('sent_at', sinceIso)
  const recentCoachIds = new Set(
    Array.isArray(recent) ? recent.map((r) => String((r as { coach_id: string }).coach_id)) : []
  )

  const headline = args.flags.find((f) => f.level === 'critical')?.reason ?? args.flags[0].reason
  const titleSeverity = args.flags.some((f) => f.level === 'critical') ? 'Red flag' : 'Watch'

  let sent = 0
  let skipped = 0

  for (const coachId of coachIds) {
    if (recentCoachIds.has(coachId)) {
      skipped += 1
      continue
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', coachId)
      .eq('active', true)
      .limit(5)

    const subscriptions = Array.isArray(subs) ? subs : []
    let coachNotified = false
    for (const sub of subscriptions) {
      const record = sub as { id: string; endpoint: string; p256dh: string; auth: string }
      const result = await sendPushNotification({
        endpoint: record.endpoint,
        keys: { p256dh: record.p256dh, auth: record.auth },
        payload: {
          title: `${titleSeverity}: ${athleteName}`,
          body: headline,
          url: '/coach/squads',
        },
      })
      if (result.ok) {
        coachNotified = true
      } else if (result.gone) {
        await supabase
          .from('push_subscriptions')
          .update({ active: false, last_error: result.error ?? 'gone' })
          .eq('id', record.id)
      }
    }

    await supabase.from('coach_alerts').insert({
      coach_id: coachId,
      athlete_id: args.athleteUserId,
      level: args.flags.some((f) => f.level === 'critical') ? 'critical' : 'warning',
      reason: headline,
      trigger: args.trigger,
      delivered: coachNotified,
    })

    if (coachNotified) sent += 1
    else skipped += 1
  }

  return { sent, skipped }
}

export function detectAthleteRedFlags(input: {
  modifiedMode?: boolean
  readinessScore?: number | null
  acwrZone?: string | null
  apsqFlagLevel?: 'green' | 'amber' | 'red' | null
  dailyEnergy?: number | null
  dailyBodyFeel?: number | null
  painLocations?: string[] | null
  highestPainScore?: number | null
}): AthleteRedFlag[] {
  const flags: AthleteRedFlag[] = []

  if (input.modifiedMode) {
    flags.push({ level: 'critical', reason: 'Modified-mode active — needs medical clearance.' })
  }
  if (input.apsqFlagLevel === 'red') {
    flags.push({ level: 'critical', reason: 'APSQ-10 score in red band — high psychological strain.' })
  }
  if (input.acwrZone === 'danger') {
    flags.push({ level: 'critical', reason: 'ACWR in the danger zone (>1.5).' })
  }
  if (typeof input.readinessScore === 'number' && input.readinessScore < 35) {
    flags.push({ level: 'warning', reason: `Readiness ${input.readinessScore}/100 — recovery priority.` })
  }
  if (input.dailyEnergy !== null && input.dailyEnergy !== undefined && input.dailyEnergy <= 1) {
    flags.push({ level: 'warning', reason: 'Energy reported very low this morning.' })
  }
  if (input.dailyBodyFeel !== null && input.dailyBodyFeel !== undefined && input.dailyBodyFeel <= 1) {
    flags.push({ level: 'warning', reason: 'Body feel rated very low this morning.' })
  }
  if (typeof input.highestPainScore === 'number' && input.highestPainScore >= 7) {
    const region = (input.painLocations ?? [])[0] ?? 'a region'
    flags.push({
      level: 'critical',
      reason: `Reported ${input.highestPainScore}/10 pain in ${region.replace(/_/g, ' ')}.`,
    })
  }

  return flags
}
