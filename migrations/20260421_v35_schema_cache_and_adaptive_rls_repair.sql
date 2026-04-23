-- CREEDA V35: Schema cache and adaptive forms privilege repair
-- Run after v31/v32 adaptive forms and v34 product operating system migrations.

BEGIN;

DO $$
DECLARE
  missing_tables text[];
BEGIN
  SELECT array_agg(table_name)
  INTO missing_tables
  FROM unnest(ARRAY[
    'health_source_connections',
    'normalized_health_samples',
    'user_goal_events',
    'accountability_groups',
    'accountability_group_members',
    'challenges',
    'challenge_participants',
    'user_milestones',
    'recommendation_audit_events',
    'product_analytics_events',
    'session_comments'
  ]) AS required(table_name)
  WHERE to_regclass(format('public.%I', required.table_name)) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION
      'Missing v34 product tables in public schema: %. Apply migrations/20260421_v34_product_operating_system.sql first.',
      array_to_string(missing_tables, ', ');
  END IF;
END $$;

DO $$
DECLARE
  missing_tables text[];
BEGIN
  SELECT array_agg(table_name)
  INTO missing_tables
  FROM unnest(ARRAY[
    'adaptive_form_profiles',
    'adaptive_daily_logs',
    'adaptive_form_events'
  ]) AS required(table_name)
  WHERE to_regclass(format('public.%I', required.table_name)) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION
      'Missing adaptive form tables in public schema: %. Apply migrations/20260416_v31_adaptive_forms.sql and migrations/20260416_v32_adaptive_form_events.sql first.',
      array_to_string(missing_tables, ', ');
  END IF;
END $$;

ALTER TABLE public.adaptive_form_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_form_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adaptive_form_profiles_owner_select" ON public.adaptive_form_profiles;
CREATE POLICY "adaptive_form_profiles_owner_select"
  ON public.adaptive_form_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "adaptive_form_profiles_owner_insert" ON public.adaptive_form_profiles;
CREATE POLICY "adaptive_form_profiles_owner_insert"
  ON public.adaptive_form_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "adaptive_form_profiles_owner_update" ON public.adaptive_form_profiles;
CREATE POLICY "adaptive_form_profiles_owner_update"
  ON public.adaptive_form_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "adaptive_daily_logs_owner_select" ON public.adaptive_daily_logs;
CREATE POLICY "adaptive_daily_logs_owner_select"
  ON public.adaptive_daily_logs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "adaptive_daily_logs_owner_insert" ON public.adaptive_daily_logs;
CREATE POLICY "adaptive_daily_logs_owner_insert"
  ON public.adaptive_daily_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "adaptive_daily_logs_owner_update" ON public.adaptive_daily_logs;
CREATE POLICY "adaptive_daily_logs_owner_update"
  ON public.adaptive_daily_logs
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "adaptive_form_events_owner_select" ON public.adaptive_form_events;
CREATE POLICY "adaptive_form_events_owner_select"
  ON public.adaptive_form_events
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "adaptive_form_events_owner_insert" ON public.adaptive_form_events;
CREATE POLICY "adaptive_form_events_owner_insert"
  ON public.adaptive_form_events
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE
  ON public.adaptive_form_profiles,
     public.adaptive_daily_logs
  TO authenticated;

GRANT SELECT, INSERT
  ON public.adaptive_form_events
  TO authenticated;

GRANT ALL
  ON public.adaptive_form_profiles,
     public.adaptive_daily_logs,
     public.adaptive_form_events
  TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON public.health_source_connections,
     public.normalized_health_samples,
     public.user_goal_events,
     public.challenge_participants,
     public.user_milestones,
     public.recommendation_audit_events,
     public.session_comments
  TO authenticated;

GRANT SELECT
  ON public.challenges
  TO authenticated;

GRANT INSERT
  ON public.product_analytics_events
  TO authenticated;

GRANT ALL
  ON public.health_source_connections,
     public.normalized_health_samples,
     public.user_goal_events,
     public.accountability_groups,
     public.accountability_group_members,
     public.challenge_participants,
     public.user_milestones,
     public.recommendation_audit_events,
     public.product_analytics_events,
     public.session_comments
  TO service_role;

GRANT SELECT
  ON public.challenges
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
