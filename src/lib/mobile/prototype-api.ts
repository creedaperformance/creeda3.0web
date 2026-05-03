import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getAthleteDashboardSnapshot,
  getTodayInIndia,
} from '@/lib/dashboard_decisions'
import type { MobileAuthenticatedUser } from '@/lib/mobile/auth'

type SupabaseLike = SupabaseClient<any, any, any>

type ErrorLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

type SafeListResult<T> = {
  available: boolean
  rows: T[]
  error: string | null
}

type SafeSingleResult<T> = {
  available: boolean
  row: T | null
  error: string | null
}

type BodyRegionStatus = 'strong' | 'caution' | 'attention' | 'unknown'
type BodyEvidenceSource = 'onboarding' | 'check-in' | 'health' | 'scan' | 'none'
type CoachStatus = 'ready' | 'caution' | 'attention' | 'unknown'

const BODY_REGION_DEFS = [
  { id: 'head_neck', label: 'Head and neck', side: 'both', front: { x: 50, y: 10 }, back: { x: 50, y: 10 } },
  { id: 'shoulders', label: 'Shoulders', side: 'both', front: { x: 50, y: 21 }, back: { x: 50, y: 21 } },
  { id: 'arms', label: 'Arms and elbows', side: 'both', front: { x: 24, y: 36 }, back: { x: 76, y: 36 } },
  { id: 'chest', label: 'Chest and ribs', side: 'front', front: { x: 50, y: 31 }, back: null },
  { id: 'core', label: 'Core', side: 'front', front: { x: 50, y: 43 }, back: null },
  { id: 'lower_back', label: 'Lower back', side: 'back', front: null, back: { x: 50, y: 42 } },
  { id: 'hips', label: 'Hips and groin', side: 'both', front: { x: 50, y: 55 }, back: { x: 50, y: 55 } },
  { id: 'thighs', label: 'Thighs and hamstrings', side: 'both', front: { x: 42, y: 67 }, back: { x: 58, y: 67 } },
  { id: 'knees', label: 'Knees', side: 'both', front: { x: 43, y: 78 }, back: { x: 57, y: 78 } },
  { id: 'calves', label: 'Calves', side: 'back', front: null, back: { x: 57, y: 88 } },
  { id: 'ankles_feet', label: 'Ankles and feet', side: 'both', front: { x: 45, y: 95 }, back: { x: 55, y: 95 } },
] as const

const STATUS_WEIGHT: Record<BodyRegionStatus, number> = {
  unknown: 0,
  strong: 1,
  caution: 2,
  attention: 3,
}

const COACH_STATUS_WEIGHT: Record<CoachStatus, number> = {
  unknown: 0,
  ready: 1,
  caution: 2,
  attention: 3,
}

export function isMissingPrototypeDataError(error: unknown, table?: string) {
  const record = asRecord(error)
  const message = String(record?.message || record?.details || error || '').toLowerCase()
  const target = table?.toLowerCase()

  return (
    record?.code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('could not find a relationship') ||
    message.includes('relation ') ||
    Boolean(target && message.includes(target) && (message.includes('not found') || message.includes('missing')))
  )
}

async function safeList<T>(
  query: PromiseLike<{ data: T[] | null; error: ErrorLike | null }>,
  table: string
): Promise<SafeListResult<T>> {
  try {
    const result = await query
    if (!result.error) {
      return {
        available: true,
        rows: Array.isArray(result.data) ? result.data : [],
        error: null,
      }
    }

    if (isMissingPrototypeDataError(result.error, table)) {
      return { available: false, rows: [], error: result.error.message || null }
    }

    console.warn(`[mobile-prototype-api] ${table} query failed`, result.error)
    return { available: true, rows: [], error: result.error.message || 'Query failed.' }
  } catch (error) {
    if (isMissingPrototypeDataError(error, table)) {
      return { available: false, rows: [], error: error instanceof Error ? error.message : null }
    }
    console.warn(`[mobile-prototype-api] ${table} query threw`, error)
    return { available: true, rows: [], error: error instanceof Error ? error.message : 'Query failed.' }
  }
}

async function safeMaybeSingle<T>(
  query: PromiseLike<{ data: T | null; error: ErrorLike | null }>,
  table: string
): Promise<SafeSingleResult<T>> {
  try {
    const result = await query
    if (!result.error) {
      return { available: true, row: result.data || null, error: null }
    }

    if (isMissingPrototypeDataError(result.error, table)) {
      return { available: false, row: null, error: result.error.message || null }
    }

    console.warn(`[mobile-prototype-api] ${table} single query failed`, result.error)
    return { available: true, row: null, error: result.error.message || 'Query failed.' }
  } catch (error) {
    if (isMissingPrototypeDataError(error, table)) {
      return { available: false, row: null, error: error instanceof Error ? error.message : null }
    }
    console.warn(`[mobile-prototype-api] ${table} single query threw`, error)
    return { available: true, row: null, error: error instanceof Error ? error.message : 'Query failed.' }
  }
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null
}

function toRecord(value: unknown): Record<string, any> {
  return asRecord(value) || {}
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toRoundedNumber(value: unknown): number | null {
  const parsed = toNumber(value)
  return parsed === null ? null : Math.round(parsed)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value))
  if (!clean.length) return null
  return clean.reduce((total, value) => total + value, 0) / clean.length
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function parseDate(date: string) {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  return new Date(Date.UTC(year, month - 1, day))
}

function recentDates(days: number) {
  const base = parseDate(getTodayInIndia())
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(base)
    date.setUTCDate(base.getUTCDate() - (days - 1 - index))
    return date.toISOString().slice(0, 10)
  })
}

function getDaysAgoIso(daysAgo: number) {
  const base = parseDate(getTodayInIndia())
  base.setUTCDate(base.getUTCDate() - daysAgo)
  return base.toISOString().slice(0, 10)
}

export function normalizeSportId(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatSportName(value: string | null | undefined) {
  const raw = String(value || '').trim()
  if (!raw) return 'Selected sport'
  return raw
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeRegionId(value: unknown): string | null {
  const text = String(value || '').toLowerCase().replace(/_/g, ' ')
  if (!text.trim()) return null
  if (text.includes('neck') || text.includes('head')) return 'head_neck'
  if (text.includes('shoulder') || text.includes('rotator')) return 'shoulders'
  if (text.includes('elbow') || text.includes('wrist') || text.includes('arm') || text.includes('hand')) return 'arms'
  if (text.includes('chest') || text.includes('rib')) return 'chest'
  if (text.includes('core') || text.includes('abdomen') || text.includes('trunk')) return 'core'
  if (text.includes('low back') || text.includes('lower back') || text.includes('lumbar') || text === 'back') return 'lower_back'
  if (text.includes('hip') || text.includes('groin') || text.includes('pelvis')) return 'hips'
  if (text.includes('hamstring') || text.includes('quad') || text.includes('thigh')) return 'thighs'
  if (text.includes('knee') || text.includes('patella')) return 'knees'
  if (text.includes('calf') || text.includes('shin')) return 'calves'
  if (text.includes('ankle') || text.includes('achilles') || text.includes('foot') || text.includes('feet')) return 'ankles_feet'
  return null
}

function emptyBodyRegions() {
  return BODY_REGION_DEFS.map((region) => ({
    id: region.id,
    label: region.label,
    side: region.side,
    coordinates: {
      front: region.front,
      back: region.back,
    },
    status: 'unknown' as BodyRegionStatus,
    evidenceSource: 'none' as BodyEvidenceSource,
    insight: 'No body insight has been recorded for this region yet.',
    confidence: 0,
    lastUpdatedAt: null as string | null,
  }))
}

function applyRegionEvidence(
  regions: ReturnType<typeof emptyBodyRegions>,
  args: {
    regionId: string | null
    status: BodyRegionStatus
    source: BodyEvidenceSource
    insight: string
    confidence: number
    lastUpdatedAt?: string | null
  }
) {
  if (!args.regionId) return
  const region = regions.find((candidate) => candidate.id === args.regionId)
  if (!region) return

  if (STATUS_WEIGHT[args.status] >= STATUS_WEIGHT[region.status]) {
    region.status = args.status
    region.evidenceSource = args.source
    region.insight = args.insight
    region.confidence = clamp(args.confidence, 0, 1)
    region.lastUpdatedAt = args.lastUpdatedAt || region.lastUpdatedAt
  }
}

function collectPhysicalStatusRegions(physicalStatus: Record<string, any> | null) {
  if (!physicalStatus) return []
  const entries = [
    ...toArray(physicalStatus.activeInjuries),
    ...toArray(physicalStatus.active_injuries),
    ...toArray(physicalStatus.currentPainRegions),
    ...toArray(physicalStatus.current_pain_regions),
  ]

  return entries
    .map((entry) => {
      const record = asRecord(entry)
      if (!record) return { regionId: normalizeRegionId(entry), painScore: null }
      return {
        regionId: normalizeRegionId(
          record.region || record.bodyRegion || record.body_region || record.location || record.area || record.type
        ),
        painScore: toNumber(record.painScore || record.pain_score || record.currentPainScore),
      }
    })
    .filter((entry) => entry.regionId)
}

function collectWeakLinkRegions(weakLinks: unknown) {
  if (Array.isArray(weakLinks)) {
    return weakLinks
      .map((item) => {
        const record = asRecord(item)
        return normalizeRegionId(record?.region || record?.bodyRegion || record?.label || record?.name || item)
      })
      .filter(Boolean) as string[]
  }

  const record = asRecord(weakLinks)
  if (!record) return []

  return Object.entries(record)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => normalizeRegionId(toRecord(value).region || key))
    .filter(Boolean) as string[]
}

function extractLatestReadiness(rows: Array<Record<string, any>>, fallbackRows: Array<Record<string, any>>) {
  const readiness = rows.map((row) => toRoundedNumber(row.score)).find((value) => value !== null)
  if (readiness !== undefined) return readiness
  return fallbackRows.map((row) => toRoundedNumber(row.readiness_score)).find((value) => value !== null) ?? null
}

export function resolveBodyOverallStatus(args: {
  regionStatuses: BodyRegionStatus[]
  evidenceCount: number
  latestReadiness: number | null
}) {
  if (args.regionStatuses.includes('attention')) return 'attention'
  if (args.regionStatuses.includes('caution')) return 'caution'
  if (args.evidenceCount > 0 && args.latestReadiness !== null && args.latestReadiness >= 70) return 'strong'
  return 'unknown'
}

export async function getMobileBodyMap(
  supabase: SupabaseLike,
  user: MobileAuthenticatedUser
) {
  const userId = user.userId
  const [diagnostic, dailyLogs, dailyCheckIns, movementBaselines, diagnosticSessions, videoReports, readinessScores, healthRows] =
    await Promise.all([
      safeMaybeSingle<Record<string, any>>(
        supabase
          .from('diagnostics')
          .select('physical_status, physiology_profile, performance_baseline, sport_context, recovery_baseline, created_at')
          .eq('athlete_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        'diagnostics'
      ),
      safeList<Record<string, any>>(
        supabase
          .from('daily_load_logs')
          .select('log_date, readiness_score, current_pain_level, pain_location, muscle_soreness, body_feel, created_at')
          .eq('athlete_id', userId)
          .order('log_date', { ascending: false })
          .limit(14),
        'daily_load_logs'
      ),
      safeList<Record<string, any>>(
        supabase
          .from('daily_check_ins')
          .select('date, body_feel, pain_locations, pain_scores, completed_at')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(14),
        'daily_check_ins'
      ),
      safeList<Record<string, any>>(
        supabase
          .from('movement_baselines')
          .select('scan_type, movement_quality_score, weak_links, motion_evidence_score, performed_at')
          .eq('user_id', userId)
          .order('performed_at', { ascending: false })
          .limit(3),
        'movement_baselines'
      ),
      safeList<Record<string, any>>(
        supabase
          .from('diagnostic_sessions')
          .select('body_region, pain_flag, severity, status, primary_bucket, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(6),
        'diagnostic_sessions'
      ),
      safeList<Record<string, any>>(
        supabase
          .from('video_analysis_reports')
          .select('issues_detected, warnings, positive, sport, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(4),
        'video_analysis_reports'
      ),
      safeList<Record<string, any>>(
        supabase
          .from('readiness_scores')
          .select('date, score, confidence_pct, confidence_tier, computed_at')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(7),
        'readiness_scores'
      ),
      safeList<Record<string, any>>(
        supabase
          .from('health_daily_metrics')
          .select('metric_date, steps, sleep_hours, heart_rate_avg, hrv, source')
          .eq('user_id', userId)
          .order('metric_date', { ascending: false })
          .limit(7),
        'health_daily_metrics'
      ),
    ])

  const regions = emptyBodyRegions()
  const evidenceSources = new Set<BodyEvidenceSource>()

  const physicalStatus = toRecord(diagnostic.row?.physical_status)
  collectPhysicalStatusRegions(physicalStatus).forEach((entry) => {
    evidenceSources.add('onboarding')
    const painScore = entry.painScore
    applyRegionEvidence(regions, {
      regionId: entry.regionId,
      status: painScore !== null && painScore >= 6 ? 'attention' : 'caution',
      source: 'onboarding',
      insight: 'Your onboarding history marked this region as useful context for performance readiness.',
      confidence: 0.55,
      lastUpdatedAt: diagnostic.row?.created_at ? String(diagnostic.row.created_at) : null,
    })
  })

  dailyLogs.rows.forEach((row) => {
    const painScore = toNumber(row.current_pain_level)
    toArray(row.pain_location).forEach((location) => {
      const regionId = normalizeRegionId(location)
      if (!regionId || painScore === null || painScore <= 0) return
      evidenceSources.add('check-in')
      applyRegionEvidence(regions, {
        regionId,
        status: painScore >= 6 ? 'attention' : 'caution',
        source: 'check-in',
        insight: 'A recent check-in marked this region for recovery attention.',
        confidence: painScore >= 6 ? 0.75 : 0.62,
        lastUpdatedAt: row.created_at ? String(row.created_at) : String(row.log_date || ''),
      })
    })
  })

  dailyCheckIns.rows.forEach((row) => {
    const painScores = toRecord(row.pain_scores)
    toArray(row.pain_locations).forEach((location) => {
      const regionId = normalizeRegionId(location)
      if (!regionId) return
      evidenceSources.add('check-in')
      const painScore = toNumber(painScores[String(location)] || painScores[regionId])
      applyRegionEvidence(regions, {
        regionId,
        status: painScore !== null && painScore >= 6 ? 'attention' : 'caution',
        source: 'check-in',
        insight: 'A recent daily check-in marked this area for recovery attention.',
        confidence: painScore !== null ? 0.7 : 0.58,
        lastUpdatedAt: row.completed_at ? String(row.completed_at) : String(row.date || ''),
      })
    })
  })

  movementBaselines.rows.forEach((row) => {
    const quality = toNumber(row.movement_quality_score)
    collectWeakLinkRegions(row.weak_links).forEach((regionId) => {
      evidenceSources.add('scan')
      applyRegionEvidence(regions, {
        regionId,
        status: quality !== null && quality < 50 ? 'attention' : 'caution',
        source: 'scan',
        insight: 'A movement baseline marked this area as a performance limiter to revisit.',
        confidence: clamp((toNumber(row.motion_evidence_score) || quality || 60) / 100, 0.45, 0.85),
        lastUpdatedAt: row.performed_at ? String(row.performed_at) : null,
      })
    })
  })

  diagnosticSessions.rows.forEach((row) => {
    const regionId = normalizeRegionId(row.body_region || row.primary_bucket)
    if (!regionId) return
    evidenceSources.add('scan')
    const severity = toNumber(row.severity)
    applyRegionEvidence(regions, {
      regionId,
      status: Boolean(row.pain_flag) || (severity !== null && severity >= 6) ? 'attention' : 'caution',
      source: 'scan',
      insight: 'A guided movement screen marked this region for closer recovery attention.',
      confidence: severity !== null ? 0.68 : 0.58,
      lastUpdatedAt: row.created_at ? String(row.created_at) : null,
    })
  })

  videoReports.rows.forEach((row) => {
    toArray(row.issues_detected).forEach((issue) => {
      const regionId = normalizeRegionId(issue)
      if (!regionId) return
      evidenceSources.add('scan')
      applyRegionEvidence(regions, {
        regionId,
        status: toNumber(row.warnings) !== null && Number(row.warnings) >= 3 ? 'attention' : 'caution',
        source: 'scan',
        insight: 'A movement scan flagged this region for technique review.',
        confidence: 0.55,
        lastUpdatedAt: row.created_at ? String(row.created_at) : null,
      })
    })
  })

  if (healthRows.rows.length > 0) {
    evidenceSources.add('health')
  }

  const latestReadiness = extractLatestReadiness(readinessScores.rows, dailyLogs.rows)
  const evidenceCount = Array.from(evidenceSources).filter((source) => source !== 'none').length
  const overallStatus = resolveBodyOverallStatus({
    regionStatuses: regions.map((region) => region.status),
    evidenceCount,
    latestReadiness,
  })

  return {
    overallStatus,
    summary:
      overallStatus === 'attention'
        ? 'Recent check-in or scan signals show one or more regions needing recovery attention.'
        : overallStatus === 'caution'
          ? 'Recent body signals show a few areas to keep controlled during training.'
          : overallStatus === 'strong'
            ? 'Recent readiness data is steady and no body-region flags were found.'
            : 'No body insights are ready yet.',
    latestReadiness,
    evidenceSources: Array.from(evidenceSources),
    regions,
    emptyState: evidenceCount === 0
      ? {
          title: 'No body insights yet',
          message: 'Complete a check-in, health sync, movement scan, or guided screen to unlock body-map insights.',
        }
      : null,
    safetyCopy: 'Creeda uses body-map signals for performance readiness and recovery awareness, not medical diagnosis.',
  }
}

function aggregateHealthRows(rows: Array<Record<string, any>>) {
  const grouped = new Map<string, Array<Record<string, any>>>()
  rows.forEach((row) => {
    const date = String(row.metric_date || '').slice(0, 10)
    if (!date) return
    grouped.set(date, [...(grouped.get(date) || []), row])
  })

  return grouped
}

function aggregateTrainingLoadRows(rows: Array<Record<string, any>>) {
  const grouped = new Map<string, Array<Record<string, any>>>()
  rows.forEach((row) => {
    const date = String(row.date || row.log_date || row.session_date || '').slice(0, 10)
    if (!date) return
    grouped.set(date, [...(grouped.get(date) || []), row])
  })
  return grouped
}

function averageField(rows: Array<Record<string, any>>, key: string) {
  return average(rows.map((row) => toNumber(row[key])).filter((value): value is number => value !== null))
}

function sumField(rows: Array<Record<string, any>>, key: string) {
  const values = rows.map((row) => toNumber(row[key])).filter((value): value is number => value !== null)
  if (!values.length) return null
  return values.reduce((total, value) => total + value, 0)
}

export async function getMobileTrackerTrends(
  supabase: SupabaseLike,
  user: MobileAuthenticatedUser,
  rangeDays = 7
) {
  const userId = user.userId
  const days = clamp(Math.round(rangeDays), 7, 30)
  const startDate = getDaysAgoIso(days - 1)

  const [connection, healthRows, trainingLoads, dailyLogs, readinessScores] = await Promise.all([
    safeMaybeSingle<Record<string, any>>(
      supabase
        .from('health_connections')
        .select('apple_connected, android_connected, connection_preference, last_sync_at, last_sync_status, last_error, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      'health_connections'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('health_daily_metrics')
        .select('metric_date, steps, sleep_hours, heart_rate_avg, hrv, source')
        .eq('user_id', userId)
        .gte('metric_date', startDate)
        .order('metric_date', { ascending: false }),
      'health_daily_metrics'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('training_load_history')
        .select('date, sessions_count, total_duration_minutes, average_rpe, session_load_au, source')
        .eq('user_id', userId)
        .gte('date', startDate)
        .order('date', { ascending: false }),
      'training_load_history'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('daily_load_logs')
        .select('log_date, readiness_score, duration_minutes, session_rpe, load_score')
        .eq('athlete_id', userId)
        .gte('log_date', startDate)
        .order('log_date', { ascending: false }),
      'daily_load_logs'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('readiness_scores')
        .select('date, score, confidence_pct, confidence_tier')
        .eq('user_id', userId)
        .gte('date', startDate)
        .order('date', { ascending: false }),
      'readiness_scores'
    ),
  ])

  const healthByDate = aggregateHealthRows(healthRows.rows)
  const loadByDate = aggregateTrainingLoadRows(trainingLoads.rows)
  const dailyLogByDate = aggregateTrainingLoadRows(dailyLogs.rows)
  const readinessByDate = new Map(readinessScores.rows.map((row) => [String(row.date || '').slice(0, 10), row]))
  const connectionRow = toRecord(connection.row)
  const healthConnected = Boolean(connectionRow.apple_connected || connectionRow.android_connected)

  const trends = recentDates(days).map((date) => {
    const health = healthByDate.get(date) || []
    const loadRows = loadByDate.get(date) || []
    const logRows = dailyLogByDate.get(date) || []
    const readiness = readinessByDate.get(date)
    const loadFromHistory = sumField(loadRows, 'session_load_au')
    const loadFromLogs = sumField(logRows, 'load_score')
    const logDurationLoad = logRows
      .map((row) => {
        const duration = toNumber(row.duration_minutes)
        const rpe = toNumber(row.session_rpe)
        return duration !== null && rpe !== null ? duration * rpe : null
      })
      .filter((value): value is number => value !== null)

    return {
      date,
      sleepHours: averageField(health, 'sleep_hours'),
      hrvMs: averageField(health, 'hrv'),
      restingHeartRate: averageField(health, 'heart_rate_avg'),
      steps: sumField(health, 'steps'),
      trainingLoadAu: loadFromHistory ?? loadFromLogs ?? (logDurationLoad.length ? Math.round(average(logDurationLoad) || 0) : null),
      recoveryScore: toRoundedNumber(readiness?.score) ?? toRoundedNumber(logRows[0]?.readiness_score),
      sources: uniqueStrings([
        health.length ? 'health_daily_metrics' : null,
        loadRows.length ? 'training_load_history' : null,
        logRows.length ? 'daily_load_logs' : null,
        readiness ? 'readiness_scores' : null,
      ]),
    }
  })

  const metricAvailability = {
    sleep: healthRows.rows.some((row) => toNumber(row.sleep_hours) !== null),
    hrv: healthRows.rows.some((row) => toNumber(row.hrv) !== null),
    restingHeartRate: healthRows.rows.some((row) => toNumber(row.heart_rate_avg) !== null),
    steps: healthRows.rows.some((row) => toNumber(row.steps) !== null),
    trainingLoad: trainingLoads.rows.length > 0 || dailyLogs.rows.some((row) => toNumber(row.load_score) !== null),
    recovery: readinessScores.rows.length > 0 || dailyLogs.rows.some((row) => toNumber(row.readiness_score) !== null),
  }

  return {
    rangeDays: days,
    healthSync: {
      connected: healthConnected,
      available: healthRows.available || connection.available,
      source: connectionRow.apple_connected && connectionRow.android_connected
        ? 'mixed'
        : connectionRow.apple_connected
          ? 'apple'
          : connectionRow.android_connected
            ? 'android'
            : 'none',
      lastSyncAt: connectionRow.last_sync_at ? String(connectionRow.last_sync_at) : null,
      lastSyncStatus: connectionRow.last_sync_status ? String(connectionRow.last_sync_status) : null,
      lastError: connectionRow.last_error ? String(connectionRow.last_error) : null,
      missingReason: healthConnected
        ? null
        : 'Health sync is not connected yet, so sleep, HRV, resting heart rate, and steps may be empty.',
    },
    metrics: {
      sleep: {
        available: metricAvailability.sleep,
        sampleDays: trends.filter((day) => day.sleepHours !== null).length,
      },
      hrv: {
        available: metricAvailability.hrv,
        sampleDays: trends.filter((day) => day.hrvMs !== null).length,
      },
      restingHeartRate: {
        available: metricAvailability.restingHeartRate,
        sampleDays: trends.filter((day) => day.restingHeartRate !== null).length,
      },
      steps: {
        available: metricAvailability.steps,
        sampleDays: trends.filter((day) => day.steps !== null).length,
      },
      trainingLoad: {
        available: metricAvailability.trainingLoad,
        sampleDays: trends.filter((day) => day.trainingLoadAu !== null).length,
      },
      recovery: {
        available: metricAvailability.recovery,
        sampleDays: trends.filter((day) => day.recoveryScore !== null).length,
      },
    },
    trends,
    emptyState: trends.every((day) => day.sources.length === 0)
      ? {
          title: 'Trend history will appear after several synced days.',
          message: 'Connect health sync or complete daily check-ins and sessions to build a 7-day trend.',
        }
      : null,
  }
}

function getSnapshotReadiness(snapshot: Awaited<ReturnType<typeof getAthleteDashboardSnapshot>>) {
  return (
    toRoundedNumber(snapshot.decisionResult?.metrics?.readiness?.score) ??
    toRoundedNumber(snapshot.latestIntelligence?.readiness_score) ??
    toRoundedNumber(snapshot.latestLog?.readiness_score)
  )
}

function readDecisionFocus(snapshot: Awaited<ReturnType<typeof getAthleteDashboardSnapshot>>) {
  const decision = snapshot.decisionResult?.creedaDecision
  return (
    String(decision?.components?.training?.focus || '').trim() ||
    String(decision?.sessionType || '').trim() ||
    null
  )
}

function readDecisionNotes(snapshot: Awaited<ReturnType<typeof getAthleteDashboardSnapshot>>) {
  const drivers = snapshot.decisionResult?.creedaDecision?.explanation?.primaryDrivers
  const driverNotes = Array.isArray(drivers)
    ? drivers.map((driver) => String(toRecord(driver).reason || '').trim()).filter(Boolean)
    : []
  const painLocations = Array.isArray(snapshot.latestLog?.pain_location)
    ? snapshot.latestLog?.pain_location.map((item) => String(item || '').trim()).filter(Boolean)
    : []

  return uniqueStrings([
    ...driverNotes,
    painLocations.length ? `Recent check-in marked recovery attention around ${painLocations.join(', ')}.` : null,
    snapshot.healthSummary?.connected === false
      ? 'Health sync is not connected, so confidence is based on check-ins and available training data.'
      : null,
  ]).slice(0, 4)
}

export async function getMobileSportDashboard(
  supabase: SupabaseLike,
  user: MobileAuthenticatedUser,
  sportId: string
) {
  const normalizedSportId = normalizeSportId(sportId)
  const primarySportId = normalizeSportId(user.profile.primarySport)
  const isPrimarySport = Boolean(primarySportId && normalizedSportId === primarySportId)
  const sportName = isPrimarySport
    ? formatSportName(user.profile.primarySport)
    : formatSportName(sportId)
  const startDate = getDaysAgoIso(27)

  const [snapshot, sessions, trainingLoads, dailyLogs] = await Promise.all([
    getAthleteDashboardSnapshot(supabase, user.userId),
    safeList<Record<string, any>>(
      supabase
        .from('training_sessions')
        .select('id, session_date, status, source, mode, title, sport, goal, readiness_score, expected_duration_minutes, compliance_pct, plan_json, explainability_json')
        .eq('athlete_id', user.userId)
        .gte('session_date', startDate)
        .order('session_date', { ascending: false })
        .limit(24),
      'training_sessions'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('training_load_history')
        .select('date, sessions_count, total_duration_minutes, average_rpe, session_load_au, source, notes')
        .eq('user_id', user.userId)
        .gte('date', startDate)
        .order('date', { ascending: false }),
      'training_load_history'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('daily_load_logs')
        .select('log_date, readiness_score, duration_minutes, session_rpe, load_score, day_type, session_importance, current_pain_level, pain_location')
        .eq('athlete_id', user.userId)
        .gte('log_date', startDate)
        .order('log_date', { ascending: false }),
      'daily_load_logs'
    ),
  ])

  const sportSessions = sessions.rows.filter((session) => {
    const sessionSport = normalizeSportId(session.sport)
    return sessionSport ? sessionSport === normalizedSportId : isPrimarySport
  })
  const loadRows = isPrimarySport ? trainingLoads.rows : []
  const logRows = isPrimarySport ? dailyLogs.rows : []
  const sevenDayStart = getDaysAgoIso(6)
  const recentLoadRows = loadRows.filter((row) => String(row.date || '').slice(0, 10) >= sevenDayStart)
  const recentLogRows = logRows.filter((row) => String(row.log_date || '').slice(0, 10) >= sevenDayStart)
  const trainingLoadAu =
    sumField(recentLoadRows, 'session_load_au') ??
    sumField(recentLogRows, 'load_score') ??
    null
  const sessionCount =
    sumField(recentLoadRows, 'sessions_count') ??
    recentLogRows.filter((row) => toNumber(row.duration_minutes) !== null || toNumber(row.session_rpe) !== null).length
  const readinessScore = isPrimarySport ? getSnapshotReadiness(snapshot) : null
  const focus = isPrimarySport ? readDecisionFocus(snapshot) : null

  return {
    sport: {
      id: normalizedSportId,
      name: sportName,
      isPrimarySport,
      profilePrimarySport: user.profile.primarySport,
    },
    readiness: {
      available: readinessScore !== null,
      score: readinessScore,
      source: readinessScore !== null ? 'dashboard_snapshot' : 'none',
      confidence: snapshot.latestIntelligence?.trust_score ?? snapshot.latestLog?.trust_score ?? null,
      emptyReason: readinessScore === null
        ? 'Complete a daily check-in to unlock sport-specific readiness.'
        : null,
    },
    loadSummary: {
      available: trainingLoadAu !== null || sessionCount > 0,
      sevenDayLoadAu: trainingLoadAu,
      sessionsCount: sessionCount,
      totalDurationMinutes: sumField(recentLoadRows, 'total_duration_minutes') ?? sumField(recentLogRows, 'duration_minutes'),
      averageRpe: averageField(recentLoadRows, 'average_rpe') ?? averageField(recentLogRows, 'session_rpe'),
      source: recentLoadRows.length
        ? 'training_load_history'
        : recentLogRows.length
          ? 'daily_load_logs'
          : 'none',
    },
    trainingFocus: {
      available: Boolean(focus),
      title: focus,
      source: focus ? 'dashboard_decision' : 'none',
      emptyReason: focus ? null : 'Training focus appears after Creeda has a fresh check-in and enough context.',
    },
    cautionNotes: readDecisionNotes(snapshot),
    sessionGuidance: {
      available: sportSessions.length > 0,
      sessions: sportSessions.slice(0, 5).map((session) => ({
        id: String(session.id || ''),
        title: String(session.title || 'Training session'),
        date: String(session.session_date || ''),
        status: String(session.status || ''),
        mode: String(session.mode || ''),
        expectedDurationMinutes: toRoundedNumber(session.expected_duration_minutes),
        readinessScore: toRoundedNumber(session.readiness_score),
        source: String(session.source || 'system'),
      })),
      emptyReason: sportSessions.length
        ? null
        : 'No real sport-specific sessions are planned or logged yet.',
    },
    emptyState: !isPrimarySport
      ? {
          title: 'No sport-specific data for this sport yet',
          message: 'Creeda only has enough context for your profile sport right now. Add sport-specific check-ins or sessions before this view fills in.',
        }
      : readinessScore === null && trainingLoadAu === null && sportSessions.length === 0
        ? {
            title: 'Sport dashboard is waiting for real data',
            message: 'Complete check-ins, sync health data, or log sessions to build this sport view.',
          }
        : null,
  }
}

export function resolveCoachAthleteStatus(args: {
  readinessScore: number | null
  riskScore: number | null
  painScore?: number | null
  hasActiveIntervention?: boolean
  staleDays?: number | null
}) {
  if (args.hasActiveIntervention) return 'attention' as CoachStatus
  if (args.readinessScore === null && args.riskScore === null) return 'unknown' as CoachStatus
  if (
    (args.readinessScore !== null && args.readinessScore < 45) ||
    (args.riskScore !== null && args.riskScore >= 55) ||
    (args.painScore !== null && args.painScore !== undefined && args.painScore >= 6)
  ) {
    return 'attention' as CoachStatus
  }
  if (
    (args.readinessScore !== null && args.readinessScore < 65) ||
    (args.riskScore !== null && args.riskScore >= 35) ||
    (args.staleDays !== null && args.staleDays !== undefined && args.staleDays > 3)
  ) {
    return 'caution' as CoachStatus
  }
  return 'ready' as CoachStatus
}

function daysSince(dateValue: unknown) {
  const date = String(dateValue || '').slice(0, 10)
  if (!date) return null
  const today = parseDate(getTodayInIndia()).getTime()
  const then = parseDate(date).getTime()
  if (!Number.isFinite(then)) return null
  return Math.max(0, Math.round((today - then) / 86400000))
}

function normalizeJoinedProfile(value: unknown) {
  const profile = Array.isArray(value) ? value[0] : value
  const record = toRecord(profile)
  return {
    id: record.id ? String(record.id) : null,
    fullName: String(record.full_name || 'Athlete'),
    avatarUrl: record.avatar_url ? String(record.avatar_url) : null,
    primarySport: record.primary_sport ? String(record.primary_sport) : null,
    position: record.position ? String(record.position) : null,
  }
}

async function loadCoachRoster(supabase: SupabaseLike, coachId: string) {
  const [legacyMembers, squadMembers] = await Promise.all([
    safeList<Record<string, any>>(
      supabase
        .from('team_members')
        .select('team_id, athlete_id, status, joined_at, teams!inner(id, team_name, sport, coach_id), profiles:athlete_id(id, full_name, avatar_url, primary_sport, position)')
        .eq('teams.coach_id', coachId)
        .eq('status', 'Active'),
      'team_members'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('squad_memberships')
        .select('squad_id, athlete_id, position, status, share_level, joined_at, squads!inner(id, name, sport, level, coach_id), profiles:athlete_id(id, full_name, avatar_url, primary_sport, position)')
        .eq('squads.coach_id', coachId)
        .in('status', ['active', 'injured', 'paused']),
      'squad_memberships'
    ),
  ])

  const groupsById = new Map<string, { id: string; name: string; sport: string | null; type: 'team' | 'squad'; athleteCount: number }>()
  const athletesById = new Map<string, {
    athleteId: string
    athleteName: string
    avatarUrl: string | null
    primarySport: string | null
    position: string | null
    groups: Array<{ id: string; name: string; sport: string | null; type: 'team' | 'squad' }>
    joinedAt: string | null
  }>()

  legacyMembers.rows.forEach((row) => {
    const team = toRecord(Array.isArray(row.teams) ? row.teams[0] : row.teams)
    const profile = normalizeJoinedProfile(row.profiles)
    const athleteId = String(row.athlete_id || profile.id || '')
    const groupId = String(row.team_id || team.id || '')
    if (!athleteId || !groupId) return
    const group = {
      id: groupId,
      name: String(team.team_name || 'Team'),
      sport: team.sport ? String(team.sport) : null,
      type: 'team' as const,
    }
    groupsById.set(groupId, { ...group, athleteCount: 0 })
    const existing = athletesById.get(athleteId)
    athletesById.set(athleteId, {
      athleteId,
      athleteName: existing?.athleteName || profile.fullName,
      avatarUrl: existing?.avatarUrl || profile.avatarUrl,
      primarySport: existing?.primarySport || profile.primarySport,
      position: existing?.position || profile.position,
      groups: [...(existing?.groups || []), group],
      joinedAt: existing?.joinedAt || (row.joined_at ? String(row.joined_at) : null),
    })
  })

  squadMembers.rows.forEach((row) => {
    const squad = toRecord(Array.isArray(row.squads) ? row.squads[0] : row.squads)
    const profile = normalizeJoinedProfile(row.profiles)
    const athleteId = String(row.athlete_id || profile.id || '')
    const groupId = String(row.squad_id || squad.id || '')
    if (!athleteId || !groupId) return
    const group = {
      id: groupId,
      name: String(squad.name || 'Squad'),
      sport: squad.sport ? String(squad.sport) : null,
      type: 'squad' as const,
    }
    groupsById.set(groupId, { ...group, athleteCount: 0 })
    const existing = athletesById.get(athleteId)
    athletesById.set(athleteId, {
      athleteId,
      athleteName: existing?.athleteName || profile.fullName,
      avatarUrl: existing?.avatarUrl || profile.avatarUrl,
      primarySport: existing?.primarySport || profile.primarySport,
      position: existing?.position || profile.position,
      groups: [...(existing?.groups || []), group],
      joinedAt: existing?.joinedAt || (row.joined_at ? String(row.joined_at) : null),
    })
  })

  const athletes = Array.from(athletesById.values()).map((athlete) => ({
    ...athlete,
    groups: Array.from(new Map(athlete.groups.map((group) => [group.id, group])).values()),
  }))

  athletes.forEach((athlete) => {
    athlete.groups.forEach((group) => {
      const existing = groupsById.get(group.id)
      if (existing) groupsById.set(group.id, { ...existing, athleteCount: existing.athleteCount + 1 })
    })
  })

  return {
    groups: Array.from(groupsById.values()),
    athletes,
    available: legacyMembers.available || squadMembers.available,
  }
}

function latestByUser(rows: Array<Record<string, any>>, userKey: string, dateKey: string) {
  const byUser = new Map<string, Record<string, any>>()
  rows
    .slice()
    .sort((left, right) => String(right[dateKey] || '').localeCompare(String(left[dateKey] || '')))
    .forEach((row) => {
      const userId = String(row[userKey] || '')
      if (userId && !byUser.has(userId)) byUser.set(userId, row)
    })
  return byUser
}

async function loadCoachAthleteSignals(supabase: SupabaseLike, coachId: string, athleteIds: string[]) {
  if (!athleteIds.length) {
    return {
      intelligence: new Map<string, Record<string, any>>(),
      readiness: new Map<string, Record<string, any>>(),
      logs: [] as Array<Record<string, any>>,
      checkIns: [] as Array<Record<string, any>>,
      sessions: [] as Array<Record<string, any>>,
      sessionLogs: [] as Array<Record<string, any>>,
      interventions: [] as Array<Record<string, any>>,
    }
  }

  const startDate = getDaysAgoIso(13)
  const [intelligence, readiness, logs, checkIns, sessions, sessionLogs, interventions] = await Promise.all([
    safeList<Record<string, any>>(
      supabase
        .from('computed_intelligence')
        .select('user_id, readiness_score, risk_score, log_date, created_at, intelligence_trace')
        .in('user_id', athleteIds)
        .order('created_at', { ascending: false }),
      'computed_intelligence'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('readiness_scores')
        .select('user_id, date, score, confidence_pct, confidence_tier')
        .in('user_id', athleteIds)
        .order('date', { ascending: false }),
      'readiness_scores'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('daily_load_logs')
        .select('athlete_id, log_date, readiness_score, duration_minutes, session_rpe, load_score, current_pain_level, pain_location')
        .in('athlete_id', athleteIds)
        .gte('log_date', startDate)
        .order('log_date', { ascending: false }),
      'daily_load_logs'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('daily_check_ins')
        .select('user_id, date, energy, body_feel, mental_load, sleep_hours_self, pain_locations, pain_scores, completed_at')
        .in('user_id', athleteIds)
        .gte('date', startDate)
        .order('date', { ascending: false }),
      'daily_check_ins'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('training_sessions')
        .select('id, athlete_id, coach_id, session_date, status, mode, title, sport, readiness_score, expected_duration_minutes, compliance_pct')
        .in('athlete_id', athleteIds)
        .gte('session_date', getDaysAgoIso(29))
        .order('session_date', { ascending: false })
        .limit(240),
      'training_sessions'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('training_session_logs')
        .select('id, session_id, athlete_id, actual_duration_minutes, compliance_pct, pain_flags, coach_notes, created_at')
        .in('athlete_id', athleteIds)
        .order('created_at', { ascending: false })
        .limit(240),
      'training_session_logs'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('coach_interventions')
        .select('id, coach_id, athlete_id, team_id, queue_type, status, priority, reason_codes, recommendation, updated_at')
        .eq('coach_id', coachId)
        .in('athlete_id', athleteIds)
        .order('updated_at', { ascending: false }),
      'coach_interventions'
    ),
  ])

  return {
    intelligence: latestByUser(intelligence.rows, 'user_id', 'created_at'),
    readiness: latestByUser(readiness.rows, 'user_id', 'date'),
    logs: logs.rows,
    checkIns: checkIns.rows,
    sessions: sessions.rows,
    sessionLogs: sessionLogs.rows,
    interventions: interventions.rows,
  }
}

function groupRows(rows: Array<Record<string, any>>, key: string) {
  const grouped = new Map<string, Array<Record<string, any>>>()
  rows.forEach((row) => {
    const id = String(row[key] || '')
    if (!id) return
    grouped.set(id, [...(grouped.get(id) || []), row])
  })
  return grouped
}

function buildAthleteFlags(args: {
  status: CoachStatus
  latestLog: Record<string, any> | null
  latestCheckIn: Record<string, any> | null
  interventionRows: Array<Record<string, any>>
  staleDays: number | null
}) {
  const flags: Array<{ level: CoachStatus; label: string; source: string }> = []
  const painScore = toNumber(args.latestLog?.current_pain_level)
  if (painScore !== null && painScore >= 4) {
    flags.push({
      level: painScore >= 6 ? 'attention' : 'caution',
      label: 'Recent check-in marked recovery attention.',
      source: 'daily_load_logs',
    })
  }

  if (args.staleDays !== null && args.staleDays > 3) {
    flags.push({
      level: 'caution',
      label: 'Check-in signal is getting stale.',
      source: 'check-in freshness',
    })
  }

  args.interventionRows
    .filter((row) => String(row.status || '') !== 'resolved')
    .slice(0, 3)
    .forEach((row) => {
      flags.push({
        level: String(row.priority || '') === 'Critical' ? 'attention' : 'caution',
        label: String(row.recommendation || row.queue_type || 'Coach follow-up is open.'),
        source: 'coach_interventions',
      })
    })

  if (!flags.length && args.status === 'unknown') {
    flags.push({
      level: 'unknown',
      label: 'Not enough recent data for a readiness call.',
      source: 'missing data',
    })
  }

  return flags
}

function buildAttendance(athleteSessions: Array<Record<string, any>>, athleteSessionLogs: Array<Record<string, any>>) {
  const completedSessions = athleteSessions.filter((session) => String(session.status || '') === 'completed').length
  const plannedSessions = athleteSessions.filter((session) => ['planned', 'in_progress', 'completed', 'skipped'].includes(String(session.status || ''))).length
  if (!plannedSessions && !athleteSessionLogs.length) {
    return {
      available: false,
      pct: null,
      completedSessions: 0,
      plannedSessions: 0,
      source: 'none',
    }
  }

  const logComplianceValues = athleteSessionLogs
    .map((row) => toNumber(row.compliance_pct))
    .filter((value): value is number => value !== null)

  return {
    available: true,
    pct: plannedSessions
      ? Math.round((completedSessions / plannedSessions) * 100)
      : Math.round(average(logComplianceValues) || 0),
    completedSessions: completedSessions || athleteSessionLogs.length,
    plannedSessions,
    source: plannedSessions ? 'training_sessions' : 'training_session_logs',
  }
}

export async function getMobileCoachSquad(supabase: SupabaseLike, user: MobileAuthenticatedUser) {
  const roster = await loadCoachRoster(supabase, user.userId)
  const athleteIds = roster.athletes.map((athlete) => athlete.athleteId)
  const signals = await loadCoachAthleteSignals(supabase, user.userId, athleteIds)
  const logsByAthlete = groupRows(signals.logs, 'athlete_id')
  const checkInsByAthlete = groupRows(signals.checkIns, 'user_id')
  const sessionsByAthlete = groupRows(signals.sessions, 'athlete_id')
  const sessionLogsByAthlete = groupRows(signals.sessionLogs, 'athlete_id')
  const interventionsByAthlete = groupRows(signals.interventions, 'athlete_id')

  const athletes = roster.athletes.map((athlete) => {
    const latestIntelligence = signals.intelligence.get(athlete.athleteId) || null
    const latestReadiness = signals.readiness.get(athlete.athleteId) || null
    const athleteLogs = logsByAthlete.get(athlete.athleteId) || []
    const athleteCheckIns = checkInsByAthlete.get(athlete.athleteId) || []
    const athleteSessions = sessionsByAthlete.get(athlete.athleteId) || []
    const athleteSessionLogs = sessionLogsByAthlete.get(athlete.athleteId) || []
    const interventions = interventionsByAthlete.get(athlete.athleteId) || []
    const latestLog = athleteLogs[0] || null
    const latestCheckIn = athleteCheckIns[0] || null
    const readinessScore =
      toRoundedNumber(latestReadiness?.score) ??
      toRoundedNumber(latestIntelligence?.readiness_score) ??
      toRoundedNumber(latestLog?.readiness_score)
    const riskScore = toRoundedNumber(latestIntelligence?.risk_score)
    const lastCheckIn = String(latestCheckIn?.date || latestLog?.log_date || '').slice(0, 10) || null
    const staleDays = daysSince(lastCheckIn)
    const activeInterventions = interventions.filter((row) => String(row.status || '') !== 'resolved')
    const status = resolveCoachAthleteStatus({
      readinessScore,
      riskScore,
      painScore: toNumber(latestLog?.current_pain_level),
      hasActiveIntervention: activeInterventions.some((row) => String(row.priority || '') === 'Critical'),
      staleDays,
    })
    const attendance = buildAttendance(athleteSessions, athleteSessionLogs)

    return {
      athleteId: athlete.athleteId,
      athleteName: athlete.athleteName,
      avatarUrl: athlete.avatarUrl,
      primarySport: athlete.primarySport,
      position: athlete.position,
      groups: athlete.groups,
      readinessScore,
      riskScore,
      status,
      statusLight: status,
      attendance,
      lastCheckInAt: lastCheckIn,
      lastCheckInDaysAgo: staleDays,
      planCompletionPct: attendance.available ? attendance.pct : null,
      flags: buildAthleteFlags({
        status,
        latestLog,
        latestCheckIn,
        interventionRows: activeInterventions,
        staleDays,
      }),
    }
  }).sort((left, right) => COACH_STATUS_WEIGHT[right.status] - COACH_STATUS_WEIGHT[left.status])

  const counts = athletes.reduce(
    (acc, athlete) => {
      acc[athlete.status] += 1
      return acc
    },
    { ready: 0, caution: 0, attention: 0, unknown: 0 } as Record<CoachStatus, number>
  )

  return {
    summary: {
      totalAthletes: athletes.length,
      readyCount: counts.ready,
      cautionCount: counts.caution,
      attentionCount: counts.attention,
      unknownCount: counts.unknown,
      teamCount: roster.groups.length,
    },
    teams: roster.groups,
    athletes,
    emptyState: athletes.length === 0
      ? {
          title: 'No connected athletes yet',
          message: 'Invite athletes into a team or squad before the mobile squad grid can show readiness.',
        }
      : null,
  }
}

export async function getMobileCoachAthleteDetail(
  supabase: SupabaseLike,
  user: MobileAuthenticatedUser,
  athleteId: string
) {
  const roster = await loadCoachRoster(supabase, user.userId)
  const rosterAthlete = roster.athletes.find((athlete) => athlete.athleteId === athleteId)
  if (!rosterAthlete) return null

  const signals = await loadCoachAthleteSignals(supabase, user.userId, [athleteId])
  const recentScans = await Promise.all([
    safeList<Record<string, any>>(
      supabase
        .from('video_analysis_reports')
        .select('id, sport, frame_count, warnings, positive, issues_detected, created_at')
        .eq('user_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(6),
      'video_analysis_reports'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('diagnostic_sessions')
        .select('id, status, body_region, pain_flag, severity, primary_bucket, created_at')
        .eq('user_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(6),
      'diagnostic_sessions'
    ),
    safeList<Record<string, any>>(
      supabase
        .from('movement_baselines')
        .select('id, scan_type, movement_quality_score, weak_links, performed_at')
        .eq('user_id', athleteId)
        .order('performed_at', { ascending: false })
        .limit(6),
      'movement_baselines'
    ),
  ])
  const comments = await safeList<Record<string, any>>(
    supabase
      .from('coach_session_feedback')
      .select('id, session_id, feedback_type, message, flagged_issue, priority, created_at')
      .eq('coach_id', user.userId)
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(12),
    'coach_session_feedback'
  )

  const latestIntelligence = signals.intelligence.get(athleteId) || null
  const latestReadiness = signals.readiness.get(athleteId) || null
  const logs = signals.logs
  const checkIns = signals.checkIns
  const sessions = signals.sessions
  const sessionLogs = signals.sessionLogs
  const interventions = signals.interventions.filter((row) => String(row.status || '') !== 'resolved')
  const latestLog = logs[0] || null
  const readinessScore =
    toRoundedNumber(latestReadiness?.score) ??
    toRoundedNumber(latestIntelligence?.readiness_score) ??
    toRoundedNumber(latestLog?.readiness_score)
  const riskScore = toRoundedNumber(latestIntelligence?.risk_score)
  const status = resolveCoachAthleteStatus({
    readinessScore,
    riskScore,
    painScore: toNumber(latestLog?.current_pain_level),
    hasActiveIntervention: interventions.some((row) => String(row.priority || '') === 'Critical'),
    staleDays: daysSince(checkIns[0]?.date || latestLog?.log_date),
  })

  return {
    athlete: {
      athleteId: rosterAthlete.athleteId,
      athleteName: rosterAthlete.athleteName,
      avatarUrl: rosterAthlete.avatarUrl,
      primarySport: rosterAthlete.primarySport,
      position: rosterAthlete.position,
      groups: rosterAthlete.groups,
    },
    readiness: {
      score: readinessScore,
      riskScore,
      status,
      confidencePct: toRoundedNumber(latestReadiness?.confidence_pct),
      source: latestReadiness ? 'readiness_scores' : latestIntelligence ? 'computed_intelligence' : latestLog ? 'daily_load_logs' : 'none',
    },
    recentCheckIns: checkIns.slice(0, 7).map((row) => ({
      date: String(row.date || ''),
      energy: toRoundedNumber(row.energy),
      bodyFeel: toRoundedNumber(row.body_feel),
      mentalLoad: toRoundedNumber(row.mental_load),
      sleepHours: toNumber(row.sleep_hours_self),
      painLocations: toArray(row.pain_locations).map(String),
      completedAt: row.completed_at ? String(row.completed_at) : null,
    })),
    recentLogs: logs.slice(0, 7).map((row) => ({
      date: String(row.log_date || ''),
      readinessScore: toRoundedNumber(row.readiness_score),
      durationMinutes: toRoundedNumber(row.duration_minutes),
      sessionRpe: toRoundedNumber(row.session_rpe),
      loadScore: toRoundedNumber(row.load_score),
      painLevel: toRoundedNumber(row.current_pain_level),
      painLocations: toArray(row.pain_location).map(String),
    })),
    recentScans: {
      video: recentScans[0].rows.map((row) => ({
        id: String(row.id || ''),
        sport: String(row.sport || ''),
        warnings: toRoundedNumber(row.warnings),
        positive: toRoundedNumber(row.positive),
        issuesDetected: toArray(row.issues_detected).map(String),
        createdAt: row.created_at ? String(row.created_at) : null,
      })),
      diagnostic: recentScans[1].rows.map((row) => ({
        id: String(row.id || ''),
        status: String(row.status || ''),
        bodyRegion: row.body_region ? String(row.body_region) : null,
        painFlag: Boolean(row.pain_flag),
        severity: toRoundedNumber(row.severity),
        createdAt: row.created_at ? String(row.created_at) : null,
      })),
      movementBaseline: recentScans[2].rows.map((row) => ({
        id: String(row.id || ''),
        scanType: String(row.scan_type || ''),
        movementQualityScore: toRoundedNumber(row.movement_quality_score),
        weakLinks: row.weak_links || null,
        performedAt: row.performed_at ? String(row.performed_at) : null,
      })),
    },
    trainingLoad: {
      sevenDayLoadAu: sumField(logs.filter((row) => String(row.log_date || '').slice(0, 10) >= getDaysAgoIso(6)), 'load_score'),
      recentSessions: sessions.slice(0, 10).map((session) => ({
        id: String(session.id || ''),
        title: String(session.title || 'Training session'),
        date: String(session.session_date || ''),
        status: String(session.status || ''),
        mode: String(session.mode || ''),
        expectedDurationMinutes: toRoundedNumber(session.expected_duration_minutes),
        compliancePct: toRoundedNumber(session.compliance_pct),
      })),
      attendance: buildAttendance(sessions, sessionLogs),
    },
    coachComments: comments.rows.map((row) => ({
      id: String(row.id || ''),
      sessionId: row.session_id ? String(row.session_id) : null,
      type: String(row.feedback_type || ''),
      message: String(row.message || ''),
      flaggedIssue: row.flagged_issue ? String(row.flagged_issue) : null,
      priority: String(row.priority || 'normal'),
      createdAt: row.created_at ? String(row.created_at) : null,
    })),
    flags: buildAthleteFlags({
      status,
      latestLog,
      latestCheckIn: checkIns[0] || null,
      interventionRows: interventions,
      staleDays: daysSince(checkIns[0]?.date || latestLog?.log_date),
    }),
    emptyState: readinessScore === null && !checkIns.length && !logs.length && !sessions.length
      ? {
          title: 'Athlete detail is waiting for real data',
          message: 'This athlete is connected, but has not shared enough check-ins, scans, or sessions yet.',
        }
      : null,
  }
}

export async function getMobileCoachRts(supabase: SupabaseLike, user: MobileAuthenticatedUser) {
  const roster = await loadCoachRoster(supabase, user.userId)
  const athleteIds = roster.athletes.map((athlete) => athlete.athleteId)
  if (!athleteIds.length) {
    return {
      records: [],
      emptyState: {
        title: 'No connected athletes yet',
        message: 'Return-to-training records will appear after athletes join your squad and share recovery data.',
      },
    }
  }

  const rehab = await safeList<Record<string, any>>(
    supabase
      .from('rehab_history')
      .select('id, user_id, date, injury_type, stage, pain_score, load_tolerance, progression_flag, notes, created_at')
      .in('user_id', athleteIds)
      .order('date', { ascending: false })
      .limit(80),
    'rehab_history'
  )
  const athleteById = new Map(roster.athletes.map((athlete) => [athlete.athleteId, athlete]))
  const activeRows = rehab.rows.filter((row) => {
    const flag = String(row.progression_flag || row.response || '').toLowerCase()
    return flag !== 'progressed' || (toNumber(row.stage) !== null && Number(row.stage) < 5)
  })

  return {
    records: activeRows.map((row) => {
      const athlete = athleteById.get(String(row.user_id || ''))
      return {
        id: String(row.id || `${row.user_id || ''}:${row.date || ''}:${row.injury_type || 'record'}`),
        athleteId: String(row.user_id || ''),
        athleteName: athlete?.athleteName || 'Athlete',
        stage: toRoundedNumber(row.stage),
        stageLabel: row.stage ? `Stage ${row.stage}` : 'Stage not set',
        nextReviewDate: null,
        evidence: {
          source: 'rehab_history',
          date: row.date ? String(row.date) : null,
          painScore: toNumber(row.pain_score),
          loadTolerance: toNumber(row.load_tolerance),
          progressionFlag: row.progression_flag ? String(row.progression_flag) : null,
        },
        coachNotes: row.notes ? String(row.notes) : null,
        safetyCopy: 'This is return-to-training support information, not a medical diagnosis.',
      }
    }),
    emptyState: activeRows.length === 0
      ? {
          title: 'No active return-to-training records',
          message: 'RTS records will appear only when real recovery or rehab history exists for connected athletes.',
        }
      : null,
  }
}

export async function getMobileLearnDaily() {
  return {
    dailyLesson: null,
    library: [],
    completedLessons: [],
    comingSoon: true,
    emptyState: {
      title: 'Learn content is coming soon',
      message: 'No lesson catalog is configured in the backend yet, so the app will keep this as an honest empty state.',
    },
  }
}

export async function getMobileCommunityChallenges(supabase: SupabaseLike, user: MobileAuthenticatedUser) {
  const challenges = await safeList<Record<string, any>>(
    supabase
      .from('challenges')
      .select('id, title, description, challenge_type, metric_key, target_value, duration_days, sport, visibility, created_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(12),
    'challenges'
  )
  const challengeIds = challenges.rows.map((row) => String(row.id || '')).filter(Boolean)
  const participantRows = challengeIds.length
    ? await safeList<Record<string, any>>(
        supabase
          .from('challenge_participants')
          .select('challenge_id, user_id, progress_value, status, joined_at, completed_at')
          .eq('user_id', user.userId)
          .in('challenge_id', challengeIds),
        'challenge_participants'
      )
    : { available: challenges.available, rows: [], error: null }
  const participationByChallenge = new Map(
    participantRows.rows.map((row) => [String(row.challenge_id || ''), row])
  )

  return {
    challenges: challenges.rows.map((row) => {
      const participant = participationByChallenge.get(String(row.id || ''))
      return {
        id: String(row.id || ''),
        title: String(row.title || ''),
        description: String(row.description || ''),
        type: String(row.challenge_type || ''),
        metricKey: String(row.metric_key || ''),
        targetValue: toNumber(row.target_value),
        durationDays: toRoundedNumber(row.duration_days),
        sport: String(row.sport || 'general_fitness'),
        visibility: String(row.visibility || 'public'),
        createdAt: row.created_at ? String(row.created_at) : null,
        participation: participant
          ? {
              status: String(participant.status || ''),
              progressValue: toNumber(participant.progress_value),
              joinedAt: participant.joined_at ? String(participant.joined_at) : null,
              completedAt: participant.completed_at ? String(participant.completed_at) : null,
            }
          : null,
        source: 'challenges',
      }
    }),
    emptyState: challenges.rows.length === 0
      ? {
          title: 'Challenges are not configured yet',
          message: 'Community challenges will appear once the backend has active challenge records.',
        }
      : null,
  }
}

export async function getMobileCommunityNearby() {
  return {
    enabled: false,
    requiresConsent: true,
    nearby: [],
    emptyState: {
      title: 'Nearby discovery is disabled',
      message: 'Creeda has not enabled privacy-safe location consent and discovery rules yet.',
    },
  }
}
