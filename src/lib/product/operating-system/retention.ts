import type { RetentionChallenge, RetentionSnapshot } from '@/lib/product/operating-system/types'

type HistoryEntry = {
  status: 'planned' | 'in_progress' | 'completed' | 'skipped'
  mode?: string
  sessionDate: string
  compliancePct: number | null
}

function isCompleted(entry: HistoryEntry) {
  return entry.status === 'completed'
}

function computeStreak(history: HistoryEntry[]) {
  let streak = 0
  for (const entry of history) {
    if (!isCompleted(entry)) break
    streak += 1
  }
  return streak
}

function averageCompliance(history: HistoryEntry[]) {
  const values = history.map((entry) => entry.compliancePct).filter((value): value is number => value !== null)
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function buildChallengeProgress(rows: Array<Record<string, unknown>>, history: HistoryEntry[], recoveryCompletions: number): RetentionChallenge[] {
  const completedCount = history.filter(isCompleted).length
  const actionCount = completedCount + recoveryCompletions
  const fallbackRows = rows.length > 0
    ? rows
    : [
        {
          id: 'first-7-days',
          title: 'First 7 Days',
          description: 'Complete five useful Creeda actions in your first week.',
          metric_key: 'weekly_actions',
          target_value: 5,
        },
        {
          id: 'recovery-builder',
          title: 'Recovery Builder',
          description: 'Complete three recovery or cooldown sessions this week.',
          metric_key: 'recovery_sessions',
          target_value: 3,
        },
      ]

  return fallbackRows.slice(0, 3).map((row) => {
    const metricKey = String(row.metric_key || 'weekly_actions')
    const target = Number(row.target_value || 1)
    const progress =
      metricKey === 'recovery_sessions'
        ? recoveryCompletions
        : metricKey === 'planned_sessions'
          ? completedCount
          : actionCount

    return {
      id: String(row.id || metricKey),
      title: String(row.title || 'Challenge'),
      description: String(row.description || 'Build consistency without adding noise.'),
      metricKey,
      progressPct: Math.min(100, Math.round((progress / Math.max(target, 1)) * 100)),
      status: progress >= target ? 'completed' : 'available',
    }
  })
}

export function buildRetentionSnapshot(args: {
  history: HistoryEntry[]
  challengeRows: Array<Record<string, unknown>>
}): RetentionSnapshot {
  const recent = args.history.slice(0, 7)
  const streakDays = computeStreak(args.history)
  const weeklyCompliancePct = averageCompliance(recent)
  const recoveryCompletions = recent.filter((entry) => entry.mode === 'recovery' && isCompleted(entry)).length
  const milestoneTitle =
    streakDays >= 7
      ? '7-day execution streak'
      : weeklyCompliancePct >= 80
        ? 'Strong weekly compliance'
        : recoveryCompletions >= 2
          ? 'Recovery discipline is building'
          : 'Next win is one completed session'
  const milestoneDetail =
    streakDays >= 7
      ? 'You have built a full week of execution data for Creeda to learn from.'
      : weeklyCompliancePct >= 80
        ? 'Your recent sessions are complete enough to support progression.'
        : recoveryCompletions >= 2
          ? 'Recovery work is becoming part of the loop, not an afterthought.'
          : 'Start today’s session or recovery flow to begin the streak.'

  return {
    streakDays,
    weeklyCompliancePct,
    recoveryCompletions,
    milestoneTitle,
    milestoneDetail,
    shareCard: {
      title: milestoneTitle,
      detail: milestoneDetail,
      stat: streakDays > 0 ? `${streakDays} day streak` : `${weeklyCompliancePct}% week`,
    },
    challenges: buildChallengeProgress(args.challengeRows, recent, recoveryCompletions),
  }
}
