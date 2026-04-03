import type { TrustSignalSummary } from '@/lib/engine/types'

export const DAILY_CONTEXT_SIGNALS_TABLE = 'daily_context_signals'

export type ContextRole = 'athlete' | 'individual'
export type HeatLevel = 'normal' | 'warm' | 'hot' | 'extreme'
export type HumidityLevel = 'low' | 'moderate' | 'high'
export type AQIBand = 'good' | 'moderate' | 'poor' | 'very_poor'
export type FastingState = 'none' | 'light' | 'strict'

export interface DailyContextSignalRecord {
  userId: string
  role: ContextRole
  logDate: string
  heatLevel: HeatLevel | null
  humidityLevel: HumidityLevel | null
  aqiBand: AQIBand | null
  commuteMinutes: number
  examStressScore: number
  fastingState: FastingState | null
  shiftWork: boolean
  contextNotes: string | null
}

export interface DailyContextSummary {
  latestSignal: DailyContextSignalRecord | null
  freshness: 'fresh' | 'stale' | 'missing'
  trustStatus: TrustSignalSummary['status']
  loadScore: number
  loadLabel: 'Low' | 'Moderate' | 'High'
  highContextLoad: boolean
  highLoadDays: number
  recentSignalDays: number
  summary: string
  drivers: string[]
  nextAction: string
}

type SupabaseLike = {
  from: (table: string) => unknown
}

type UpsertResult =
  | PromiseLike<{ error: { message?: string | null } | null }>
  | { error: { message?: string | null } | null }

type DeleteResult =
  | PromiseLike<{ error: { message?: string | null } | null }>
  | { error: { message?: string | null } | null }

type ContextTable = {
  upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => UpsertResult
  delete: () => unknown
}

type ContextQueryResult =
  | PromiseLike<{ data: unknown; error: { message?: string | null } | null }>
  | { data: unknown; error: { message?: string | null } | null }

type ContextSelectQuery = {
  eq: (column: string, value: string) => {
    lt: (column: string, value: string) => {
      order: (orderColumn: string, options: { ascending: boolean }) => {
        limit: (count: number) => ContextQueryResult
      }
    }
    order: (orderColumn: string, options: { ascending: boolean }) => {
      limit: (count: number) => ContextQueryResult
    }
  }
}

const HEAT_LEVELS: HeatLevel[] = ['normal', 'warm', 'hot', 'extreme']
const HUMIDITY_LEVELS: HumidityLevel[] = ['low', 'moderate', 'high']
const AQI_BANDS: AQIBand[] = ['good', 'moderate', 'poor', 'very_poor']
const FASTING_STATES: FastingState[] = ['none', 'light', 'strict']

const HEAT_SCORES: Record<HeatLevel, number> = {
  normal: 0,
  warm: 4,
  hot: 10,
  extreme: 18,
}

const HUMIDITY_SCORES: Record<HumidityLevel, number> = {
  low: 0,
  moderate: 3,
  high: 7,
}

const AQI_SCORES: Record<AQIBand, number> = {
  good: 0,
  moderate: 4,
  poor: 10,
  very_poor: 16,
}

const FASTING_SCORES: Record<FastingState, number> = {
  none: 0,
  light: 5,
  strict: 10,
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isHeatLevel(value: unknown): value is HeatLevel {
  return HEAT_LEVELS.includes(String(value || '') as HeatLevel)
}

function isHumidityLevel(value: unknown): value is HumidityLevel {
  return HUMIDITY_LEVELS.includes(String(value || '') as HumidityLevel)
}

function isAqiBand(value: unknown): value is AQIBand {
  return AQI_BANDS.includes(String(value || '') as AQIBand)
}

function isFastingState(value: unknown): value is FastingState {
  return FASTING_STATES.includes(String(value || '') as FastingState)
}

function clampInteger(value: unknown, min: number, max: number, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

function getRecentDateIso(daysAgo = 0) {
  const now = new Date()
  now.setDate(now.getDate() - daysAgo)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
}

function listToSentence(items: string[]) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function getContextDrivers(signal: DailyContextSignalRecord | null) {
  if (!signal) return []

  const drivers: string[] = []

  if (signal.heatLevel === 'hot' || signal.heatLevel === 'extreme') {
    drivers.push(signal.heatLevel === 'extreme' ? 'extreme heat' : 'high heat')
  }

  if (signal.humidityLevel === 'high') {
    drivers.push('high humidity')
  }

  if (signal.aqiBand === 'poor' || signal.aqiBand === 'very_poor') {
    drivers.push(signal.aqiBand === 'very_poor' ? 'very poor air quality' : 'poor air quality')
  }

  if (signal.commuteMinutes >= 90) {
    drivers.push(`a ${signal.commuteMinutes}-minute commute`)
  } else if (signal.commuteMinutes >= 45) {
    drivers.push(`a ${signal.commuteMinutes}-minute commute`)
  }

  if (signal.examStressScore >= 4) {
    drivers.push('heavy exam or schedule stress')
  } else if (signal.examStressScore >= 2) {
    drivers.push('moderate exam or schedule stress')
  }

  if (signal.fastingState === 'strict') {
    drivers.push('strict fasting')
  } else if (signal.fastingState === 'light') {
    drivers.push('light fasting')
  }

  if (signal.shiftWork) {
    drivers.push('shift-work fatigue')
  }

  return drivers
}

function getContextLoadScore(signal: DailyContextSignalRecord | null) {
  if (!signal) return 0

  const commuteScore =
    signal.commuteMinutes >= 120 ? 16 :
    signal.commuteMinutes >= 90 ? 13 :
    signal.commuteMinutes >= 60 ? 9 :
    signal.commuteMinutes >= 30 ? 4 :
    0
  const examStressScore = Math.max(0, Math.min(16, signal.examStressScore * 4))
  const shiftWorkScore = signal.shiftWork ? 8 : 0
  const heatScore = signal.heatLevel ? HEAT_SCORES[signal.heatLevel] : 0
  const humidityScore = signal.humidityLevel ? HUMIDITY_SCORES[signal.humidityLevel] : 0
  const aqiScore = signal.aqiBand ? AQI_SCORES[signal.aqiBand] : 0
  const fastingScore = signal.fastingState ? FASTING_SCORES[signal.fastingState] : 0

  return Math.max(0, Math.min(100, heatScore + humidityScore + aqiScore + commuteScore + examStressScore + fastingScore + shiftWorkScore))
}

function getContextLoadLabel(score: number): DailyContextSummary['loadLabel'] {
  if (score >= 26) return 'High'
  if (score >= 10) return 'Moderate'
  return 'Low'
}

function hasMeaningfulContext(signal: DailyContextSignalRecord | null) {
  if (!signal) return false
  return (
    getContextLoadScore(signal) > 0 ||
    Boolean(signal.contextNotes)
  )
}

export function normalizeDailyContextSignal(value: unknown): DailyContextSignalRecord | null {
  const record = asRecord(value)
  if (!record) return null

  const role = String(record.role || '') === 'athlete' || String(record.role || '') === 'individual'
    ? (String(record.role) as ContextRole)
    : null
  const userId = String(record.user_id || record.userId || '').trim()
  const logDate = String(record.log_date || record.logDate || '').slice(0, 10)

  if (!role || !userId || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return null

  return {
    userId,
    role,
    logDate,
    heatLevel: isHeatLevel(record.heat_level || record.heatLevel) ? (record.heat_level || record.heatLevel) as HeatLevel : null,
    humidityLevel: isHumidityLevel(record.humidity_level || record.humidityLevel) ? (record.humidity_level || record.humidityLevel) as HumidityLevel : null,
    aqiBand: isAqiBand(record.aqi_band || record.aqiBand) ? (record.aqi_band || record.aqiBand) as AQIBand : null,
    commuteMinutes: clampInteger(record.commute_minutes ?? record.commuteMinutes, 0, 240),
    examStressScore: clampInteger(record.exam_stress_score ?? record.examStressScore, 0, 5),
    fastingState: isFastingState(record.fasting_state || record.fastingState) ? (record.fasting_state || record.fastingState) as FastingState : null,
    shiftWork: Boolean(record.shift_work ?? record.shiftWork),
    contextNotes: String(record.context_notes || record.contextNotes || '').trim() || null,
  }
}

export function createDailyContextSignalRecord(args: {
  userId: string
  role: ContextRole
  logDate: string
  heatLevel?: HeatLevel | '' | null
  humidityLevel?: HumidityLevel | '' | null
  aqiBand?: AQIBand | '' | null
  commuteMinutes?: number | null
  examStressScore?: number | null
  fastingState?: FastingState | '' | null
  shiftWork?: boolean | null
  contextNotes?: string | null
}) {
  const signal: DailyContextSignalRecord = {
    userId: args.userId,
    role: args.role,
    logDate: args.logDate,
    heatLevel: isHeatLevel(args.heatLevel) ? args.heatLevel : null,
    humidityLevel: isHumidityLevel(args.humidityLevel) ? args.humidityLevel : null,
    aqiBand: isAqiBand(args.aqiBand) ? args.aqiBand : null,
    commuteMinutes: clampInteger(args.commuteMinutes, 0, 240),
    examStressScore: clampInteger(args.examStressScore, 0, 5),
    fastingState: isFastingState(args.fastingState) ? args.fastingState : null,
    shiftWork: Boolean(args.shiftWork),
    contextNotes: String(args.contextNotes || '').trim().slice(0, 300) || null,
  }

  return hasMeaningfulContext(signal) ? signal : null
}

export function summarizeDailyContextSignals(signals: DailyContextSignalRecord[]): DailyContextSummary | null {
  const sorted = [...signals]
    .sort((a, b) => b.logDate.localeCompare(a.logDate))

  const latestSignal = sorted[0] || null
  const freshness: DailyContextSummary['freshness'] =
    !latestSignal ? 'missing' : latestSignal.logDate >= getRecentDateIso(2) ? 'fresh' : 'stale'
  const recentSignals = sorted.filter((signal) => signal.logDate >= getRecentDateIso(6))
  const latestDrivers = getContextDrivers(latestSignal)
  const loadScore = getContextLoadScore(latestSignal)
  const loadLabel = getContextLoadLabel(loadScore)
  const highContextLoad = loadScore >= 26
  const highLoadDays = recentSignals.filter((signal) => getContextLoadScore(signal) >= 26).length
  const recentSignalDays = recentSignals.filter((signal) => hasMeaningfulContext(signal)).length
  const trustStatus: DailyContextSummary['trustStatus'] =
    freshness === 'missing' ? 'missing' : freshness === 'fresh' ? 'active' : 'limited'

  if (!latestSignal) {
    return {
      latestSignal: null,
      freshness,
      trustStatus,
      loadScore: 0,
      loadLabel: 'Low',
      highContextLoad: false,
      highLoadDays: 0,
      recentSignalDays: 0,
      summary: 'No daily context has been logged yet. Add heat, commute, fasting, or schedule pressure only when the day is unusual.',
      drivers: [],
      nextAction: 'Optional: log context only when the day is different enough that it should explain the decision more clearly.',
    }
  }

  const summary =
    latestDrivers.length === 0
      ? highLoadDays >= 3
        ? `The latest check-in did not add extra context load, but context pressure still showed up on ${highLoadDays} days this week.`
        : 'No extra context load was logged today beyond the normal daily routine.'
      : `Daily context is adding ${loadLabel.toLowerCase()} extra load through ${listToSentence(latestDrivers.slice(0, 3))}.${highLoadDays >= 3 ? ` Similar pressure showed up on ${highLoadDays} days this week.` : ''}`

  const nextAction =
    freshness === 'stale'
      ? 'Refresh the optional context note when heat, commute, fasting, or schedule stress changes.'
      : highContextLoad
        ? 'Use this as a reason to cool hydration, trim friction, and simplify the session when the plan allows.'
        : 'Keep logging context only on unusual days so CREEDA gets sharper without creating extra daily work.'

  return {
    latestSignal,
    freshness,
    trustStatus,
    loadScore,
    loadLabel,
    highContextLoad,
    highLoadDays,
    recentSignalDays,
    summary,
    drivers: latestDrivers,
    nextAction,
  }
}

export function selectRecentDailyContextSignals(
  supabase: SupabaseLike,
  userId: string,
  limit = 7,
  beforeDate?: string
) {
  const table = supabase.from(DAILY_CONTEXT_SIGNALS_TABLE) as {
    select: (columns: string) => ContextSelectQuery
  }

  const query = table
    .select('user_id, role, log_date, heat_level, humidity_level, aqi_band, commute_minutes, exam_stress_score, fasting_state, shift_work, context_notes')
    .eq('user_id', userId)

  if (beforeDate) {
    return query.lt('log_date', beforeDate).order('log_date', { ascending: false }).limit(limit)
  }

  return query.order('log_date', { ascending: false }).limit(limit)
}

export async function saveDailyContextSignal(
  supabase: SupabaseLike,
  signal: DailyContextSignalRecord | null,
  args: { userId: string; role: ContextRole; logDate: string }
) {
  const table = supabase.from(DAILY_CONTEXT_SIGNALS_TABLE) as ContextTable

  if (!signal) {
    const deleteQuery = table.delete() as {
      eq: (column: string, value: string) => {
        eq: (nextColumn: string, nextValue: string) => {
          eq: (finalColumn: string, finalValue: string) => DeleteResult
        }
      }
    }

    return deleteQuery
      .eq('user_id', args.userId)
      .eq('log_date', args.logDate)
      .eq('role', args.role)
  }

  return table.upsert(
    {
      user_id: signal.userId,
      role: signal.role,
      log_date: signal.logDate,
      heat_level: signal.heatLevel,
      humidity_level: signal.humidityLevel,
      aqi_band: signal.aqiBand,
      commute_minutes: signal.commuteMinutes,
      exam_stress_score: signal.examStressScore,
      fasting_state: signal.fastingState,
      shift_work: signal.shiftWork,
      context_notes: signal.contextNotes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,role,log_date' }
  )
}

export function isDailyContextMissingError(error: { message?: string | null } | null | undefined) {
  const message = String(error?.message || '')
  return message.includes(DAILY_CONTEXT_SIGNALS_TABLE)
}
