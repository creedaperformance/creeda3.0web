import type { DashboardSnapshotLike, GoalEventPlan, GoalPhase } from '@/lib/product/operating-system/types'

const GOAL_ALIASES: Record<string, string> = {
  fat_loss: 'fat_loss',
  weight_loss: 'fat_loss',
  strength: 'strength_gain',
  strength_gain: 'strength_gain',
  return_to_play: 'return_to_play',
  rehab: 'return_to_play',
  race_prep: 'race_prep',
  tournament_prep: 'tournament_prep',
  general_fitness: 'general_fitness',
  athletic_performance: 'sport_performance',
  sport_performance: 'sport_performance',
  body_recomposition: 'body_recomposition',
  mobility: 'mobility',
}

function normalizeToken(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function daysUntil(date: string | null) {
  if (!date) return null
  const today = new Date()
  const event = new Date(`${date}T00:00:00`)
  if (Number.isNaN(event.getTime())) return null
  return Math.ceil((event.getTime() - today.getTime()) / 86400000)
}

function inferPhase(days: number | null, fallback?: string): GoalPhase {
  const normalized = normalizeToken(fallback)
  if (['build', 'peak', 'taper', 'compete', 'recover'].includes(normalized)) return normalized as GoalPhase
  if (days === null) return 'build'
  if (days < -3) return 'recover'
  if (days <= 1) return 'compete'
  if (days <= 10) return 'taper'
  if (days <= 28) return 'peak'
  return 'build'
}

function statusFor(args: {
  phase: GoalPhase
  readinessScore: number
  compliancePct: number
  days: number | null
  hasData: boolean
}): GoalEventPlan['onTrackStatus'] {
  if (!args.hasData) return 'needs_data'
  if (args.phase === 'compete' && args.readinessScore < 55) return 'off_track'
  if (args.phase === 'taper' && args.compliancePct < 45) return 'watch'
  if (args.readinessScore < 42) return 'off_track'
  if (args.compliancePct < 50) return 'watch'
  return 'on_track'
}

function nextMilestone(goalType: string, phase: GoalPhase, days: number | null) {
  if (phase === 'compete') return 'Protect sharpness and arrive fresh.'
  if (phase === 'taper') return 'Reduce fatigue while preserving speed and skill rhythm.'
  if (phase === 'recover') return 'Close the loop with recovery and pain-free movement quality.'
  if (goalType === 'return_to_play') return 'Complete the next rehab exposure without symptom flare.'
  if (goalType === 'fat_loss' || goalType === 'body_recomposition') return 'Hit the next three planned sessions and keep recovery consistent.'
  if (goalType === 'race_prep') return days !== null ? `Build specific rhythm before the final ${Math.max(days, 0)} days.` : 'Anchor the next event date for sharper phases.'
  return 'Complete this week’s planned training with one deliberate recovery block.'
}

export function buildGoalEventPlan(args: {
  snapshot: DashboardSnapshotLike
  dbGoalRows: Array<Record<string, unknown>>
  weeklyCompliancePct: number
  readinessScore: number
}): GoalEventPlan {
  const activeGoal = args.dbGoalRows.find((row) => String(row.status || 'active') === 'active') || null
  const diagnostic = args.snapshot.diagnostic || {}
  const sportContext = diagnostic.sport_context as Record<string, unknown> | undefined
  const rawGoal = activeGoal?.goal_type || diagnostic.primary_goal || 'sport_performance'
  const goalType = GOAL_ALIASES[normalizeToken(rawGoal)] || normalizeToken(rawGoal) || 'sport_performance'
  const eventDate = activeGoal?.event_date ? String(activeGoal.event_date).slice(0, 10) : null
  const days = daysUntil(eventDate)
  const explicitPhase = activeGoal?.phase
    ? String(activeGoal.phase)
    : eventDate
      ? ''
      : String(sportContext?.seasonPhase || sportContext?.season_phase || '')
  const phase = inferPhase(days, explicitPhase)
  const hasData = Boolean(args.snapshot.latestLog || args.snapshot.decisionResult || args.dbGoalRows.length > 0)
  const onTrackStatus = statusFor({
    phase,
    readinessScore: args.readinessScore,
    compliancePct: args.weeklyCompliancePct,
    days,
    hasData,
  })

  const statusReason =
    onTrackStatus === 'needs_data'
      ? 'Creeda needs a check-in or synced data before it can judge goal trajectory.'
      : onTrackStatus === 'off_track'
        ? 'Current readiness or pain signals are not matching the demand of the phase.'
        : onTrackStatus === 'watch'
          ? 'The plan is viable, but compliance or recovery needs attention this week.'
          : 'Current behavior is aligned with the active phase.'

  return {
    id: activeGoal?.id ? String(activeGoal.id) : null,
    goalType,
    sport: String(activeGoal?.sport || args.snapshot.profile?.primary_sport || sportContext?.primarySport || sportContext?.sport || 'general_fitness'),
    position: activeGoal?.position ? String(activeGoal.position) : String(args.snapshot.profile?.position || sportContext?.position || '') || null,
    eventName: activeGoal?.event_name ? String(activeGoal.event_name) : null,
    eventDate,
    daysUntilEvent: days,
    phase,
    onTrackStatus,
    statusReason,
    nextMilestone: nextMilestone(goalType, phase, days),
  }
}
