export interface OverheadSquatGeometry {
  knee_valgus_deg_left: number
  knee_valgus_deg_right: number
  ankle_dorsiflexion_deg_left: number
  ankle_dorsiflexion_deg_right: number
  thoracic_extension_deg: number
  hip_shoulder_asymmetry_deg: number
  squat_depth_ratio: number
}

export interface WeakLink {
  region: string
  finding: string
  severity: 'mild' | 'moderate' | 'severe'
  drill_id: string
}

export function scoreOverheadSquat(geometry: OverheadSquatGeometry): {
  score: number
  weakLinks: WeakLink[]
} {
  let score = 100
  const weakLinks: WeakLink[] = []

  const valgusMax = Math.max(
    geometry.knee_valgus_deg_left,
    geometry.knee_valgus_deg_right
  )

  if (valgusMax > 12) {
    score -= 25
    weakLinks.push({
      region: 'knee',
      finding: `Knee valgus ${valgusMax.toFixed(1)} deg (severe)`,
      severity: 'severe',
      drill_id: 'banded_clamshell',
    })
  } else if (valgusMax > 6) {
    score -= 12
    weakLinks.push({
      region: 'knee',
      finding: `Knee valgus ${valgusMax.toFixed(1)} deg (moderate)`,
      severity: 'moderate',
      drill_id: 'banded_clamshell',
    })
  }

  const dorsiflexionMin = Math.min(
    geometry.ankle_dorsiflexion_deg_left,
    geometry.ankle_dorsiflexion_deg_right
  )
  if (dorsiflexionMin < 25) {
    score -= 15
    weakLinks.push({
      region: 'ankle',
      finding: `Limited ankle dorsiflexion ${dorsiflexionMin.toFixed(0)} deg`,
      severity: 'moderate',
      drill_id: 'wall_ankle_mob',
    })
  }

  if (geometry.thoracic_extension_deg < 30) {
    score -= 12
    weakLinks.push({
      region: 'thoracic_spine',
      finding: 'Limited thoracic extension',
      severity: 'moderate',
      drill_id: 'foam_roll_t_spine',
    })
  }

  if (geometry.hip_shoulder_asymmetry_deg > 8) {
    score -= 15
    weakLinks.push({
      region: 'core',
      finding: `Hip-shoulder asymmetry ${geometry.hip_shoulder_asymmetry_deg.toFixed(1)} deg`,
      severity: 'moderate',
      drill_id: 'pallof_press',
    })
  }

  if (geometry.squat_depth_ratio < 0.85) {
    score -= 10
    weakLinks.push({
      region: 'squat_pattern',
      finding: 'Cannot reach parallel depth',
      severity: 'mild',
      drill_id: 'goblet_squat_pattern',
    })
  }

  return { score: Math.max(0, score), weakLinks }
}
