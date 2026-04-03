import { getObjectiveProtocol } from '@/lib/objective-tests/protocols'
import { computeDeltaVsBaseline } from '@/lib/objective-tests/baselines'
import type {
  ObjectiveBaselineRecord,
  ObjectiveDecisionDomain,
  ObjectiveSignalSummary,
  ObjectiveTestSession,
} from '@/lib/objective-tests/types'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getValidityGate(status: ObjectiveTestSession['validityStatus']) {
  if (status === 'accepted') return 1
  if (status === 'low_confidence') return 0.6
  return 0
}

function getFreshnessFactor(freshness: ObjectiveSignalSummary['freshness']) {
  if (freshness === 'fresh') return 1
  if (freshness === 'stale') return 0.5
  return 0
}

function getBaselineFactor(status: ObjectiveSignalSummary['baselineStatus']) {
  if (status === 'ready') return 1
  if (status === 'provisional') return 0.5
  if (status === 'stale') return 0.35
  return 0
}

export function getObjectiveDomainContributions(
  signal: ObjectiveSignalSummary,
  session: ObjectiveTestSession | null,
  baseline: ObjectiveBaselineRecord | null
) {
  if (!session) return [] as Array<{ domain: ObjectiveDecisionDomain; value: number }>
  const protocol = getObjectiveProtocol(signal.protocolId)
  if (!protocol) return []

  const delta = computeDeltaVsBaseline(session, baseline)
  if (delta === null) return []

  const validityGate = getValidityGate(session.validityStatus)
  const freshnessFactor = getFreshnessFactor(signal.freshness)
  const confidenceFactor = clamp(session.confidenceScore || 0, 0, 1)
  const baselineFactor = getBaselineFactor(signal.baselineStatus)

  return protocol.decisionMappings.map((mapping) => {
    const normalizedChange = clamp(delta, -2, 2)
    const value =
      normalizedChange *
      mapping.coefficient *
      mapping.maxInfluencePoints *
      validityGate *
      freshnessFactor *
      confidenceFactor *
      baselineFactor

    return {
      domain: mapping.domain,
      value,
    }
  })
}
