-- CREEDA V25: Objective testing platform expansion
-- Purpose:
-- 1. Generalize objective tests beyond reaction_tap
-- 2. Support AI-powered pose, recovery, and speed protocols
-- 3. Persist metric-level measurements and personal baselines

BEGIN;

ALTER TABLE public.objective_test_sessions
  DROP CONSTRAINT IF EXISTS objective_test_sessions_test_type_check,
  DROP CONSTRAINT IF EXISTS objective_test_sessions_source_check;

ALTER TABLE public.objective_test_sessions
  ADD COLUMN IF NOT EXISTS family TEXT
    CHECK (family IN ('neural', 'balance', 'recovery', 'power', 'mobility', 'speed', 'agility', 'derived')),
  ADD COLUMN IF NOT EXISTS capture_mode TEXT NOT NULL DEFAULT 'screen_tap'
    CHECK (capture_mode IN (
      'screen_tap',
      'camera_pose_live',
      'camera_pose_upload',
      'guided_timer_hr_optional',
      'camera_timed_distance'
    )),
  ADD COLUMN IF NOT EXISTS sport TEXT,
  ADD COLUMN IF NOT EXISTS capture_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS side_scope TEXT NOT NULL DEFAULT 'none'
    CHECK (side_scope IN ('none', 'left', 'right', 'bilateral', 'battery')),
  ADD COLUMN IF NOT EXISTS dominant_side TEXT
    CHECK (dominant_side IN ('left', 'right')),
  ADD COLUMN IF NOT EXISTS headline_metric_key TEXT,
  ADD COLUMN IF NOT EXISTS headline_metric_value NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS headline_metric_unit TEXT,
  ADD COLUMN IF NOT EXISTS headline_metric_direction TEXT
    CHECK (headline_metric_direction IN ('higher_better', 'lower_better', 'target_band')),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4)
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ADD COLUMN IF NOT EXISTS capture_quality_score NUMERIC(5,4)
    CHECK (capture_quality_score >= 0 AND capture_quality_score <= 1),
  ADD COLUMN IF NOT EXISTS validity_status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (validity_status IN ('accepted', 'low_confidence', 'invalid_saved', 'supplemental')),
  ADD COLUMN IF NOT EXISTS baseline_status TEXT NOT NULL DEFAULT 'building'
    CHECK (baseline_status IN ('building', 'provisional', 'ready', 'stale')),
  ADD COLUMN IF NOT EXISTS baseline_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS safety_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_video_report_id UUID REFERENCES public.video_analysis_reports(id) ON DELETE SET NULL;

ALTER TABLE public.objective_test_sessions
  ADD CONSTRAINT objective_test_sessions_test_type_check
  CHECK (test_type IN (
    'reaction_tap',
    'balance_single_leg',
    'breathing_recovery',
    'jump_landing_control',
    'mobility_battery',
    'sprint_10m',
    'agility_505'
  ));

ALTER TABLE public.objective_test_sessions
  ADD CONSTRAINT objective_test_sessions_source_check
  CHECK (source IN (
    'phone_browser',
    'camera_live',
    'camera_upload',
    'health_sync',
    'hybrid'
  ));

CREATE INDEX IF NOT EXISTS idx_objective_test_sessions_user_family
  ON public.objective_test_sessions(user_id, family, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_objective_test_sessions_user_validity
  ON public.objective_test_sessions(user_id, test_type, validity_status, completed_at DESC);

CREATE TABLE IF NOT EXISTS public.objective_test_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.objective_test_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'individual')),
  test_type TEXT NOT NULL,
  subtest_key TEXT,
  side TEXT CHECK (side IN ('left', 'right', 'bilateral', 'none')),
  metric_key TEXT NOT NULL,
  metric_group TEXT NOT NULL,
  display_label TEXT NOT NULL,
  value NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('higher_better', 'lower_better', 'target_band')),
  is_headline BOOLEAN NOT NULL DEFAULT false,
  quality_weight NUMERIC(5,4) NOT NULL DEFAULT 1
    CHECK (quality_weight >= 0 AND quality_weight <= 1),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_objective_test_measurements_user_metric
  ON public.objective_test_measurements(user_id, test_type, metric_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_objective_test_measurements_session
  ON public.objective_test_measurements(session_id, metric_key);

ALTER TABLE public.objective_test_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_objective_test_measurements_select ON public.objective_test_measurements;
DROP POLICY IF EXISTS creeda_objective_test_measurements_insert ON public.objective_test_measurements;

CREATE POLICY creeda_objective_test_measurements_select
  ON public.objective_test_measurements
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = user_id
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = public.objective_test_measurements.user_id
          AND t.coach_id = (select auth.uid())
          AND tm.status = 'Active'
      )
    )
  );

CREATE POLICY creeda_objective_test_measurements_insert
  ON public.objective_test_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

GRANT ALL ON public.objective_test_measurements TO postgres, service_role, authenticated;

CREATE TABLE IF NOT EXISTS public.objective_test_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'individual')),
  test_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  side TEXT NOT NULL DEFAULT 'none' CHECK (side IN ('left', 'right', 'bilateral', 'none')),
  baseline_method TEXT NOT NULL CHECK (baseline_method IN ('first_3_median', 'rolling_5_median', 'rolling_28d', 'manual_clinician_override')),
  baseline_n INTEGER NOT NULL DEFAULT 0 CHECK (baseline_n >= 0),
  baseline_value NUMERIC(12,4) NOT NULL,
  baseline_unit TEXT NOT NULL,
  min_detectable_change NUMERIC(12,4) NOT NULL,
  ready BOOLEAN NOT NULL DEFAULT false,
  last_session_id UUID REFERENCES public.objective_test_sessions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, test_type, metric_key, side)
);

CREATE INDEX IF NOT EXISTS idx_objective_test_baselines_user_test
  ON public.objective_test_baselines(user_id, test_type, metric_key, side);

ALTER TABLE public.objective_test_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_objective_test_baselines_select ON public.objective_test_baselines;
DROP POLICY IF EXISTS creeda_objective_test_baselines_insert ON public.objective_test_baselines;
DROP POLICY IF EXISTS creeda_objective_test_baselines_update ON public.objective_test_baselines;

CREATE POLICY creeda_objective_test_baselines_select
  ON public.objective_test_baselines
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = user_id
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = public.objective_test_baselines.user_id
          AND t.coach_id = (select auth.uid())
          AND tm.status = 'Active'
      )
    )
  );

CREATE POLICY creeda_objective_test_baselines_insert
  ON public.objective_test_baselines
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_objective_test_baselines_update
  ON public.objective_test_baselines
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

GRANT ALL ON public.objective_test_baselines TO postgres, service_role, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
