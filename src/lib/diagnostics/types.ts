import type { VideoAnalysisFeedbackEvent, VideoAnalysisRecommendation } from '@/lib/video-analysis/reporting'
import type { VisionFault } from '@/lib/engine/types'

export type ComplaintBucket =
  | 'lower_body_mobility'
  | 'lower_body_stability'
  | 'lower_body_pain_with_movement'
  | 'upper_body_mobility'
  | 'upper_body_pain_with_movement'
  | 'balance_and_control'
  | 'asymmetry'
  | 'speed_and_explosiveness'
  | 'fatigue_and_recovery'
  | 'technique_breakdown'
  | 'unknown_general'

export type BodyRegion =
  | 'ankle'
  | 'knee'
  | 'hip'
  | 'hamstring'
  | 'calf'
  | 'lower_back'
  | 'trunk'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'neck'
  | 'whole_body'
  | 'unknown'

export type RequiredView = 'front' | 'side'

export type DiagnosticSessionStatus =
  | 'followup_pending'
  | 'test_prescribed'
  | 'recording_pending'
  | 'analysis_pending'
  | 'completed'
  | 'caution_blocked'

export type DiagnosticQuestionType =
  | 'open_text'
  | 'multiple_choice'
  | 'yes_no'
  | 'body_side'
  | 'severity_scale'
  | 'activity_trigger'
  | 'duration'
  | 'sport_context'
  | 'training_context'

export interface DiagnosticFollowUpQuestion {
  key: string
  prompt: string
  type: DiagnosticQuestionType
  options?: Array<{
    label: string
    value: string
    caution?: boolean
  }>
  required?: boolean
  helperText?: string
}

export interface DiagnosticFollowUpAnswer {
  questionKey: string
  answerValue: string | number | boolean | string[]
  answerType: DiagnosticQuestionType
}

export interface ComplaintClassification {
  primaryBucket: ComplaintBucket
  secondaryBucket: ComplaintBucket | null
  bodyRegion: BodyRegion
  painFlag: boolean
  severity: number | null
  severityFlag: 'none' | 'mild' | 'moderate' | 'high' | 'urgent'
  activityTrigger: string | null
  side: 'left' | 'right' | 'both' | 'center' | 'unknown'
  sportRelevance: string | null
  confidence: number
  matchedSignals: string[]
}

export interface DiagnosticSafetyFlag {
  key: string
  label: string
  severity: 'info' | 'caution' | 'stop'
  message: string
}

export interface DiagnosticSafetyState {
  canContinue: boolean
  shouldStopTest: boolean
  flags: DiagnosticSafetyFlag[]
  intakeMessage: string
  resultMessage: string
}

export interface MovementTestDefinition {
  id: string
  displayName: string
  bodyRegion: BodyRegion | 'lower_body' | 'upper_body'
  requiredView: RequiredView
  instructions: string[]
  cameraSetup: string[]
  repCount?: number
  durationSeconds?: number
  contraindicationHints: string[]
  compatibleComplaintBuckets: ComplaintBucket[]
  expectedAnalysisMetrics: Array<keyof NormalizedDiagnosticMetrics>
  scoringLogicReferences: string[]
  passFailLogic?: string
}

export interface PrescribedMovementTestPayload {
  id: string
  testId: string
  displayName: string
  requiredView: RequiredView
  instructionVersion: string
  recordingStatus: 'pending' | 'uploaded' | 'analysis_started' | 'completed' | 'blocked'
  definition: MovementTestDefinition
  prescriptionReason: string
  safetyNotes: DiagnosticSafetyFlag[]
}

export interface DiagnosticRawEnginePayload {
  testId: string
  sportId?: string | null
  frameCount: number
  warnings: number
  positive: number
  issuesDetected: string[]
  feedbackLog: VideoAnalysisFeedbackEvent[]
  visionFaults: VisionFault[]
  clipDurationSeconds?: number | null
  motionFrameLoad?: number | null
  captureUsable?: boolean | null
  captureAssessment?: Record<string, unknown> | null
  recommendations?: VideoAnalysisRecommendation[]
}

export interface NormalizedDiagnosticMetrics {
  depthScore: number | null
  kneeTrackingScore: number | null
  hipControlScore: number | null
  ankleMobilityIndicator: number | null
  trunkControlScore: number | null
  asymmetryIndicator: number | null
  balanceScore: number | null
  stabilityScore: number | null
  shoulderMobilityScore: number | null
  hingePatternScore: number | null
  landingControlScore: number | null
  explosivenessIndicator: number | null
  tempoControlScore: number | null
  painBehaviorFlag: boolean
  analysisConfidence: number
}

export interface MovementScores {
  overall: number
  confidenceLabel: 'low' | 'medium' | 'high'
  relevantScores: Array<{
    key: keyof NormalizedDiagnosticMetrics
    label: string
    value: number | null
  }>
}

export interface DiagnosticContributor {
  title: string
  explanation: string
  priority: 'high' | 'medium' | 'low'
  metricKey?: keyof NormalizedDiagnosticMetrics
}

export interface DiagnosticInterpretationPayload {
  summaryText: string
  likelyContributors: DiagnosticContributor[]
  limitations: string[]
  cautionFlags: DiagnosticSafetyFlag[]
  recommendedNextSteps: string[]
}

export interface DiagnosticDrill {
  title: string
  why: string
  dosage: string
  difficulty: 'easy' | 'moderate' | 'hard'
  mediaReference?: string | null
}

export interface DiagnosticActionPlanPayload {
  mainFinding: string
  topLikelyContributors: string[]
  doThisNow: string[]
  drills: DiagnosticDrill[]
  loadModification: string[]
  recoveryGuidance: string[]
  escalationGuidance: string[]
  retestRecommendation: string
  reviewAfterDays: number
}

export interface DiagnosticResultPayload {
  session: {
    id: string
    status: DiagnosticSessionStatus
    complaintText: string
    createdAt: string
    updatedAt: string
  }
  classification: ComplaintClassification
  prescribedTest: PrescribedMovementTestPayload | null
  normalizedMetrics: NormalizedDiagnosticMetrics | null
  movementScores: MovementScores | null
  asymmetryScores: Record<string, unknown> | null
  flags: Record<string, unknown> | null
  confidenceScore: number | null
  interpretation: DiagnosticInterpretationPayload | null
  actionPlan: DiagnosticActionPlanPayload | null
  safety: DiagnosticSafetyState
}
