import type {
  ComplaintClassification,
  DiagnosticFollowUpAnswer,
  DiagnosticSafetyFlag,
  DiagnosticSafetyState,
} from '@/lib/diagnostics/types'

const STOP_MESSAGE =
  'This tool cannot assess serious injury. Please stop the test and consult a qualified medical professional.'

const NON_MEDICAL_MESSAGE =
  'CREEDA can guide movement quality and training choices, but it does not diagnose injuries or replace a clinician.'

function normalizedAnswer(answers: DiagnosticFollowUpAnswer[], key: string) {
  const answer = answers.find((item) => item.questionKey === key)
  return String(answer?.answerValue ?? '').toLowerCase()
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function allAnswerText(answers: DiagnosticFollowUpAnswer[]) {
  return answers
    .map((answer) => Array.isArray(answer.answerValue) ? answer.answerValue.join(' ') : String(answer.answerValue ?? ''))
    .join(' ')
}

function isNegatedOccurrence(text: string, index: number, term: string) {
  const before = text.slice(Math.max(0, index - 88), index).trim()
  const after = text.slice(index + term.length, index + term.length + 24).trim()

  return (
    /\b(no|not|none|without|denies|deny|never|do not|don t|does not|doesn t|free of)\b(?:\s+\w+){0,9}$/.test(before) ||
    /^(free|free today)\b/.test(after)
  )
}

function hasAffirmedSignal(text: string, terms: string[]) {
  return terms.some((term) => {
    const normalizedTerm = normalize(term)
    let index = text.indexOf(normalizedTerm)

    while (index >= 0) {
      if (!isNegatedOccurrence(text, index, normalizedTerm)) return true
      index = text.indexOf(normalizedTerm, index + normalizedTerm.length)
    }

    return false
  })
}

function parseSeverityFromText(value: string) {
  const raw = value.toLowerCase()
  const text = normalize(value)
  const match =
    raw.match(/\b([0-9]|10)\s*(?:\/\s*10|out\s+of\s+10)\b/) ||
    text.match(/\b(?:pain|severity|intensity|level)\s*(?:is|feels|around|about|at)?\s*([0-9]|10)\b/)

  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10, parsed)) : null
}

function makeFlag(key: string, label: string, severity: DiagnosticSafetyFlag['severity'], message: string): DiagnosticSafetyFlag {
  return { key, label, severity, message }
}

export function evaluateDiagnosticSafety(input: {
  complaintText?: string | null
  classification: ComplaintClassification
  answers?: DiagnosticFollowUpAnswer[]
}): DiagnosticSafetyState {
  const answers = input.answers || []
  const text = normalize(`${input.complaintText || ''} ${allAnswerText(answers)}`)
  const flags: DiagnosticSafetyFlag[] = [
    makeFlag('non_medical', 'Movement guidance only', 'info', NON_MEDICAL_MESSAGE),
  ]

  const redFlagAnswer = normalizedAnswer(answers, 'red_flags')
  const worseningAnswer = normalizedAnswer(answers, 'worsening')
  const severityAnswer = Number(normalizedAnswer(answers, 'severity_scale'))
  const openSeverity = parseSeverityFromText(allAnswerText(answers))
  const highSeverity =
    input.classification.severityFlag === 'urgent' ||
    input.classification.severityFlag === 'high' ||
    (Number.isFinite(severityAnswer) && severityAnswer >= 8) ||
    (openSeverity !== null && openSeverity >= 8)
  const hasRedFlagLanguage = hasAffirmedSignal(text, [
    'swelling',
    'locking',
    'numb',
    'numbness',
    'sharp pain',
    'sharp',
    'cannot bear',
    'can t bear',
    'cant bear',
    'unable to bear',
    'inability to bear',
    'trouble bearing weight',
  ])
  const hasWorseningLanguage = hasAffirmedSignal(text, ['getting worse', 'worsening', 'worse'])

  if (redFlagAnswer === 'yes' || hasRedFlagLanguage) {
    flags.push(makeFlag('serious_symptom_check', 'Stop and get help', 'stop', STOP_MESSAGE))
  }

  if (highSeverity) {
    flags.push(
      makeFlag(
        'high_severity',
        'High symptom intensity',
        'stop',
        'High or severe pain should not be tested through. Please stop and consult a qualified professional.'
      )
    )
  }

  if ((worseningAnswer === 'yes' || hasWorseningLanguage) && input.classification.painFlag) {
    flags.push(
      makeFlag(
        'worsening_pain',
        'Worsening symptoms',
        'caution',
        'Because this seems to be getting worse, reduce load and consider a qualified professional if it persists.'
      )
    )
  }

  if (input.classification.painFlag) {
    flags.push(
      makeFlag(
        'pain_language',
        'Pain-aware test',
        'caution',
        'Only record within a comfortable range. Stop if pain becomes sharp, worsening, or changes how you move.'
      )
    )
  }

  const shouldStopTest = flags.some((flag) => flag.severity === 'stop')

  return {
    canContinue: !shouldStopTest,
    shouldStopTest,
    flags,
    intakeMessage: shouldStopTest ? STOP_MESSAGE : NON_MEDICAL_MESSAGE,
    resultMessage: shouldStopTest
      ? STOP_MESSAGE
      : 'Use this as movement guidance. Consider seeing a clinician if pain is sharp, worsening, persistent, swollen, numb, locked, or unsafe.',
  }
}
