import { classifyComplaint, refineClassificationWithAnswers } from '@/lib/diagnostics/classifier'
import { selectFollowUpQuestions, hasEnoughFollowUpContext } from '@/lib/diagnostics/followup'
import { evaluateDiagnosticSafety } from '@/lib/diagnostics/guardrails'
import { prescribeMovementTest } from '@/lib/diagnostics/prescription'
import type { DiagnosticFollowUpAnswer } from '@/lib/diagnostics/types'

test('asks pain-aware follow-up questions for squat knee complaint', () => {
  const classification = classifyComplaint({ complaintText: 'My knees hurt in squats' })
  const questions = selectFollowUpQuestions(classification)
  const keys = questions.map((question) => question.key)

  expect(keys).toEqual(['movement_story', 'context_story', 'safety_story'])
  expect(questions.every((question) => question.type === 'open_text')).toBe(true)
  expect(questions.length).toBeLessThanOrEqual(5)
})

test('prescribes bodyweight squat for knee pain during squat', () => {
  const base = classifyComplaint({ complaintText: 'My knees hurt in squats' })
  const answers: DiagnosticFollowUpAnswer[] = [
    {
      questionKey: 'movement_story',
      answerValue: 'Both knees feel achy, around 4 out of 10, especially near the bottom.',
      answerType: 'open_text',
    },
    {
      questionKey: 'context_story',
      answerValue: 'It happens during squats at the gym and has been going on for a few weeks.',
      answerType: 'open_text',
    },
    {
      questionKey: 'safety_story',
      answerValue: 'No swelling, locking, numbness, sharp pain, or trouble bearing weight.',
      answerType: 'open_text',
    },
  ]
  const classification = refineClassificationWithAnswers(base, answers)
  const safety = evaluateDiagnosticSafety({ complaintText: 'My knees hurt in squats', classification, answers })
  const prescription = prescribeMovementTest({ sessionId: 'session-1', classification, answers, safetyNotes: safety.flags })

  expect(hasEnoughFollowUpContext(classification, answers)).toBe(true)
  expect(prescription.testId).toBe('bodyweight_squat')
  expect(prescription.requiredView).toBe('front')
})

test('prescribes hip hinge for low-back lifting discomfort', () => {
  const classification = classifyComplaint({ complaintText: 'My back feels uncomfortable when I lift' })
  const prescription = prescribeMovementTest({ sessionId: 'session-1', classification, answers: [] })

  expect(prescription.testId).toBe('basic_hip_hinge')
  expect(prescription.requiredView).toBe('side')
})
