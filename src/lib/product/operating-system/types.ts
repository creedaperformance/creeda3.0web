import type { AthleteHealthSummary, AthleteDashboardSnapshot } from '@/lib/dashboard_decisions'
import type { ExecutionMode } from '@/lib/product/types'

export const HEALTH_PROVIDERS = [
  'apple_health',
  'health_connect',
  'google_fit',
  'garmin',
  'fitbit',
  'manual_import',
] as const

export const DATA_PROVENANCE_TYPES = [
  'wearable',
  'self_reported',
  'coach_entered',
  'inferred',
  'manual_import',
] as const

export type HealthProvider = (typeof HEALTH_PROVIDERS)[number]
export type DataProvenanceType = (typeof DATA_PROVENANCE_TYPES)[number]
export type SourceCategory = 'measured' | 'estimated' | 'manual'
export type IntegrationStatus = 'available' | 'connected' | 'mock_connected' | 'needs_auth' | 'sync_failed' | 'paused'
export type DailyAction = 'train_hard' | 'train_light' | 'mobility_only' | 'recovery_focus' | 'deload' | 'full_rest'
export type GoalPhase = 'build' | 'peak' | 'taper' | 'compete' | 'recover'

export interface IntegrationConnectorDefinition {
  provider: HealthProvider
  displayName: string
  statusLabel: string
  sourceCategory: SourceCategory
  provenanceType: DataProvenanceType
  supportedSignals: Array<'sleep' | 'hrv' | 'resting_hr' | 'activity_load' | 'steps' | 'workouts' | 'calories' | 'recovery'>
  productionReadiness: 'ready_for_client_token' | 'needs_partner_credentials' | 'manual'
  setupHint: string
}

export interface HealthSourceConnection {
  id: string | null
  provider: HealthProvider
  displayName: string
  status: IntegrationStatus
  sourceCategory: SourceCategory
  provenanceType: DataProvenanceType
  supportedSignals: IntegrationConnectorDefinition['supportedSignals']
  lastSyncAt: string | null
  lastError: string | null
  enabled: boolean
  setupHint: string
}

export interface NormalizedHealthSample {
  id?: string | null
  date: string
  provider: HealthProvider | 'creeda_estimate'
  sourceCategory: SourceCategory
  provenanceType: DataProvenanceType
  sleepMinutes: number | null
  sleepQualityPct: number | null
  hrvMs: number | null
  restingHrBpm: number | null
  avgHrBpm: number | null
  steps: number | null
  activeCalories: number | null
  workoutMinutes: number | null
  activityLoad: number | null
  recoverySignalPct: number | null
  confidencePct: number
}

export interface ReadinessReason {
  label: string
  impact: number
  detail: string
  provenance: DataProvenanceType
}

export interface MissingDataWarning {
  signal: string
  detail: string
}

export interface DailyReadinessOperatingScore {
  score: number
  recoveryScore: number
  confidencePct: number
  confidenceLabel: 'high' | 'medium' | 'low'
  action: DailyAction
  actionLabel: string
  actionDetail: string
  reasons: ReadinessReason[]
  missingDataWarnings: MissingDataWarning[]
  provenance: Array<{
    label: string
    type: DataProvenanceType
    status: 'active' | 'missing' | 'estimated'
  }>
}

export interface GoalEventPlan {
  id: string | null
  goalType: string
  sport: string
  position: string | null
  eventName: string | null
  eventDate: string | null
  daysUntilEvent: number | null
  phase: GoalPhase
  onTrackStatus: 'on_track' | 'watch' | 'off_track' | 'needs_data'
  statusReason: string
  nextMilestone: string
}

export interface RetentionChallenge {
  id: string
  title: string
  description: string
  metricKey: string
  progressPct: number
  status: 'available' | 'active' | 'completed'
}

export interface RetentionSnapshot {
  streakDays: number
  weeklyCompliancePct: number
  recoveryCompletions: number
  milestoneTitle: string
  milestoneDetail: string
  shareCard: {
    title: string
    detail: string
    stat: string
  }
  challenges: RetentionChallenge[]
}

export interface DailyOperatingSnapshot {
  readiness: DailyReadinessOperatingScore
  integrations: {
    connectedCount: number
    measuredSampleDays: number
    sources: HealthSourceConnection[]
    latestSample: NormalizedHealthSample | null
  }
  goal: GoalEventPlan
  retention: RetentionSnapshot
  today: {
    title: string
    mode: ExecutionMode
    expectedDurationMinutes: number
    href: string
  }
}

export interface CoachOperatingAthlete {
  athleteId: string
  athleteName: string
  readinessScore: number | null
  compliancePct: number | null
  missedSessions: number
  recoveryDebt: number
  injuryRiskFlags: string[]
  recentPainReports: string[]
  lastSessionId: string | null
}

export interface CoachOperatingSnapshot {
  averageReadiness: number
  averageCompliancePct: number
  interventionQueue: CoachOperatingAthlete[]
  lowDataAthletes: CoachOperatingAthlete[]
  recentComments: Array<{
    id: string
    athleteId: string
    athleteName: string
    message: string
    createdAt: string
  }>
}

export type DashboardSnapshotLike = Pick<
  AthleteDashboardSnapshot,
  'decisionResult' | 'healthSummary' | 'latestLog' | 'historicalLogs' | 'rehabHistory' | 'contextSummary' | 'diagnostic' | 'profile'
>

export type LegacyHealthSummary = AthleteHealthSummary | null
