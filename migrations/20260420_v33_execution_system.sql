-- CREEDA V33: Exercise execution system foundation
-- Adds the structured exercise library, planned sessions, execution logs,
-- weekly calendar tracking, and coach feedback loop for premium workout execution.

BEGIN;

CREATE OR REPLACE FUNCTION public.creeda_is_coach_of_athlete(p_coach_id uuid, p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.connection_requests
    WHERE coach_id = p_coach_id
      AND athlete_id = p_athlete_id
      AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.creeda_is_coach_of_athlete(uuid, uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.exercise_library (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  family text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('strength', 'mobility', 'conditioning', 'recovery', 'rehab', 'warmup', 'cooldown')),
  subcategory text NOT NULL,
  movement_pattern text NOT NULL,
  training_intent text[] NOT NULL DEFAULT '{}',
  primary_muscles text[] NOT NULL DEFAULT '{}',
  secondary_muscles text[] NOT NULL DEFAULT '{}',
  joints_involved text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  experience_level_suitability text[] NOT NULL DEFAULT '{}',
  equipment_required text[] NOT NULL DEFAULT '{}',
  environment text[] NOT NULL DEFAULT '{}',
  unilateral_or_bilateral text NOT NULL CHECK (unilateral_or_bilateral IN ('unilateral', 'bilateral', 'mixed')),
  impact_level text NOT NULL CHECK (impact_level IN ('low', 'moderate', 'high')),
  intensity_profile text NOT NULL CHECK (intensity_profile IN ('low', 'moderate', 'high', 'variable')),
  estimated_duration_seconds integer,
  default_prescription jsonb NOT NULL DEFAULT '{}'::jsonb,
  coaching_cues text[] NOT NULL DEFAULT '{}',
  instructions text[] NOT NULL DEFAULT '{}',
  common_mistakes text[] NOT NULL DEFAULT '{}',
  regressions text[] NOT NULL DEFAULT '{}',
  progressions text[] NOT NULL DEFAULT '{}',
  substitutions text[] NOT NULL DEFAULT '{}',
  contraindications text[] NOT NULL DEFAULT '{}',
  injury_constraints text[] NOT NULL DEFAULT '{}',
  soreness_constraints text[] NOT NULL DEFAULT '{}',
  fatigue_constraints text[] NOT NULL DEFAULT '{}',
  readiness_suitability text[] NOT NULL DEFAULT '{}',
  goal_tags text[] NOT NULL DEFAULT '{}',
  sport_tags text[] NOT NULL DEFAULT '{}',
  position_tags text[] NOT NULL DEFAULT '{}',
  fitstart_tags text[] NOT NULL DEFAULT '{}',
  recovery_tags text[] NOT NULL DEFAULT '{}',
  rehab_tags text[] NOT NULL DEFAULT '{}',
  movement_quality_tags text[] NOT NULL DEFAULT '{}',
  suitable_blocks text[] NOT NULL DEFAULT '{}',
  media jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON public.exercise_library(category);
CREATE INDEX IF NOT EXISTS idx_exercise_library_sport_tags ON public.exercise_library USING gin(sport_tags);
CREATE INDEX IF NOT EXISTS idx_exercise_library_goal_tags ON public.exercise_library USING gin(goal_tags);
CREATE INDEX IF NOT EXISTS idx_exercise_library_suitable_blocks ON public.exercise_library USING gin(suitable_blocks);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_exercise_library_select ON public.exercise_library;
CREATE POLICY creeda_exercise_library_select
  ON public.exercise_library
  FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE TABLE IF NOT EXISTS public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped')),
  source text NOT NULL DEFAULT 'system',
  mode text NOT NULL CHECK (mode IN ('train_hard', 'train_light', 'recovery', 'rehab')),
  title text NOT NULL,
  sport text,
  position text,
  goal text,
  readiness_score integer,
  expected_duration_minutes integer NOT NULL DEFAULT 0,
  compliance_pct numeric(5,2),
  athlete_notes text,
  plan_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  explainability_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_athlete_date ON public.training_sessions(athlete_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_sessions_coach_date ON public.training_sessions(coach_id, session_date DESC);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_training_sessions_select ON public.training_sessions;
CREATE POLICY creeda_training_sessions_select
  ON public.training_sessions
  FOR SELECT
  USING (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_training_sessions_insert ON public.training_sessions;
CREATE POLICY creeda_training_sessions_insert
  ON public.training_sessions
  FOR INSERT
  WITH CHECK (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_training_sessions_update ON public.training_sessions;
CREATE POLICY creeda_training_sessions_update
  ON public.training_sessions
  FOR UPDATE
  USING (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

CREATE TABLE IF NOT EXISTS public.training_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actual_duration_minutes integer,
  compliance_pct numeric(5,2),
  pain_flags text[] NOT NULL DEFAULT '{}',
  athlete_notes text,
  coach_notes text,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_training_session_logs_session ON public.training_session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_training_session_logs_athlete ON public.training_session_logs(athlete_id, created_at DESC);

ALTER TABLE public.training_session_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_training_session_logs_select ON public.training_session_logs;
CREATE POLICY creeda_training_session_logs_select
  ON public.training_session_logs
  FOR SELECT
  USING (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_training_session_logs_insert ON public.training_session_logs;
CREATE POLICY creeda_training_session_logs_insert
  ON public.training_session_logs
  FOR INSERT
  WITH CHECK (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_training_session_logs_update ON public.training_session_logs;
CREATE POLICY creeda_training_session_logs_update
  ON public.training_session_logs
  FOR UPDATE
  USING (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

CREATE TABLE IF NOT EXISTS public.training_exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  session_log_id uuid NOT NULL REFERENCES public.training_session_logs(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id text NOT NULL,
  exercise_slug text NOT NULL,
  block_type text NOT NULL,
  prescribed_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actual_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion_status text NOT NULL DEFAULT 'completed' CHECK (completion_status IN ('completed', 'partial', 'skipped', 'substituted')),
  note text,
  substitution_exercise_slug text,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_training_exercise_logs_athlete_exercise ON public.training_exercise_logs(athlete_id, exercise_slug, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_exercise_logs_session ON public.training_exercise_logs(session_id, sort_order);

ALTER TABLE public.training_exercise_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_training_exercise_logs_select ON public.training_exercise_logs;
CREATE POLICY creeda_training_exercise_logs_select
  ON public.training_exercise_logs
  FOR SELECT
  USING (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_training_exercise_logs_insert ON public.training_exercise_logs;
CREATE POLICY creeda_training_exercise_logs_insert
  ON public.training_exercise_logs
  FOR INSERT
  WITH CHECK (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_training_exercise_logs_update ON public.training_exercise_logs;
CREATE POLICY creeda_training_exercise_logs_update
  ON public.training_exercise_logs
  FOR UPDATE
  USING (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

CREATE TABLE IF NOT EXISTS public.training_calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'missed')),
  carry_forward boolean NOT NULL DEFAULT false,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (athlete_id, session_date, session_id)
);

CREATE INDEX IF NOT EXISTS idx_training_calendar_entries_athlete_date ON public.training_calendar_entries(athlete_id, session_date DESC);

ALTER TABLE public.training_calendar_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_training_calendar_entries_select ON public.training_calendar_entries;
CREATE POLICY creeda_training_calendar_entries_select
  ON public.training_calendar_entries
  FOR SELECT
  USING (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_training_calendar_entries_insert ON public.training_calendar_entries;
CREATE POLICY creeda_training_calendar_entries_insert
  ON public.training_calendar_entries
  FOR INSERT
  WITH CHECK (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_training_calendar_entries_update ON public.training_calendar_entries;
CREATE POLICY creeda_training_calendar_entries_update
  ON public.training_calendar_entries
  FOR UPDATE
  USING (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

CREATE TABLE IF NOT EXISTS public.coach_session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  session_log_id uuid REFERENCES public.training_session_logs(id) ON DELETE SET NULL,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type text NOT NULL DEFAULT 'completion_review' CHECK (feedback_type IN ('assignment_note', 'completion_review', 'warning', 'encouragement')),
  message text NOT NULL,
  feedback text,
  flagged_issue text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.coach_session_feedback
  ADD COLUMN IF NOT EXISTS feedback_type text NOT NULL DEFAULT 'completion_review',
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS flagged_issue text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';

ALTER TABLE public.coach_session_feedback
  ALTER COLUMN session_id DROP NOT NULL;

UPDATE public.coach_session_feedback
SET message = COALESCE(message, feedback, '')
WHERE message IS NULL;

ALTER TABLE public.coach_session_feedback
  ALTER COLUMN message SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coach_session_feedback_feedback_type_check'
  ) THEN
    ALTER TABLE public.coach_session_feedback
      ADD CONSTRAINT coach_session_feedback_feedback_type_check
      CHECK (feedback_type IN ('assignment_note', 'completion_review', 'warning', 'encouragement'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coach_session_feedback_priority_check'
  ) THEN
    ALTER TABLE public.coach_session_feedback
      ADD CONSTRAINT coach_session_feedback_priority_check
      CHECK (priority IN ('low', 'normal', 'high'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coach_session_feedback_session ON public.coach_session_feedback(session_id, created_at DESC);

ALTER TABLE public.coach_session_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_coach_session_feedback_select ON public.coach_session_feedback;
CREATE POLICY creeda_coach_session_feedback_select
  ON public.coach_session_feedback
  FOR SELECT
  USING (
    athlete_id = auth.uid()
    OR coach_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_coach_session_feedback_insert ON public.coach_session_feedback;
CREATE POLICY creeda_coach_session_feedback_insert
  ON public.coach_session_feedback
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid()
    AND public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

GRANT ALL ON public.exercise_library TO postgres, service_role, authenticated;
GRANT ALL ON public.training_sessions TO postgres, service_role, authenticated;
GRANT ALL ON public.training_session_logs TO postgres, service_role, authenticated;
GRANT ALL ON public.training_exercise_logs TO postgres, service_role, authenticated;
GRANT ALL ON public.training_calendar_entries TO postgres, service_role, authenticated;
GRANT ALL ON public.coach_session_feedback TO postgres, service_role, authenticated;

COMMIT;
