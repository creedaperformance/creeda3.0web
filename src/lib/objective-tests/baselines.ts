import { getObjectiveProtocol } from '@/lib/objective-tests/protocols'
import type {
  ObjectiveBaselineRecord,
  ObjectiveBaselineStatus,
  ObjectiveMetricDirection,
  ObjectiveTestSession,
  ObjectiveTestType,
} from '@/lib/objective-tests/types'

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export function inferBaselineStatus(
  protocolId: ObjectiveTestType,
  validSessionCount: number,
  daysCovered: number
): ObjectiveBaselineStatus {
  const protocol = getObjectiveProtocol(protocolId)
  if (!protocol) return 'building'
  if (validSessionCount < protocol.baseline.minimumAcceptedSessions) return 'building'
  if (daysCovered < Math.max(protocol.baseline.minimumDaysBetweenAnchorSessions, 2)) return 'provisional'
  return 'ready'
}

function normalizeDirectionalDelta(
  direction: ObjectiveMetricDirection,
  current: number,
  baseline: number,
  mdc: number
) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || !Number.isFinite(mdc) || mdc <= 0) return 0
  if (direction === 'lower_better') return (baseline - current) / mdc
  if (direction === 'higher_better') return (current - baseline) / mdc
  return 0
}

export function computeObjectiveBaselines(
  sessions: ObjectiveTestSession[]
): ObjectiveBaselineRecord[] {
  const grouped = new Map<string, ObjectiveTestSession[]>()

  for (const session of sessions) {
    if (session.validityStatus === 'invalid_saved' || session.validityStatus === 'supplemental') continue
    if (session.headlineMetricValue === null) continue
    const key = `${session.testType}::none`
    grouped.set(key, [...(grouped.get(key) || []), session])
  }

  const baselines: ObjectiveBaselineRecord[] = []

  for (const [key, group] of grouped.entries()) {
    const [testType] = key.split('::') as [ObjectiveTestType, string]
    const protocol = getObjectiveProtocol(testType)
    if (!protocol) continue

    const sorted = [...group].sort(
      (left, right) => new Date(left.completedAt || 0).getTime() - new Date(right.completedAt || 0).getTime()
    )
    const anchorSessions = sorted.slice(0, Math.max(protocol.baseline.minimumAcceptedSessions, 3))
    const rollingSessions = sorted.slice(-5)
    const daysCovered =
      anchorSessions.length > 1
        ? Math.round(
            (new Date(anchorSessions[anchorSessions.length - 1].completedAt).getTime() -
              new Date(anchorSessions[0].completedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0
    const status = inferBaselineStatus(testType, sorted.length, daysCovered)
    const baselineValue =
      rollingSessions.length >= protocol.baseline.minimumAcceptedSessions
        ? median(rollingSessions.map((item) => item.headlineMetricValue || 0))
        : median(anchorSessions.map((item) => item.headlineMetricValue || 0))

    baselines.push({
      userId: sorted[0].userId,
      role: sorted[0].role,
      testType,
      metricKey: protocol.headlineMetric.key,
      side: 'none',
      baselineMethod: rollingSessions.length >= protocol.baseline.minimumAcceptedSessions ? 'rolling_5_median' : 'first_3_median',
      baselineN: rollingSessions.length >= protocol.baseline.minimumAcceptedSessions ? rollingSessions.length : anchorSessions.length,
      baselineValue,
      baselineUnit: protocol.headlineMetric.unit,
      minDetectableChange: protocol.headlineMetric.minimumDetectableChange,
      ready: status === 'ready',
      metadata: {
        status,
        daysCovered,
      },
    })
  }

  return baselines
}

export function computeDeltaVsBaseline(
  session: ObjectiveTestSession,
  baseline: ObjectiveBaselineRecord | null
) {
  if (!baseline || session.headlineMetricValue === null) return null
  const protocol = getObjectiveProtocol(session.testType)
  if (!protocol) return null
  return normalizeDirectionalDelta(
    protocol.headlineMetric.direction,
    session.headlineMetricValue,
    baseline.baselineValue,
    baseline.minDetectableChange
  )
}
