import 'server-only'

import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getCronSecret, getVapidServerConfig } from '@/lib/env'

export type ReminderDispatchResult = {
  ok: boolean
  reason?: 'missing_vapid' | 'missing_supabase' | 'unauthorized' | 'no_subscriptions'
  configured: boolean
  considered: number
  skippedAlreadyLogged: number
  skippedNotDueYet: number
  attempted: number
  sent: number
  pruned: number
  failed: number
  errors: Array<{ subscription_id: string; reason: string }>
}

const REMINDER_BODY = {
  title: 'Creeda · Today’s check-in',
  body: 'Three taps — energy, body, mind. Recalibrate today’s plan.',
  url: '/onboarding/daily-ritual',
}

function todayInTimezone(timezone: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  }
}

function localHourInTimezone(timezone: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const parts = formatter.formatToParts(new Date())
    const hour = parts.find((p) => p.type === 'hour')?.value
    return hour ? Number(hour) : null
  } catch {
    return null
  }
}

export function authorizeCronRequest(headers: Headers): boolean {
  const expected = getCronSecret()
  if (!expected) return false
  const header = headers.get('authorization') || headers.get('x-cron-secret') || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : header
  if (bearer === expected) return true
  // Vercel Cron forwards an x-vercel-cron-signature header; allow that as a
  // trust signal when the secret isn't directly attached.
  if (headers.get('x-vercel-cron') === '1' && header === '') {
    return Boolean(headers.get('x-vercel-id'))
  }
  return false
}

type SubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  reminder_local_hour: number
  reminder_timezone: string
  last_sent_at: string | null
}

export async function dispatchDailyRitualReminders(
  supabase: SupabaseClient,
  options: { now?: Date; hourTolerance?: number } = {}
): Promise<ReminderDispatchResult> {
  const now = options.now ?? new Date()
  const hourTolerance = options.hourTolerance ?? 1

  const result: ReminderDispatchResult = {
    ok: true,
    configured: false,
    considered: 0,
    skippedAlreadyLogged: 0,
    skippedNotDueYet: 0,
    attempted: 0,
    sent: 0,
    pruned: 0,
    failed: 0,
    errors: [],
  }

  const vapid = getVapidServerConfig()
  if (!vapid) {
    return { ...result, ok: false, reason: 'missing_vapid' }
  }
  result.configured = true

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  const { data: rows, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, reminder_local_hour, reminder_timezone, last_sent_at')
    .eq('reminder_kind', 'daily_ritual')
    .eq('active', true)

  if (error) {
    return { ...result, ok: false, reason: 'no_subscriptions' }
  }

  const subscriptions = (rows ?? []) as SubscriptionRow[]
  result.considered = subscriptions.length
  if (subscriptions.length === 0) return result

  // Dedup: at most one send per user per local day per device.
  const userIds = Array.from(new Set(subscriptions.map((s) => s.user_id)))
  const earliestToday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 1
  )).toISOString()

  const [{ data: checkInRows }, { data: alreadySentRows }] = await Promise.all([
    supabase
      .from('daily_check_ins')
      .select('user_id, date')
      .in('user_id', userIds)
      .gte('date', earliestToday.slice(0, 10)),
    supabase
      .from('reminder_dispatch_log')
      .select('user_id, sent_at, status')
      .in('user_id', userIds)
      .gte('sent_at', earliestToday)
      .eq('reminder_kind', 'daily_ritual')
      .eq('status', 'sent'),
  ])

  const checkInsByUser = new Map<string, Set<string>>()
  ;(checkInRows ?? []).forEach((row: any) => {
    const list = checkInsByUser.get(row.user_id) ?? new Set<string>()
    list.add(String(row.date))
    checkInsByUser.set(row.user_id, list)
  })

  const sentTodayByUser = new Set<string>(
    (alreadySentRows ?? []).flatMap((row: any) => {
      const sent = todayInTimezone('UTC')
      const sentDay = String(row.sent_at).slice(0, 10)
      return sentDay === sent ? [String(row.user_id)] : []
    })
  )

  for (const sub of subscriptions) {
    const userToday = todayInTimezone(sub.reminder_timezone)
    const userHour = localHourInTimezone(sub.reminder_timezone)
    const checkedInToday = checkInsByUser.get(sub.user_id)?.has(userToday) ?? false
    if (checkedInToday) {
      result.skippedAlreadyLogged += 1
      continue
    }
    if (sentTodayByUser.has(sub.user_id)) {
      result.skippedAlreadyLogged += 1
      continue
    }
    if (userHour !== null) {
      const targetHour = sub.reminder_local_hour
      const diff = Math.min(Math.abs(userHour - targetHour), 24 - Math.abs(userHour - targetHour))
      if (diff > hourTolerance) {
        result.skippedNotDueYet += 1
        continue
      }
    }

    result.attempted += 1
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: REMINDER_BODY.title,
          body: REMINDER_BODY.body,
          url: REMINDER_BODY.url,
        })
      )
      result.sent += 1
      await Promise.all([
        supabase
          .from('push_subscriptions')
          .update({
            last_sent_at: now.toISOString(),
            last_error: null,
            updated_at: now.toISOString(),
          })
          .eq('id', sub.id),
        supabase.from('reminder_dispatch_log').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          reminder_kind: 'daily_ritual',
          channel: 'web_push',
          status: 'sent',
          payload: { url: REMINDER_BODY.url },
        }),
      ])
    } catch (err) {
      const sendError = err as { statusCode?: number; body?: string; message?: string }
      const status = sendError.statusCode ?? 0
      const message = (sendError.body || sendError.message || 'unknown_error').slice(0, 500)
      if (status === 404 || status === 410) {
        result.pruned += 1
        await Promise.all([
          supabase
            .from('push_subscriptions')
            .update({
              active: false,
              last_error: 'gone',
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id),
          supabase.from('reminder_dispatch_log').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            reminder_kind: 'daily_ritual',
            channel: 'web_push',
            status: 'gone',
            error: message,
            payload: { status },
          }),
        ])
      } else {
        result.failed += 1
        result.errors.push({ subscription_id: sub.id, reason: `${status || 'err'}:${message}` })
        await Promise.all([
          supabase
            .from('push_subscriptions')
            .update({
              last_error: message,
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id),
          supabase.from('reminder_dispatch_log').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            reminder_kind: 'daily_ritual',
            channel: 'web_push',
            status: 'failed',
            error: message,
            payload: { status },
          }),
        ])
      }
    }
  }

  return result
}
