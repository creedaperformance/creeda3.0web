import type {
  ComplaintClassification,
  DiagnosticActionPlanPayload,
  DiagnosticDrill,
  DiagnosticInterpretationPayload,
  NormalizedDiagnosticMetrics,
} from '@/lib/diagnostics/types'

function drill(title: string, why: string, dosage: string, difficulty: DiagnosticDrill['difficulty']): DiagnosticDrill {
  return { title, why, dosage, difficulty, mediaReference: null }
}

function isLow(value: number | null, threshold = 68) {
  return typeof value === 'number' && value < threshold
}

export function buildDiagnosticActionPlan(input: {
  classification: ComplaintClassification
  testId: string
  metrics: NormalizedDiagnosticMetrics
  interpretation: DiagnosticInterpretationPayload
}): DiagnosticActionPlanPayload {
  const drills: DiagnosticDrill[] = []

  if (isLow(input.metrics.kneeTrackingScore)) {
    drills.push(
      drill('Banded knee-control squats', 'Build awareness of keeping hip, knee, and second toe stacked.', '2 sets of 8 slow reps, 4 days per week.', 'moderate'),
      drill('Assisted split squats', 'Improve control through one leg without forcing depth.', '2 sets of 6 each side, easy range only.', 'moderate')
    )
  }

  if (isLow(input.metrics.ankleMobilityIndicator) || isLow(input.metrics.depthScore)) {
    drills.push(
      drill('Ankle dorsiflexion rocks', 'Improve the ankle range that often supports squat depth and knee tracking.', '2 sets of 10 each side before training.', 'easy')
    )
  }

  if (isLow(input.metrics.hipControlScore) || isLow(input.metrics.balanceScore)) {
    drills.push(
      drill('Single-leg holds', 'Build steady hip and foot control without speed.', '3 holds of 20 seconds each side.', 'easy'),
      drill('Glute bridge', 'Rehearse hip extension without knee or back load.', '2 sets of 10 controlled reps.', 'easy')
    )
  }

  if (isLow(input.metrics.trunkControlScore) || isLow(input.metrics.hingePatternScore)) {
    drills.push(
      drill('Hip-hinge wall drill', 'Practice moving from the hips while the trunk stays quiet.', '2 sets of 8 reps before lifting.', 'easy'),
      drill('Dead bug', 'Build trunk control without spinal loading.', '2 sets of 6 slow reps each side.', 'easy')
    )
  }

  if (isLow(input.metrics.shoulderMobilityScore)) {
    drills.push(
      drill('Wall slides', 'Improve overhead shoulder and upper-back coordination.', '2 sets of 8 slow reps.', 'easy'),
      drill('Thoracic extension breathing', 'Reduce overhead compensation by improving rib and upper-back position.', '5 slow breaths in 2 positions.', 'easy')
    )
  }

  if (isLow(input.metrics.landingControlScore) || isLow(input.metrics.explosivenessIndicator)) {
    drills.push(
      drill('Pogo mechanics drill', 'Rebuild quiet, springy contact before harder jumps.', '3 sets of 10 low contacts.', 'moderate'),
      drill('Drop squat landing stick', 'Practice absorbing force with hips and knees before adding height.', '2 sets of 5 quiet landings.', 'moderate')
    )
  }

  if (drills.length === 0) {
    drills.push(
      drill('Reference-pattern practice', 'Keep the current movement standard repeatable.', '2 easy sets before training, then re-test in 14 days.', 'easy')
    )
  }

  const painAware = input.classification.painFlag
  const reviewAfterDays = painAware ? 7 : 14

  return {
    mainFinding: input.interpretation.summaryText,
    topLikelyContributors: input.interpretation.likelyContributors.map((item) => item.title).slice(0, 3),
    doThisNow: [
      painAware ? 'Keep today’s training pain-free and avoid pushing through symptoms.' : 'Use the first two drills as your warm-up focus today.',
      'Record the same test again after the focus window so the comparison is clean.',
    ],
    drills: drills.slice(0, 5),
    loadModification: painAware
      ? [
          'Reduce load, depth, speed, or volume for movements that reproduce the complaint.',
          'Use controlled tempo and stop sets before symptoms change your technique.',
        ]
      : [
          'Keep normal training if the movement stays controlled.',
          'Avoid adding speed or load until the screen looks repeatable.',
        ],
    recoveryGuidance: [
      'Prioritize sleep and easy movement on the same day as the screen.',
      'Do not use soreness or fatigue as a reason to force extra corrective volume.',
    ],
    escalationGuidance: [
      'Seek a qualified professional if pain is sharp, worsening, persistent, or accompanied by swelling.',
      'Stop testing if you notice locking, numbness, or inability to bear weight.',
    ],
    retestRecommendation: `Re-test the same ${input.testId.replace(/_/g, ' ')} screen in ${reviewAfterDays} days using the same camera angle.`,
    reviewAfterDays,
  }
}
