import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { getTodayInIndia } from '@/lib/dashboard_decisions'
import { buildGoalEventPlan } from '@/lib/product/operating-system/goals'
import {
  buildConnectionList,
  createMockHealthSamples,
  legacyHealthToSamples,
  normalizeSampleRow,
  getConnector,
} from '@/lib/product/operating-system/integrations'
import { buildDailyReadinessOperatingScore } from '@/lib/product/operating-system/readiness'
import { buildRetentionSnapshot } from '@/lib/product/operating-system/retention'
import { recordRecommendationAudit, trackProductEvent } from '@/lib/product/operating-system/analytics'
import { getOrCreateTodayExecutionSession, listExecutionHistory } from '@/lib/product/server'
import type {
  CoachOperatingSnapshot,
  DailyOperatingSnapshot,
  DashboardSnapshotLike,
  HealthProvider,
  LegacyHealthSummary,
  NormalizedHealthSample,
} from '@/lib/product/operating-system/types'

type SupabaseLike = SupabaseClient

type PostgrestMaybeError = {
  code?: string | null
  message?: string | null
}

function isMissingTableError(error: PostgrestMaybeError | null) {
  const message = String(error?.message || '').toLowerCase()
  return (
    error?.code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('relation')
  )
}

async function safeList<T>(query: PromiseLike<{ data: T[] | null; error: PostgrestMaybeError | null }>) {
  const result = await query
  if (result.error) {
    if (isMissingTableError(result.error)) return [] as T[]
    throw result.error
  }
  return Array.isArray(result.data) ? result.data : [] as T[]
}

async function safeMaybeSingle<T>(query: PromiseLike<{ data: T | null; error: PostgrestMaybeError | null }>) {
  const result = await query
  if (result.error) {
    if (isMissingTableError(result.error)) return null
    throw result.error
  }
  return result.data || null
}

function normalizeHistoryForRetention(history: Awaited<ReturnType<typeof listExecutionHistory>>) {
  return history.map((entry) => ({
    status: entry.status,
    mode: entry.mode,
    sessionDate: entry.sessionDate,
    compliancePct: entry.compliancePct,
  }))
}

function mergeSamples(normalized: NormalizedHealthSample[], legacy: NormalizedHealthSample[]) {
  const byDateProvider = new Map<string, NormalizedHealthSample>()
  ;[...legacy, ...normalized].forEach((sample) => {
    byDateProvider.set(`${sample.date}:${sample.provider}`, sample)
  })
  return [...byDateProvider.values()].sort((left, right) => right.date.localeCompare(left.date))
}

export async function getDailyOperatingSnapshot(
  supabase: SupabaseLike,
  userId: string,
  snapshot: DashboardSnapshotLike
): Promise<DailyOperatingSnapshot> {
  const [
    connectionRows,
    sampleRows,
    goalRows,
    challengeRows,
    history,
    todaySession,
  ] = await Promise.all([
    safeList<Record<string, unknown>>(
      supabase
        .from('health_source_connections')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
    ),
    safeList<Record<string, unknown>>(
      supabase
        .from('normalized_health_samples')
        .select('*')
        .eq('user_id', userId)
        .order('sample_date', { ascending: false })
        .limit(21)
    ),
    safeList<Record<string, unknown>>(
      supabase
        .from('user_goal_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
    ),
    safeList<Record<string, unknown>>(
      supabase
        .from('challenges')
        .select('id,title,description,metric_key,target_value,duration_days,sport,visibility')
        .order('created_at', { ascending: false })
        .limit(6)
    ),
    listExecutionHistory(supabase, userId, 14),
    getOrCreateTodayExecutionSession(supabase, userId),
  ])

  const samples = mergeSamples(sampleRows.map(normalizeSampleRow), legacyHealthToSamples(snapshot.healthSummary || null))
  const retention = buildRetentionSnapshot({
    history: normalizeHistoryForRetention(history),
    challengeRows,
  })
  const readiness = buildDailyReadinessOperatingScore({
    snapshot,
    normalizedSamples: samples,
    completedSessionsLast7: history.slice(0, 7).filter((entry) => entry.status === 'completed').length,
    recoverySessionsLast7: history.slice(0, 7).filter((entry) => entry.mode === 'recovery' && entry.status === 'completed').length,
  })
  const goal = buildGoalEventPlan({
    snapshot,
    dbGoalRows: goalRows,
    weeklyCompliancePct: retention.weeklyCompliancePct,
    readinessScore: readiness.score,
  })
  const connections = buildConnectionList(connectionRows, snapshot.healthSummary || null)

  await recordRecommendationAudit(supabase, {
    userId,
    surface: 'athlete_dashboard',
    recommendationType: 'daily_action',
    decision: readiness.action,
    reasons: readiness.reasons.map((reason) => `${reason.label}: ${reason.detail}`),
    provenance: {
      dataSources: readiness.provenance,
      missingSignals: readiness.missingDataWarnings,
      goal,
    },
    confidencePct: readiness.confidencePct,
  })

  return {
    readiness,
    integrations: {
      connectedCount: connections.filter((source) => source.status === 'connected' || source.status === 'mock_connected').length,
      measuredSampleDays: new Set(samples.filter((sample) => sample.sourceCategory === 'measured').map((sample) => sample.date)).size,
      sources: connections,
      latestSample: samples[0] || null,
    },
    goal,
    retention,
    today: {
      title: todaySession.session.title,
      mode: todaySession.session.mode,
      expectedDurationMinutes: todaySession.expectedDurationMinutes,
      href: '/athlete/sessions/today',
    },
  }
}

export async function getIntegrationSnapshot(supabase: SupabaseLike, userId: string, legacyHealth: LegacyHealthSummary = null) {
  const [connectionRows, sampleRows] = await Promise.all([
    safeList<Record<string, unknown>>(
      supabase
        .from('health_source_connections')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
    ),
    safeList<Record<string, unknown>>(
      supabase
        .from('normalized_health_samples')
        .select('*')
        .eq('user_id', userId)
        .order('sample_date', { ascending: false })
        .limit(14)
    ),
  ])

  const sources = buildConnectionList(connectionRows, legacyHealth)
  return {
    sources,
    samples: sampleRows.map(normalizeSampleRow),
  }
}

export async function connectMockProvider(supabase: SupabaseLike, userId: string, provider: HealthProvider) {
  const connector = getConnector(provider)
  const now = new Date().toISOString()
  const today = getTodayInIndia()
  const connection = await safeMaybeSingle<Record<string, unknown>>(
    supabase
      .from('health_source_connections')
      .upsert(
        {
          user_id: userId,
          provider,
          display_name: connector.displayName,
          status: 'mock_connected',
          source_category: connector.sourceCategory,
          permission_state: {
            mock: true,
            signals: connector.supportedSignals,
            note: 'Demo connector. Replace with provider OAuth or mobile permissions in production.',
          },
          last_sync_at: now,
          last_error: null,
          enabled: true,
          updated_at: now,
        },
        { onConflict: 'user_id,provider' }
      )
      .select('id')
      .maybeSingle()
  )

  const samples = createMockHealthSamples(provider, today, 7)
  const rows = samples.map((sample) => ({
    user_id: userId,
    source_connection_id: connection?.id || null,
    provider,
    source_category: sample.sourceCategory,
    sample_date: sample.date,
    sleep_minutes: sample.sleepMinutes,
    sleep_quality_pct: sample.sleepQualityPct,
    hrv_ms: sample.hrvMs,
    resting_hr_bpm: sample.restingHrBpm,
    avg_hr_bpm: sample.avgHrBpm,
    steps: sample.steps,
    active_calories: sample.activeCalories,
    workout_minutes: sample.workoutMinutes,
    activity_load: sample.activityLoad,
    recovery_signal_pct: sample.recoverySignalPct,
    confidence_pct: sample.confidencePct,
    provenance_json: {
      connector: provider,
      source: 'mock_connector',
      productionStatus: connector.productionReadiness,
    },
    updated_at: now,
  }))

  const { error } = await supabase
    .from('normalized_health_samples')
    .upsert(rows, { onConflict: 'user_id,sample_date,provider' })

  if (error) throw error

  if (provider === 'apple_health' || provider === 'health_connect') {
    const legacySource = provider === 'apple_health' ? 'apple' : 'android'
    await supabase
      .from('health_daily_metrics')
      .upsert(
        samples.map((sample) => ({
          user_id: userId,
          metric_date: sample.date,
          steps: sample.steps || 0,
          sleep_hours: sample.sleepMinutes ? Number((sample.sleepMinutes / 60).toFixed(2)) : 0,
          heart_rate_avg: sample.avgHrBpm,
          hrv: sample.hrvMs,
          source: legacySource,
          updated_at: now,
        })),
        { onConflict: 'user_id,metric_date,source' }
      )
  }

  await trackProductEvent(supabase, {
    userId,
    eventName: 'device_mock_sync_completed',
    surface: 'athlete_integrations',
    properties: {
      provider,
      sampleDays: samples.length,
      productionReadiness: connector.productionReadiness,
    },
  })

  return { provider, syncedRows: rows.length }
}

export async function getCoachOperatingSnapshot(supabase: SupabaseLike, coachId: string): Promise<CoachOperatingSnapshot> {
  const connectionRows = await safeList<Record<string, unknown>>(
    supabase
      .from('connection_requests')
      .select('athlete_id, profiles!athlete_id(id, full_name)')
      .eq('coach_id', coachId)
      .eq('status', 'approved')
  )

  const athletes = connectionRows
    .map((row) => {
      const rawProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const profile = rawProfile as Record<string, unknown> | null
      return {
        athleteId: String(row.athlete_id || profile?.id || ''),
        athleteName: String(profile?.full_name || 'Athlete'),
      }
    })
    .filter((entry) => entry.athleteId)

  if (!athletes.length) {
    return {
      averageReadiness: 0,
      averageCompliancePct: 0,
      interventionQueue: [],
      lowDataAthletes: [],
      recentComments: [],
    }
  }

  const athleteIds = athletes.map((entry) => entry.athleteId)
  const [sessionRows, logRows, comments] = await Promise.all([
    safeList<Record<string, unknown>>(
      supabase
        .from('training_sessions')
        .select('id, athlete_id, status, compliance_pct, readiness_score, session_date')
        .in('athlete_id', athleteIds)
        .order('session_date', { ascending: false })
        .limit(80)
    ),
    safeList<Record<string, unknown>>(
      supabase
        .from('training_session_logs')
        .select('athlete_id, pain_flags, compliance_pct, created_at')
        .in('athlete_id', athleteIds)
        .order('created_at', { ascending: false })
        .limit(80)
    ),
    safeList<Record<string, unknown>>(
      supabase
        .from('session_comments')
        .select('id, athlete_id, message, created_at')
        .in('athlete_id', athleteIds)
        .order('created_at', { ascending: false })
        .limit(8)
    ),
  ])

  const athleteSummaries = athletes.map<CoachOperatingSnapshot['interventionQueue'][number]>((athlete) => {
    const sessions = sessionRows.filter((row) => String(row.athlete_id) === athlete.athleteId)
    const logs = logRows.filter((row) => String(row.athlete_id) === athlete.athleteId)
    const latestSession = sessions[0] || null
    const missedSessions = sessions.filter((row) => String(row.status) === 'skipped').length
    const latestPainFlags = logs.flatMap((row) => Array.isArray(row.pain_flags) ? row.pain_flags.map(String) : []).slice(0, 3)
    const complianceValues = sessions
      .map((row) => Number(row.compliance_pct))
      .filter((value) => Number.isFinite(value))
    const compliancePct = complianceValues.length
      ? Math.round(complianceValues.reduce((sum, value) => sum + value, 0) / complianceValues.length)
      : null
    const readinessScore = latestSession?.readiness_score ? Number(latestSession.readiness_score) : null
    const recoveryDebt = Math.max(0, missedSessions + (compliancePct !== null && compliancePct < 60 ? 1 : 0))

    return {
      athleteId: athlete.athleteId,
      athleteName: athlete.athleteName,
      readinessScore,
      compliancePct,
      missedSessions,
      recoveryDebt,
      injuryRiskFlags: latestPainFlags,
      recentPainReports: latestPainFlags,
      lastSessionId: latestSession?.id ? String(latestSession.id) : null,
    }
  })

  const readinessValues = athleteSummaries
    .map((entry) => entry.readinessScore)
    .filter((value): value is number => value !== null)
  const complianceValues = athleteSummaries
    .map((entry) => entry.compliancePct)
    .filter((value): value is number => value !== null)

  return {
    averageReadiness: readinessValues.length ? Math.round(readinessValues.reduce((sum, value) => sum + value, 0) / readinessValues.length) : 0,
    averageCompliancePct: complianceValues.length ? Math.round(complianceValues.reduce((sum, value) => sum + value, 0) / complianceValues.length) : 0,
    interventionQueue: athleteSummaries
      .filter((entry) => (entry.readinessScore !== null && entry.readinessScore < 55) || (entry.compliancePct !== null && entry.compliancePct < 65) || entry.injuryRiskFlags.length > 0)
      .sort((left, right) => right.recoveryDebt - left.recoveryDebt)
      .slice(0, 6),
    lowDataAthletes: athleteSummaries
      .filter((entry) => entry.readinessScore === null || entry.compliancePct === null)
      .slice(0, 6),
    recentComments: comments.map((comment) => {
      const athlete = athletes.find((entry) => entry.athleteId === String(comment.athlete_id))
      return {
        id: String(comment.id),
        athleteId: String(comment.athlete_id),
        athleteName: athlete?.athleteName || 'Athlete',
        message: String(comment.message || ''),
        createdAt: String(comment.created_at || ''),
      }
    }),
  }
}
