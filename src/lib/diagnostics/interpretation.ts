import { getMovementTestDefinition } from '@/lib/diagnostics/config'
import type {
  ComplaintClassification,
  DiagnosticContributor,
  DiagnosticInterpretationPayload,
  DiagnosticSafetyState,
  MovementScores,
  NormalizedDiagnosticMetrics,
} from '@/lib/diagnostics/types'

function isLow(value: number | null, threshold = 68) {
  return typeof value === 'number' && value < threshold
}

function contributor(
  title: string,
  explanation: string,
  priority: DiagnosticContributor['priority'],
  metricKey?: DiagnosticContributor['metricKey']
): DiagnosticContributor {
  return { title, explanation, priority, metricKey }
}

export function interpretDiagnosticResult(input: {
  classification: ComplaintClassification
  testId: string
  metrics: NormalizedDiagnosticMetrics
  movementScores: MovementScores
  safety: DiagnosticSafetyState
}): DiagnosticInterpretationPayload {
  const definition = getMovementTestDefinition(input.testId)
  const contributors: DiagnosticContributor[] = []

  if (isLow(input.metrics.kneeTrackingScore)) {
    contributors.push(
      contributor(
        'Knee tracking control',
        'Your movement pattern suggests the knee may be drifting inward or losing its line over the foot during the test.',
        'high',
        'kneeTrackingScore'
      )
    )
  }

  if (isLow(input.metrics.ankleMobilityIndicator) || isLow(input.metrics.depthScore)) {
    contributors.push(
      contributor(
        'Range or ankle-mobility constraint',
        'Limited depth or ankle range may be a possible contributor to compensation during the movement.',
        'medium',
        isLow(input.metrics.ankleMobilityIndicator) ? 'ankleMobilityIndicator' : 'depthScore'
      )
    )
  }

  if (isLow(input.metrics.hipControlScore) || isLow(input.metrics.balanceScore)) {
    contributors.push(
      contributor(
        'Single-side control',
        `Control appears less steady${input.classification.side !== 'unknown' ? ` on the ${input.classification.side} side` : ''}, which may be contributing to instability or uneven loading.`,
        'high',
        isLow(input.metrics.hipControlScore) ? 'hipControlScore' : 'balanceScore'
      )
    )
  }

  if (isLow(input.metrics.trunkControlScore) || isLow(input.metrics.hingePatternScore)) {
    contributors.push(
      contributor(
        'Trunk and hinge control',
        'The pattern suggests the trunk may be losing position during the working phase, which can make lifting or squatting feel less controlled.',
        'high',
        isLow(input.metrics.hingePatternScore) ? 'hingePatternScore' : 'trunkControlScore'
      )
    )
  }

  if (isLow(input.metrics.shoulderMobilityScore)) {
    contributors.push(
      contributor(
        'Overhead shoulder range',
        'The screen suggests shoulder or upper-back range may be limiting overhead motion.',
        'medium',
        'shoulderMobilityScore'
      )
    )
  }

  if (isLow(input.metrics.landingControlScore)) {
    contributors.push(
      contributor(
        'Landing control',
        'Landing mechanics appear stiff or less controlled, which may reduce shock absorption during jumping or hopping.',
        'high',
        'landingControlScore'
      )
    )
  }

  if (isLow(input.metrics.explosivenessIndicator)) {
    contributors.push(
      contributor(
        'Explosive pattern quality',
        'The test suggests force production or rhythm may be limited today. This can be influenced by technique, fatigue, or recent training load.',
        'medium',
        'explosivenessIndicator'
      )
    )
  }

  if (contributors.length === 0) {
    contributors.push(
      contributor(
        'No major movement limiter detected',
        'The single-angle screen did not show a clear major movement fault. Keep monitoring symptoms and re-test if the pattern changes.',
        'low'
      )
    )
  }

  const primaryContributor = contributors[0]
  const testName = definition?.displayName || 'movement screen'
  const confidencePhrase =
    input.movementScores.confidenceLabel === 'high'
      ? 'with good confidence'
      : input.movementScores.confidenceLabel === 'medium'
        ? 'with moderate confidence'
        : 'with limited confidence'

  return {
    summaryText:
      input.safety.shouldStopTest
        ? input.safety.resultMessage
        : `From the ${testName}, the main finding is ${primaryContributor.title.toLowerCase()} ${confidencePhrase}. This may indicate a movement contributor, not a diagnosis.`,
    likelyContributors: contributors.slice(0, 4),
    limitations: [
      'This V1 screen uses one camera angle only.',
      'Pain behavior is based on self-report; CREEDA does not diagnose injuries.',
      'Lighting, framing, clothing, and camera distance can affect pose confidence.',
    ],
    cautionFlags: input.safety.flags.filter((flag) => flag.severity !== 'info'),
    recommendedNextSteps: [
      'Keep the next session pain-free and technically controlled.',
      'Use the drills below for 7 to 14 days, then re-test the same screen.',
      'Reduce load if symptoms increase during or after training.',
    ],
  }
}
