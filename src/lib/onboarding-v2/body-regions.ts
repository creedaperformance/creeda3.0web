/**
 * Onboarding v2 body region catalog. Matches the orthopedic_history.body_region
 * CHECK constraint in migrations/20260426_v37_onboarding_v2_core_tables.sql.
 *
 * Each region has a display label, a "view" (front | back | side), an
 * anatomical group used to colour-code the body map, and approximate
 * normalized coordinates [0..1] for the 2D SVG overlay so the BodyMap2D
 * component can position the tap target consistently.
 */

export type BodyRegionView = 'front' | 'back'

export type BodyRegionGroup =
  | 'head_spine'
  | 'shoulder_arm'
  | 'core'
  | 'hip_pelvis'
  | 'thigh'
  | 'lower_leg'
  | 'foot'

export type BodyRegion = {
  id: string
  label: string
  group: BodyRegionGroup
  view: BodyRegionView
  /** Center-of-region position in body silhouette, [0..1]. */
  cx: number
  cy: number
  /** Hit radius in normalized units. Larger = easier to tap. */
  radius?: number
  /** Side ('left' | 'right' | 'midline') — drives mirroring + asymmetry math. */
  side: 'left' | 'right' | 'midline'
}

export const BODY_REGIONS: BodyRegion[] = [
  // ── Front view ────────────────────────────────────────────────
  { id: 'neck', label: 'Neck', group: 'head_spine', view: 'front', cx: 0.5, cy: 0.12, side: 'midline' },
  { id: 'left_shoulder', label: 'Left shoulder', group: 'shoulder_arm', view: 'front', cx: 0.35, cy: 0.18, side: 'left' },
  { id: 'right_shoulder', label: 'Right shoulder', group: 'shoulder_arm', view: 'front', cx: 0.65, cy: 0.18, side: 'right' },
  { id: 'left_elbow', label: 'Left elbow', group: 'shoulder_arm', view: 'front', cx: 0.27, cy: 0.34, side: 'left' },
  { id: 'right_elbow', label: 'Right elbow', group: 'shoulder_arm', view: 'front', cx: 0.73, cy: 0.34, side: 'right' },
  { id: 'left_wrist', label: 'Left wrist', group: 'shoulder_arm', view: 'front', cx: 0.22, cy: 0.48, side: 'left' },
  { id: 'right_wrist', label: 'Right wrist', group: 'shoulder_arm', view: 'front', cx: 0.78, cy: 0.48, side: 'right' },
  { id: 'left_hip', label: 'Left hip', group: 'hip_pelvis', view: 'front', cx: 0.42, cy: 0.5, side: 'left' },
  { id: 'right_hip', label: 'Right hip', group: 'hip_pelvis', view: 'front', cx: 0.58, cy: 0.5, side: 'right' },
  { id: 'groin', label: 'Groin / Adductor', group: 'hip_pelvis', view: 'front', cx: 0.5, cy: 0.54, side: 'midline' },
  { id: 'left_quad', label: 'Left quad / Front of thigh', group: 'thigh', view: 'front', cx: 0.42, cy: 0.62, side: 'left' },
  { id: 'right_quad', label: 'Right quad / Front of thigh', group: 'thigh', view: 'front', cx: 0.58, cy: 0.62, side: 'right' },
  { id: 'left_knee_acl', label: 'Left knee — ACL / front', group: 'thigh', view: 'front', cx: 0.42, cy: 0.74, side: 'left' },
  { id: 'left_knee_mcl', label: 'Left knee — MCL / inner', group: 'thigh', view: 'front', cx: 0.45, cy: 0.74, side: 'left' },
  { id: 'left_knee_lcl', label: 'Left knee — LCL / outer', group: 'thigh', view: 'front', cx: 0.39, cy: 0.74, side: 'left' },
  { id: 'left_knee_meniscus', label: 'Left knee — meniscus', group: 'thigh', view: 'front', cx: 0.42, cy: 0.755, side: 'left' },
  { id: 'left_knee_other', label: 'Left knee — other / unsure', group: 'thigh', view: 'front', cx: 0.42, cy: 0.77, side: 'left' },
  { id: 'right_knee_acl', label: 'Right knee — ACL / front', group: 'thigh', view: 'front', cx: 0.58, cy: 0.74, side: 'right' },
  { id: 'right_knee_mcl', label: 'Right knee — MCL / inner', group: 'thigh', view: 'front', cx: 0.55, cy: 0.74, side: 'right' },
  { id: 'right_knee_lcl', label: 'Right knee — LCL / outer', group: 'thigh', view: 'front', cx: 0.61, cy: 0.74, side: 'right' },
  { id: 'right_knee_meniscus', label: 'Right knee — meniscus', group: 'thigh', view: 'front', cx: 0.58, cy: 0.755, side: 'right' },
  { id: 'right_knee_other', label: 'Right knee — other / unsure', group: 'thigh', view: 'front', cx: 0.58, cy: 0.77, side: 'right' },
  { id: 'left_ankle', label: 'Left ankle', group: 'foot', view: 'front', cx: 0.42, cy: 0.92, side: 'left' },
  { id: 'right_ankle', label: 'Right ankle', group: 'foot', view: 'front', cx: 0.58, cy: 0.92, side: 'right' },
  { id: 'left_foot', label: 'Left foot', group: 'foot', view: 'front', cx: 0.42, cy: 0.97, side: 'left' },
  { id: 'right_foot', label: 'Right foot', group: 'foot', view: 'front', cx: 0.58, cy: 0.97, side: 'right' },
  { id: 'plantar_fascia', label: 'Plantar fascia / Heel', group: 'foot', view: 'front', cx: 0.5, cy: 0.99, side: 'midline' },

  // ── Back view ─────────────────────────────────────────────────
  { id: 'upper_back', label: 'Upper back / Trapezius', group: 'head_spine', view: 'back', cx: 0.5, cy: 0.22, side: 'midline' },
  { id: 'lower_back', label: 'Lower back / Lumbar', group: 'core', view: 'back', cx: 0.5, cy: 0.45, side: 'midline' },
  { id: 'left_hamstring', label: 'Left hamstring', group: 'thigh', view: 'back', cx: 0.42, cy: 0.62, side: 'left' },
  { id: 'right_hamstring', label: 'Right hamstring', group: 'thigh', view: 'back', cx: 0.58, cy: 0.62, side: 'right' },
  { id: 'left_calf', label: 'Left calf', group: 'lower_leg', view: 'back', cx: 0.42, cy: 0.84, side: 'left' },
  { id: 'right_calf', label: 'Right calf', group: 'lower_leg', view: 'back', cx: 0.58, cy: 0.84, side: 'right' },
]

export const BODY_REGION_BY_ID: Record<string, BodyRegion> = BODY_REGIONS.reduce(
  (acc, region) => {
    acc[region.id] = region
    return acc
  },
  {} as Record<string, BodyRegion>
)

export function regionsForView(view: BodyRegionView): BodyRegion[] {
  return BODY_REGIONS.filter((region) => region.view === view)
}

export const SEVERITY_OPTIONS = [
  {
    id: 'annoying' as const,
    label: 'Annoying',
    detail: 'Niggling, doesn’t stop training.',
  },
  {
    id: 'limited_1_2_weeks' as const,
    label: '1–2 weeks out',
    detail: 'Stopped training for a week or two.',
  },
  {
    id: 'limited_1_2_months' as const,
    label: '1–2 months out',
    detail: 'Stopped training for a month or more.',
  },
  {
    id: 'surgery_required' as const,
    label: 'Surgery / major',
    detail: 'Needed surgery, hospital, or long rehab.',
  },
]

export const TIME_BUCKETS = [
  { id: 'this_week', label: 'This week', daysAgo: 4 },
  { id: 'last_month', label: 'Last month', daysAgo: 30 },
  { id: '3_months', label: '3 months ago', daysAgo: 90 },
  { id: '6_months', label: '6 months ago', daysAgo: 180 },
  { id: '1_year', label: '1 year ago', daysAgo: 365 },
  { id: '2_years', label: '2+ years ago', daysAgo: 730 },
  { id: '3_years', label: '3+ years ago', daysAgo: 1095 },
] as const

export type TimeBucketId = (typeof TIME_BUCKETS)[number]['id']

export function dateFromBucket(bucket: TimeBucketId): string {
  const entry = TIME_BUCKETS.find((b) => b.id === bucket)
  const days = entry?.daysAgo ?? 30
  const dt = new Date()
  dt.setDate(dt.getDate() - days)
  return dt.toISOString().slice(0, 10)
}

export const CLINICIAN_OPTIONS = [
  { id: 'none' as const, label: 'No clinician' },
  { id: 'physio' as const, label: 'Physio' },
  { id: 'sports_doctor' as const, label: 'Sports doctor' },
  { id: 'orthopedist' as const, label: 'Orthopedist' },
  { id: 'gp' as const, label: 'GP / family doctor' },
  { id: 'other' as const, label: 'Other' },
]
