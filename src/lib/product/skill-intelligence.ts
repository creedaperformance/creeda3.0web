import type { VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'

export interface SkillIntelligenceGap {
  label: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  drills: string[]
  movementTags: string[]
}
export interface SkillIntelligenceSnapshot {
  status: 'no_video' | 'baseline' | 'watch' | 'corrective'
  score: number | null
  headline: string
  priorityAreas: SkillIntelligenceGap[]
  targetedDrills: string[]
  movementTags: string[]
  planAdjustment: string
  nextScanStandard: string
}

const FAULT_TAG_RULES: Array<{ match: string[]; tags: string[] }> = [
  {
    match: ['knee', 'valgus', 'landing', 'stiff'],
    tags: ['knee_control', 'landing_control', 'frontal_plane_control', 'deceleration_control'],
  },
  {
    match: ['hip', 'pelvic'],
    tags: ['pelvic_control', 'single_leg_control', 'frontal_plane_control', 'hip_extension'],
  },
  {
    match: ['shoulder', 'guard', 'arm', 'overhead', 'contact'],
    tags: ['scapular_control', 'cuff_activation', 'overhead_endurance', 'shoulder_resilience'],
  },
  {
    match: ['stride', 'drive', 'cadence', 'sprint'],
    tags: ['front_side_mechanics', 'projection', 'upright_mechanics', 'cadence'],
  },
  {
    match: ['rotation', 'swing', 'head falling', 'base'],
    tags: ['rotational_timing', 'hip_shoulder_separation', 'force_transfer', 'balance'],
  },
  {
    match: ['trunk', 'spine', 'brace', 'posture'],
    tags: ['bracing', 'stacked_breathing', 'posture', 'force_transfer'],
  },
  {
    match: ['ankle', 'foot'],
    tags: ['ankle_dorsiflexion', 'foot_control', 'ankle_stiffness', 'landing_mechanics'],
  },
]

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function priorityFromReport(
  priority: VideoAnalysisReportSummary['recommendations'][number]['priority'] | undefined,
  severity: string | undefined
): SkillIntelligenceGap['priority'] {
  if (priority === 'high' || severity === 'high') return 'high'
  if (priority === 'medium' || severity === 'moderate') return 'medium'
  return 'low'
}

function movementTagsFor(label: string, reason: string) {
  const text = normalize(`${label} ${reason}`)
  return unique(
    FAULT_TAG_RULES.flatMap((rule) =>
      rule.match.some((token) => text.includes(token)) ? rule.tags : []
    )
  )
}

function statusFor(report: VideoAnalysisReportSummary | null): SkillIntelligenceSnapshot['status'] {
  if (!report) return 'no_video'
  if (report.summary.status === 'corrective') return 'corrective'
  if (report.summary.status === 'watch') return 'watch'
  return 'baseline'
}

export function buildSkillIntelligenceSnapshot(
  report: VideoAnalysisReportSummary | null
): SkillIntelligenceSnapshot {
  if (!report) {
    return {
      status: 'no_video',
      score: null,
      headline: 'No movement scan is connected yet',
      priorityAreas: [],
      targetedDrills: [],
      movementTags: [],
      planAdjustment: 'Daily plans are currently built from check-ins, readiness, training history, and profile context.',
      nextScanStandard: 'Record one clean clip when you want CREEDA to sharpen technique guidance.',
    }
  }

  const gaps = report.recommendations.slice(0, 4).map((recommendation, index) => {
    const matchingFault = report.visionFaults[index]
    const label = recommendation.title || matchingFault?.fault || 'Movement quality'
    const reason = recommendation.reason || matchingFault?.riskMapping || report.summary.coachSummary
    const drills = unique([
      ...recommendation.drills,
      ...(matchingFault?.correctiveDrills || []),
    ]).slice(0, 5)

    return {
      label,
      priority: priorityFromReport(recommendation.priority, matchingFault?.severity),
      reason,
      drills,
      movementTags: movementTagsFor(label, reason),
    } satisfies SkillIntelligenceGap
  })

  const movementTags = unique(gaps.flatMap((gap) => gap.movementTags)).slice(0, 8)
  const targetedDrills = unique(gaps.flatMap((gap) => gap.drills)).slice(0, 8)
  const leadGap = gaps[0]
  const planAdjustment =
    report.summary.status === 'clean'
      ? 'The latest scan can act as a reference clip. CREEDA can keep normal technical loading unless readiness says otherwise.'
      : leadGap
        ? `Next plans should bias toward ${leadGap.label.toLowerCase()} before increasing chaos, speed, or load.`
        : 'CREEDA will keep technique work conservative until the next usable scan provides a cleaner read.'

  return {
    status: statusFor(report),
    score: report.summary.score,
    headline: report.summary.headline,
    priorityAreas: gaps,
    targetedDrills,
    movementTags,
    planAdjustment,
    nextScanStandard:
      report.recommendations[0]?.nextRepFocus ||
      'Re-scan with the same camera angle after the corrective drills feel cleaner.',
  }
}
