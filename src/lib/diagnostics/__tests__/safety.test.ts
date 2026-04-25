import { classifyComplaint } from '@/lib/diagnostics/classifier'
import { evaluateDiagnosticSafety } from '@/lib/diagnostics/guardrails'

test('blocks testing for red-flag symptoms', () => {
  const classification = classifyComplaint({ complaintText: 'My knee has sharp pain and swelling' })
  const safety = evaluateDiagnosticSafety({
    complaintText: 'My knee has sharp pain and swelling',
    classification,
    answers: [{ questionKey: 'safety_story', answerValue: 'Yes, there is swelling and sharp pain.', answerType: 'open_text' }],
  })

  expect(safety.shouldStopTest).toBe(true)
  expect(safety.resultMessage).toContain('cannot assess serious injury')
})

test('allows low severity pain-aware testing with caution language', () => {
  const classification = classifyComplaint({ complaintText: 'My knee hurts slightly in squats' })
  const safety = evaluateDiagnosticSafety({
    complaintText: 'My knee hurts slightly in squats',
    classification,
    answers: [
      { questionKey: 'movement_story', answerValue: 'It is mild pain, about 3 out of 10.', answerType: 'open_text' },
      { questionKey: 'safety_story', answerValue: 'No swelling, locking, numbness, sharp pain, or trouble bearing weight.', answerType: 'open_text' },
    ],
  })

  expect(safety.shouldStopTest).toBe(false)
  expect(safety.flags.some((flag) => flag.key === 'pain_language')).toBe(true)
})

test('does not treat negated red-flag language as a stop signal', () => {
  const classification = classifyComplaint({ complaintText: 'My knee hurts slightly in squats' })
  const safety = evaluateDiagnosticSafety({
    complaintText: 'My knee hurts slightly in squats',
    classification,
    answers: [
      {
        questionKey: 'safety_story',
        answerValue: 'No swelling, no locking, no numbness, and no sharp pain.',
        answerType: 'open_text',
      },
    ],
  })

  expect(safety.shouldStopTest).toBe(false)
})
