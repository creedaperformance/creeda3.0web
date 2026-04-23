import { clamp } from '@/lib/product/types'
import type {
  DailyReadinessOperatingScore,
  DashboardSnapshotLike,
  MissingDataWarning,
  NormalizedHealthSample,
  ReadinessReason,
} from '@/lib/product/operating-system/types'

function numberOr(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function latestMeasuredSample(samples: NormalizedHealthSample[]) {
  return samples.find((sample) => sample.sourceCategory === 'measured') || samples[0] || null
}

function computeSleepScore(sample: NormalizedHealthSample | null, snapshot: DashboardSnapshotLike) {
  if (sample?.sleepMinutes) return clamp(Math.round((sample.sleepMinutes / 480) * 100), 0, 100)
  const sleepFactor = snapshot.decisionResult?.metrics.readiness.factors.sleep
  if (typeof sleepFactor === 'number') return clamp(sleepFactor, 0, 100)
  const logSleep = String(snapshot.latestLog?.sleep_quality || '').toLowerCase()
  if (logSleep.includes('excellent')) return 92
  if (logSleep.includes('good')) return 78
  if (logSleep.includes('poor')) return 35
  return 62
}

function computeLoadPenalty(snapshot: DashboardSnapshotLike, sample: NormalizedHealthSample | null) {
  const currentLoad =
    sample?.activityLoad ??
    numberOr(snapshot.latestLog?.session_rpe, 0) * numberOr(snapshot.latestLog?.duration_minutes, 0) / 8
  const recentLoad = snapshot.historicalLogs
    .slice(0, 7)
    .reduce((sum, log) => sum + numberOr(log.session_rpe, 0) * numberOr(log.duration_minutes, 0), 0)

  if (currentLoad > 120 || recentLoad > 1900) return 18
  if (currentLoad > 80 || recentLoad > 1300) return 10
  if (currentLoad < 25 && recentLoad < 300) return 4
  return 0
}

function buildAction(score: number, pain: number, injuryActive: boolean, recoveryDebt: number): Pick<DailyReadinessOperatingScore, 'action' | 'actionLabel' | 'actionDetail'> {
  if (pain >= 7 || injuryActive) {
    return {
      action: 'deload',
      actionLabel: 'Deload',
      actionDetail: 'Keep movement controlled, use the rehab block, and avoid high-speed or high-load exposure.',
    }
  }
  if (score >= 82 && recoveryDebt < 2) {
    return {
      action: 'train_hard',
      actionLabel: 'Train hard',
      actionDetail: 'Use the full session, but still complete the cooldown so tomorrow stays usable.',
    }
  }
  if (score >= 62) {
    return {
      action: 'train_light',
      actionLabel: 'Train light',
      actionDetail: 'Keep quality high while trimming volume, impact, and failure work.',
    }
  }
  if (score >= 45) {
    return {
      action: 'mobility_only',
      actionLabel: 'Mobility only',
      actionDetail: 'Use movement prep, breathing, and easy tissue work. Skip heavy or high-speed loading.',
    }
  }
  if (score >= 32) {
    return {
      action: 'recovery_focus',
      actionLabel: 'Recovery focus',
      actionDetail: 'Do a recovery flow, walk easy, hydrate, and protect sleep tonight.',
    }
  }
  return {
    action: 'full_rest',
    actionLabel: 'Full rest',
    actionDetail: 'Avoid training. Use nutrition, sleep, and symptom monitoring as the work today.',
  }
}

export function buildDailyReadinessOperatingScore(args: {
  snapshot: DashboardSnapshotLike
  normalizedSamples: NormalizedHealthSample[]
  completedSessionsLast7: number
  recoverySessionsLast7: number
}): DailyReadinessOperatingScore {
  const latest = latestMeasuredSample(args.normalizedSamples)
  const decisionReadiness = args.snapshot.decisionResult?.metrics.readiness.score
  const baseScore = typeof decisionReadiness === 'number' ? decisionReadiness : numberOr(args.snapshot.latestLog?.readiness_score, 64)
  const sleepScore = computeSleepScore(latest, args.snapshot)
  const hrvScore = latest?.hrvMs ? clamp(Math.round((latest.hrvMs / 65) * 100), 20, 100) : 58
  const restingHrScore = latest?.restingHrBpm ? clamp(Math.round(105 - latest.restingHrBpm), 20, 100) : 60
  const soreness = numberOr(args.snapshot.latestLog?.muscle_soreness, numberOr(args.snapshot.latestLog?.soreness, 3))
  const sorenessPenalty = soreness >= 4 ? 14 : soreness >= 3 ? 7 : 0
  const stress = numberOr(args.snapshot.latestLog?.stress_level, 3)
  const stressPenalty = stress >= 4 ? 12 : stress >= 3 ? 6 : 0
  const pain = numberOr(args.snapshot.latestLog?.current_pain_level, 0)
  const painPenalty = pain >= 7 ? 22 : pain >= 4 ? 12 : pain > 0 ? 5 : 0
  const loadPenalty = computeLoadPenalty(args.snapshot, latest)
  const recoveryDebt = Math.max(0, 2 - args.recoverySessionsLast7)
  const recoveryPenalty = recoveryDebt * 5
  const injuryActive = args.snapshot.rehabHistory.some((entry) => String(entry.progression_flag || '').toLowerCase() !== 'cleared')

  const measuredBlend = latest
    ? Math.round(baseScore * 0.48 + sleepScore * 0.18 + hrvScore * 0.14 + restingHrScore * 0.08 + (latest.recoverySignalPct ?? 60) * 0.12)
    : baseScore

  const score = clamp(
    Math.round(measuredBlend - sorenessPenalty - stressPenalty - painPenalty - loadPenalty - recoveryPenalty),
    5,
    98
  )
  const recoveryScore = clamp(Math.round(score + sleepScore * 0.08 - loadPenalty * 0.6), 0, 100)
  const measuredSignals = [
    latest?.sleepMinutes,
    latest?.hrvMs,
    latest?.restingHrBpm,
    latest?.steps,
    latest?.activityLoad,
  ].filter(Boolean).length
  const confidencePct = clamp(
    Math.round((args.snapshot.decisionResult?.creedaDecision.confidenceScore || 56) * 0.55 + measuredSignals * 7 + Math.min(args.completedSessionsLast7, 4) * 4),
    25,
    96
  )

  const reasons: ReadinessReason[] = [
    {
      label: 'Sleep',
      impact: Math.round((sleepScore - 70) / 3),
      detail: latest?.sleepMinutes
        ? `${Math.round(latest.sleepMinutes / 60)}h ${latest.sleepMinutes % 60}m sleep is influencing recovery.`
        : 'Sleep is estimated from check-in because no wearable sleep sample is available.',
      provenance: latest?.sleepMinutes ? latest.provenanceType : 'inferred',
    },
    {
      label: 'Training load',
      impact: -loadPenalty,
      detail: loadPenalty > 0
        ? 'Recent load is high enough to reduce today’s ceiling.'
        : 'Recent load is not forcing a major reduction today.',
      provenance: latest?.activityLoad ? latest.provenanceType : 'inferred',
    },
    {
      label: 'Body status',
      impact: -(sorenessPenalty + painPenalty),
      detail: painPenalty > 0
        ? `Pain or soreness is active, so the plan is biased conservative.`
        : 'No major pain penalty was detected from today’s available signals.',
      provenance: args.snapshot.latestLog ? 'self_reported' : 'inferred',
    },
    {
      label: 'Recovery debt',
      impact: -recoveryPenalty,
      detail: recoveryDebt > 0
        ? 'Recovery work is under target this week, so today includes more downshift logic.'
        : 'Recovery work is on track for the week.',
      provenance: 'inferred',
    },
  ]

  if (stressPenalty > 0) {
    reasons.push({
      label: 'Stress',
      impact: -stressPenalty,
      detail: 'Stress is elevated enough to lower confidence in hard training.',
      provenance: 'self_reported',
    })
  }

  const missingDataWarnings: MissingDataWarning[] = []
  if (!latest?.sleepMinutes) missingDataWarnings.push({ signal: 'Sleep', detail: 'Connect a wearable or enter sleep manually to improve recovery confidence.' })
  if (!latest?.hrvMs) missingDataWarnings.push({ signal: 'HRV', detail: 'HRV is missing, so autonomic recovery is estimated.' })
  if (!latest?.restingHrBpm) missingDataWarnings.push({ signal: 'Resting heart rate', detail: 'Resting HR is missing, so fatigue detection is less sensitive.' })
  if (!args.snapshot.latestLog) missingDataWarnings.push({ signal: 'Daily check-in', detail: 'Self-reported soreness, stress, and pain are missing for today.' })

  const action = buildAction(score, pain, injuryActive, recoveryDebt)

  return {
    score,
    recoveryScore,
    confidencePct,
    confidenceLabel: confidencePct >= 78 ? 'high' : confidencePct >= 55 ? 'medium' : 'low',
    ...action,
    reasons,
    missingDataWarnings,
    provenance: [
      { label: 'Wearable health', type: 'wearable', status: latest?.sourceCategory === 'measured' ? 'active' : 'missing' },
      { label: 'Daily check-in', type: 'self_reported', status: args.snapshot.latestLog ? 'active' : 'missing' },
      { label: 'Coach input', type: 'coach_entered', status: 'missing' },
      { label: 'Creeda model', type: 'inferred', status: 'estimated' },
    ],
  }
}
