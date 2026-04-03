import { getObjectiveProtocol } from '@/lib/objective-tests/protocols'
import type {
  ObjectiveBaselineRecord,
  ObjectiveBaselineStatus,
  ObjectiveMetricDirection,
  ObjectiveSignalSummary,
  ObjectiveTestMeasurement,
  ObjectiveTestRole,
  ObjectiveTestSession,
  ObjectiveTestType,
  ObjectiveValidityStatus,
} from '@/lib/objective-tests/types'

const VALID_TEST_TYPES = new Set<ObjectiveTestType>([
  'reaction_tap',
  'balance_single_leg',
  'breathing_recovery',
  'jump_landing_control',
  'mobility_battery',
  'sprint_10m',
  'agility_505',
])

export interface ObjectiveTestSessionInsert {
  user_id: string
  role: ObjectiveTestRole
  test_type: ObjectiveTestType
  family?: string | null
  protocol_version: string
  source: string
  capture_mode?: string | null
  sport?: string | null
  capture_context?: Record<string, unknown>
  side_scope?: 'none' | 'left' | 'right' | 'bilateral' | 'battery'
  dominant_side?: 'left' | 'right' | null
  sample_count?: number
  false_start_count?: number
  average_score_ms?: number | null
  validated_score_ms?: number | null
  best_score_ms?: number | null
  consistency_ms?: number | null
  classification?: string | null
  headline_metric_key?: string | null
  headline_metric_value?: number | null
  headline_metric_unit?: string | null
  headline_metric_direction?: ObjectiveMetricDirection | null
  confidence_score?: number | null
  capture_quality_score?: number | null
  validity_status?: ObjectiveValidityStatus
  baseline_status?: ObjectiveBaselineStatus
  baseline_snapshot?: Record<string, unknown>
  quality_flags?: string[]
  safety_flags?: string[]
  trial_results?: number[]
  results_json?: Record<string, unknown>
  metadata?: Record<string, unknown>
  linked_video_report_id?: string | null
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? '').trim()).filter(Boolean)
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toInteger(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.round(numeric) : 0
}

function toNullableInteger(value: unknown) {
  const numeric = toNullableNumber(value)
  return numeric === null ? null : Math.round(numeric)
}

function parseTrialResults(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => toNullableInteger(item))
    .filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

function normalizeDirection(value: unknown): ObjectiveMetricDirection | null {
  return value === 'higher_better' || value === 'lower_better' || value === 'target_band'
    ? value
    : null
}

function normalizeValidityStatus(value: unknown): ObjectiveValidityStatus {
  return value === 'accepted' || value === 'low_confidence' || value === 'invalid_saved' || value === 'supplemental'
    ? value
    : 'accepted'
}

function normalizeBaselineStatus(value: unknown): ObjectiveBaselineStatus {
  return value === 'building' || value === 'provisional' || value === 'ready' || value === 'stale'
    ? value
    : 'building'
}

export function normalizeObjectiveTestSession(row: unknown): ObjectiveTestSession | null {
  const record = asRecord(row)
  if (!record) return null

  if (
    typeof record.id !== 'string' ||
    typeof record.user_id !== 'string' ||
    (record.role !== 'athlete' && record.role !== 'individual') ||
    !VALID_TEST_TYPES.has(String(record.test_type) as ObjectiveTestType)
  ) {
    return null
  }

  const captureContext = asRecord(record.capture_context) || {}
  const baselineSnapshot = asRecord(record.baseline_snapshot) || {}
  const metadata = asRecord(record.metadata) || {}
  const resultsJson =
    asRecord(record.results_json) ||
    asRecord(record.results_jsonb) ||
    (Array.isArray(record.results_json) ? { values: record.results_json } : {})

  return {
    id: record.id,
    userId: record.user_id,
    role: record.role,
    testType: record.test_type as ObjectiveTestType,
    family:
      record.family === 'neural' ||
      record.family === 'balance' ||
      record.family === 'recovery' ||
      record.family === 'power' ||
      record.family === 'mobility' ||
      record.family === 'speed' ||
      record.family === 'agility' ||
      record.family === 'derived'
        ? record.family
        : null,
    protocolVersion: typeof record.protocol_version === 'string' ? record.protocol_version : 'v1',
    source: typeof record.source === 'string' ? record.source : 'phone_browser',
    captureMode:
      record.capture_mode === 'screen_tap' ||
      record.capture_mode === 'camera_pose_live' ||
      record.capture_mode === 'camera_pose_upload' ||
      record.capture_mode === 'guided_timer_hr_optional' ||
      record.capture_mode === 'camera_timed_distance'
        ? record.capture_mode
        : null,
    sport: typeof record.sport === 'string' ? record.sport : null,
    captureContext,
    sideScope:
      record.side_scope === 'left' ||
      record.side_scope === 'right' ||
      record.side_scope === 'bilateral' ||
      record.side_scope === 'battery'
        ? record.side_scope
        : 'none',
    dominantSide: record.dominant_side === 'left' || record.dominant_side === 'right' ? record.dominant_side : null,
    sampleCount: toInteger(record.sample_count),
    falseStartCount: toInteger(record.false_start_count),
    averageScoreMs: toNullableInteger(record.average_score_ms),
    validatedScoreMs: toNullableInteger(record.validated_score_ms),
    bestScoreMs: toNullableInteger(record.best_score_ms),
    consistencyMs: toNullableInteger(record.consistency_ms),
    classification: typeof record.classification === 'string' ? record.classification : null,
    headlineMetricKey: typeof record.headline_metric_key === 'string' ? record.headline_metric_key : null,
    headlineMetricValue: toNullableNumber(record.headline_metric_value),
    headlineMetricUnit: typeof record.headline_metric_unit === 'string' ? record.headline_metric_unit : null,
    headlineMetricDirection: normalizeDirection(record.headline_metric_direction),
    confidenceScore: toNullableNumber(record.confidence_score),
    captureQualityScore: toNullableNumber(record.capture_quality_score),
    validityStatus: normalizeValidityStatus(record.validity_status),
    baselineStatus: normalizeBaselineStatus(record.baseline_status),
    baselineSnapshot,
    qualityFlags: toStringArray(record.quality_flags),
    safetyFlags: toStringArray(record.safety_flags),
    trialResults: parseTrialResults(record.trial_results),
    resultsJson,
    metadata,
    linkedVideoReportId: typeof record.linked_video_report_id === 'string' ? record.linked_video_report_id : null,
    completedAt: typeof record.completed_at === 'string' ? record.completed_at : '',
    createdAt: typeof record.created_at === 'string' ? record.created_at : '',
    updatedAt: typeof record.updated_at === 'string' ? record.updated_at : '',
  }
}

export function formatObjectiveMetricValue(
  value: number | null,
  unit: string | null,
  decimals = 0
) {
  if (value === null || !Number.isFinite(value)) return 'Optional'
  const formatted =
    decimals > 0 ? value.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1') : Math.round(value).toString()
  return unit ? `${formatted}${unit}` : formatted
}

function compareAgainstThreshold(value: number, threshold: number | [number, number], direction: ObjectiveMetricDirection) {
  if (Array.isArray(threshold)) {
    const [min, max] = threshold
    return value >= min && value <= max
  }

  if (direction === 'higher_better') return value >= threshold
  if (direction === 'lower_better') return value <= threshold
  return value === threshold
}

export function classifyObjectiveMetric(
  protocolId: ObjectiveTestType,
  metricKey: string,
  value: number | null
) {
  if (value === null) return null
  const protocol = getObjectiveProtocol(protocolId)
  const metric =
    protocol?.headlineMetric.key === metricKey
      ? protocol.headlineMetric
      : protocol?.secondaryMetrics.find((item) => item.key === metricKey) || null
  if (!metric) return null

  if (compareAgainstThreshold(value, metric.provisionalThresholds.good, metric.direction)) return 'Good'
  if (compareAgainstThreshold(value, metric.provisionalThresholds.critical, metric.direction)) return 'Critical'
  return 'Risk'
}

export function buildObjectiveMeasurementRows(
  sessionId: string,
  userId: string,
  role: ObjectiveTestRole,
  testType: ObjectiveTestType,
  measurements: ObjectiveTestMeasurement[]
) {
  return measurements.map((measurement) => ({
    session_id: sessionId,
    user_id: userId,
    role,
    test_type: testType,
    subtest_key: measurement.subtestKey || null,
    side: measurement.side || 'none',
    metric_key: measurement.key,
    metric_group: measurement.metricGroup || 'primary',
    display_label: measurement.label,
    value: measurement.value,
    unit: measurement.unit,
    direction: measurement.direction,
    is_headline: Boolean(measurement.isHeadline),
    quality_weight: measurement.qualityWeight ?? 1,
    metadata: measurement.metadata || {},
  }))
}

function computeFreshness(completedAt: string | null, freshnessWindowHours: number) {
  if (!completedAt) return 'missing' as const
  const ageHours = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60)
  return ageHours <= freshnessWindowHours ? 'fresh' : 'stale'
}

function computeTrend(current: number | null, previous: number | null, direction: ObjectiveMetricDirection, mdc: number) {
  if (current === null) return 'missing' as const
  if (previous === null) return 'stable' as const
  const delta = current - previous

  if (Math.abs(delta) < mdc) return 'stable' as const

  if (direction === 'lower_better') return delta < 0 ? 'improving' as const : 'declining' as const
  if (direction === 'higher_better') return delta > 0 ? 'improving' as const : 'declining' as const
  return 'stable' as const
}

export function groupSessionsByProtocol(sessions: ObjectiveTestSession[]) {
  return sessions.reduce<Record<ObjectiveTestType, ObjectiveTestSession[]>>((accumulator, session) => {
    const existing = accumulator[session.testType] || []
    existing.push(session)
    accumulator[session.testType] = existing.sort(
      (left, right) => new Date(right.completedAt || 0).getTime() - new Date(left.completedAt || 0).getTime()
    )
    return accumulator
  }, {} as Record<ObjectiveTestType, ObjectiveTestSession[]>)
}

export function summarizeObjectiveSignals(
  sessions: ObjectiveTestSession[],
  baselines: ObjectiveBaselineRecord[] = []
) {
  const grouped = groupSessionsByProtocol(sessions)
  const signals: ObjectiveSignalSummary[] = []

  for (const protocolId of Object.keys(grouped) as ObjectiveTestType[]) {
    const protocol = getObjectiveProtocol(protocolId)
    const current = grouped[protocolId]?.[0] || null
    if (!protocol || !current) continue

    const previous = grouped[protocolId]?.find((candidate) => candidate.id !== current.id) || null
    const baseline = baselines.find(
      (candidate) =>
        candidate.testType === protocolId && candidate.metricKey === protocol.headlineMetric.key && candidate.side === 'none'
    )
    const freshness = computeFreshness(current.completedAt || null, protocol.freshnessWindowHours)
    const trend = computeTrend(
      current.headlineMetricValue,
      previous?.headlineMetricValue ?? null,
      protocol.headlineMetric.direction,
      protocol.headlineMetric.minimumDetectableChange
    )
    const deltaVsBaseline =
      baseline && current.headlineMetricValue !== null
        ? current.headlineMetricValue - baseline.baselineValue
        : null
    const deltaVsPrevious =
      current.headlineMetricValue !== null && previous?.headlineMetricValue !== null
        ? current.headlineMetricValue - (previous?.headlineMetricValue ?? 0)
        : null
    const formattedHeadline = formatObjectiveMetricValue(
      current.headlineMetricValue,
      current.headlineMetricUnit || protocol.headlineMetric.unit,
      protocol.headlineMetric.decimals
    )

    const trendText =
      trend === 'improving'
        ? 'improving'
        : trend === 'declining'
          ? 'dropping'
          : trend === 'stable'
            ? 'holding stable'
            : 'still building'

    signals.push({
      protocolId,
      displayName: protocol.displayName,
      family: protocol.family,
      headlineMetricKey: current.headlineMetricKey || protocol.headlineMetric.key,
      headlineMetricLabel: protocol.headlineMetric.label,
      headlineMetricValue: current.headlineMetricValue,
      headlineMetricUnit: current.headlineMetricUnit || protocol.headlineMetric.unit,
      headlineMetricDirection: current.headlineMetricDirection || protocol.headlineMetric.direction,
      formattedHeadline,
      confidenceScore: current.confidenceScore,
      captureQualityScore: current.captureQualityScore,
      freshness,
      trend,
      classification: current.classification || classifyObjectiveMetric(protocolId, protocol.headlineMetric.key, current.headlineMetricValue),
      summary:
        current.headlineMetricValue === null
          ? `${protocol.displayName} is optional. No saved session yet.`
          : `${protocol.displayName} is ${formattedHeadline} and ${trendText}.`,
      nextAction:
        freshness === 'fresh'
          ? `Keep ${protocol.displayName.toLowerCase()} to ${protocol.weeklyCap === 1 ? 'once' : 'once or twice'} per week so trend stays meaningful.`
          : `Optional: refresh ${protocol.displayName.toLowerCase()} if you want a current measured anchor.`,
      completedAt: current.completedAt || null,
      baselineStatus: current.baselineStatus,
      validityStatus: current.validityStatus,
      deltaVsBaseline,
      deltaVsPrevious,
    })
  }

  return signals.sort((left, right) => {
    const freshnessRank = left.freshness === right.freshness ? 0 : left.freshness === 'fresh' ? -1 : 1
    if (freshnessRank !== 0) return freshnessRank
    const confidenceLeft = left.confidenceScore || 0
    const confidenceRight = right.confidenceScore || 0
    return confidenceRight - confidenceLeft
  })
}
