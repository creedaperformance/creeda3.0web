import { classifyComplaint, refineClassificationWithAnswers } from '@/lib/diagnostics/classifier'
import { normalizeDiagnosticAnalysis } from '@/lib/diagnostics/adapter'
import { interpretDiagnosticResult } from '@/lib/diagnostics/interpretation'
import { buildDiagnosticActionPlan } from '@/lib/diagnostics/action-plan'
import { evaluateDiagnosticSafety } from '@/lib/diagnostics/guardrails'
import type { DiagnosticFollowUpAnswer, DiagnosticRawEnginePayload } from '@/lib/diagnostics/types'

test('turns a squat analysis into contributors and a practical action plan', () => {
  const answers: DiagnosticFollowUpAnswer[] = [
    {
      questionKey: 'movement_story',
      answerValue: 'Both knees feel painful around 4 out of 10 during the bottom of the squat.',
      answerType: 'open_text',
    },
    {
      questionKey: 'context_story',
      answerValue: 'It shows up in bodyweight and loaded squats.',
      answerType: 'open_text',
    },
    {
      questionKey: 'safety_story',
      answerValue: 'No swelling, locking, numbness, sharp pain, or trouble bearing weight.',
      answerType: 'open_text',
    },
  ]
  const base = classifyComplaint({ complaintText: 'My knees hurt in squats' })
  const classification = refineClassificationWithAnswers(base, answers)
  const raw: DiagnosticRawEnginePayload = {
    testId: 'bodyweight_squat',
    sportId: 'weightlifting',
    frameCount: 120,
    warnings: 3,
    positive: 2,
    issuesDetected: ['knee_valgus', 'shallow_squat'],
    feedbackLog: [],
    visionFaults: [
      {
        fault: 'Knee tracking collapses under load',
        riskMapping: 'Knee overload risk rises when the knee caves inward.',
        correctiveDrills: ['Single-leg glute bridge'],
        severity: 'high',
        confidence: 0.9,
      },
    ],
    captureUsable: true,
  }
  const safety = evaluateDiagnosticSafety({ complaintText: 'My knees hurt in squats', classification, answers })
  const normalized = normalizeDiagnosticAnalysis({ raw, classification })
  const interpretation = interpretDiagnosticResult({
    classification,
    testId: raw.testId,
    metrics: normalized.normalizedMetrics,
    movementScores: normalized.movementScores,
    safety,
  })
  const plan = buildDiagnosticActionPlan({
    classification,
    testId: raw.testId,
    metrics: normalized.normalizedMetrics,
    interpretation,
  })

  expect(normalized.normalizedMetrics.kneeTrackingScore).toBeLessThan(70)
  expect(interpretation.summaryText).toContain('not a diagnosis')
  expect(plan.drills.map((drill) => drill.title)).toContain('Banded knee-control squats')
  expect(plan.escalationGuidance.join(' ')).toContain('qualified professional')
})
