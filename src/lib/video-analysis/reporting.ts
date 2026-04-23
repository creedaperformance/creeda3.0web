import type { VisionFault } from '@/lib/engine/types'
import {
  canonicalizeSportId,
  resolveVideoAnalysisProfile,
  type VideoAnalysisFamily,
  type VideoAnalysisRole,
} from '@/lib/video-analysis/catalog'
import { MAX_VIDEO_ANALYSIS_SECONDS, MIN_VIDEO_ANALYSIS_SECONDS } from '@/lib/video-analysis/clipValidation'
import {
  getVideoAnalysisIssueProfile,
  inferVideoAnalysisIssueKeyFromFault,
  synthesizeVisionFaultsFromIssues,
} from '@/lib/video-analysis/issueProfiles'

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
  correctionCue?: string
  nextRepFocus?: string
}

export interface VideoSessionValidation {
  repEstimate: number | null
  tempoLabel: 'slow' | 'controlled' | 'fast' | 'unknown'
  executionScore: number
  signalQuality: 'accepted' | 'limited' | 'rejected'
  detail: string
}

export interface VideoAnalysisSummary {
  score: number
  status: 'clean' | 'watch' | 'corrective'
  headline: string
  coachSummary: string
  validation?: VideoSessionValidation | null
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
  clipDurationSeconds?: number | null
  motionFrameLoad?: number | null
  captureUsable?: boolean | null
}

type ResolvedBuildArtifactsInput = BuildArtifactsInput & {
  issueProfiles: Array<ReturnType<typeof getVideoAnalysisIssueProfile>>
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

function resolveBuildArtifactsInput(input: BuildArtifactsInput): ResolvedBuildArtifactsInput {
  const resolvedFaults =
    input.visionFaults.length > 0 ? input.visionFaults : synthesizeVisionFaultsFromIssues(input.issuesDetected)

  const issueProfiles = resolvedFaults.map((fault, index) => {
    const directKey = input.issuesDetected[index]
    return getVideoAnalysisIssueProfile(directKey) || getVideoAnalysisIssueProfile(inferVideoAnalysisIssueKeyFromFault(fault.fault))
  })

  return {
    ...input,
    visionFaults: resolvedFaults,
    issueProfiles,
  }
}

function hasInsufficientEvidence(input: ResolvedBuildArtifactsInput) {
  return (
    input.frameCount < 24 ||
    (input.visionFaults.length === 0 &&
      input.feedbackLog.length < 2 &&
      input.positive === 0 &&
      input.warnings === 0)
  )
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

function normalizeSessionValidation(value: unknown): VideoSessionValidation | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const tempoLabel =
    raw.tempoLabel === 'slow' ||
    raw.tempoLabel === 'controlled' ||
    raw.tempoLabel === 'fast' ||
    raw.tempoLabel === 'unknown'
      ? raw.tempoLabel
      : 'unknown'
  const signalQuality =
    raw.signalQuality === 'accepted' ||
    raw.signalQuality === 'limited' ||
    raw.signalQuality === 'rejected'
      ? raw.signalQuality
      : 'limited'

  return {
    repEstimate: typeof raw.repEstimate === 'number' ? raw.repEstimate : null,
    tempoLabel,
    executionScore: clamp(Number(raw.executionScore || 0), 0, 100),
    signalQuality,
    detail: String(raw.detail || ''),
  }
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

function buildMovementScore(input: ResolvedBuildArtifactsInput) {
  if (hasInsufficientEvidence(input)) return 42
  const uniqueFaults = uniqueStrings(input.visionFaults.map((fault) => `${fault.fault}:${fault.severity}`))
  const structuralPenalty = input.visionFaults.reduce((sum, fault) => sum + severityPenalty(fault.severity), 0)
  const warningPenalty = clamp(input.warnings * 2, 0, 18)
  const coverageBonus = input.frameCount >= 120 ? 4 : input.frameCount >= 60 ? 2 : 0
  const positiveBonus = clamp(Math.floor(input.positive / 2), 0, 8)
  const base = uniqueFaults.length === 0 ? 88 : 82
  return clamp(Math.round(base - structuralPenalty - warningPenalty + coverageBonus + positiveBonus), 38, 98)
}

function buildHeadline(input: ResolvedBuildArtifactsInput, profileLabel: string) {
  if (hasInsufficientEvidence(input)) {
    return `Clip quality was too weak for a trusted ${profileLabel.toLowerCase()} read`
  }
  const topFault = input.visionFaults[0]
  const topIssueProfile = input.issueProfiles[0]
  if (topFault) return topIssueProfile?.title || topFault.fault
  if (input.warnings > 0) return `${profileLabel} needs a lighter cleanup pass`
  return `${profileLabel} looks stable in this clip`
}

function buildStatus(score: number): VideoAnalysisSummary['status'] {
  if (score >= 86) return 'clean'
  if (score >= 70) return 'watch'
  return 'corrective'
}

function buildCoachSummary(
  input: ResolvedBuildArtifactsInput,
  summary: VideoAnalysisSummary,
  sportLabel: string
) {
  if (hasInsufficientEvidence(input)) {
    return `Capture quality was too weak to trust this ${sportLabel} report. Re-record one person clearly, full-body, doing the actual movement before using this for coaching decisions.`
  }
  const highSeverityCount = input.visionFaults.filter((fault) => fault.severity === 'high').length
  const leadingIssue = input.issueProfiles[0]

  if (summary.status === 'clean') {
    return `${sportLabel} clip is stable. Keep technical loading normal and use this pattern as the current reference model.`
  }

  if (highSeverityCount > 0 && leadingIssue) {
    return `${sportLabel} clip is currently limited by ${leadingIssue.title.toLowerCase()}. Reduce chaos, clean the pattern, and use this cue first: ${leadingIssue.correctionCue}`
  }

  if (leadingIssue) {
    return `${sportLabel} clip shows technical leakage around ${leadingIssue.title.toLowerCase()}. Keep rhythm, bias the next session toward corrective reps, and re-scan once this cue looks cleaner: ${leadingIssue.nextRepFocus}`
  }

  return `${sportLabel} clip shows moderate technical leakage. Keep sport rhythm, but bias the next session toward corrective reps and lower-cost exposures.`
}

function buildSessionValidation(input: ResolvedBuildArtifactsInput): VideoSessionValidation | null {
  if (!input.clipDurationSeconds || input.clipDurationSeconds <= 0) return null

  const duration = input.clipDurationSeconds
  const motionFrames = Math.max(0, Number(input.motionFrameLoad || 0))
  const repEstimate =
    motionFrames > 0
      ? clamp(Math.round(motionFrames / 28), 1, 12)
      : clamp(Math.round(duration / 4), 1, 8)
  const secondsPerRep = repEstimate > 0 ? duration / repEstimate : 0
  const tempoLabel =
    secondsPerRep <= 1.8 ? 'fast' : secondsPerRep >= 5.5 ? 'slow' : 'controlled'
  const faultPenalty = input.visionFaults.reduce(
    (sum, fault) => sum + (fault.severity === 'high' ? 18 : fault.severity === 'moderate' ? 10 : 5),
    0
  )
  const executionScore = clamp(
    Math.round(82 + Math.min(input.positive, 6) * 2 - faultPenalty - Math.min(input.warnings, 8) * 2),
    35,
    98
  )
  const signalQuality =
    input.captureUsable === false || hasInsufficientEvidence(input)
      ? 'rejected'
      : input.frameCount >= 60
        ? 'accepted'
        : 'limited'

  return {
    repEstimate,
    tempoLabel,
    executionScore,
    signalQuality,
    detail:
      signalQuality === 'accepted'
        ? `CREEDA estimated ${repEstimate} repeatable rep${repEstimate === 1 ? '' : 's'} at a ${tempoLabel} tempo from this clip.`
        : signalQuality === 'limited'
          ? `CREEDA saved a limited validation estimate of ${repEstimate} rep${repEstimate === 1 ? '' : 's'} because the clip had fewer tracked frames.`
          : 'CREEDA did not trust this clip enough for execution validation.',
  }
}

function buildRecommendations(input: ResolvedBuildArtifactsInput): VideoAnalysisRecommendation[] {
  if (hasInsufficientEvidence(input)) {
    return [
      {
        title: 'Re-scan with a clearer movement clip',
        reason: 'CREEDA did not capture enough trusted human movement to support a real biomechanical read.',
        drills: [
          `Record ${MIN_VIDEO_ANALYSIS_SECONDS}-${MAX_VIDEO_ANALYSIS_SECONDS} seconds with one athlete fully in frame.`,
          'Use the actual sport movement, not a general or unrelated clip.',
          'Capture 2-4 clear repetitions from the recommended angle.',
        ],
        priority: 'high',
        correctionCue: 'Make the next upload one clean athlete, one clean angle, and one repeated movement pattern.',
        nextRepFocus: 'The next clip should keep the full body visible for most of the recording and show the real sport action.',
      },
    ]
  }

  if (input.visionFaults.length === 0) {
    return [
      {
        title: 'Keep this movement as your reference clip',
        reason: 'No major technical deviations were detected in the visible frames.',
        drills: ['Repeat the same setup in future scans to track drift over time.'],
        priority: 'low',
        correctionCue: 'Keep the same camera angle and lighting so future scans stay comparable.',
        nextRepFocus: 'Use this clip as the baseline standard for future reviews.',
      },
    ]
  }

  return input.visionFaults.slice(0, 3).map((fault, index) => {
    const issueProfile = input.issueProfiles[index]
    return {
      title: issueProfile?.title || fault.fault,
      reason: issueProfile?.riskMapping || fault.riskMapping,
      drills: (fault.correctiveDrills.length > 0 ? fault.correctiveDrills : issueProfile?.correctiveDrills || []).slice(0, 4),
      priority: fault.severity === 'high' ? 'high' : fault.severity === 'moderate' ? 'medium' : 'low',
      correctionCue: issueProfile?.correctionCue,
      nextRepFocus: issueProfile?.nextRepFocus,
    }
  })
}

export function buildVideoAnalysisArtifacts(input: BuildArtifactsInput) {
  const resolved = resolveBuildArtifactsInput(input)
  const profile = resolveVideoAnalysisProfile(input.sportId, input.subjectPosition)
  const score = buildMovementScore(resolved)
  const status = buildStatus(score)
  const summary: VideoAnalysisSummary = {
    score,
    status,
    headline: buildHeadline(resolved, profile.familyLabel),
    coachSummary: '',
    validation: buildSessionValidation(resolved),
  }

  summary.coachSummary = buildCoachSummary(resolved, summary, profile.sportLabel)
  const recommendations = buildRecommendations(resolved)

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
  const rawVisionFaults = normalizeVideoFaults(raw.vision_faults)
  const feedbackLog = normalizeFeedbackLog(raw.feedback_log)
  const issuesDetected = Array.isArray(raw.issues_detected)
    ? raw.issues_detected.map((item) => String(item)).filter(Boolean)
    : []
  const visionFaults =
    rawVisionFaults.length > 0 ? rawVisionFaults : synthesizeVisionFaultsFromIssues(issuesDetected)

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
          validation:
            normalizeSessionValidation((raw.summary as Record<string, unknown>).validation) ||
            base.summary.validation ||
            null,
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
          correctionCue: item.correctionCue ? String(item.correctionCue) : undefined,
          nextRepFocus: item.nextRepFocus ? String(item.nextRepFocus) : undefined,
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
