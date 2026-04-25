import { buildVideoAnalysisArtifacts } from '@/lib/video-analysis/reporting'
import { inferVideoAnalysisIssueKeyFromFault } from '@/lib/video-analysis/issueProfiles'
import { getMovementTestDefinition } from '@/lib/diagnostics/config'
import type {
  ComplaintClassification,
  DiagnosticRawEnginePayload,
  MovementScores,
  NormalizedDiagnosticMetrics,
} from '@/lib/diagnostics/types'

const METRIC_LABELS: Record<keyof NormalizedDiagnosticMetrics, string> = {
  depthScore: 'Depth',
  kneeTrackingScore: 'Knee tracking',
  hipControlScore: 'Hip control',
  ankleMobilityIndicator: 'Ankle mobility',
  trunkControlScore: 'Trunk control',
  asymmetryIndicator: 'Asymmetry control',
  balanceScore: 'Balance',
  stabilityScore: 'Stability',
  shoulderMobilityScore: 'Shoulder mobility',
  hingePatternScore: 'Hinge pattern',
  landingControlScore: 'Landing control',
  explosivenessIndicator: 'Explosiveness',
  tempoControlScore: 'Tempo control',
  painBehaviorFlag: 'Pain flag',
  analysisConfidence: 'Analysis confidence',
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function baseScore(raw: DiagnosticRawEnginePayload) {
  const artifacts = buildVideoAnalysisArtifacts({
    sportId: raw.sportId || 'strength',
    subjectRole: 'individual',
    subjectPosition: null,
    frameCount: raw.frameCount,
    warnings: raw.warnings,
    positive: raw.positive,
    issuesDetected: raw.issuesDetected,
    feedbackLog: raw.feedbackLog,
    visionFaults: raw.visionFaults,
    clipDurationSeconds: raw.clipDurationSeconds || null,
    motionFrameLoad: raw.motionFrameLoad || null,
    captureUsable: raw.captureUsable,
  })

  return artifacts.summary.score
}

function issueSet(raw: DiagnosticRawEnginePayload) {
  const inferred: string[] = []
  raw.visionFaults.forEach((fault) => {
    const issue = inferVideoAnalysisIssueKeyFromFault(fault.fault)
    if (issue) inferred.push(issue)
  })

  return new Set([...raw.issuesDetected, ...inferred])
}

function applyIssueDeductions(metrics: NormalizedDiagnosticMetrics, issues: Set<string>, score: number) {
  if (issues.has('knee_valgus')) {
    metrics.kneeTrackingScore = Math.min(metrics.kneeTrackingScore ?? 100, clamp(score - 28, 32, 72))
    metrics.hipControlScore = Math.min(metrics.hipControlScore ?? 100, clamp(score - 18, 38, 78))
    metrics.asymmetryIndicator = Math.min(metrics.asymmetryIndicator ?? 100, clamp(score - 22, 35, 75))
  }
  if (issues.has('shallow_squat')) {
    metrics.depthScore = Math.min(metrics.depthScore ?? 100, clamp(score - 24, 35, 76))
    metrics.ankleMobilityIndicator = Math.min(metrics.ankleMobilityIndicator ?? 100, clamp(score - 16, 42, 82))
  }
  if (issues.has('rounded_spine')) {
    metrics.trunkControlScore = Math.min(metrics.trunkControlScore ?? 100, clamp(score - 30, 30, 70))
    metrics.hingePatternScore = Math.min(metrics.hingePatternScore ?? 100, clamp(score - 24, 36, 74))
  }
  if (issues.has('trunk_collapse')) {
    metrics.trunkControlScore = Math.min(metrics.trunkControlScore ?? 100, clamp(score - 22, 36, 78))
    metrics.stabilityScore = Math.min(metrics.stabilityScore ?? 100, clamp(score - 16, 42, 82))
  }
  if (issues.has('hip_drop')) {
    metrics.hipControlScore = Math.min(metrics.hipControlScore ?? 100, clamp(score - 24, 35, 74))
    metrics.balanceScore = Math.min(metrics.balanceScore ?? 100, clamp(score - 20, 38, 78))
    metrics.asymmetryIndicator = Math.min(metrics.asymmetryIndicator ?? 100, clamp(score - 24, 35, 74))
  }
  if (issues.has('stiff_landing')) {
    metrics.landingControlScore = Math.min(metrics.landingControlScore ?? 100, clamp(score - 28, 30, 72))
    metrics.kneeTrackingScore = Math.min(metrics.kneeTrackingScore ?? 100, clamp(score - 12, 45, 84))
  }
  if (issues.has('stiff_knees')) {
    metrics.stabilityScore = Math.min(metrics.stabilityScore ?? 100, clamp(score - 12, 50, 84))
    metrics.tempoControlScore = Math.min(metrics.tempoControlScore ?? 100, clamp(score - 8, 55, 88))
  }
  if (issues.has('narrow_base') || issues.has('head_falling_over')) {
    metrics.balanceScore = Math.min(metrics.balanceScore ?? 100, clamp(score - 18, 42, 80))
    metrics.stabilityScore = Math.min(metrics.stabilityScore ?? 100, clamp(score - 14, 46, 84))
  }
  if (issues.has('shoulder_tilt')) {
    metrics.shoulderMobilityScore = Math.min(metrics.shoulderMobilityScore ?? 100, clamp(score - 18, 42, 82))
    metrics.asymmetryIndicator = Math.min(metrics.asymmetryIndicator ?? 100, clamp(score - 20, 40, 78))
  }
  if (issues.has('low_contact_point')) {
    metrics.shoulderMobilityScore = Math.min(metrics.shoulderMobilityScore ?? 100, clamp(score - 24, 36, 76))
  }
  if (issues.has('forward_head')) {
    metrics.trunkControlScore = Math.min(metrics.trunkControlScore ?? 100, clamp(score - 10, 52, 88))
  }
}

function confidenceFor(raw: DiagnosticRawEnginePayload) {
  const averageFaultConfidence = raw.visionFaults.length
    ? raw.visionFaults.reduce((sum, fault) => sum + (fault.confidence || 0.65), 0) / raw.visionFaults.length
    : 0.74
  const frameConfidence = raw.frameCount >= 90 ? 0.9 : raw.frameCount >= 45 ? 0.74 : 0.52
  const capturePenalty = raw.captureUsable === false ? 0.22 : 0
  return Number(Math.max(0.25, Math.min(0.94, (averageFaultConfidence + frameConfidence) / 2 - capturePenalty)).toFixed(2))
}

function fillExpectedMetrics(
  metrics: NormalizedDiagnosticMetrics,
  testId: string,
  score: number
) {
  const definition = getMovementTestDefinition(testId)
  const expected = definition?.expectedAnalysisMetrics || []

  expected.forEach((metricKey) => {
    if (metricKey === 'painBehaviorFlag' || metricKey === 'analysisConfidence') return
    if (metrics[metricKey] === null) {
      metrics[metricKey] = clamp(score + 2, 40, 92) as never
    }
  })
}

export function normalizeDiagnosticAnalysis(input: {
  raw: DiagnosticRawEnginePayload
  classification: ComplaintClassification
}) {
  const score = baseScore(input.raw)
  const issues = issueSet(input.raw)
  const metrics: NormalizedDiagnosticMetrics = {
    depthScore: null,
    kneeTrackingScore: null,
    hipControlScore: null,
    ankleMobilityIndicator: null,
    trunkControlScore: null,
    asymmetryIndicator: null,
    balanceScore: null,
    stabilityScore: null,
    shoulderMobilityScore: null,
    hingePatternScore: null,
    landingControlScore: null,
    explosivenessIndicator: null,
    tempoControlScore: null,
    painBehaviorFlag: input.classification.painFlag,
    analysisConfidence: confidenceFor(input.raw),
  }

  applyIssueDeductions(metrics, issues, score)
  fillExpectedMetrics(metrics, input.raw.testId, score)

  if (input.raw.testId === 'vertical_jump' && metrics.explosivenessIndicator === null) {
    metrics.explosivenessIndicator = clamp(score + (input.raw.positive > input.raw.warnings ? 4 : -4), 38, 94)
  }
  if (input.raw.testId === 'pogo_hops' && metrics.tempoControlScore === null) {
    metrics.tempoControlScore = clamp(score, 38, 94)
  }

  const relevantScores = (getMovementTestDefinition(input.raw.testId)?.expectedAnalysisMetrics || [])
    .filter((metricKey) => metricKey !== 'painBehaviorFlag' && metricKey !== 'analysisConfidence')
    .map((metricKey) => ({
      key: metricKey,
      label: METRIC_LABELS[metricKey],
      value: metrics[metricKey] as number | null,
    }))

  const movementScores: MovementScores = {
    overall: score,
    confidenceLabel:
      metrics.analysisConfidence >= 0.8 ? 'high' : metrics.analysisConfidence >= 0.58 ? 'medium' : 'low',
    relevantScores,
  }

  const asymmetryScores = {
    side: input.classification.side,
    indicator: metrics.asymmetryIndicator,
    source: issues.has('hip_drop') || issues.has('shoulder_tilt') || issues.has('knee_valgus') ? 'pose_faults' : 'not_detected',
  }

  const flags = {
    issuesDetected: Array.from(issues),
    warnings: input.raw.warnings,
    positive: input.raw.positive,
    captureUsable: input.raw.captureUsable !== false,
    frameCount: input.raw.frameCount,
  }

  return {
    normalizedMetrics: metrics,
    movementScores,
    asymmetryScores,
    flags,
    confidenceScore: metrics.analysisConfidence,
  }
}
