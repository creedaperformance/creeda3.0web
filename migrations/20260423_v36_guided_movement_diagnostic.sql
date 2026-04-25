-- CREEDA V36: Guided Movement Diagnostic Coach
-- Additive schema for complaint intake, guided movement screen prescription,
-- local video-analysis orchestration, diagnostic interpretation, and action plans.

BEGIN;

CREATE TABLE IF NOT EXISTS public.diagnostic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'followup_pending'
    CHECK (status IN ('followup_pending', 'test_prescribed', 'recording_pending', 'analysis_pending', 'completed', 'caution_blocked')),
  complaint_text text NOT NULL,
  primary_bucket text NOT NULL CHECK (primary_bucket IN (
    'lower_body_mobility',
    'lower_body_stability',
    'lower_body_pain_with_movement',
    'upper_body_mobility',
    'upper_body_pain_with_movement',
    'balance_and_control',
    'asymmetry',
    'speed_and_explosiveness',
    'fatigue_and_recovery',
    'technique_breakdown',
    'unknown_general'
  )),
  secondary_bucket text CHECK (secondary_bucket IN (
    'lower_body_mobility',
    'lower_body_stability',
    'lower_body_pain_with_movement',
    'upper_body_mobility',
    'upper_body_pain_with_movement',
    'balance_and_control',
    'asymmetry',
    'speed_and_explosiveness',
    'fatigue_and_recovery',
    'technique_breakdown',
    'unknown_general'
  )),
  body_region text NOT NULL DEFAULT 'unknown',
  pain_flag boolean NOT NULL DEFAULT false,
  severity integer CHECK (severity IS NULL OR (severity >= 0 AND severity <= 10)),
  sport_context text,
  user_context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  classification_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_user_created
  ON public.diagnostic_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_bucket
  ON public.diagnostic_sessions(primary_bucket, created_at DESC);

CREATE TABLE IF NOT EXISTS public.diagnostic_followup_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_value jsonb NOT NULL,
  answer_type text NOT NULL CHECK (answer_type IN (
    'open_text',
    'multiple_choice',
    'yes_no',
    'body_side',
    'severity_scale',
    'activity_trigger',
    'duration',
    'sport_context',
    'training_context'
  )),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (session_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_followup_answers_session
  ON public.diagnostic_followup_answers(session_id);

CREATE TABLE IF NOT EXISTS public.prescribed_movement_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  required_view text NOT NULL CHECK (required_view IN ('front', 'side')),
  instruction_version text NOT NULL,
  recording_status text NOT NULL DEFAULT 'pending'
    CHECK (recording_status IN ('pending', 'uploaded', 'analysis_started', 'completed', 'blocked')),
  prescription_reason text,
  safety_notes_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_prescribed_movement_tests_session
  ON public.prescribed_movement_tests(session_id);

CREATE TABLE IF NOT EXISTS public.diagnostic_video_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  media_url text,
  camera_used text NOT NULL DEFAULT 'back',
  device_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  upload_status text NOT NULL DEFAULT 'local_analysis_pending'
    CHECK (upload_status IN ('local_analysis_pending', 'uploaded', 'failed', 'analyzed')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_video_captures_session
  ON public.diagnostic_video_captures(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.diagnostic_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  raw_engine_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  movement_scores_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  asymmetry_scores_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  flags_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(4,3) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_analysis_results_session_created
  ON public.diagnostic_analysis_results(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.diagnostic_interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  likely_contributors_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitations_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  caution_flags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_next_steps_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (session_id)
);

CREATE TABLE IF NOT EXISTS public.diagnostic_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  drills_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  load_modification_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  recovery_guidance_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_guidance_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  plan_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_after_days integer NOT NULL DEFAULT 14 CHECK (review_after_days BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (session_id)
);

CREATE OR REPLACE FUNCTION public.set_diagnostic_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS diagnostic_sessions_set_updated_at ON public.diagnostic_sessions;
CREATE TRIGGER diagnostic_sessions_set_updated_at
BEFORE UPDATE ON public.diagnostic_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_diagnostic_updated_at();

DROP TRIGGER IF EXISTS diagnostic_followup_answers_set_updated_at ON public.diagnostic_followup_answers;
CREATE TRIGGER diagnostic_followup_answers_set_updated_at
BEFORE UPDATE ON public.diagnostic_followup_answers
FOR EACH ROW EXECUTE FUNCTION public.set_diagnostic_updated_at();

DROP TRIGGER IF EXISTS prescribed_movement_tests_set_updated_at ON public.prescribed_movement_tests;
CREATE TRIGGER prescribed_movement_tests_set_updated_at
BEFORE UPDATE ON public.prescribed_movement_tests
FOR EACH ROW EXECUTE FUNCTION public.set_diagnostic_updated_at();

DROP TRIGGER IF EXISTS diagnostic_video_captures_set_updated_at ON public.diagnostic_video_captures;
CREATE TRIGGER diagnostic_video_captures_set_updated_at
BEFORE UPDATE ON public.diagnostic_video_captures
FOR EACH ROW EXECUTE FUNCTION public.set_diagnostic_updated_at();

DROP TRIGGER IF EXISTS diagnostic_interpretations_set_updated_at ON public.diagnostic_interpretations;
CREATE TRIGGER diagnostic_interpretations_set_updated_at
BEFORE UPDATE ON public.diagnostic_interpretations
FOR EACH ROW EXECUTE FUNCTION public.set_diagnostic_updated_at();

DROP TRIGGER IF EXISTS diagnostic_action_plans_set_updated_at ON public.diagnostic_action_plans;
CREATE TRIGGER diagnostic_action_plans_set_updated_at
BEFORE UPDATE ON public.diagnostic_action_plans
FOR EACH ROW EXECUTE FUNCTION public.set_diagnostic_updated_at();

ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_followup_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescribed_movement_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_video_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_action_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS diagnostic_sessions_owner_select ON public.diagnostic_sessions;
CREATE POLICY diagnostic_sessions_owner_select ON public.diagnostic_sessions
FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS diagnostic_sessions_owner_insert ON public.diagnostic_sessions;
CREATE POLICY diagnostic_sessions_owner_insert ON public.diagnostic_sessions
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS diagnostic_sessions_owner_update ON public.diagnostic_sessions;
CREATE POLICY diagnostic_sessions_owner_update ON public.diagnostic_sessions
FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS diagnostic_followups_owner_all ON public.diagnostic_followup_answers;
CREATE POLICY diagnostic_followups_owner_all ON public.diagnostic_followup_answers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_followup_answers.session_id
      AND s.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_followup_answers.session_id
      AND s.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS prescribed_movement_tests_owner_all ON public.prescribed_movement_tests;
CREATE POLICY prescribed_movement_tests_owner_all ON public.prescribed_movement_tests
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = prescribed_movement_tests.session_id
      AND s.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = prescribed_movement_tests.session_id
      AND s.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS diagnostic_video_captures_owner_all ON public.diagnostic_video_captures;
CREATE POLICY diagnostic_video_captures_owner_all ON public.diagnostic_video_captures
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_video_captures.session_id
      AND s.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_video_captures.session_id
      AND s.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS diagnostic_analysis_results_owner_all ON public.diagnostic_analysis_results;
CREATE POLICY diagnostic_analysis_results_owner_all ON public.diagnostic_analysis_results
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_analysis_results.session_id
      AND s.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_analysis_results.session_id
      AND s.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS diagnostic_interpretations_owner_all ON public.diagnostic_interpretations;
CREATE POLICY diagnostic_interpretations_owner_all ON public.diagnostic_interpretations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_interpretations.session_id
      AND s.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_interpretations.session_id
      AND s.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS diagnostic_action_plans_owner_all ON public.diagnostic_action_plans;
CREATE POLICY diagnostic_action_plans_owner_all ON public.diagnostic_action_plans
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_action_plans.session_id
      AND s.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.id = diagnostic_action_plans.session_id
      AND s.user_id = (select auth.uid())
  )
);

GRANT SELECT, INSERT, UPDATE
  ON public.diagnostic_sessions,
     public.diagnostic_followup_answers,
     public.prescribed_movement_tests,
     public.diagnostic_video_captures,
     public.diagnostic_analysis_results,
     public.diagnostic_interpretations,
     public.diagnostic_action_plans
  TO authenticated;

GRANT ALL
  ON public.diagnostic_sessions,
     public.diagnostic_followup_answers,
     public.prescribed_movement_tests,
     public.diagnostic_video_captures,
     public.diagnostic_analysis_results,
     public.diagnostic_interpretations,
     public.diagnostic_action_plans
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
