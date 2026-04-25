import { classifyComplaint, refineClassificationWithAnswers } from '@/lib/diagnostics/classifier'

test('classifies knee pain during squats into lower-body pain with movement', () => {
  const classification = classifyComplaint({ complaintText: 'My knees hurt in squats' })

  expect(classification.primaryBucket).toBe('lower_body_pain_with_movement')
  expect(classification.bodyRegion).toBe('knee')
  expect(classification.activityTrigger).toBe('squat')
  expect(classification.painFlag).toBe(true)
})

test('classifies slow feeling into speed and explosiveness without pain', () => {
  const classification = classifyComplaint({ complaintText: 'I feel slow' })

  expect(classification.primaryBucket).toBe('speed_and_explosiveness')
  expect(classification.painFlag).toBe(false)
})

test('refines classification from follow-up answers', () => {
  const classification = classifyComplaint({ complaintText: 'My shoulder is stiff overhead' })
  const refined = refineClassificationWithAnswers(classification, [
    {
      questionKey: 'movement_story',
      answerValue: 'It feels like pain in my right shoulder, about 5 out of 10.',
      answerType: 'open_text',
    },
    {
      questionKey: 'context_story',
      answerValue: 'I notice it most when reaching overhead.',
      answerType: 'open_text',
    },
  ])

  expect(refined.primaryBucket).toBe('upper_body_pain_with_movement')
  expect(refined.painFlag).toBe(true)
  expect(refined.severity).toBe(5)
  expect(refined.side).toBe('right')
})
