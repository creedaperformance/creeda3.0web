import { z } from 'zod'
import { EnvironmentalContextSchema } from './environmental'
import { SquadSetupSchema } from './coach'
import { IdentitySchema } from './identity'
import { ParqPlusSchema } from './medical-screening'
import { NutritionProfileSchema } from './nutrition'
import { OrthopedicHistoryEntrySchema } from './orthopedic'
import { PersonaSchema, PersonaSourceSchema } from './persona'
import { Apsq10Schema } from './psychological'
import { TrainingLoadSnapshotSchema } from './training-load'

export const OnboardingV2EventNameSchema = z.enum([
  'onb.screen.viewed',
  'onb.screen.completed',
  'onb.screen.abandoned',
  'onb.field.error',
])

export const OnboardingV2EventSchema = z.object({
  event_name: OnboardingV2EventNameSchema,
  persona: PersonaSchema.optional(),
  phase: z.number().int().min(0).max(3),
  screen: z.string().trim().min(1).max(80),
  source: PersonaSourceSchema,
  completion_seconds: z.number().int().min(0).max(900).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const OnboardingV2SafetyGateSubmissionSchema = z.object({
  persona: PersonaSchema,
  source: PersonaSourceSchema,
  parq: ParqPlusSchema,
  completion_seconds: z.number().int().min(0).max(900),
})

export const OnboardingV2SportSpecificitySchema = z.object({
  primary_sport: z.string().trim().min(2).max(60),
  position: z.string().trim().max(60).optional(),
  level: z
    .enum(['starter', 'recreational', 'competitive', 'academy', 'elite'])
    .default('recreational'),
})

export const OnboardingV2GoalAnchorSchema = z.object({
  primary_goal: z.enum([
    'general_fitness',
    'sport_performance',
    'strength_gain',
    'fat_loss',
    'return_to_play',
    'event_prep',
    'movement_quality',
  ]),
  goal_detail: z.string().trim().max(180).optional(),
  target_event_name: z.string().trim().max(80).optional(),
  target_event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const WearableProviderSchema = z.enum([
  'apple_health',
  'android_health_connect',
  'fitbit',
  'garmin',
  'none',
])

export const OnboardingV2WearablePreferenceSchema = z.object({
  preference: z.enum(['connect_now', 'later']),
  provider: WearableProviderSchema.default('none'),
})

export const OverheadSquatGeometrySchema = z.object({
  knee_valgus_deg_left: z.number().min(0).max(60),
  knee_valgus_deg_right: z.number().min(0).max(60),
  ankle_dorsiflexion_deg_left: z.number().min(0).max(90),
  ankle_dorsiflexion_deg_right: z.number().min(0).max(90),
  thoracic_extension_deg: z.number().min(0).max(90),
  hip_shoulder_asymmetry_deg: z.number().min(0).max(60),
  squat_depth_ratio: z.number().min(0).max(1.5),
})

export const MovementWeakLinkSchema = z.object({
  region: z.string().trim().min(1).max(80),
  finding: z.string().trim().min(1).max(180),
  severity: z.enum(['mild', 'moderate', 'severe']),
  drill_id: z.string().trim().min(1).max(80),
})

export const OnboardingV2MovementBaselineSubmissionSchema = z.object({
  persona: z.enum(['athlete', 'individual']),
  source: PersonaSourceSchema,
  report_id: z.string().trim().min(1).max(120),
  sport_id: z.string().trim().min(1).max(80),
  scan_type: z.literal('overhead_squat_baseline').default('overhead_squat_baseline'),
  geometry: OverheadSquatGeometrySchema,
  movement_quality_score: z.number().int().min(0).max(100),
  weak_links: z.array(MovementWeakLinkSchema).max(12).default([]),
  full_body_coverage_pct: z.number().min(0).max(100),
  motion_evidence_score: z.number().min(0).max(100),
  passed_quality_gate: z.boolean(),
  rejection_reason: z.string().trim().max(240).optional(),
  device_meta: z.record(z.string(), z.unknown()).default({}),
  completion_seconds: z.number().int().min(0).max(900).optional(),
})

export const OnboardingV2Phase2DaySchema = z.enum([
  'day1_aerobic',
  'day2_strength_power',
  'day3_movement_quality',
  'day4_anaerobic_recovery',
  'day5_nutrition',
  'day6_psych_sleep',
  'day7_environment',
])

const Phase2BaseSchema = z.object({
  phase: z.literal(2).default(2),
  persona: z.enum(['athlete', 'individual']),
  source: PersonaSourceSchema,
  completion_seconds: z.number().int().min(0).max(900).optional(),
})

const OptionalSecondsSchema = z.number().int().min(1).max(21600).optional()
const OptionalPositiveNumberSchema = z.number().min(0).max(10000).optional()
const OptionalOneToFiveSchema = z.number().int().min(1).max(5).optional()

export const OnboardingV2Phase2Day1AerobicSchema = Phase2BaseSchema.extend({
  day: z.literal('day1_aerobic'),
  resting_hr_bpm: z.number().int().min(30).max(130).optional(),
  cooper_distance_meters: z.number().int().min(400).max(5000).optional(),
  run_1km_seconds: OptionalSecondsSchema,
  run_5km_seconds: OptionalSecondsSchema,
  run_10km_seconds: OptionalSecondsSchema,
  walk_1km_seconds: OptionalSecondsSchema,
  stairs_flights_completed: z.number().int().min(0).max(150).optional(),
  perceived_exertion_1_to_10: z.number().int().min(1).max(10).optional(),
})

export const OnboardingV2Phase2Day2StrengthPowerSchema = Phase2BaseSchema.extend({
  day: z.literal('day2_strength_power'),
  squat_1rm_kg: OptionalPositiveNumberSchema,
  deadlift_1rm_kg: OptionalPositiveNumberSchema,
  bench_1rm_kg: OptionalPositiveNumberSchema,
  ohp_1rm_kg: OptionalPositiveNumberSchema,
  vertical_jump_cm: z.number().min(0).max(150).optional(),
  broad_jump_cm: z.number().min(0).max(400).optional(),
  pushups_60s: z.number().int().min(0).max(200).optional(),
  plank_hold_seconds: z.number().int().min(0).max(1800).optional(),
  strength_training_past_year: z.boolean().optional(),
})

const FmsScoreSchema = z.number().int().min(0).max(3)

export const OnboardingV2Phase2Day3MovementQualitySchema = Phase2BaseSchema.extend({
  day: z.literal('day3_movement_quality'),
  fms: z
    .object({
      aslr_left: FmsScoreSchema.optional(),
      aslr_right: FmsScoreSchema.optional(),
      shoulder_left: FmsScoreSchema.optional(),
      shoulder_right: FmsScoreSchema.optional(),
      trunk_pushup: FmsScoreSchema.optional(),
      single_leg_squat_left: FmsScoreSchema.optional(),
      single_leg_squat_right: FmsScoreSchema.optional(),
      inline_lunge_left: FmsScoreSchema.optional(),
      inline_lunge_right: FmsScoreSchema.optional(),
    })
    .default({}),
  self_reported_pain_0_to_10: z.number().int().min(0).max(10).optional(),
  camera_baseline_completed: z.boolean().default(false),
  notes: z.string().trim().max(240).optional(),
})

export const OnboardingV2Phase2Day4AnaerobicRecoverySchema = Phase2BaseSchema.extend({
  day: z.literal('day4_anaerobic_recovery'),
  sprint_100m_seconds: z.number().min(8).max(90).optional(),
  rsa_6x30m_best_seconds: z.number().min(3).max(30).optional(),
  rsa_6x30m_average_seconds: z.number().min(3).max(45).optional(),
  recovery_hr_drop_bpm_60s: z.number().int().min(0).max(120).optional(),
  hrv_ppg_ms: z.number().min(0).max(300).optional(),
  recovery_rating_1_to_5: OptionalOneToFiveSchema,
})

export const OnboardingV2Phase2Day5NutritionSchema = Phase2BaseSchema.extend({
  day: z.literal('day5_nutrition'),
  nutrition: NutritionProfileSchema,
  body_mass_kg: z.number().min(30).max(250).optional(),
  training_hours_per_week: z.number().min(0).max(45),
  target_protein_g_per_kg: z.number().min(0.8).max(2.6).default(1.6),
  recent_weight_loss_pct: z.number().min(0).max(30).optional(),
  missed_periods_last_90_days: z.number().int().min(0).max(6).optional(),
  fatigue_score_1_to_5: OptionalOneToFiveSchema,
})

export const OnboardingV2Phase2Day6PsychSleepSchema = Phase2BaseSchema.extend({
  day: z.literal('day6_psych_sleep'),
  apsq10: Apsq10Schema.optional(),
  sleep_baseline: z
    .object({
      avg_sleep_hours: z.number().min(0).max(14),
      sleep_quality_1_to_5: OptionalOneToFiveSchema,
      wakeups_per_night: z.number().int().min(0).max(20).optional(),
      bedtime_consistency_1_to_5: OptionalOneToFiveSchema,
      screen_before_bed_minutes: z.number().int().min(0).max(600).optional(),
    })
    .optional(),
  life_stress_1_to_5: OptionalOneToFiveSchema,
})

export const OnboardingV2Phase2Day7EnvironmentSchema = Phase2BaseSchema.extend({
  day: z.literal('day7_environment'),
  environment: EnvironmentalContextSchema,
  heat_index_c: z.number().min(-20).max(60).optional(),
  aqi: z.number().int().min(0).max(500).optional(),
  training_surface: z
    .enum(['grass', 'turf', 'track', 'road', 'gym_floor', 'mixed'])
    .optional(),
  heat_acclimated: z.boolean().optional(),
})

export const OnboardingV2Phase2SubmissionSchema = z
  .discriminatedUnion('day', [
    OnboardingV2Phase2Day1AerobicSchema,
    OnboardingV2Phase2Day2StrengthPowerSchema,
    OnboardingV2Phase2Day3MovementQualitySchema,
    OnboardingV2Phase2Day4AnaerobicRecoverySchema,
    OnboardingV2Phase2Day5NutritionSchema,
    OnboardingV2Phase2Day6PsychSleepSchema,
    OnboardingV2Phase2Day7EnvironmentSchema,
  ])
  .superRefine((payload, context) => {
    if (payload.day === 'day1_aerobic') {
      const hasMetric = Boolean(
        payload.resting_hr_bpm ||
          payload.cooper_distance_meters ||
          payload.run_1km_seconds ||
          payload.run_5km_seconds ||
          payload.run_10km_seconds ||
          payload.walk_1km_seconds ||
          payload.stairs_flights_completed
      )
      if (!hasMetric) {
        context.addIssue({
          code: 'custom',
          message: 'Add at least one aerobic or resting heart-rate measure.',
        })
      }
    }

    if (payload.day === 'day2_strength_power') {
      const hasMetric = Boolean(
        payload.squat_1rm_kg ||
          payload.deadlift_1rm_kg ||
          payload.bench_1rm_kg ||
          payload.ohp_1rm_kg ||
          payload.vertical_jump_cm ||
          payload.broad_jump_cm ||
          payload.pushups_60s ||
          payload.plank_hold_seconds
      )
      if (!hasMetric) {
        context.addIssue({
          code: 'custom',
          message: 'Add at least one strength or power measure.',
        })
      }
    }

    if (payload.day === 'day3_movement_quality') {
      const hasFms = Object.values(payload.fms).some((value) => value !== undefined)
      if (!hasFms && payload.self_reported_pain_0_to_10 === undefined && !payload.camera_baseline_completed) {
        context.addIssue({
          code: 'custom',
          message: 'Add an FMS score, pain score, or completed camera baseline.',
        })
      }
    }

    if (payload.day === 'day4_anaerobic_recovery') {
      const hasMetric = Boolean(
        payload.sprint_100m_seconds ||
          payload.rsa_6x30m_best_seconds ||
          payload.rsa_6x30m_average_seconds ||
          payload.recovery_hr_drop_bpm_60s ||
          payload.hrv_ppg_ms ||
          payload.recovery_rating_1_to_5
      )
      if (!hasMetric) {
        context.addIssue({
          code: 'custom',
          message: 'Add at least one anaerobic or recovery measure.',
        })
      }
    }

    if (payload.day === 'day6_psych_sleep' && !payload.apsq10 && !payload.sleep_baseline) {
      context.addIssue({
        code: 'custom',
        message: 'Add APSQ-10 responses or a sleep baseline.',
      })
    }
  })

export const OnboardingV2DailyRitualSubmissionSchema = z.object({
  phase: z.literal(3).default(3),
  persona: z.enum(['athlete', 'individual']),
  source: PersonaSourceSchema,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  energy: z.number().int().min(1).max(5),
  body_feel: z.number().int().min(1).max(5),
  mental_load: z.number().int().min(1).max(5),
  sleep_hours_self: z.number().min(0).max(16).optional(),
  sleep_quality_self: z.number().int().min(1).max(10).optional(),
  pain_locations: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  pain_scores: z.record(z.string(), z.number().int().min(0).max(10)).default({}),
  apsq3: z.array(z.number().int().min(0).max(4)).length(3).optional(),
  wants_recovery_day: z.boolean().default(false),
  completion_seconds: z.number().int().min(0).max(180).optional(),
})

export const OnboardingV2Phase1SubmissionSchema = z
  .object({
    phase: z.literal(1).default(1),
    persona: PersonaSchema,
    source: PersonaSourceSchema,
    identity: IdentitySchema,
    sport: OnboardingV2SportSpecificitySchema,
    goal: OnboardingV2GoalAnchorSchema,
    training_load: TrainingLoadSnapshotSchema.optional(),
    orthopedic_history: z.array(OrthopedicHistoryEntrySchema).max(5).default([]),
    wearable: OnboardingV2WearablePreferenceSchema,
    squad: SquadSetupSchema.optional(),
    completion_seconds: z.number().int().min(0).max(900),
  })
  .superRefine((payload, context) => {
    if (payload.persona !== 'coach' && !payload.training_load) {
      context.addIssue({
        code: 'custom',
        path: ['training_load'],
        message: 'Training load snapshot is required for athlete and individual onboarding.',
      })
    }

    if (payload.persona === 'coach' && !payload.squad) {
      context.addIssue({
        code: 'custom',
        path: ['squad'],
        message: 'Coach squad setup is required for coach onboarding.',
      })
    }
  })

export type OnboardingV2Event = z.infer<typeof OnboardingV2EventSchema>
export type OnboardingV2SafetyGateSubmission = z.infer<
  typeof OnboardingV2SafetyGateSubmissionSchema
>
export type OnboardingV2Phase1Submission = z.infer<
  typeof OnboardingV2Phase1SubmissionSchema
>
export type OnboardingV2MovementBaselineSubmission = z.infer<
  typeof OnboardingV2MovementBaselineSubmissionSchema
>
export type OnboardingV2Phase2Day = z.infer<typeof OnboardingV2Phase2DaySchema>
export type OnboardingV2Phase2Submission = z.infer<typeof OnboardingV2Phase2SubmissionSchema>
export type OnboardingV2DailyRitualSubmission = z.infer<
  typeof OnboardingV2DailyRitualSubmissionSchema
>
