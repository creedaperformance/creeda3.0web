import { z } from 'zod'

export const CapacityTestTypeSchema = z.enum([
  'resting_hr',
  'cooper_run_12min',
  'step_test_3min',
  'run_1km',
  'run_5km',
  'run_10km',
  'sprint_100m',
  'vertical_jump',
  'broad_jump',
  'rsi_drop_jump',
  'squat_1rm',
  'deadlift_1rm',
  'bench_1rm',
  'ohp_1rm',
  'pullup_amrap',
  'pushup_amrap',
  'rsa_6x30m',
  'farmers_carry',
  'plank_hold',
  'fms_aslr_left',
  'fms_aslr_right',
  'fms_shoulder_left',
  'fms_shoulder_right',
  'fms_trunk_pushup',
  'fms_single_leg_squat_left',
  'fms_single_leg_squat_right',
  'fms_inline_lunge_left',
  'fms_inline_lunge_right',
  'overhead_squat_baseline',
  'hrv_ppg',
])

export const CapacityTestMethodSchema = z.enum([
  'self_reported',
  'in_app_camera',
  'in_app_gps',
  'in_app_accel',
  'in_app_ppg',
  'wearable',
])

export const CapacityTestSchema = z.object({
  test_type: CapacityTestTypeSchema,
  test_method: CapacityTestMethodSchema,
  raw_value: z.number().optional(),
  unit: z.string().trim().max(24).optional(),
  quality_score: z.number().int().min(0).max(100).optional(),
  rejection_reason: z.string().trim().max(200).optional(),
})

export type CapacityTest = z.infer<typeof CapacityTestSchema>
