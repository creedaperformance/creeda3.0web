import type { RehabHistoryEntry, TrustSummary } from '@/lib/engine/types'

export type IdentityMetricKey =
  | 'resilience'
  | 'recovery_discipline'
  | 'training_consistency'
  | 'readiness_reliability'
  | 'return_to_play_confidence'

export type IdentityMetricStatus = 'elite' | 'strong' | 'building' | 'fragile' | 'inactive'

export interface IdentityMetricSummary {
  key: IdentityMetricKey
  label: string
  score: number | null
  status: IdentityMetricStatus
  summary: string
  nextAction: string
}

export interface SquadIdentityMetricSummary extends IdentityMetricSummary {
  athleteCount: number
  flaggedCount: number
}

interface IdentityLogInput {
  readinessScore?: unknown
  readiness_score?: unknown
  duration_minutes?: unknown
  session_rpe?: unknown
  current_pain_level?: unknown
  stress_level?: unknown
  sleep_quality?: unknown
  log_date?: unknown
}

interface ObjectiveIdentitySignal {
  trend?: 'improving' | 'stable' | 'declining' | 'missing' | null
  freshness?: 'fresh' | 'stale' | 'missing' | null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0
  const mean = average(values) || 0
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function toFiniteNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function mapSleepValueToScore(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 5) return value
    if (value >= 8) return 5
    if (value >= 7) return 4
    if (value >= 6) return 3
    if (value >= 5) return 2
    return 1
  }

  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('excellent')) return 5
  if (normalized.includes('good')) return 4
  if (normalized.includes('okay') || normalized.includes('fair')) return 3
  if (normalized.includes('poor') || normalized.includes('bad')) return 2
  return null
}

function mapStressValueToScore(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 10) return value * 10
    return value
  }

  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('low')) return 25
  if (normalized.includes('moderate') || normalized.includes('medium')) return 55
  if (normalized.includes('high')) return 80
  if (normalized.includes('severe')) return 90
  return null
}

function getStatus(score: number | null): IdentityMetricStatus {
  if (score === null) return 'inactive'
  if (score >= 85) return 'elite'
  if (score >= 70) return 'strong'
  if (score >= 55) return 'building'
  return 'fragile'
}

function normalizeLoadTolerancePct(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  if (numeric <= 1) return clamp(numeric * 100)
  return clamp(numeric)
}

function getObjectiveAdjustment(objectiveSignal?: ObjectiveIdentitySignal | null) {
  if (!objectiveSignal || objectiveSignal.freshness !== 'fresh') return 0
  if (objectiveSignal.trend === 'improving') return 8
  if (objectiveSignal.trend === 'declining') return -10
  return 0
}

function buildMetric(
  key: IdentityMetricKey,
  label: string,
  score: number | null,
  summary: string,
  nextAction: string
): IdentityMetricSummary {
  return {
    key,
    label,
    score,
    status: getStatus(score),
    summary,
    nextAction,
  }
}

function getReadinessValues(logs: IdentityLogInput[]) {
  return logs
    .map((log) => toFiniteNumber(log.readinessScore ?? log.readiness_score))
    .filter((value): value is number => value !== null)
}

function getTrainingLogs(logs: IdentityLogInput[]) {
  return logs.filter((log) => {
    const duration = toFiniteNumber(log.duration_minutes) || 0
    const rpe = toFiniteNumber(log.session_rpe) || 0
    return duration > 0 || rpe > 0
  })
}

function getMaxGapBetweenTrainingDays(logs: IdentityLogInput[]) {
  const dates = getTrainingLogs(logs)
    .map((log) => String(log.log_date || '').slice(0, 10))
    .filter(Boolean)
    .sort()

  if (dates.length < 2) return 6

  let maxGap = 0
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(dates[index - 1])
    const current = new Date(dates[index])
    const gap = Math.max(0, Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)) - 1)
    maxGap = Math.max(maxGap, gap)
  }

  return maxGap
}

export function buildAthleteIdentityMetrics(args: {
  logs: IdentityLogInput[]
  trustSummary: TrustSummary | null
  objectiveSignal?: ObjectiveIdentitySignal | null
  rehabHistory?: RehabHistoryEntry[]
  adherencePct: number
}): IdentityMetricSummary[] {
  const readinessValues = getReadinessValues(args.logs)
  const trainingLogs = getTrainingLogs(args.logs)
  const hardSessions = trainingLogs.filter((log) => {
    const duration = toFiniteNumber(log.duration_minutes) || 0
    const rpe = toFiniteNumber(log.session_rpe) || 0
    return rpe >= 7 || duration >= 60
  })
  const hardReadinessValues = hardSessions
    .map((log) => toFiniteNumber(log.readinessScore ?? log.readiness_score))
    .filter((value): value is number => value !== null)
  const painValues = args.logs
    .map((log) => toFiniteNumber(log.current_pain_level))
    .filter((value): value is number => value !== null)
  const sleepValues = args.logs
    .map((log) => mapSleepValueToScore(log.sleep_quality))
    .filter((value): value is number => value !== null)
  const stressValues = args.logs
    .map((log) => mapStressValueToScore(log.stress_level))
    .filter((value): value is number => value !== null)
  const readinessAverage = average(readinessValues) || 0
  const hardReadinessAverage = average(hardReadinessValues) || readinessAverage
  const readinessStability = clamp(100 - standardDeviation(readinessValues) * 3.2)
  const painAverage = average(painValues) || 0
  const logCoverage = clamp((args.logs.length / 7) * 100)
  const objectiveAdjustment = getObjectiveAdjustment(args.objectiveSignal)
  const maxGap = getMaxGapBetweenTrainingDays(args.logs)

  let resilienceScore = clamp(
    hardReadinessAverage * 0.5 +
      readinessStability * 0.25 +
      Math.min(100, hardSessions.length * 33) * 0.15 +
      (100 - painAverage * 12) * 0.1 +
      objectiveAdjustment
  )
  if (args.logs.length < 3) resilienceScore = Math.min(resilienceScore, 68)

  const recoveryDisciplineScore = clamp(
    logCoverage * 0.25 +
      (average(sleepValues)?.valueOf() || 2.5) * 20 * 0.4 +
      (100 - (average(stressValues) || 55)) * 0.2 +
      (100 - painAverage * 10) * 0.15
  )

  const trainingConsistencyScore = clamp(
    args.adherencePct * 0.5 +
      Math.min(100, trainingLogs.length * 25) * 0.3 +
      Math.max(20, 100 - maxGap * 18) * 0.2
  )

  let readinessReliabilityScore = clamp(
    (args.trustSummary?.confidenceScore || 35) * 0.5 +
      (args.trustSummary?.dataCompleteness || logCoverage) * 0.25 +
      logCoverage * 0.15 +
      (args.objectiveSignal?.freshness === 'fresh' ? 10 : args.objectiveSignal?.freshness === 'stale' ? 5 : 0)
  )
  if (args.logs.length < 3) readinessReliabilityScore = Math.min(readinessReliabilityScore, 68)

  const latestRehab = (args.rehabHistory || [])[0] || null
  const returnToPlayConfidence = latestRehab
    ? clamp(
        (latestRehab.stage / 5) * 45 +
          (100 - latestRehab.pain_score * 10) * 0.25 +
          (normalizeLoadTolerancePct(latestRehab.load_tolerance) || 35) * 0.2 +
          readinessReliabilityScore * 0.1 +
          objectiveAdjustment
      )
    : null

  return [
    buildMetric(
      'resilience',
      'Resilience',
      resilienceScore,
      args.logs.length < 3
        ? 'Resilience is still building because this week does not yet have enough load exposure to judge it strongly.'
        : resilienceScore >= 70
          ? 'You held readiness well enough under load to show real resilience this week.'
          : 'Load is pulling your readiness down faster than recovery is restoring it.',
      resilienceScore >= 70
        ? 'Protect the habits that are keeping heavy days stable.'
        : 'Keep hard sessions tighter and give recovery one more honest day before progressing again.'
    ),
    buildMetric(
      'recovery_discipline',
      'Recovery Discipline',
      recoveryDisciplineScore,
      recoveryDisciplineScore >= 70
        ? 'Sleep, stress control, and recovery follow-through were steady enough to support adaptation.'
        : 'Recovery behaviors were too uneven to fully support the current training demand.',
      recoveryDisciplineScore >= 70
        ? 'Keep recovery timing routine and avoid changing too many variables at once.'
        : 'Tighten sleep quality, down-regulate stress earlier, and stop letting recovery happen by accident.'
    ),
    buildMetric(
      'training_consistency',
      'Training Consistency',
      trainingConsistencyScore,
      trainingConsistencyScore >= 70
        ? 'Your training rhythm stayed stable enough to compound progress.'
        : 'Training rhythm was broken up enough that progress is relying on scattered effort rather than momentum.',
      trainingConsistencyScore >= 70
        ? 'Maintain the same weekly rhythm and protect the next check-in cycle.'
        : 'Reduce long gaps between sessions and log what you actually completed so the next week stays believable.'
    ),
    buildMetric(
      'readiness_reliability',
      'Readiness Reliability',
      readinessReliabilityScore,
      readinessReliabilityScore >= 70
        ? 'Creeda had enough signal quality to make the week’s readiness story more believable.'
        : 'The readiness story is still partially noisy because signal quality is not stable enough yet.',
      readinessReliabilityScore >= 70
        ? 'Keep the same signal quality and only add optional measured anchors when useful.'
        : 'Strengthen check-in coverage and trust inputs before using readiness shifts to justify aggressive progression.'
    ),
    buildMetric(
      'return_to_play_confidence',
      'Return-To-Play Confidence',
      returnToPlayConfidence,
      returnToPlayConfidence === null
        ? 'No active return-to-play lane is running right now.'
        : returnToPlayConfidence >= 70
          ? 'Return-to-play progress looks believable enough to discuss the next stage.'
          : 'Return-to-play progress still needs more proof before exposure should rise.',
      returnToPlayConfidence === null
        ? 'This metric turns on automatically when rehab history is active.'
        : returnToPlayConfidence >= 70
          ? 'Progress exposure carefully and confirm the next 24-hour response before green-lighting more chaos.'
          : 'Hold the current stage, protect tissue calm, and wait for pain and load tolerance to stabilize.'
    ),
  ]
}

export function buildIndividualIdentityMetrics(args: {
  readinessValues: number[]
  trustSummary: TrustSummary
  objectiveSignal?: ObjectiveIdentitySignal | null
  adherencePct: number
  streakCount: number
  progressToPeakPct: number
}): IdentityMetricSummary[] {
  const readinessAverage = average(args.readinessValues) || 0
  const readinessStability = clamp(100 - standardDeviation(args.readinessValues) * 3.4)
  const objectiveAdjustment = getObjectiveAdjustment(args.objectiveSignal)
  const logCoverage = clamp((Math.min(args.readinessValues.length, 7) / 7) * 100)

  const resilienceScore = clamp(
    readinessAverage * 0.45 +
      readinessStability * 0.35 +
      args.progressToPeakPct * 0.1 +
      logCoverage * 0.1 +
      objectiveAdjustment
  )

  const recoveryDisciplineScore = clamp(
    args.adherencePct * 0.35 +
      logCoverage * 0.2 +
      (100 - Math.max(0, 100 - readinessAverage)) * 0.2 +
      Math.min(100, args.streakCount * 12) * 0.25
  )

  const trainingConsistencyScore = clamp(
    args.adherencePct * 0.55 +
      Math.min(100, args.streakCount * 12) * 0.3 +
      args.progressToPeakPct * 0.15
  )

  const readinessReliabilityScore = clamp(
    args.trustSummary.confidenceScore * 0.55 +
      args.trustSummary.dataCompleteness * 0.25 +
      logCoverage * 0.1 +
      (args.objectiveSignal?.freshness === 'fresh' ? 10 : args.objectiveSignal?.freshness === 'stale' ? 5 : 0)
  )

  return [
    buildMetric(
      'resilience',
      'Resilience',
      resilienceScore,
      resilienceScore >= 70
        ? 'You are holding momentum without big readiness swings.'
        : 'Energy and readiness are still fluctuating enough that the next phase needs more stability first.',
      resilienceScore >= 70
        ? 'Protect the current rhythm and avoid overreacting to one soft day.'
        : 'Aim for calmer week-to-week rhythm before chasing more intensity.'
    ),
    buildMetric(
      'recovery_discipline',
      'Recovery Discipline',
      recoveryDisciplineScore,
      recoveryDisciplineScore >= 70
        ? 'Your recovery habits were stable enough to support the plan.'
        : 'Recovery habits are still too inconsistent to fully support the next step.',
      recoveryDisciplineScore >= 70
        ? 'Keep recovery boring and repeatable.'
        : 'Make sleep, hydration, and the daily loop more automatic before adding complexity.'
    ),
    buildMetric(
      'training_consistency',
      'Training Consistency',
      trainingConsistencyScore,
      trainingConsistencyScore >= 70
        ? 'You are showing the kind of repetition that makes the pathway work.'
        : 'The plan still needs a steadier rhythm to create momentum.',
      trainingConsistencyScore >= 70
        ? 'Stay with the same rhythm long enough for it to compound.'
        : 'Protect your streak and reduce stop-start weeks.'
    ),
    buildMetric(
      'readiness_reliability',
      'Readiness Reliability',
      readinessReliabilityScore,
      readinessReliabilityScore >= 70
        ? 'Creeda has enough trusted signal to make the next guidance step more believable.'
        : 'The readiness story still needs more stable input quality.',
      readinessReliabilityScore >= 70
        ? 'Keep the daily loop steady and use optional tests only when they truly add clarity.'
        : 'Give Creeda a few more consistent days before letting one score change your plan too much.'
    ),
  ]
}

export function buildSquadIdentityMetrics(
  metricsByAthlete: IdentityMetricSummary[][]
): SquadIdentityMetricSummary[] {
  const metricOrder: Array<{ key: IdentityMetricKey; label: string }> = [
    { key: 'resilience', label: 'Squad Resilience' },
    { key: 'recovery_discipline', label: 'Squad Recovery Discipline' },
    { key: 'training_consistency', label: 'Squad Training Consistency' },
    { key: 'readiness_reliability', label: 'Squad Readiness Reliability' },
    { key: 'return_to_play_confidence', label: 'Squad Return-To-Play Confidence' },
  ]

  return metricOrder.map(({ key, label }) => {
    const activeMetrics = metricsByAthlete
      .map((metrics) => metrics.find((metric) => metric.key === key) || null)
      .filter((metric): metric is IdentityMetricSummary => Boolean(metric && metric.score !== null))

    if (!activeMetrics.length) {
      return {
        key,
        label,
        score: null,
        status: 'inactive',
        summary:
          key === 'return_to_play_confidence'
            ? 'No active return-to-play lane is running across the squad right now.'
            : 'This squad identity metric is still building because the underlying athlete-level signal is too thin.',
        nextAction:
          key === 'return_to_play_confidence'
            ? 'This turns on automatically for athletes who are actively in rehab.'
            : 'Keep the daily loop active long enough for the squad pattern to become believable.',
        athleteCount: 0,
        flaggedCount: 0,
      }
    }

    const averageScore = clamp(average(activeMetrics.map((metric) => metric.score || 0)) || 0)
    const flaggedCount = activeMetrics.filter((metric) => metric.status === 'fragile').length

    let summary = 'The squad identity is stable enough to support the next weekly block.'
    let nextAction = 'Keep the next microcycle aligned with the same signal quality.'

    if (averageScore < 55) {
      summary = `${label} is the main squad weakness right now.`
      nextAction = `Make ${label.toLowerCase()} the first coaching correction next week.`
    } else if (flaggedCount >= Math.max(2, Math.round(activeMetrics.length * 0.3))) {
      summary = `${flaggedCount} athletes are pulling ${label.toLowerCase()} down enough to matter.`
      nextAction = 'Treat the fragile subgroup before assuming the whole squad can progress together.'
    }

    return {
      key,
      label,
      score: averageScore,
      status: getStatus(averageScore),
      summary,
      nextAction,
      athleteCount: activeMetrics.length,
      flaggedCount,
    }
  })
}

export function getIdentityMetricScore(
  metrics: IdentityMetricSummary[],
  key: IdentityMetricKey
) {
  return metrics.find((metric) => metric.key === key)?.score ?? null
}
