import { clamp } from '@/lib/product/types'
import type {
  DataProvenanceType,
  HealthProvider,
  HealthSourceConnection,
  IntegrationConnectorDefinition,
  IntegrationStatus,
  LegacyHealthSummary,
  NormalizedHealthSample,
  SourceCategory,
} from '@/lib/product/operating-system/types'

export const INTEGRATION_CONNECTORS: IntegrationConnectorDefinition[] = [
  {
    provider: 'apple_health',
    displayName: 'Apple Health',
    statusLabel: 'iPhone / Apple Watch',
    sourceCategory: 'measured',
    provenanceType: 'wearable',
    supportedSignals: ['sleep', 'hrv', 'resting_hr', 'activity_load', 'steps', 'workouts', 'calories', 'recovery'],
    productionReadiness: 'ready_for_client_token',
    setupHint: 'Use the mobile app to grant HealthKit permissions for sleep, HRV, heart rate, workouts, and activity.',
  },
  {
    provider: 'health_connect',
    displayName: 'Health Connect',
    statusLabel: 'Android health layer',
    sourceCategory: 'measured',
    provenanceType: 'wearable',
    supportedSignals: ['sleep', 'hrv', 'resting_hr', 'activity_load', 'steps', 'workouts', 'calories', 'recovery'],
    productionReadiness: 'ready_for_client_token',
    setupHint: 'Use the Android app to grant Health Connect permissions for recovery and activity signals.',
  },
  {
    provider: 'google_fit',
    displayName: 'Google Fit',
    statusLabel: 'Google activity fallback',
    sourceCategory: 'measured',
    provenanceType: 'wearable',
    supportedSignals: ['steps', 'workouts', 'calories', 'activity_load'],
    productionReadiness: 'needs_partner_credentials',
    setupHint: 'Ready for OAuth credentials when Google Fit support is enabled.',
  },
  {
    provider: 'garmin',
    displayName: 'Garmin',
    statusLabel: 'Performance wearable',
    sourceCategory: 'measured',
    provenanceType: 'wearable',
    supportedSignals: ['sleep', 'hrv', 'resting_hr', 'activity_load', 'steps', 'workouts', 'calories', 'recovery'],
    productionReadiness: 'needs_partner_credentials',
    setupHint: 'Ready for Garmin Health API approval and credentials.',
  },
  {
    provider: 'fitbit',
    displayName: 'Fitbit',
    statusLabel: 'Wearable recovery',
    sourceCategory: 'measured',
    provenanceType: 'wearable',
    supportedSignals: ['sleep', 'hrv', 'resting_hr', 'activity_load', 'steps', 'workouts', 'calories', 'recovery'],
    productionReadiness: 'needs_partner_credentials',
    setupHint: 'Ready for Fitbit OAuth credentials and refresh-token storage.',
  },
  {
    provider: 'manual_import',
    displayName: 'Manual Import',
    statusLabel: 'CSV or self-entered data',
    sourceCategory: 'manual',
    provenanceType: 'manual_import',
    supportedSignals: ['sleep', 'resting_hr', 'activity_load', 'steps', 'workouts', 'calories', 'recovery'],
    productionReadiness: 'manual',
    setupHint: 'Use this when a wearable is unavailable or the athlete wants to upload a simple training log.',
  },
]

export function getConnector(provider: HealthProvider) {
  return INTEGRATION_CONNECTORS.find((connector) => connector.provider === provider) || INTEGRATION_CONNECTORS[0]
}

function normalizeProvider(value: unknown): HealthProvider | null {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'apple' || normalized === 'apple_health') return 'apple_health'
  if (normalized === 'android' || normalized === 'health_connect') return 'health_connect'
  if (normalized === 'google_fit') return 'google_fit'
  if (normalized === 'garmin') return 'garmin'
  if (normalized === 'fitbit') return 'fitbit'
  if (normalized === 'manual' || normalized === 'manual_import') return 'manual_import'
  return null
}

function provenanceFor(provider: HealthProvider, sourceCategory?: SourceCategory): DataProvenanceType {
  if (sourceCategory === 'manual') return 'manual_import'
  return getConnector(provider).provenanceType
}

function statusFor(row: Record<string, unknown> | null, fallback: IntegrationStatus): IntegrationStatus {
  const status = String(row?.status || fallback)
  if (['available', 'connected', 'mock_connected', 'needs_auth', 'sync_failed', 'paused'].includes(status)) {
    return status as IntegrationStatus
  }
  return fallback
}

export function buildConnectionList(rows: Array<Record<string, unknown>>, legacyHealth: LegacyHealthSummary) {
  const rowsByProvider = new Map<HealthProvider, Record<string, unknown>>()
  rows.forEach((row) => {
    const provider = normalizeProvider(row.provider)
    if (provider) rowsByProvider.set(provider, row)
  })

  return INTEGRATION_CONNECTORS.map<HealthSourceConnection>((connector) => {
    const row = rowsByProvider.get(connector.provider) || null
    const legacyConnected =
      connector.provider === 'apple_health'
        ? Boolean(legacyHealth?.connected && (legacyHealth.source === 'apple' || legacyHealth.source === 'mixed'))
        : connector.provider === 'health_connect'
          ? Boolean(legacyHealth?.connected && (legacyHealth.source === 'android' || legacyHealth.source === 'mixed'))
          : false
    const sourceCategory = (row?.source_category as SourceCategory | undefined) || connector.sourceCategory

    return {
      id: row?.id ? String(row.id) : null,
      provider: connector.provider,
      displayName: connector.displayName,
      status: statusFor(row, legacyConnected ? 'connected' : 'available'),
      sourceCategory,
      provenanceType: provenanceFor(connector.provider, sourceCategory),
      supportedSignals: connector.supportedSignals,
      lastSyncAt: row?.last_sync_at ? String(row.last_sync_at) : legacyConnected ? legacyHealth?.lastSyncAt || null : null,
      lastError: row?.last_error ? String(row.last_error) : null,
      enabled: typeof row?.enabled === 'boolean' ? row.enabled : true,
      setupHint: connector.setupHint,
    }
  })
}

export function normalizeSampleRow(row: Record<string, unknown>): NormalizedHealthSample {
  const provider = normalizeProvider(row.provider) || 'manual_import'
  const sourceCategory = (row.source_category as SourceCategory | undefined) || 'estimated'
  return {
    id: row.id ? String(row.id) : null,
    date: String(row.sample_date || row.date || '').slice(0, 10),
    provider,
    sourceCategory,
    provenanceType: provenanceFor(provider, sourceCategory),
    sleepMinutes: readNumber(row.sleep_minutes),
    sleepQualityPct: readNumber(row.sleep_quality_pct),
    hrvMs: readNumber(row.hrv_ms),
    restingHrBpm: readNumber(row.resting_hr_bpm),
    avgHrBpm: readNumber(row.avg_hr_bpm),
    steps: readNumber(row.steps),
    activeCalories: readNumber(row.active_calories),
    workoutMinutes: readNumber(row.workout_minutes),
    activityLoad: readNumber(row.activity_load),
    recoverySignalPct: readNumber(row.recovery_signal_pct),
    confidencePct: readNumber(row.confidence_pct) || 50,
  }
}

export function legacyHealthToSamples(legacyHealth: LegacyHealthSummary): NormalizedHealthSample[] {
  if (!legacyHealth?.latestMetricDate) return []

  const provider = legacyHealth.source === 'apple' ? 'apple_health' : legacyHealth.source === 'android' ? 'health_connect' : 'manual_import'
  const sleepMinutes = legacyHealth.avgSleepHours !== null && legacyHealth.avgSleepHours !== undefined
    ? Math.round(legacyHealth.avgSleepHours * 60)
    : null

  return [
    {
      date: legacyHealth.latestMetricDate,
      provider,
      sourceCategory: 'measured',
      provenanceType: provider === 'manual_import' ? 'manual_import' : 'wearable',
      sleepMinutes,
      sleepQualityPct: sleepMinutes ? clamp(Math.round((sleepMinutes / 480) * 100), 0, 100) : null,
      hrvMs: legacyHealth.avgHrv,
      restingHrBpm: legacyHealth.avgHeartRate,
      avgHrBpm: legacyHealth.latestMetrics?.heart_rate_avg || legacyHealth.avgHeartRate,
      steps: legacyHealth.latestSteps,
      activeCalories: null,
      workoutMinutes: null,
      activityLoad: legacyHealth.latestSteps ? Math.round(legacyHealth.latestSteps / 120) : null,
      recoverySignalPct: null,
      confidencePct: legacyHealth.sampleDays >= 7 ? 82 : legacyHealth.sampleDays >= 3 ? 68 : 52,
    },
  ]
}

export function createMockHealthSamples(provider: HealthProvider, startDate: string, days = 7): NormalizedHealthSample[] {
  const connector = getConnector(provider)
  const start = new Date(`${startDate}T00:00:00+05:30`)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() - (days - index - 1))
    const rhythm = Math.sin(index / Math.max(days - 1, 1) * Math.PI)
    const sleepMinutes = Math.round(390 + rhythm * 70 + (index % 2 === 0 ? 16 : -12))
    const steps = Math.round(5200 + rhythm * 4200 + index * 180)
    const workoutMinutes = index % 3 === 0 ? 42 : index % 4 === 0 ? 28 : 0
    const activityLoad = Math.round((steps / 130) + workoutMinutes * 4.5)
    const hrvMs = Number((42 + rhythm * 12 - Math.max(0, activityLoad - 80) * 0.03).toFixed(2))
    const restingHrBpm = Number((64 - rhythm * 4 + Math.max(0, activityLoad - 90) * 0.02).toFixed(2))

    return {
      date: date.toISOString().slice(0, 10),
      provider,
      sourceCategory: connector.sourceCategory,
      provenanceType: connector.provenanceType,
      sleepMinutes,
      sleepQualityPct: clamp(Math.round((sleepMinutes / 480) * 100), 0, 100),
      hrvMs,
      restingHrBpm,
      avgHrBpm: restingHrBpm + 18,
      steps,
      activeCalories: Math.round(steps * 0.04 + workoutMinutes * 8),
      workoutMinutes,
      activityLoad,
      recoverySignalPct: clamp(Math.round(68 + rhythm * 18 - Math.max(0, activityLoad - 105) * 0.25), 0, 100),
      confidencePct: provider === 'manual_import' ? 66 : provider === 'google_fit' ? 74 : 86,
    }
  })
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
