import 'server-only'

import type { Persona } from '@creeda/schemas'
import type { ConfidenceTier } from '@creeda/engine'

import { getVapidPublicKey } from '@/lib/env'
import {
  PHASE2_DAY_KEYS,
  PHASE2_TOTAL_DAYS,
  emptyOnboardingV2Snapshot,
  nextPhase2Day,
  type OnboardingV2Snapshot,
  type Phase2DayKey,
  type WeakLinkSummary,
} from './types'

type SupabaseLike = {
  from: (table: string) => any
}

type PostgrestMaybeError = {
  code?: string | null
  message?: string | null
}

function isMissingTableError(error: PostgrestMaybeError | null) {
  if (!error) return false
  const message = String(error.message || '').toLowerCase()
  return (
    error.code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('relation')
  )
}

async function safeMaybeSingle<T>(
  query: PromiseLike<{ data: T | null; error: PostgrestMaybeError | null }>
) {
  const result = await query
  if (result.error) {
    if (isMissingTableError(result.error)) return null
    throw result.error
  }
  return result.data ?? null
}

async function safeList<T>(
  query: PromiseLike<{ data: T[] | null; error: PostgrestMaybeError | null }>
) {
  const result = await query
  if (result.error) {
    if (isMissingTableError(result.error)) return [] as T[]
    throw result.error
  }
  return Array.isArray(result.data) ? result.data : ([] as T[])
}

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

function shiftIsoDate(iso: string, daysOffset: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + daysOffset)
  return dt.toISOString().slice(0, 10)
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function readNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readPersona(value: unknown): Persona | null {
  return value === 'athlete' || value === 'individual' || value === 'coach' ? value : null
}

function readTier(value: unknown): ConfidenceTier | null {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'locked'
    ? value
    : null
}

function parseCompletedPhase2Days(value: unknown): Phase2DayKey[] {
  if (!value || typeof value !== 'object') return []
  const candidate = (value as Record<string, unknown>).completed_days
  if (!Array.isArray(candidate)) return []
  return candidate.filter((day): day is Phase2DayKey =>
    typeof day === 'string' && (PHASE2_DAY_KEYS as readonly string[]).includes(day)
  )
}

function streakFromDates(dates: string[], today: string) {
  if (dates.length === 0) return 0
  const set = new Set(dates)
  let streak = 0
  let cursor = today
  while (set.has(cursor)) {
    streak += 1
    cursor = shiftIsoDate(cursor, -1)
  }
  return streak
}

export async function getOnboardingV2Snapshot(
  supabase: SupabaseLike,
  userId: string
): Promise<OnboardingV2Snapshot> {
  const today = todayInIndia()

  if (!userId) return emptyOnboardingV2Snapshot(today)

  const fourteenDaysAgo = shiftIsoDate(today, -13)

  const profile = await safeMaybeSingle<Record<string, unknown>>(
    supabase
      .from('profiles')
      .select('persona, onboarding_phase, profile_calibration_pct')
      .eq('id', userId)
      .maybeSingle()
  )

  const [medical, readinessRow, movementRow, checkInRows, phase2AdaptiveRow, pushRow] = await Promise.all([
    safeMaybeSingle<Record<string, unknown>>(
      supabase
        .from('medical_screenings')
        .select('any_yes, modified_mode_active, medical_clearance_provided')
        .eq('user_id', userId)
        .maybeSingle()
    ),
    safeMaybeSingle<Record<string, unknown>>(
      supabase
        .from('readiness_scores')
        .select(
          'score, confidence_tier, confidence_pct, drivers, missing_inputs, directive, date, computed_at'
        )
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
    ),
    safeMaybeSingle<Record<string, unknown>>(
      supabase
        .from('movement_baselines')
        .select(
          'movement_quality_score, weak_links, performed_at, passed_quality_gate, rejection_reason'
        )
        .eq('user_id', userId)
        .order('performed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ),
    safeList<Record<string, unknown>>(
      supabase
        .from('daily_check_ins')
        .select('date')
        .eq('user_id', userId)
        .gte('date', fourteenDaysAgo)
        .order('date', { ascending: false })
    ),
    safeMaybeSingle<Record<string, unknown>>(
      supabase
        .from('adaptive_form_profiles')
        .select('optional_fields')
        .eq('user_id', userId)
        .eq('flow_id', 'onboarding_v2_phase2')
        .maybeSingle()
    ),
    safeMaybeSingle<Record<string, unknown>>(
      supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('reminder_kind', 'daily_ritual')
        .eq('active', true)
        .limit(1)
        .maybeSingle()
    ),
  ])

  const persona = readPersona(profile?.persona)
  const onboardingPhase = clampInt(profile?.onboarding_phase, 0, 3, 0)
  const calibrationPct = clampInt(profile?.profile_calibration_pct, 0, 100, 0)
  const modifiedMode =
    Boolean(medical?.modified_mode_active) && !Boolean(medical?.medical_clearance_provided)
  const parqAnyYes = Boolean(medical?.any_yes)

  let latestReadiness: OnboardingV2Snapshot['latestReadiness'] = null
  if (readinessRow) {
    const tier = readTier(readinessRow.confidence_tier)
    const score = Number(readinessRow.score)
    if (Number.isFinite(score) && tier) {
      const confidencePct = clampInt(readinessRow.confidence_pct, 0, 100, 0)
      const drivers = Array.isArray(readinessRow.drivers)
        ? (readinessRow.drivers as unknown[]).flatMap((d) => {
            if (!d || typeof d !== 'object') return []
            const record = d as Record<string, unknown>
            const name = readString(record.name)
            if (!name) return []
            const contribution = readNumber(record.contribution)
            return [
              {
                name,
                contribution: contribution ?? 0,
                explanation: readString(record.explanation) ?? undefined,
              },
            ]
          })
        : []
      const missing = Array.isArray(readinessRow.missing_inputs)
        ? (readinessRow.missing_inputs as unknown[]).filter(
            (m): m is string => typeof m === 'string'
          )
        : []
      latestReadiness = {
        score: clampInt(score, 0, 100, 0),
        tier,
        confidencePct,
        drivers,
        missing,
        directive: readString(readinessRow.directive) ?? '',
        date: readString(readinessRow.date) ?? today,
        computedAt: readString(readinessRow.computed_at),
      }
    }
  }

  let latestMovementBaseline: OnboardingV2Snapshot['latestMovementBaseline'] = null
  if (movementRow) {
    const score = readNumber(movementRow.movement_quality_score)
    const performedAt = readString(movementRow.performed_at)
    const rejection = readString(movementRow.rejection_reason)
    const weakLinks: WeakLinkSummary[] = Array.isArray(movementRow.weak_links)
      ? (movementRow.weak_links as unknown[]).flatMap((w) => {
          if (!w || typeof w !== 'object') return []
          const record = w as Record<string, unknown>
          const region = readString(record.region)
          const finding = readString(record.finding)
          if (!region || !finding) return []
          const sev = record.severity
          const severity: WeakLinkSummary['severity'] =
            sev === 'severe' || sev === 'moderate' ? sev : 'mild'
          return [
            {
              region,
              finding,
              severity,
              drillId: readString(record.drill_id) ?? undefined,
            },
          ]
        })
      : []
    latestMovementBaseline = {
      score: score !== null ? clampInt(score, 0, 100, 0) : null,
      weakLinks,
      performedAt,
      passedQualityGate: Boolean(movementRow.passed_quality_gate),
      rejectionReason: rejection,
    }
  }

  const checkInDates = checkInRows
    .map((row) => readString(row.date))
    .filter((d): d is string => Boolean(d))
  const streakDays = streakFromDates(checkInDates, today)
  const hasToday = checkInDates.includes(today)
  const lastDate = checkInDates[0] ?? null

  const completedPhase2 = parseCompletedPhase2Days(phase2AdaptiveRow?.optional_fields)

  const hasV2Data =
    Boolean(profile) ||
    Boolean(latestReadiness) ||
    Boolean(latestMovementBaseline) ||
    checkInDates.length > 0 ||
    completedPhase2.length > 0 ||
    Boolean(medical)

  return {
    hasV2Data,
    persona,
    onboardingPhase,
    calibrationPct,
    modifiedMode,
    parqAnyYes,
    latestReadiness,
    latestMovementBaseline,
    dailyCheckIn: {
      streakDays,
      lastDate,
      hasToday,
      last14Days: checkInDates,
      today,
    },
    phase2: {
      daysCompleted: completedPhase2.length,
      totalDays: PHASE2_TOTAL_DAYS,
      completed: completedPhase2.length >= PHASE2_TOTAL_DAYS,
      nextDay: nextPhase2Day(completedPhase2),
    },
    reminderSubscription: {
      hasActive: Boolean(pushRow?.id),
      vapidPublicKey: getVapidPublicKey(),
    },
  }
}
