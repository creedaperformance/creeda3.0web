-- Onboarding v2 core data model.
-- Medical-screening answers are stored only in owner-locked tables and are not
-- copied into analytics events.

CREATE TABLE IF NOT EXISTS public.medical_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  q1_heart_condition BOOLEAN NOT NULL,
  q2_chest_pain_activity BOOLEAN NOT NULL,
  q3_chest_pain_rest BOOLEAN NOT NULL,
  q4_dizziness_loc BOOLEAN NOT NULL,
  q5_bone_joint_problem BOOLEAN NOT NULL,
  q6_bp_heart_meds BOOLEAN NOT NULL,
  q7_other_reason BOOLEAN NOT NULL,
  q7_other_reason_text TEXT,
  pregnancy_status TEXT NOT NULL DEFAULT 'not_applicable',
  cycle_tracking_optin BOOLEAN NOT NULL DEFAULT FALSE,
  any_yes BOOLEAN GENERATED ALWAYS AS (
    q1_heart_condition OR q2_chest_pain_activity OR q3_chest_pain_rest
    OR q4_dizziness_loc OR q5_bone_joint_problem OR q6_bp_heart_meds OR q7_other_reason
  ) STORED,
  modified_mode_active BOOLEAN GENERATED ALWAYS AS (
    q1_heart_condition OR q2_chest_pain_activity OR q3_chest_pain_rest
    OR q4_dizziness_loc OR q5_bone_joint_problem OR q6_bp_heart_meds OR q7_other_reason
  ) STORED,
  medical_clearance_provided BOOLEAN NOT NULL DEFAULT FALSE,
  medical_clearance_date DATE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_screening_per_user UNIQUE (user_id),
  CONSTRAINT medical_screenings_pregnancy_status_check CHECK (
    pregnancy_status IN ('not_applicable', 'pregnant', 'trying_to_conceive', 'postpartum', 'no')
  )
);

CREATE TABLE IF NOT EXISTS public.orthopedic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body_region TEXT NOT NULL,
  severity TEXT NOT NULL,
  occurred_at_estimate DATE NOT NULL,
  currently_symptomatic BOOLEAN NOT NULL DEFAULT FALSE,
  current_pain_score INT,
  has_seen_clinician BOOLEAN NOT NULL DEFAULT FALSE,
  clinician_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orthopedic_history_body_region_check CHECK (body_region IN (
    'neck', 'left_shoulder', 'right_shoulder', 'upper_back', 'lower_back',
    'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist',
    'left_hip', 'right_hip', 'groin', 'left_hamstring', 'right_hamstring',
    'left_quad', 'right_quad', 'left_calf', 'right_calf',
    'left_knee_acl', 'left_knee_mcl', 'left_knee_lcl', 'left_knee_meniscus', 'left_knee_other',
    'right_knee_acl', 'right_knee_mcl', 'right_knee_lcl', 'right_knee_meniscus', 'right_knee_other',
    'left_ankle', 'right_ankle', 'left_foot', 'right_foot', 'plantar_fascia'
  )),
  CONSTRAINT orthopedic_history_severity_check CHECK (
    severity IN ('annoying', 'limited_1_2_weeks', 'limited_1_2_months', 'surgery_required')
  ),
  CONSTRAINT orthopedic_history_current_pain_score_check CHECK (
    current_pain_score IS NULL OR current_pain_score BETWEEN 0 AND 10
  ),
  CONSTRAINT orthopedic_history_clinician_type_check CHECK (
    clinician_type IS NULL OR clinician_type IN ('physio', 'orthopedist', 'sports_doctor', 'gp', 'other', 'none')
  )
);

CREATE TABLE IF NOT EXISTS public.training_load_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  date DATE NOT NULL,
  sessions_count INT NOT NULL DEFAULT 0,
  total_duration_minutes INT NOT NULL DEFAULT 0,
  average_rpe NUMERIC(3,1),
  session_load_au NUMERIC(8,2) GENERATED ALWAYS AS (total_duration_minutes * COALESCE(average_rpe, 0)) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_load_history_source_check CHECK (
    source IN ('onboarding_self_report', 'session_log', 'wearable_sync', 'coach_assigned')
  ),
  CONSTRAINT training_load_history_sessions_count_check CHECK (sessions_count >= 0),
  CONSTRAINT training_load_history_duration_check CHECK (total_duration_minutes >= 0),
  CONSTRAINT training_load_history_average_rpe_check CHECK (average_rpe IS NULL OR average_rpe BETWEEN 0 AND 10)
);

CREATE TABLE IF NOT EXISTS public.capacity_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  test_method TEXT NOT NULL,
  raw_value NUMERIC(10,3),
  unit TEXT,
  derived_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score INT,
  rejection_reason TEXT,
  mediapipe_landmarks JSONB,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT capacity_tests_test_type_check CHECK (test_type IN (
    'resting_hr', 'cooper_run_12min', 'step_test_3min', 'run_1km', 'run_5km', 'run_10km',
    'sprint_100m', 'vertical_jump', 'broad_jump', 'rsi_drop_jump',
    'squat_1rm', 'deadlift_1rm', 'bench_1rm', 'ohp_1rm', 'pullup_amrap',
    'rsa_6x30m', 'farmers_carry', 'plank_hold',
    'fms_aslr_left', 'fms_aslr_right', 'fms_shoulder_left', 'fms_shoulder_right',
    'fms_trunk_pushup', 'fms_single_leg_squat_left', 'fms_single_leg_squat_right',
    'fms_inline_lunge_left', 'fms_inline_lunge_right',
    'overhead_squat_baseline', 'hrv_ppg'
  )),
  CONSTRAINT capacity_tests_test_method_check CHECK (
    test_method IN ('self_reported', 'in_app_camera', 'in_app_gps', 'in_app_accel', 'in_app_ppg', 'wearable')
  ),
  CONSTRAINT capacity_tests_quality_score_check CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS public.nutrition_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  diet_pattern TEXT NOT NULL,
  protein_portions_per_day NUMERIC(3,1),
  estimated_protein_grams NUMERIC(5,1),
  water_cups_per_day INT,
  caffeine_mg_per_day INT,
  pre_workout_pattern TEXT,
  allergies TEXT[],
  supplements TEXT[],
  last_blood_panel_date DATE,
  known_deficiencies TEXT[],
  red_s_risk_score INT,
  protein_adequacy_ratio NUMERIC(3,2),
  hydration_adequacy_ratio NUMERIC(3,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_nutrition_per_user UNIQUE (user_id),
  CONSTRAINT nutrition_profile_diet_pattern_check CHECK (
    diet_pattern IN ('vegetarian', 'eggetarian', 'pescatarian', 'omnivore', 'vegan', 'jain')
  ),
  CONSTRAINT nutrition_profile_pre_workout_pattern_check CHECK (
    pre_workout_pattern IS NULL OR pre_workout_pattern IN ('carb_heavy', 'mixed', 'minimal', 'fasted')
  ),
  CONSTRAINT nutrition_profile_red_s_risk_score_check CHECK (
    red_s_risk_score IS NULL OR red_s_risk_score BETWEEN 0 AND 100
  )
);

CREATE TABLE IF NOT EXISTS public.psychological_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL,
  responses JSONB NOT NULL,
  total_score INT,
  subscale_scores JSONB,
  flag_level TEXT,
  recommendation_shown TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT psychological_assessments_type_check CHECK (
    assessment_type IN ('apsq_10', 'sleep_baseline', 'life_stress')
  ),
  CONSTRAINT psychological_assessments_flag_level_check CHECK (
    flag_level IS NULL OR flag_level IN ('green', 'amber', 'red')
  )
);

CREATE TABLE IF NOT EXISTS public.environmental_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  primary_training_city TEXT NOT NULL,
  primary_training_lat NUMERIC(9,6),
  primary_training_lng NUMERIC(9,6),
  altitude_meters INT,
  indoor_outdoor_split_pct INT,
  sleep_environment TEXT,
  commute_minutes INT,
  commute_mode TEXT,
  travel_frequency TEXT,
  current_high_stress_phase BOOLEAN NOT NULL DEFAULT FALSE,
  high_stress_reason TEXT,
  high_stress_until DATE,
  caregiving_responsibilities BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_env_per_user UNIQUE (user_id),
  CONSTRAINT environmental_context_indoor_outdoor_split_check CHECK (
    indoor_outdoor_split_pct IS NULL OR indoor_outdoor_split_pct BETWEEN 0 AND 100
  ),
  CONSTRAINT environmental_context_sleep_environment_check CHECK (
    sleep_environment IS NULL OR sleep_environment IN ('ac', 'fan_only', 'open_windows', 'shared_room')
  ),
  CONSTRAINT environmental_context_travel_frequency_check CHECK (
    travel_frequency IS NULL OR travel_frequency IN ('rarely', 'monthly', 'biweekly', 'weekly')
  )
);

CREATE TABLE IF NOT EXISTS public.movement_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL,
  full_body_coverage_pct NUMERIC(5,2),
  motion_evidence_score NUMERIC(5,2),
  passed_quality_gate BOOLEAN NOT NULL,
  rejection_reason TEXT,
  knee_valgus_deg_left NUMERIC(5,2),
  knee_valgus_deg_right NUMERIC(5,2),
  ankle_dorsiflexion_deg_left NUMERIC(5,2),
  ankle_dorsiflexion_deg_right NUMERIC(5,2),
  thoracic_extension_deg NUMERIC(5,2),
  hip_shoulder_asymmetry_deg NUMERIC(5,2),
  squat_depth_ratio NUMERIC(4,2),
  movement_quality_score INT,
  weak_links JSONB,
  raw_landmarks_url TEXT,
  device_meta JSONB,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT movement_baselines_quality_score_check CHECK (
    movement_quality_score IS NULL OR movement_quality_score BETWEEN 0 AND 100
  )
);

CREATE TABLE IF NOT EXISTS public.readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INT NOT NULL,
  confidence_tier TEXT NOT NULL,
  confidence_pct INT NOT NULL,
  data_points_count INT NOT NULL,
  drivers JSONB NOT NULL,
  missing_inputs TEXT[],
  directive TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_readiness_per_day UNIQUE (user_id, date),
  CONSTRAINT readiness_scores_score_check CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT readiness_scores_confidence_tier_check CHECK (
    confidence_tier IN ('low', 'medium', 'high', 'locked')
  ),
  CONSTRAINT readiness_scores_confidence_pct_check CHECK (confidence_pct BETWEEN 0 AND 100),
  CONSTRAINT readiness_scores_data_points_count_check CHECK (data_points_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  energy INT NOT NULL,
  body_feel INT NOT NULL,
  mental_load INT NOT NULL,
  sleep_hours_self NUMERIC(3,1),
  sleep_quality_self INT,
  pain_locations TEXT[],
  pain_scores JSONB,
  completion_seconds INT,
  source TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_checkin_per_day UNIQUE (user_id, date),
  CONSTRAINT daily_check_ins_energy_check CHECK (energy BETWEEN 1 AND 5),
  CONSTRAINT daily_check_ins_body_feel_check CHECK (body_feel BETWEEN 1 AND 5),
  CONSTRAINT daily_check_ins_mental_load_check CHECK (mental_load BETWEEN 1 AND 5),
  CONSTRAINT daily_check_ins_sleep_quality_check CHECK (
    sleep_quality_self IS NULL OR sleep_quality_self BETWEEN 1 AND 10
  ),
  CONSTRAINT daily_check_ins_source_check CHECK (source IS NULL OR source IN ('mobile', 'web'))
);

CREATE TABLE IF NOT EXISTS public.onboarding_v2_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  persona TEXT,
  phase INT NOT NULL,
  screen TEXT NOT NULL,
  event_name TEXT NOT NULL,
  source TEXT NOT NULL,
  completion_seconds INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT onboarding_v2_events_persona_check CHECK (
    persona IS NULL OR persona IN ('athlete', 'individual', 'coach')
  ),
  CONSTRAINT onboarding_v2_events_phase_check CHECK (phase BETWEEN 0 AND 3),
  CONSTRAINT onboarding_v2_events_name_check CHECK (
    event_name IN ('onb.screen.viewed', 'onb.screen.completed', 'onb.screen.abandoned', 'onb.field.error')
  ),
  CONSTRAINT onboarding_v2_events_source_check CHECK (source IN ('web', 'mobile')),
  CONSTRAINT onboarding_v2_events_completion_seconds_check CHECK (
    completion_seconds IS NULL OR completion_seconds BETWEEN 0 AND 900
  )
);

CREATE INDEX IF NOT EXISTS idx_ortho_user ON public.orthopedic_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ortho_active ON public.orthopedic_history(user_id) WHERE currently_symptomatic = TRUE;
CREATE INDEX IF NOT EXISTS idx_load_user_date ON public.training_load_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_load_user_28d ON public.training_load_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_capacity_user_type_date ON public.capacity_tests(user_id, test_type, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_psych_user_date ON public.psychological_assessments(user_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_movement_user_date ON public.movement_baselines(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_user_date ON public.readiness_scores(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_user_date ON public.daily_check_ins(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_events_user_date ON public.onboarding_v2_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_events_screen ON public.onboarding_v2_events(screen, event_name, created_at DESC);

ALTER TABLE public.medical_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orthopedic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_load_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychological_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environmental_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_v2_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medical_screenings_owner ON public.medical_screenings;
CREATE POLICY medical_screenings_owner ON public.medical_screenings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS orthopedic_history_owner ON public.orthopedic_history;
CREATE POLICY orthopedic_history_owner ON public.orthopedic_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS training_load_history_owner ON public.training_load_history;
CREATE POLICY training_load_history_owner ON public.training_load_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS capacity_tests_owner ON public.capacity_tests;
CREATE POLICY capacity_tests_owner ON public.capacity_tests
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nutrition_profile_owner ON public.nutrition_profile;
CREATE POLICY nutrition_profile_owner ON public.nutrition_profile
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS psychological_assessments_owner ON public.psychological_assessments;
CREATE POLICY psychological_assessments_owner ON public.psychological_assessments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS environmental_context_owner ON public.environmental_context;
CREATE POLICY environmental_context_owner ON public.environmental_context
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS movement_baselines_owner ON public.movement_baselines;
CREATE POLICY movement_baselines_owner ON public.movement_baselines
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS readiness_scores_owner ON public.readiness_scores;
CREATE POLICY readiness_scores_owner ON public.readiness_scores
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_check_ins_owner ON public.daily_check_ins;
CREATE POLICY daily_check_ins_owner ON public.daily_check_ins
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS onboarding_v2_events_owner ON public.onboarding_v2_events;
CREATE POLICY onboarding_v2_events_owner ON public.onboarding_v2_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.medical_screenings,
  public.orthopedic_history,
  public.training_load_history,
  public.capacity_tests,
  public.nutrition_profile,
  public.psychological_assessments,
  public.environmental_context,
  public.movement_baselines,
  public.readiness_scores,
  public.daily_check_ins,
  public.onboarding_v2_events
TO authenticated;

GRANT ALL ON
  public.medical_screenings,
  public.orthopedic_history,
  public.training_load_history,
  public.capacity_tests,
  public.nutrition_profile,
  public.psychological_assessments,
  public.environmental_context,
  public.movement_baselines,
  public.readiness_scores,
  public.daily_check_ins,
  public.onboarding_v2_events
TO service_role;
