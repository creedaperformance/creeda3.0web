import type { VisionFault } from '@/lib/engine/types'
import {
  canonicalizeSportId,
  resolveVideoAnalysisProfile,
  type VideoAnalysisFamily,
  type VideoAnalysisRole,
} from '@/lib/video-analysis/catalog'

export interface VideoAnalysisFeedbackEvent {
  message: string
  isError: boolean
  timestampMs?: number
}

export interface VideoAnalysisRecommendation {
  title: string
  reason: string
  drills: string[]
  priority: 'high' | 'medium' | 'low'
}

export interface VideoAnalysisSummary {
  score: number
  status: 'clean' | 'watch' | 'corrective'
  headline: string
  coachSummary: string
}

export interface VideoAnalysisReportSummary {
  id: string
  userId: string
  sportId: string
  sportLabel: string
  subjectRole: VideoAnalysisRole
  subjectPosition: string | null
  analyzerFamily: VideoAnalysisFamily
  createdAt: string
  frameCount: number
  warnings: number
  positive: number
  issuesDetected: string[]
  feedbackLog: VideoAnalysisFeedbackEvent[]
  visionFaults: VisionFault[]
  summary: VideoAnalysisSummary
  recommendations: VideoAnalysisRecommendation[]
}

type BuildArtifactsInput = {
  sportId: string
  subjectRole: VideoAnalysisRole
  subjectPosition?: string | null
  frameCount: number
  warnings: number
  positive: number
  issuesDetected: string[]
  feedbackLog: VideoAnalysisFeedbackEvent[]
  visionFaults: VisionFault[]
}

const ISSUE_TITLES: Record<string, string> = {
  knee_valgus: 'Knee tracking needs cleanup',
  low_knee_drive_left: 'Drive-phase mechanics are dropping off',
  overstriding: 'Stride reach is too aggressive',
  head_falling_over: 'Head stability is drifting outside the base',
  stiff_knees: 'Athletic stance is too rigid',
  shoulder_tilt: 'Upper-body alignment is uneven',
  low_contact_point: 'Contact point is too low',
  stiff_landing: 'Landing mechanics are too stiff',
  forward_head: 'Head posture is drifting forward',
  hip_drop: 'Pelvic control is dropping during movement',
  low_guard: 'Guard position is falling away from the trunk',
  narrow_base: 'Base width is too narrow for clean control',
  shallow_squat: 'Depth and brace quality are limited',
  trunk_collapse: 'Trunk posture is collapsing under load',
  rounded_spine: 'Spinal position is losing neutrality',
  rotation_leak: 'Rotation is leaking before clean transfer',
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function severityPenalty(severity: VisionFault['severity']) {
  if (severity === 'high') return 16
  if (severity === 'moderate') return 9
  return 4
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeFeedbackLog(value: unknown): VideoAnalysisFeedbackEvent[] {
  if (!Array.isArray(value)) return []
  const entries: Array<VideoAnalysisFeedbackEvent | null> = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const raw = entry as Record<string, unknown>
      return {
        message: String(raw.message || ''),
        isError: Boolean(raw.isError),
        timestampMs: typeof raw.timestampMs === 'number' ? raw.timestampMs : undefined,
      }
    })
  return entries.filter((entry): entry is VideoAnalysisFeedbackEvent => Boolean(entry && entry.message))
}

export function normalizeVideoFaults(value: unknown): VisionFault[] {
  if (!Array.isArray(value)) return []

  const faults: Array<VisionFault | null> = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const raw = entry as Record<string, unknown>
      const drills = Array.isArray(raw.correctiveDrills)
        ? raw.correctiveDrills
        : Array.isArray(raw.corrective_drills)
          ? raw.corrective_drills
          : []

      return {
        fault: String(raw.fault || ''),
        riskMapping: String(raw.riskMapping || raw.risk_mapping || ''),
        correctiveDrills: drills.map((item) => String(item)).filter(Boolean),
        severity:
          raw.severity === 'high' || raw.severity === 'moderate' || raw.severity === 'low'
            ? raw.severity
            : 'low',
        confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.7,
        timestamp: raw.timestamp ? String(raw.timestamp) : undefined,
      } satisfies VisionFault
    })
  return faults.filter((entry): entry is VisionFault => Boolean(entry && entry.fault))
}

function buildMovementScore(input: BuildArtifactsInput) {
  const uniqueFaults = uniqueStrings(input.visionFaults.map((fault) => `${fault.fault}:${fault.severity}`))
  const structuralPenalty = input.visionFaults.reduce((sum, fault) => sum + severityPenalty(fault.severity), 0)
  const warningPenalty = clamp(input.warnings * 2, 0, 18)
  const coverageBonus = input.frameCount >= 120 ? 4 : input.frameCount >= 60 ? 2 : 0
  const positiveBonus = clamp(Math.floor(input.positive / 2), 0, 8)
  const base = uniqueFaults.length === 0 ? 88 : 82
  return clamp(Math.round(base - structuralPenalty - warningPenalty + coverageBonus + positiveBonus), 38, 98)
}

function buildHeadline(input: BuildArtifactsInput, profileLabel: string) {
  const topFault = input.visionFaults[0]
  if (topFault) return ISSUE_TITLES[input.issuesDetected[0] || ''] || topFault.fault
  if (input.warnings > 0) return `${profileLabel} needs a lighter cleanup pass`
  return `${profileLabel} looks stable in this clip`
}

function buildStatus(score: number): VideoAnalysisSummary['status'] {
  if (score >= 86) return 'clean'
  if (score >= 70) return 'watch'
  return 'corrective'
}

function buildCoachSummary(
  input: BuildArtifactsInput,
  summary: VideoAnalysisSummary,
  sportLabel: string
) {
  const highSeverityCount = input.visionFaults.filter((fault) => fault.severity === 'high').length

  if (summary.status === 'clean') {
    return `${sportLabel} clip is stable. Keep technical loading normal and use this pattern as the current reference model.`
  }

  if (highSeverityCount > 0) {
    return `${sportLabel} clip shows one or more high-priority structural faults. Reduce chaos, clean the pattern, and reassess before increasing intensity.`
  }

  return `${sportLabel} clip shows moderate technical leakage. Keep sport rhythm, but bias the next session toward corrective reps and lower-cost exposures.`
}

function buildRecommendations(input: BuildArtifactsInput): VideoAnalysisRecommendation[] {
  if (input.visionFaults.length === 0) {
    return [
      {
        title: 'Keep this movement as your reference clip',
        reason: 'No major technical deviations were detected in the visible frames.',
        drills: ['Repeat the same setup in future scans to track drift over time.'],
        priority: 'low',
      },
    ]
  }

  return input.visionFaults.slice(0, 3).map((fault) => ({
    title: fault.fault,
    reason: fault.riskMapping,
    drills: fault.correctiveDrills.slice(0, 4),
    priority: fault.severity === 'high' ? 'high' : fault.severity === 'moderate' ? 'medium' : 'low',
  }))
}

export function buildVideoAnalysisArtifacts(input: BuildArtifactsInput) {
  const profile = resolveVideoAnalysisProfile(input.sportId, input.subjectPosition)
  const score = buildMovementScore(input)
  const status = buildStatus(score)
  const summary: VideoAnalysisSummary = {
    score,
    status,
    headline: buildHeadline(input, profile.familyLabel),
    coachSummary: '',
  }

  summary.coachSummary = buildCoachSummary(input, summary, profile.sportLabel)
  const recommendations = buildRecommendations(input)

  return {
    sportId: profile.sportId,
    sportLabel: profile.sportLabel,
    analyzerFamily: profile.family,
    subjectRole: input.subjectRole,
    subjectPosition: input.subjectPosition || null,
    summary,
    recommendations,
  }
}

export function normalizeVideoAnalysisReport(row: unknown): VideoAnalysisReportSummary | null {
  if (!row || typeof row !== 'object') return null
  const raw = row as Record<string, unknown>

  const sportId = canonicalizeSportId(String(raw.sport || 'other')) || 'other'
  const subjectPosition = raw.subject_position ? String(raw.subject_position) : null
  const subjectRole = raw.subject_role === 'individual' ? 'individual' : 'athlete'
  const visionFaults = normalizeVideoFaults(raw.vision_faults)
  const feedbackLog = normalizeFeedbackLog(raw.feedback_log)
  const issuesDetected = Array.isArray(raw.issues_detected)
    ? raw.issues_detected.map((item) => String(item)).filter(Boolean)
    : []

  const base = buildVideoAnalysisArtifacts({
    sportId,
    subjectRole,
    subjectPosition,
    frameCount: Number(raw.frame_count || 0),
    warnings: Number(raw.warnings || 0),
    positive: Number(raw.positive || 0),
    issuesDetected,
    feedbackLog,
    visionFaults,
  })

  const summary =
    raw.summary && typeof raw.summary === 'object'
      ? {
          score: Number((raw.summary as Record<string, unknown>).score || base.summary.score),
          status:
            (raw.summary as Record<string, unknown>).status === 'clean' ||
            (raw.summary as Record<string, unknown>).status === 'watch' ||
            (raw.summary as Record<string, unknown>).status === 'corrective'
              ? ((raw.summary as Record<string, unknown>).status as VideoAnalysisSummary['status'])
              : base.summary.status,
          headline: String((raw.summary as Record<string, unknown>).headline || base.summary.headline),
          coachSummary: String((raw.summary as Record<string, unknown>).coachSummary || base.summary.coachSummary),
        }
      : base.summary

  const recommendations = Array.isArray(raw.recommendations)
    ? (raw.recommendations as Array<Record<string, unknown>>)
        .map((item): VideoAnalysisRecommendation => ({
          title: String(item.title || ''),
          reason: String(item.reason || ''),
          drills: Array.isArray(item.drills) ? item.drills.map((drill) => String(drill)).filter(Boolean) : [],
          priority:
            item.priority === 'high' || item.priority === 'medium' || item.priority === 'low'
              ? item.priority
              : ('medium' as const),
        }))
        .filter((item) => item.title)
    : base.recommendations

  return {
    id: String(raw.id || ''),
    userId: String(raw.user_id || ''),
    sportId: base.sportId,
    sportLabel: String(raw.sport_label || base.sportLabel),
    subjectRole,
    subjectPosition,
    analyzerFamily:
      typeof raw.analyzer_family === 'string'
        ? (raw.analyzer_family as VideoAnalysisFamily)
        : base.analyzerFamily,
    createdAt: String(raw.created_at || new Date().toISOString()),
    frameCount: Number(raw.frame_count || 0),
    warnings: Number(raw.warnings || 0),
    positive: Number(raw.positive || 0),
    issuesDetected,
    feedbackLog,
    visionFaults,
    summary,
    recommendations,
  }
}
