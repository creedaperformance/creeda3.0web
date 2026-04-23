import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGoalEventPlan } from './goals'
import { buildConnectionList, createMockHealthSamples } from './integrations'
import { buildDailyReadinessOperatingScore } from './readiness'
import { buildRetentionSnapshot } from './retention'
import type { DashboardSnapshotLike, NormalizedHealthSample } from './types'

function dateDaysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function snapshot(overrides: Record<string, unknown> = {}): DashboardSnapshotLike {
  return {
    decisionResult: {
      metrics: {
        readiness: {
          score: 74,
          factors: { sleep: 76 },
        },
      },
      creedaDecision: {
        confidenceScore: 72,
      },
    },
    healthSummary: null,
    latestLog: {
      sleep_quality: 'good',
      muscle_soreness: 2,
      soreness: 2,
      stress_level: 2,
      current_pain_level: 0,
      session_rpe: 3,
      duration_minutes: 35,
      readiness_score: 74,
    },
    historicalLogs: [],
    rehabHistory: [],
    contextSummary: {},
    diagnostic: {
      primary_goal: 'sport_performance',
      sport_context: {
        sport: 'cricket',
        position: 'fast bowler',
        seasonPhase: 'build',
      },
    },
    profile: {
      primary_sport: 'cricket',
      position: 'fast bowler',
    },
    ...overrides,
  } as unknown as DashboardSnapshotLike
}

test('integration connectors produce normalized measured samples and connection states', () => {
  const samples = createMockHealthSamples('garmin', '2026-04-21', 7)
  assert.equal(samples.length, 7)
  assert.ok(samples.every((sample) => sample.provider === 'garmin'))
  assert.ok(samples.every((sample) => sample.sourceCategory === 'measured'))
  assert.ok(samples.every((sample) => sample.provenanceType === 'wearable'))
  assert.ok(samples.some((sample) => sample.hrvMs !== null && sample.sleepMinutes !== null))

  const connections = buildConnectionList(
    [
      {
        id: 'connection-1',
        provider: 'garmin',
        status: 'mock_connected',
        source_category: 'measured',
        last_sync_at: '2026-04-21T07:00:00.000Z',
        enabled: true,
      },
    ],
    null
  )

  const garmin = connections.find((connection) => connection.provider === 'garmin')
  assert.equal(garmin?.status, 'mock_connected')
  assert.equal(garmin?.provenanceType, 'wearable')
  assert.ok(garmin?.supportedSignals.includes('hrv'))
})

test('readiness engine downshifts hard training when pain and missing data reduce confidence', () => {
  const lowReadiness = buildDailyReadinessOperatingScore({
    snapshot: snapshot({
      decisionResult: {
        metrics: {
          readiness: {
            score: 44,
            factors: { sleep: 35 },
          },
        },
        creedaDecision: {
          confidenceScore: 46,
        },
      },
      latestLog: {
        sleep_quality: 'poor',
        muscle_soreness: 4,
        soreness: 4,
        stress_level: 4,
        current_pain_level: 7,
        session_rpe: 8,
        duration_minutes: 70,
        readiness_score: 40,
      },
      rehabHistory: [
        {
          progression_flag: 'held',
        },
      ],
    }),
    normalizedSamples: [],
    completedSessionsLast7: 1,
    recoverySessionsLast7: 0,
  })

  assert.equal(lowReadiness.action, 'deload')
  assert.ok(lowReadiness.score < 45)
  assert.ok(lowReadiness.missingDataWarnings.length >= 3)
  assert.ok(lowReadiness.reasons.some((reason) => reason.label === 'Body status' && reason.impact < 0))
  assert.ok(lowReadiness.provenance.some((item) => item.type === 'inferred' && item.status === 'estimated'))
})

test('readiness engine elevates confidence when wearable and execution signals are present', () => {
  const samples: NormalizedHealthSample[] = createMockHealthSamples('apple_health', '2026-04-21', 7)
    .map((sample) => ({
      ...sample,
      sleepMinutes: 505,
      sleepQualityPct: 96,
      hrvMs: 62,
      restingHrBpm: 54,
      activityLoad: 52,
      recoverySignalPct: 88,
    }))
  const readiness = buildDailyReadinessOperatingScore({
    snapshot: snapshot({
      decisionResult: {
        metrics: {
          readiness: {
            score: 86,
            factors: { sleep: 88 },
          },
        },
        creedaDecision: {
          confidenceScore: 83,
        },
      },
    }),
    normalizedSamples: samples,
    completedSessionsLast7: 4,
    recoverySessionsLast7: 2,
  })

  assert.ok(['train_hard', 'train_light'].includes(readiness.action))
  assert.ok(readiness.confidencePct >= 75)
  assert.equal(readiness.provenance.find((item) => item.label === 'Wearable health')?.status, 'active')
  assert.ok(readiness.reasons.some((reason) => reason.provenance === 'wearable'))
})

test('goal engine maps events into phases and on-track status', () => {
  const goal = buildGoalEventPlan({
    snapshot: snapshot(),
    dbGoalRows: [
      {
        id: 'goal-1',
        status: 'active',
        goal_type: 'tournament_prep',
        sport: 'cricket',
        position: 'fast bowler',
        event_name: 'District final',
        event_date: dateDaysFromNow(8),
      },
    ],
    weeklyCompliancePct: 40,
    readinessScore: 70,
  })

  assert.equal(goal.phase, 'taper')
  assert.equal(goal.onTrackStatus, 'watch')
  assert.equal(goal.sport, 'cricket')
  assert.equal(goal.position, 'fast bowler')
  assert.ok(goal.statusReason.includes('compliance') || goal.statusReason.includes('recovery'))
})

test('retention engine creates lightweight challenges and shareable progress moments', () => {
  const retention = buildRetentionSnapshot({
    history: [
      { status: 'completed', mode: 'recovery', sessionDate: '2026-04-21', compliancePct: 100 },
      { status: 'completed', mode: 'train_light', sessionDate: '2026-04-20', compliancePct: 90 },
      { status: 'completed', mode: 'recovery', sessionDate: '2026-04-19', compliancePct: 85 },
      { status: 'planned', mode: 'train_hard', sessionDate: '2026-04-18', compliancePct: null },
    ],
    challengeRows: [
      {
        id: 'recovery-builder',
        title: 'Recovery Builder',
        description: 'Complete three recovery or cooldown sessions this week.',
        metric_key: 'recovery_sessions',
        target_value: 3,
      },
    ],
  })

  assert.equal(retention.streakDays, 3)
  assert.equal(retention.recoveryCompletions, 2)
  assert.ok(retention.weeklyCompliancePct >= 90)
  assert.equal(retention.challenges[0].progressPct, 67)
  assert.ok(retention.shareCard.stat.includes('day streak'))
})
