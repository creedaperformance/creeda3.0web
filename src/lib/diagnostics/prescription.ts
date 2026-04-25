import { DIAGNOSTIC_INSTRUCTION_VERSION, getMovementTestDefinition } from '@/lib/diagnostics/config'
import type {
  ComplaintClassification,
  DiagnosticFollowUpAnswer,
  DiagnosticSafetyFlag,
  MovementTestDefinition,
} from '@/lib/diagnostics/types'

function answerValue(answers: DiagnosticFollowUpAnswer[], key: string) {
  return String(answers.find((answer) => answer.questionKey === key)?.answerValue || '')
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function answersText(answers: DiagnosticFollowUpAnswer[]) {
  return normalize(
    answers
      .map((answer) => Array.isArray(answer.answerValue) ? answer.answerValue.join(' ') : String(answer.answerValue ?? ''))
      .join(' ')
  )
}

function detectActivityFromAnswers(text: string) {
  if (text.includes('squat')) return 'squat'
  if (text.includes('run') || text.includes('sprint')) return 'run'
  if (text.includes('jump') || text.includes('landing') || text.includes('hop')) return 'jump'
  if (text.includes('overhead') || text.includes('reach') || text.includes('throw') || text.includes('serve')) return 'overhead'
  if (text.includes('lift') || text.includes('deadlift') || text.includes('hinge') || text.includes('bend')) return 'hinge'
  if (text.includes('push up') || text.includes('pushup') || text.includes('press')) return 'push'
  return ''
}

function chooseTestId(classification: ComplaintClassification, answers: DiagnosticFollowUpAnswer[]) {
  const text = answersText(answers)
  const activity = answerValue(answers, 'activity_trigger') || classification.activityTrigger || detectActivityFromAnswers(text)
  const sensation = answerValue(answers, 'sensation_type') || text
  const region = classification.bodyRegion

  if (region === 'knee' && (activity === 'squat' || classification.painFlag)) return 'bodyweight_squat'
  if (activity === 'squat') return 'bodyweight_squat'
  if (activity === 'hinge' || region === 'lower_back') return 'basic_hip_hinge'
  if (region === 'hamstring') return 'toe_touch_hamstring_hinge'
  if (region === 'shoulder' && activity === 'overhead') return 'overhead_reach'
  if (region === 'shoulder' || classification.primaryBucket === 'upper_body_mobility') return 'wall_slide'
  if (classification.primaryBucket === 'upper_body_pain_with_movement') return 'overhead_reach'
  if (activity === 'push') return 'push_up_pattern_check'
  if (classification.primaryBucket === 'speed_and_explosiveness' && activity === 'jump') return 'vertical_jump'
  if (classification.primaryBucket === 'speed_and_explosiveness') return 'vertical_jump'
  if (classification.primaryBucket === 'fatigue_and_recovery' && !classification.painFlag) return 'pogo_hops'
  if (classification.primaryBucket === 'balance_and_control' || sensation.includes('instability') || sensation.includes('unstable') || sensation.includes('wobble')) return 'single_leg_balance_hold'
  if (classification.primaryBucket === 'asymmetry') return 'step_down'
  if (classification.primaryBucket === 'lower_body_stability') return 'step_down'
  if (classification.primaryBucket === 'lower_body_mobility') return 'bodyweight_squat'
  return 'bodyweight_squat'
}

function prescriptionReason(test: MovementTestDefinition, classification: ComplaintClassification) {
  if (test.id === 'bodyweight_squat' && classification.bodyRegion === 'knee') {
    return 'A front-view squat is the lowest-friction way to check knee tracking, stance symmetry, and control for this complaint.'
  }
  if (test.id === 'single_leg_balance_hold') {
    return 'A front-view single-leg hold checks whether balance and hip control may be contributing to the unstable feeling.'
  }
  if (test.id === 'basic_hip_hinge') {
    return 'A side-view hinge checks trunk control and hip-hinge patterning for lifting or back-discomfort complaints.'
  }
  if (test.id === 'overhead_reach' || test.id === 'wall_slide') {
    return 'This screen checks overhead range, shoulder symmetry, and trunk compensation with one simple angle.'
  }
  if (test.id === 'vertical_jump') {
    return 'A side-view jump gives a simple first look at landing control and explosive pattern quality.'
  }
  return `${test.displayName} is the best V1 movement screen for this complaint category and follow-up context.`
}

export function prescribeMovementTest(input: {
  sessionId: string
  classification: ComplaintClassification
  answers?: DiagnosticFollowUpAnswer[]
  safetyNotes?: DiagnosticSafetyFlag[]
}) {
  const testId = chooseTestId(input.classification, input.answers || [])
  const definition = getMovementTestDefinition(testId) || getMovementTestDefinition('bodyweight_squat')

  if (!definition) {
    throw new Error('No movement test definitions are available.')
  }

  return {
    testId: definition.id,
    displayName: definition.displayName,
    requiredView: definition.requiredView,
    instructionVersion: DIAGNOSTIC_INSTRUCTION_VERSION,
    recordingStatus: 'pending' as const,
    definition,
    prescriptionReason: prescriptionReason(definition, input.classification),
    safetyNotes: input.safetyNotes || [],
  }
}
