import { scoreOverheadSquat } from '@creeda/engine'
import type { OnboardingV2MovementBaselineSubmission } from '@creeda/schemas'

import type { AnalysisState, VideoCaptureAssessment } from '@/lib/vision/rules'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function rounded(value: number, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function deriveOverheadSquatGeometryFromAnalysis(state: AnalysisState) {
  return {
    knee_valgus_deg_left: rounded(finiteOr(state.kneeValgusDegLeftMax, 0)),
    knee_valgus_deg_right: rounded(finiteOr(state.kneeValgusDegRightMax, 0)),
    ankle_dorsiflexion_deg_left: rounded(
      clamp(finiteOr(state.ankleDorsiflexionDegLeftMin, 30), 0, 90)
    ),
    ankle_dorsiflexion_deg_right: rounded(
      clamp(finiteOr(state.ankleDorsiflexionDegRightMin, 30), 0, 90)
    ),
    thoracic_extension_deg: rounded(clamp(finiteOr(state.thoracicExtensionDegMin, 45), 0, 90)),
    hip_shoulder_asymmetry_deg: rounded(
      clamp(finiteOr(state.hipShoulderAsymmetryDegMax, 0), 0, 60)
    ),
    squat_depth_ratio: rounded(clamp(finiteOr(state.squatDepthRatioMax, 0), 0, 1.5), 2),
  }
}

export function buildOnboardingMovementBaselineSubmission(args: {
  state: AnalysisState
  captureAssessment: VideoCaptureAssessment
  reportId: string
  sportId: string
  persona: 'athlete' | 'individual'
  source: 'web' | 'mobile'
  completionSeconds?: number
  deviceMeta?: Record<string, unknown>
}): OnboardingV2MovementBaselineSubmission {
  const geometry = deriveOverheadSquatGeometryFromAnalysis(args.state)
  const movementScore = scoreOverheadSquat(geometry)

  return {
    persona: args.persona,
    source: args.source,
    report_id: args.reportId,
    sport_id: args.sportId,
    scan_type: 'overhead_squat_baseline',
    geometry,
    movement_quality_score: movementScore.score,
    weak_links: movementScore.weakLinks,
    full_body_coverage_pct: args.captureAssessment.fullBodyCoveragePct,
    motion_evidence_score: rounded(clamp(args.captureAssessment.motionEvidence * 100, 0, 100)),
    passed_quality_gate: args.captureAssessment.usable,
    rejection_reason: args.captureAssessment.usable ? undefined : args.captureAssessment.reason,
    device_meta: args.deviceMeta ?? {},
    completion_seconds: args.completionSeconds,
  }
}
