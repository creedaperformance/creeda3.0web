import { scoreOverheadSquat } from '../movement-quality'

describe('scoreOverheadSquat', () => {
  it('returns weak links for obvious squat limitations', () => {
    const result = scoreOverheadSquat({
      knee_valgus_deg_left: 14,
      knee_valgus_deg_right: 4,
      ankle_dorsiflexion_deg_left: 20,
      ankle_dorsiflexion_deg_right: 30,
      thoracic_extension_deg: 24,
      hip_shoulder_asymmetry_deg: 10,
      squat_depth_ratio: 0.7,
    })

    expect(result.score).toBe(23)
    expect(result.weakLinks.map((link) => link.region)).toEqual([
      'knee',
      'ankle',
      'thoracic_spine',
      'core',
      'squat_pattern',
    ])
  })
})
