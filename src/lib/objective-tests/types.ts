export type ObjectiveTestRole = 'athlete' | 'individual'

export type ObjectiveTestType =
  | 'reaction_tap'
  | 'balance_single_leg'
  | 'breathing_recovery'
  | 'jump_landing_control'
  | 'mobility_battery'
  | 'sprint_10m'
  | 'agility_505'

export type ObjectiveTestFamily =
  | 'neural'
  | 'balance'
  | 'recovery'
  | 'power'
  | 'mobility'
  | 'speed'
  | 'agility'
  | 'derived'

export type ObjectiveCaptureMode =
  | 'screen_tap'
  | 'camera_pose_live'
  | 'camera_pose_upload'
  | 'guided_timer_hr_optional'
  | 'camera_timed_distance'

export type ObjectiveMetricDirection = 'higher_better' | 'lower_better' | 'target_band'

export type ObjectiveValidityStatus = 'accepted' | 'low_confidence' | 'invalid_saved' | 'supplemental'

export type ObjectiveBaselineStatus = 'building' | 'provisional' | 'ready' | 'stale'

export type ObjectiveRecommendationState =
  | 'recommended'
  | 'optional'
  | 'cooldown'
  | 'not_useful_now'
  | 'unsafe_now'
  | 'replace_with_lower_load'

export type ObjectiveDecisionDomain =
  | 'neural_sharpness'
  | 'postural_control'
  | 'systemic_recovery'
  | 'explosive_readiness'
  | 'movement_capacity'
  | 'asymmetry_risk'
  | 'speed_exposure_readiness'
  | 'return_to_play_confidence'

export type ObjectiveAnalysisMode =
  | 'ai_pose'
  | 'ai_sensor_fusion'
  | 'ai_interpreted'

export interface ProtocolMetricDefinition {
  key: string
  label: string
  unit: string
  direction: ObjectiveMetricDirection
  decimals: number
  minimumDetectableChange: number
  provisionalThresholds: {
    good: number | [number, number]
    risk: number | [number, number]
    critical: number | [number, number]
  }
}

export interface ObjectiveBaselineDefinition {
  minimumAcceptedSessions: number
  initialMethod: 'first_3_median'
  rollingMethod: 'rolling_5_median'
  minimumDaysBetweenAnchorSessions: number
}

export interface ObjectiveDecisionMappingDefinition {
  domain: ObjectiveDecisionDomain
  coefficient: number
  maxInfluencePoints: number
  rehabMultiplier?: number
}

export interface ObjectiveTestProtocolDefinition {
  id: ObjectiveTestType
  family: ObjectiveTestFamily
  displayName: string
  shortDescription: string
  analysisMode: ObjectiveAnalysisMode
  captureMode: ObjectiveCaptureMode
  rolloutPhase: 1 | 2 | 3
  supportedRoles: ObjectiveTestRole[]
  supportedSports: 'all' | string[]
  estimatedDurationMinutes: number
  estimatedLoad: 'very_low' | 'low' | 'moderate' | 'high'
  heroLabel: string
  protocolRules: string[]
  setupChecklist: string[]
  whenUseful: string[]
  whenToSkip: string[]
  headlineMetric: ProtocolMetricDefinition
  secondaryMetrics: ProtocolMetricDefinition[]
  subtests?: Array<{
    key: string
    label: string
    metrics: ProtocolMetricDefinition[]
  }>
  baseline: ObjectiveBaselineDefinition
  freshnessWindowHours: number
  cooldownHours: number
  weeklyCap: number
  validityRules: {
    minimumCaptureQuality: number
    minimumConfidence: number
    minimumAcceptedTrials?: number
    minimumVisibleLandmarks?: string[]
    minimumFps?: number
    requiredSides?: Array<'left' | 'right'>
  }
  contraindications: string[]
  decisionMappings: ObjectiveDecisionMappingDefinition[]
  alternativesWhenUnsafe?: ObjectiveTestType[]
}

export interface ObjectiveTestMeasurement {
  key: string
  label: string
  value: number
  unit: string
  direction: ObjectiveMetricDirection
  metricGroup?: string
  side?: 'left' | 'right' | 'bilateral' | 'none'
  isHeadline?: boolean
  subtestKey?: string
  qualityWeight?: number
  metadata?: Record<string, unknown>
}

export interface ObjectiveTestSession {
  id: string
  userId: string
  role: ObjectiveTestRole
  testType: ObjectiveTestType
  family: ObjectiveTestFamily | null
  protocolVersion: string
  source: string
  captureMode: ObjectiveCaptureMode | null
  sport: string | null
  captureContext: Record<string, unknown>
  sideScope: 'none' | 'left' | 'right' | 'bilateral' | 'battery'
  dominantSide: 'left' | 'right' | null
  sampleCount: number
  falseStartCount: number
  averageScoreMs: number | null
  validatedScoreMs: number | null
  bestScoreMs: number | null
  consistencyMs: number | null
  classification: string | null
  headlineMetricKey: string | null
  headlineMetricValue: number | null
  headlineMetricUnit: string | null
  headlineMetricDirection: ObjectiveMetricDirection | null
  confidenceScore: number | null
  captureQualityScore: number | null
  validityStatus: ObjectiveValidityStatus
  baselineStatus: ObjectiveBaselineStatus
  baselineSnapshot: Record<string, unknown>
  qualityFlags: string[]
  safetyFlags: string[]
  trialResults: number[]
  resultsJson: Record<string, unknown>
  metadata: Record<string, unknown>
  linkedVideoReportId: string | null
  completedAt: string
  createdAt: string
  updatedAt: string
}

export interface ObjectiveBaselineRecord {
  userId: string
  role: ObjectiveTestRole
  testType: ObjectiveTestType
  metricKey: string
  side: 'left' | 'right' | 'bilateral' | 'none'
  baselineMethod: 'first_3_median' | 'rolling_5_median' | 'rolling_28d' | 'manual_clinician_override'
  baselineN: number
  baselineValue: number
  baselineUnit: string
  minDetectableChange: number
  ready: boolean
  metadata: Record<string, unknown>
}

export interface ObjectiveSignalSummary {
  protocolId: ObjectiveTestType
  displayName: string
  family: ObjectiveTestFamily
  headlineMetricKey: string
  headlineMetricLabel: string
  headlineMetricValue: number | null
  headlineMetricUnit: string
  headlineMetricDirection: ObjectiveMetricDirection
  formattedHeadline: string
  confidenceScore: number | null
  captureQualityScore: number | null
  freshness: 'fresh' | 'stale' | 'missing'
  trend: 'improving' | 'stable' | 'declining' | 'missing'
  classification: string | null
  summary: string
  nextAction: string
  completedAt: string | null
  baselineStatus: ObjectiveBaselineStatus
  validityStatus: ObjectiveValidityStatus
  deltaVsBaseline: number | null
  deltaVsPrevious: number | null
}

export interface ObjectiveCadenceDecision {
  state: ObjectiveRecommendationState
  reason: string
  alternativeProtocolId?: ObjectiveTestType
}
