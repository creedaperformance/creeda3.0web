-- CREEDA V34: Product operating system foundations
-- Adds provider-agnostic integrations, normalized health samples, goals/events,
-- retention loops, recommendation audit trail, analytics events, and session comments.

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

CREATE TABLE IF NOT EXISTS public.health_source_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('apple_health', 'health_connect', 'google_fit', 'garmin', 'fitbit', 'manual_import')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'connected', 'mock_connected', 'needs_auth', 'sync_failed', 'paused')),
  source_category text NOT NULL DEFAULT 'measured' CHECK (source_category IN ('measured', 'estimated', 'manual')),
  display_name text NOT NULL,
  permission_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_health_source_connections_user
  ON public.health_source_connections(user_id, provider);

ALTER TABLE public.health_source_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_health_source_connections_select ON public.health_source_connections;
CREATE POLICY creeda_health_source_connections_select
  ON public.health_source_connections
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_health_source_connections_insert ON public.health_source_connections;
CREATE POLICY creeda_health_source_connections_insert
  ON public.health_source_connections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_health_source_connections_update ON public.health_source_connections;
CREATE POLICY creeda_health_source_connections_update
  ON public.health_source_connections
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.normalized_health_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_connection_id uuid REFERENCES public.health_source_connections(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('apple_health', 'health_connect', 'google_fit', 'garmin', 'fitbit', 'manual_import', 'creeda_estimate')),
  source_category text NOT NULL CHECK (source_category IN ('measured', 'estimated', 'manual')),
  sample_date date NOT NULL,
  sleep_minutes integer CHECK (sleep_minutes IS NULL OR (sleep_minutes >= 0 AND sleep_minutes <= 1440)),
  sleep_quality_pct integer CHECK (sleep_quality_pct IS NULL OR (sleep_quality_pct >= 0 AND sleep_quality_pct <= 100)),
  hrv_ms numeric(7,2),
  resting_hr_bpm numeric(6,2),
  avg_hr_bpm numeric(6,2),
  steps integer CHECK (steps IS NULL OR steps >= 0),
  active_calories integer CHECK (active_calories IS NULL OR active_calories >= 0),
  workout_minutes integer CHECK (workout_minutes IS NULL OR workout_minutes >= 0),
  activity_load numeric(7,2),
  recovery_signal_pct integer CHECK (recovery_signal_pct IS NULL OR (recovery_signal_pct >= 0 AND recovery_signal_pct <= 100)),
  provenance_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_pct integer NOT NULL DEFAULT 50 CHECK (confidence_pct >= 0 AND confidence_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, sample_date, provider)
);

CREATE INDEX IF NOT EXISTS idx_normalized_health_samples_user_date
  ON public.normalized_health_samples(user_id, sample_date DESC);

CREATE INDEX IF NOT EXISTS idx_normalized_health_samples_provider
  ON public.normalized_health_samples(provider, sample_date DESC);

ALTER TABLE public.normalized_health_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_normalized_health_samples_select ON public.normalized_health_samples;
CREATE POLICY creeda_normalized_health_samples_select
  ON public.normalized_health_samples
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_normalized_health_samples_insert ON public.normalized_health_samples;
CREATE POLICY creeda_normalized_health_samples_insert
  ON public.normalized_health_samples
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creeda_normalized_health_samples_update ON public.normalized_health_samples;
CREATE POLICY creeda_normalized_health_samples_update
  ON public.normalized_health_samples
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_goal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'athlete' CHECK (role IN ('athlete', 'individual', 'coach')),
  goal_type text NOT NULL CHECK (goal_type IN ('fat_loss', 'strength_gain', 'return_to_play', 'race_prep', 'tournament_prep', 'general_fitness', 'sport_performance', 'body_recomposition', 'mobility')),
  sport text NOT NULL DEFAULT 'general_fitness',
  position text,
  event_name text,
  event_date date,
  phase text NOT NULL DEFAULT 'build' CHECK (phase IN ('build', 'peak', 'taper', 'compete', 'recover')),
  target_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_goal_events_user_status
  ON public.user_goal_events(user_id, status, event_date);

ALTER TABLE public.user_goal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_user_goal_events_select ON public.user_goal_events;
CREATE POLICY creeda_user_goal_events_select
  ON public.user_goal_events
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_user_goal_events_insert ON public.user_goal_events;
CREATE POLICY creeda_user_goal_events_insert
  ON public.user_goal_events
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_user_goal_events_update ON public.user_goal_events;
CREATE POLICY creeda_user_goal_events_update
  ON public.user_goal_events
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

CREATE TABLE IF NOT EXISTS public.accountability_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  group_type text NOT NULL DEFAULT 'squad' CHECK (group_type IN ('friend_group', 'squad', 'academy')),
  privacy text NOT NULL DEFAULT 'invite_only' CHECK (privacy IN ('invite_only', 'coach_managed')),
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.accountability_group_members (
  group_id uuid NOT NULL REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'member' CHECK (member_role IN ('owner', 'coach', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.accountability_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_accountability_groups_select ON public.accountability_groups;
CREATE POLICY creeda_accountability_groups_select
  ON public.accountability_groups
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.accountability_group_members m
      WHERE m.group_id = accountability_groups.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS creeda_accountability_groups_insert ON public.accountability_groups;
CREATE POLICY creeda_accountability_groups_insert
  ON public.accountability_groups
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS creeda_accountability_group_members_select ON public.accountability_group_members;
CREATE POLICY creeda_accountability_group_members_select
  ON public.accountability_group_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.accountability_groups g
      WHERE g.id = accountability_group_members.group_id
        AND g.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creeda_accountability_group_members_insert ON public.accountability_group_members;
CREATE POLICY creeda_accountability_group_members_insert
  ON public.accountability_group_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.accountability_groups g
      WHERE g.id = accountability_group_members.group_id
        AND g.owner_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  challenge_type text NOT NULL CHECK (challenge_type IN ('streak', 'workout_completion', 'recovery', 'team')),
  metric_key text NOT NULL,
  target_value numeric(10,2) NOT NULL DEFAULT 1,
  duration_days integer NOT NULL DEFAULT 7,
  sport text NOT NULL DEFAULT 'general_fitness',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'group')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.accountability_groups(id) ON DELETE SET NULL,
  progress_value numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  PRIMARY KEY (challenge_id, user_id)
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_challenges_select ON public.challenges;
CREATE POLICY creeda_challenges_select
  ON public.challenges
  FOR SELECT
  USING (
    visibility = 'public'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants p
      WHERE p.challenge_id = challenges.id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creeda_challenge_participants_select ON public.challenge_participants;
CREATE POLICY creeda_challenge_participants_select
  ON public.challenge_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.accountability_groups g
      WHERE g.id = challenge_participants.group_id
        AND g.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creeda_challenge_participants_insert ON public.challenge_participants;
CREATE POLICY creeda_challenge_participants_insert
  ON public.challenge_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type text NOT NULL CHECK (milestone_type IN ('streak', 'workout', 'recovery', 'readiness', 'goal', 'coach')),
  title text NOT NULL,
  detail text NOT NULL,
  metric_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  earned_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user
  ON public.user_milestones(user_id, earned_at DESC);

ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_user_milestones_select ON public.user_milestones;
CREATE POLICY creeda_user_milestones_select
  ON public.user_milestones
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_user_milestones_insert ON public.user_milestones;
CREATE POLICY creeda_user_milestones_insert
  ON public.user_milestones
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.recommendation_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL DEFAULT 'system' CHECK (actor_role IN ('system', 'athlete', 'individual', 'coach', 'admin')),
  surface text NOT NULL,
  recommendation_type text NOT NULL,
  decision text NOT NULL,
  reasons text[] NOT NULL DEFAULT '{}',
  provenance_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_pct integer NOT NULL DEFAULT 50 CHECK (confidence_pct >= 0 AND confidence_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_recommendation_audit_events_user
  ON public.recommendation_audit_events(user_id, created_at DESC);

ALTER TABLE public.recommendation_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_recommendation_audit_events_select ON public.recommendation_audit_events;
CREATE POLICY creeda_recommendation_audit_events_select
  ON public.recommendation_audit_events
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR actor_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS creeda_recommendation_audit_events_insert ON public.recommendation_audit_events;
CREATE POLICY creeda_recommendation_audit_events_insert
  ON public.recommendation_audit_events
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR actor_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), user_id)
  );

CREATE TABLE IF NOT EXISTS public.product_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  surface text NOT NULL,
  properties_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_events_name_time
  ON public.product_analytics_events(event_name, created_at DESC);

ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_product_analytics_events_insert ON public.product_analytics_events;
CREATE POLICY creeda_product_analytics_events_insert
  ON public.product_analytics_events
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.session_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('athlete', 'coach', 'admin')),
  message text NOT NULL,
  comment_type text NOT NULL DEFAULT 'note' CHECK (comment_type IN ('note', 'question', 'coach_instruction', 'pain_report')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_session_comments_session
  ON public.session_comments(session_id, created_at DESC);

ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_session_comments_select ON public.session_comments;
CREATE POLICY creeda_session_comments_select
  ON public.session_comments
  FOR SELECT
  USING (
    athlete_id = auth.uid()
    OR author_id = auth.uid()
    OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
  );

DROP POLICY IF EXISTS creeda_session_comments_insert ON public.session_comments;
CREATE POLICY creeda_session_comments_insert
  ON public.session_comments
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      athlete_id = auth.uid()
      OR public.creeda_is_coach_of_athlete(auth.uid(), athlete_id)
    )
  );

INSERT INTO public.challenges (title, description, challenge_type, metric_key, target_value, duration_days, sport, visibility)
SELECT seed.title, seed.description, seed.challenge_type, seed.metric_key, seed.target_value, seed.duration_days, seed.sport, seed.visibility
FROM (VALUES
  ('First 7 Days', 'Complete five useful Creeda actions in your first week: check-ins, sessions, or recovery flows.', 'streak', 'weekly_actions', 5, 7, 'general_fitness', 'public'),
  ('Recovery Builder', 'Complete three recovery or cooldown sessions this week.', 'recovery', 'recovery_sessions', 3, 7, 'general_fitness', 'public'),
  ('Match Week Discipline', 'Complete two training sessions and one recovery session before competition day.', 'workout_completion', 'planned_sessions', 3, 7, 'cricket', 'public'),
  ('Squad Consistency', 'Help your group reach 75% planned-session compliance this week.', 'team', 'group_compliance_pct', 75, 7, 'general_fitness', 'public')
) AS seed(title, description, challenge_type, metric_key, target_value, duration_days, sport, visibility)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.challenges existing
  WHERE existing.title = seed.title
    AND existing.metric_key = seed.metric_key
);

GRANT ALL ON public.health_source_connections TO postgres, service_role, authenticated;
GRANT ALL ON public.normalized_health_samples TO postgres, service_role, authenticated;
GRANT ALL ON public.user_goal_events TO postgres, service_role, authenticated;
GRANT ALL ON public.accountability_groups TO postgres, service_role, authenticated;
GRANT ALL ON public.accountability_group_members TO postgres, service_role, authenticated;
GRANT SELECT ON public.challenges TO postgres, service_role, authenticated;
GRANT ALL ON public.challenge_participants TO postgres, service_role, authenticated;
GRANT ALL ON public.user_milestones TO postgres, service_role, authenticated;
GRANT ALL ON public.recommendation_audit_events TO postgres, service_role, authenticated;
GRANT INSERT ON public.product_analytics_events TO postgres, service_role, authenticated;
GRANT ALL ON public.session_comments TO postgres, service_role, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
