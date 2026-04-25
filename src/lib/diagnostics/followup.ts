import { FOLLOW_UP_QUESTIONS } from '@/lib/diagnostics/config'
import type {
  ComplaintClassification,
  DiagnosticFollowUpAnswer,
  DiagnosticFollowUpQuestion,
} from '@/lib/diagnostics/types'

function answeredKeys(answers: DiagnosticFollowUpAnswer[]) {
  return new Set(answers.map((answer) => answer.questionKey))
}

export function selectFollowUpQuestions(
  classification: ComplaintClassification,
  answers: DiagnosticFollowUpAnswer[] = []
): DiagnosticFollowUpQuestion[] {
  const keys = answeredKeys(answers)
  const planned: string[] = ['movement_story', 'context_story', 'safety_story']

  return planned
    .filter((key, index, all) => all.indexOf(key) === index)
    .filter((key) => !keys.has(key))
    .slice(0, 5)
    .map((key) => FOLLOW_UP_QUESTIONS[key])
    .filter((question): question is DiagnosticFollowUpQuestion => Boolean(question))
}

export function hasEnoughFollowUpContext(
  _classification: ComplaintClassification,
  answers: DiagnosticFollowUpAnswer[]
) {
  const keys = answeredKeys(answers)
  return keys.has('movement_story') && keys.has('context_story') && keys.has('safety_story')
}
