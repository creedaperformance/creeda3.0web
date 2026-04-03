import { getObjectiveProtocol } from '@/lib/objective-tests/protocols'
import type {
  ObjectiveCadenceDecision,
  ObjectiveRecommendationState,
  ObjectiveTestSession,
  ObjectiveTestType,
} from '@/lib/objective-tests/types'

interface CadenceContext {
  protocolId: ObjectiveTestType
  recentSessions: ObjectiveTestSession[]
  isUnsafe?: boolean
  alternativeProtocolId?: ObjectiveTestType
  goalBias?: 'readiness' | 'rehab' | 'movement' | 'speed'
}

function countRecentSessions(sessions: ObjectiveTestSession[], hours: number) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  return sessions.filter((session) => new Date(session.completedAt || 0).getTime() >= cutoff).length
}

function buildDecision(
  state: ObjectiveRecommendationState,
  reason: string,
  alternativeProtocolId?: ObjectiveTestType
): ObjectiveCadenceDecision {
  return { state, reason, alternativeProtocolId }
}

export function getObjectiveCadenceDecision({
  protocolId,
  recentSessions,
  isUnsafe,
  alternativeProtocolId,
  goalBias,
}: CadenceContext): ObjectiveCadenceDecision {
  const protocol = getObjectiveProtocol(protocolId)
  if (!protocol) return buildDecision('optional', 'Protocol is available but not fully configured yet.')

  if (isUnsafe) {
    return buildDecision(
      alternativeProtocolId ? 'replace_with_lower_load' : 'unsafe_now',
      alternativeProtocolId
        ? `This protocol is not a good fit right now. Use ${getObjectiveProtocol(alternativeProtocolId)?.displayName || 'a lower-load test'} instead.`
        : 'This protocol is not recommended right now because the context looks unsafe.',
      alternativeProtocolId
    )
  }

  const mostRecent = recentSessions[0] || null
  const hoursSinceRecent = mostRecent
    ? (Date.now() - new Date(mostRecent.completedAt || 0).getTime()) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY

  if (hoursSinceRecent < protocol.cooldownHours) {
    return buildDecision(
      'cooldown',
      `${protocol.displayName} was already done recently. Let it cool down before retesting.`
    )
  }

  const recentWeekCount = countRecentSessions(recentSessions, 168)
  if (recentWeekCount >= protocol.weeklyCap) {
    return buildDecision(
      'not_useful_now',
      `${protocol.displayName} already has enough recent data this week. More repeats would add noise.`
    )
  }

  if (goalBias === 'movement' && protocol.family === 'mobility') {
    return buildDecision('recommended', 'Movement quality is a priority right now, so this battery is worth doing.')
  }

  if (goalBias === 'rehab' && (protocol.family === 'balance' || protocol.family === 'power')) {
    return buildDecision('recommended', 'This protocol is especially useful for rehab progression and control right now.')
  }

  return buildDecision(
    mostRecent ? 'optional' : 'recommended',
    mostRecent
      ? `${protocol.displayName} is optional right now. Use it if you want one extra measured anchor.`
      : `${protocol.displayName} would add a fresh measured anchor to CREEDA today.`
  )
}
