-- CREEDA FINAL REPAIR: V34 product tables + V35 adaptive RLS/grants
-- Safe to run in Supabase SQL Editor as one script.

BEGIN;

CREATE OR REPLACE FUNCTION public.creeda_is_coach_of_athlete(p_coach_id uuid, p_athlete_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_coach boolean;
BEGIN
  IF to_regclass('public.connection_requests') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE
    'SELECT EXISTS (
       SELECT 1
       FROM public.connection_requests
       WHERE coach_id = $1
         AND athlete_id = $2
         AND status = ''approved''
     )'
  INTO v_is_coach
  USING p_coach_id, p_athlete_id;

  RETURN COALESCE(v_is_coach, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.creeda_is_coach_of_athlete(uuid, uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.health_source_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  source_category text NOT NULL DEFAULT 'measured',
  display_name text NOT NULL,
  permission_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.health_source_connections
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS source_category text DEFAULT 'measured',
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS permission_state jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

CREATE UNIQUE INDEX IF NOT EXISTS health_source_connections_user_id_provider_key
  ON public.health_source_connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_health_source_connections_user
  ON public.health_source_connections(user_id, provider);

CREATE TABLE IF NOT EXISTS public.normalized_health_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_connection_id uuid REFERENCES public.health_source_connections(id) ON DELETE SET NULL,
  provider text NOT NULL,
  source_category text NOT NULL,
  sample_date date NOT NULL,
  sleep_minutes integer,
  sleep_quality_pct integer,
  hrv_ms numeric(7,2),
  resting_hr_bpm numeric(6,2),
  avg_hr_bpm numeric(6,2),
  steps integer,
  active_calories integer,
  workout_minutes integer,
  activity_load numeric(7,2),
  recovery_signal_pct integer,
  provenance_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_pct integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.normalized_health_samples
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS source_connection_id uuid,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS source_category text,
  ADD COLUMN IF NOT EXISTS sample_date date,
  ADD COLUMN IF NOT EXISTS sleep_minutes integer,
  ADD COLUMN IF NOT EXISTS sleep_quality_pct integer,
  ADD COLUMN IF NOT EXISTS hrv_ms numeric(7,2),
  ADD COLUMN IF NOT EXISTS resting_hr_bpm numeric(6,2),
  ADD COLUMN IF NOT EXISTS avg_hr_bpm numeric(6,2),
  ADD COLUMN IF NOT EXISTS steps integer,
  ADD COLUMN IF NOT EXISTS active_calories integer,
  ADD COLUMN IF NOT EXISTS workout_minutes integer,
  ADD COLUMN IF NOT EXISTS activity_load numeric(7,2),
  ADD COLUMN IF NOT EXISTS recovery_signal_pct integer,
  ADD COLUMN IF NOT EXISTS provenance_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_pct integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

CREATE UNIQUE INDEX IF NOT EXISTS normalized_health_samples_user_id_sample_date_provider_key
  ON public.normalized_health_samples(user_id, sample_date, provider);
CREATE INDEX IF NOT EXISTS idx_normalized_health_samples_user_date
  ON public.normalized_health_samples(user_id, sample_date DESC);
CREATE INDEX IF NOT EXISTS idx_normalized_health_samples_provider
  ON public.normalized_health_samples(provider, sample_date DESC);

CREATE TABLE IF NOT EXISTS public.user_goal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'athlete',
  goal_type text NOT NULL,
  sport text NOT NULL DEFAULT 'general_fitness',
  position text,
  event_name text,
  event_date date,
  phase text NOT NULL DEFAULT 'build',
  target_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.user_goal_events
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'athlete',
  ADD COLUMN IF NOT EXISTS goal_type text,
  ADD COLUMN IF NOT EXISTS sport text DEFAULT 'general_fitness',
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS phase text DEFAULT 'build',
  ADD COLUMN IF NOT EXISTS target_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_user_goal_events_user_status
  ON public.user_goal_events(user_id, status, event_date);

CREATE TABLE IF NOT EXISTS public.accountability_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  group_type text NOT NULL DEFAULT 'squad',
  privacy text NOT NULL DEFAULT 'invite_only',
  invite_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.accountability_groups
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'squad',
  ADD COLUMN IF NOT EXISTS privacy text DEFAULT 'invite_only',
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

CREATE UNIQUE INDEX IF NOT EXISTS accountability_groups_invite_code_key
  ON public.accountability_groups(invite_code);

CREATE TABLE IF NOT EXISTS public.accountability_group_members (
  group_id uuid NOT NULL REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.accountability_group_members
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS member_role text DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT timezone('utc', now());

CREATE UNIQUE INDEX IF NOT EXISTS accountability_group_members_group_id_user_id_key
  ON public.accountability_group_members(group_id, user_id);

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  challenge_type text NOT NULL,
  metric_key text NOT NULL,
  target_value numeric(10,2) NOT NULL DEFAULT 1,
  duration_days integer NOT NULL DEFAULT 7,
  sport text NOT NULL DEFAULT 'general_fitness',
  visibility text NOT NULL DEFAULT 'public',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS challenge_type text,
  ADD COLUMN IF NOT EXISTS metric_key text,
  ADD COLUMN IF NOT EXISTS target_value numeric(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 7,
  ADD COLUMN IF NOT EXISTS sport text DEFAULT 'general_fitness',
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.accountability_groups(id) ON DELETE SET NULL,
  progress_value numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz
);

ALTER TABLE public.challenge_participants
  ADD COLUMN IF NOT EXISTS challenge_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS progress_value numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS challenge_participants_challenge_id_user_id_key
  ON public.challenge_participants(challenge_id, user_id);

CREATE TABLE IF NOT EXISTS public.user_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  metric_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  earned_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.user_milestones
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS milestone_type text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS detail text,
  ADD COLUMN IF NOT EXISTS metric_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS share_payload_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS earned_at timestamptz DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_user_milestones_user
  ON public.user_milestones(user_id, earned_at DESC);

CREATE TABLE IF NOT EXISTS public.recommendation_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL DEFAULT 'system',
  surface text NOT NULL,
  recommendation_type text NOT NULL,
  decision text NOT NULL,
  reasons text[] NOT NULL DEFAULT '{}',
  provenance_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_pct integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.recommendation_audit_events
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS surface text,
  ADD COLUMN IF NOT EXISTS recommendation_type text,
  ADD COLUMN IF NOT EXISTS decision text,
  ADD COLUMN IF NOT EXISTS reasons text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS provenance_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_pct integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_recommendation_audit_events_user
  ON public.recommendation_audit_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  surface text NOT NULL,
  properties_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.product_analytics_events
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS surface text,
  ADD COLUMN IF NOT EXISTS properties_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_product_analytics_events_name_time
  ON public.product_analytics_events(event_name, created_at DESC);

CREATE TABLE IF NOT EXISTS public.session_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role text NOT NULL,
  message text NOT NULL,
  comment_type text NOT NULL DEFAULT 'note',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.session_comments
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS athlete_id uuid,
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS author_role text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS comment_type text DEFAULT 'note',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_session_comments_session
  ON public.session_comments(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.adaptive_form_profiles (
  user_id uuid NOT NULL,
  role text NOT NULL,
  flow_id text NOT NULL,
  flow_version text NOT NULL,
  core_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  optional_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  inferred_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion_score integer NOT NULL DEFAULT 0,
  confidence_score integer NOT NULL DEFAULT 0,
  confidence_level text NOT NULL DEFAULT 'low',
  confidence_recommendations text[] NOT NULL DEFAULT '{}',
  next_question_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, role, flow_id)
);

ALTER TABLE public.adaptive_form_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS flow_id text,
  ADD COLUMN IF NOT EXISTS flow_version text,
  ADD COLUMN IF NOT EXISTS core_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS optional_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS inferred_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completion_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_level text DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS confidence_recommendations text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_question_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

CREATE UNIQUE INDEX IF NOT EXISTS adaptive_form_profiles_user_id_role_flow_id_key
  ON public.adaptive_form_profiles(user_id, role, flow_id);
CREATE INDEX IF NOT EXISTS adaptive_form_profiles_role_idx
  ON public.adaptive_form_profiles(role, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.adaptive_daily_logs (
  user_id uuid NOT NULL,
  role text NOT NULL,
  flow_id text NOT NULL,
  flow_version text NOT NULL,
  log_date date NOT NULL,
  minimal_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  inferred_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  anomaly_flags text[] NOT NULL DEFAULT '{}',
  follow_up_field_ids text[] NOT NULL DEFAULT '{}',
  readiness_score integer,
  confidence_score integer,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, role, flow_id, log_date)
);

ALTER TABLE public.adaptive_daily_logs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS flow_id text,
  ADD COLUMN IF NOT EXISTS flow_version text,
  ADD COLUMN IF NOT EXISTS log_date date,
  ADD COLUMN IF NOT EXISTS minimal_signals jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS inferred_signals jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS anomaly_flags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS follow_up_field_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS readiness_score integer,
  ADD COLUMN IF NOT EXISTS confidence_score integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

CREATE UNIQUE INDEX IF NOT EXISTS adaptive_daily_logs_user_id_role_flow_id_log_date_key
  ON public.adaptive_daily_logs(user_id, role, flow_id, log_date);
CREATE INDEX IF NOT EXISTS adaptive_daily_logs_role_date_idx
  ON public.adaptive_daily_logs(role, log_date DESC);

CREATE TABLE IF NOT EXISTS public.adaptive_form_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  flow_id text NOT NULL,
  flow_version text,
  flow_kind text,
  session_id text NOT NULL,
  step_id text,
  question_id text,
  entry_source text,
  entry_mode text,
  event_name text NOT NULL,
  event_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.adaptive_form_events
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS flow_id text,
  ADD COLUMN IF NOT EXISTS flow_version text,
  ADD COLUMN IF NOT EXISTS flow_kind text,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS step_id text,
  ADD COLUMN IF NOT EXISTS question_id text,
  ADD COLUMN IF NOT EXISTS entry_source text,
  ADD COLUMN IF NOT EXISTS entry_mode text,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_properties jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS adaptive_form_events_flow_idx
  ON public.adaptive_form_events(flow_id, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS adaptive_form_events_user_session_idx
  ON public.adaptive_form_events(user_id, session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS adaptive_form_events_role_created_idx
  ON public.adaptive_form_events(role, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_adaptive_forms_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS adaptive_form_profiles_set_updated_at ON public.adaptive_form_profiles;
CREATE TRIGGER adaptive_form_profiles_set_updated_at
BEFORE UPDATE ON public.adaptive_form_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_adaptive_forms_updated_at();

DROP TRIGGER IF EXISTS adaptive_daily_logs_set_updated_at ON public.adaptive_daily_logs;
CREATE TRIGGER adaptive_daily_logs_set_updated_at
BEFORE UPDATE ON public.adaptive_daily_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_adaptive_forms_updated_at();

ALTER TABLE public.health_source_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_health_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_form_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_form_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_health_source_connections_select ON public.health_source_connections;
CREATE POLICY creeda_health_source_connections_select
  ON public.health_source_connections
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.creeda_is_coach_of_athlete(auth.uid(), user_id));

DROP POLICY IF EXISTS creeda_health_source_connections_insert ON public.health_source_connections;
CREATE POLICY creeda_health_source_connections_insert
  ON public.health_source_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_health_source_connections_update ON public.health_source_connections;
CREATE POLICY creeda_health_source_connections_update
  ON public.health_source_connections
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_normalized_health_samples_select ON public.normalized_health_samples;
CREATE POLICY creeda_normalized_health_samples_select
  ON public.normalized_health_samples
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.creeda_is_coach_of_athlete(auth.uid(), user_id));

DROP POLICY IF EXISTS creeda_normalized_health_samples_insert ON public.normalized_health_samples;
CREATE POLICY creeda_normalized_health_samples_insert
  ON public.normalized_health_samples
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_normalized_health_samples_update ON public.normalized_health_samples;
CREATE POLICY creeda_normalized_health_samples_update
  ON public.normalized_health_samples
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_user_goal_events_select ON public.user_goal_events;
CREATE POLICY creeda_user_goal_events_select
  ON public.user_goal_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_user_goal_events_insert ON public.user_goal_events;
CREATE POLICY creeda_user_goal_events_insert
  ON public.user_goal_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_user_goal_events_update ON public.user_goal_events;
CREATE POLICY creeda_user_goal_events_update
  ON public.user_goal_events
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_accountability_groups_select ON public.accountability_groups;
CREATE POLICY creeda_accountability_groups_select
  ON public.accountability_groups
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.accountability_group_members m
      WHERE m.group_id = public.accountability_groups.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS creeda_accountability_groups_insert ON public.accountability_groups;
CREATE POLICY creeda_accountability_groups_insert
  ON public.accountability_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS creeda_accountability_group_members_select ON public.accountability_group_members;
CREATE POLICY creeda_accountability_group_members_select
  ON public.accountability_group_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.accountability_groups g
      WHERE g.id = public.accountability_group_members.group_id
        AND g.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creeda_accountability_group_members_insert ON public.accountability_group_members;
CREATE POLICY creeda_accountability_group_members_insert
  ON public.accountability_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.accountability_groups g
      WHERE g.id = public.accountability_group_members.group_id
        AND g.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creeda_challenges_select ON public.challenges;
CREATE POLICY creeda_challenges_select
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.challenge_participants p
      WHERE p.challenge_id = public.challenges.id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creeda_challenge_participants_select ON public.challenge_participants;
CREATE POLICY creeda_challenge_participants_select
  ON public.challenge_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.accountability_groups g
      WHERE g.id = public.challenge_participants.group_id
        AND g.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creeda_challenge_participants_insert ON public.challenge_participants;
CREATE POLICY creeda_challenge_participants_insert
  ON public.challenge_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_user_milestones_select ON public.user_milestones;
CREATE POLICY creeda_user_milestones_select
  ON public.user_milestones
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.creeda_is_coach_of_athlete(auth.uid(), user_id));

DROP POLICY IF EXISTS creeda_user_milestones_insert ON public.user_milestones;
CREATE POLICY creeda_user_milestones_insert
  ON public.user_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_recommendation_audit_events_select ON public.recommendation_audit_events;
CREATE POLICY creeda_recommendation_audit_events_select
  ON public.recommendation_audit_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR actor_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_recommendation_audit_events_insert ON public.recommendation_audit_events;
CREATE POLICY creeda_recommendation_audit_events_insert
  ON public.recommendation_audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_product_analytics_events_insert ON public.product_analytics_events;
CREATE POLICY creeda_product_analytics_events_insert
  ON public.product_analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS creeda_session_comments_select ON public.session_comments;
CREATE POLICY creeda_session_comments_select
  ON public.session_comments
  FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR author_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_session_comments_insert ON public.session_comments;
CREATE POLICY creeda_session_comments_insert
  ON public.session_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS adaptive_form_profiles_owner_select ON public.adaptive_form_profiles;
DROP POLICY IF EXISTS "adaptive_form_profiles_owner_select" ON public.adaptive_form_profiles;
CREATE POLICY adaptive_form_profiles_owner_select
  ON public.adaptive_form_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS adaptive_form_profiles_owner_insert ON public.adaptive_form_profiles;
DROP POLICY IF EXISTS "adaptive_form_profiles_owner_insert" ON public.adaptive_form_profiles;
CREATE POLICY adaptive_form_profiles_owner_insert
  ON public.adaptive_form_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS adaptive_form_profiles_owner_update ON public.adaptive_form_profiles;
DROP POLICY IF EXISTS "adaptive_form_profiles_owner_update" ON public.adaptive_form_profiles;
CREATE POLICY adaptive_form_profiles_owner_update
  ON public.adaptive_form_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS adaptive_daily_logs_owner_select ON public.adaptive_daily_logs;
DROP POLICY IF EXISTS "adaptive_daily_logs_owner_select" ON public.adaptive_daily_logs;
CREATE POLICY adaptive_daily_logs_owner_select
  ON public.adaptive_daily_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS adaptive_daily_logs_owner_insert ON public.adaptive_daily_logs;
DROP POLICY IF EXISTS "adaptive_daily_logs_owner_insert" ON public.adaptive_daily_logs;
CREATE POLICY adaptive_daily_logs_owner_insert
  ON public.adaptive_daily_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS adaptive_daily_logs_owner_update ON public.adaptive_daily_logs;
DROP POLICY IF EXISTS "adaptive_daily_logs_owner_update" ON public.adaptive_daily_logs;
CREATE POLICY adaptive_daily_logs_owner_update
  ON public.adaptive_daily_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS adaptive_form_events_owner_select ON public.adaptive_form_events;
DROP POLICY IF EXISTS "adaptive_form_events_owner_select" ON public.adaptive_form_events;
CREATE POLICY adaptive_form_events_owner_select
  ON public.adaptive_form_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS adaptive_form_events_owner_insert ON public.adaptive_form_events;
DROP POLICY IF EXISTS "adaptive_form_events_owner_insert" ON public.adaptive_form_events;
CREATE POLICY adaptive_form_events_owner_insert
  ON public.adaptive_form_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  INSERT INTO public.challenges (title, description, challenge_type, metric_key, target_value, duration_days, sport, visibility)
  SELECT seed.title, seed.description, seed.challenge_type, seed.metric_key, seed.target_value, seed.duration_days, seed.sport, seed.visibility
  FROM (VALUES
    ('First 7 Days', 'Complete five useful Creeda actions in your first week: check-ins, sessions, or recovery flows.', 'streak', 'weekly_actions', 5::numeric, 7, 'general_fitness', 'public'),
    ('Recovery Builder', 'Complete three recovery or cooldown sessions this week.', 'recovery', 'recovery_sessions', 3::numeric, 7, 'general_fitness', 'public'),
    ('Match Week Discipline', 'Complete two training sessions and one recovery session before competition day.', 'workout_completion', 'planned_sessions', 3::numeric, 7, 'cricket', 'public'),
    ('Squad Consistency', 'Help your group reach 75% planned-session compliance this week.', 'team', 'group_compliance_pct', 75::numeric, 7, 'general_fitness', 'public')
  ) AS seed(title, description, challenge_type, metric_key, target_value, duration_days, sport, visibility)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.challenges existing
    WHERE existing.title = seed.title
      AND existing.metric_key = seed.metric_key
  );
EXCEPTION
  WHEN undefined_column OR not_null_violation OR check_violation THEN
    RAISE NOTICE 'Challenge seed skipped: %', SQLERRM;
END;
$$;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE
  ON public.health_source_connections,
     public.normalized_health_samples,
     public.user_goal_events,
     public.accountability_groups,
     public.accountability_group_members,
     public.challenge_participants,
     public.user_milestones,
     public.recommendation_audit_events,
     public.session_comments,
     public.adaptive_form_profiles,
     public.adaptive_daily_logs
  TO authenticated;

GRANT SELECT
  ON public.challenges
  TO authenticated;

GRANT INSERT
  ON public.product_analytics_events,
     public.adaptive_form_events
  TO authenticated;

GRANT SELECT
  ON public.adaptive_form_events
  TO authenticated;

GRANT ALL
  ON public.health_source_connections,
     public.normalized_health_samples,
     public.user_goal_events,
     public.accountability_groups,
     public.accountability_group_members,
     public.challenges,
     public.challenge_participants,
     public.user_milestones,
     public.recommendation_audit_events,
     public.product_analytics_events,
     public.session_comments,
     public.adaptive_form_profiles,
     public.adaptive_daily_logs,
     public.adaptive_form_events
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
