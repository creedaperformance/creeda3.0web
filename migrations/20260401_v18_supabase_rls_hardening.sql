-- CREEDA V18: Supabase Security Advisor RLS hardening
-- Purpose:
-- 1. Enable RLS on public-schema catalog tables that were created via SQL migrations
-- 2. Restrict catalog reads to authenticated users only
-- 3. Restrict user-linked sports-science tables to owner-only access
-- Notes:
-- - service_role continues to bypass RLS for trusted backend/admin operations
-- - no public/anon access is granted here

BEGIN;

-- ==============================================================================
-- 0. REMOVE LEGACY ANON TABLE/SEQUENCE PRIVILEGES
-- Older schema bootstrap migrations granted broad public-schema access to anon.
-- We keep existing function access intact because signup / locker-code RPCs may
-- still rely on selected public functions, but table/sequence access is removed.
-- ==============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

CREATE OR REPLACE FUNCTION public.creeda_apply_authenticated_select_policy(
  target_schema text,
  target_table text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass(format('%I.%I', target_schema, target_table)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target_schema, target_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'creeda_authenticated_read', target_schema, target_table);
  EXECUTE format(
    'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (true)',
    'creeda_authenticated_read',
    target_schema,
    target_table
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.creeda_apply_owner_policies(
  target_schema text,
  target_table text,
  owner_column text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass(format('%I.%I', target_schema, target_table)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target_schema, target_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'creeda_owner_select', target_schema, target_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'creeda_owner_insert', target_schema, target_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'creeda_owner_update', target_schema, target_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'creeda_owner_delete', target_schema, target_table);

  EXECUTE format(
    'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = %I)',
    'creeda_owner_select',
    target_schema,
    target_table,
    owner_column
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = %I)',
    'creeda_owner_insert',
    target_schema,
    target_table,
    owner_column
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = %I) WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = %I)',
    'creeda_owner_update',
    target_schema,
    target_table,
    owner_column,
    owner_column
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = %I)',
    'creeda_owner_delete',
    target_schema,
    target_table,
    owner_column
  );
END;
$$;

-- ==============================================================================
-- 1. REFERENCE / CATALOG TABLES
-- Logged-in users may read these through the Data API.
-- Writes stay backend-only because no INSERT/UPDATE/DELETE policies are created.
-- ==============================================================================

SELECT public.creeda_apply_authenticated_select_policy('public', 'platform_events');
SELECT public.creeda_apply_authenticated_select_policy('public', 'foods');
SELECT public.creeda_apply_authenticated_select_policy('public', 'food_substitutions');
SELECT public.creeda_apply_authenticated_select_policy('public', 'meal_templates');
SELECT public.creeda_apply_authenticated_select_policy('public', 'exercises');
SELECT public.creeda_apply_authenticated_select_policy('public', 'exercise_variants');
SELECT public.creeda_apply_authenticated_select_policy('public', 'sport_profiles');
SELECT public.creeda_apply_authenticated_select_policy('public', 'position_profiles');
SELECT public.creeda_apply_authenticated_select_policy('public', 'goal_profiles');
SELECT public.creeda_apply_authenticated_select_policy('public', 'rehab_protocols');

-- ==============================================================================
-- 2. USER-OWNED SPORTS SCIENCE TABLES
-- Each signed-in user can only access their own rows.
-- ==============================================================================

SELECT public.creeda_apply_owner_policies('public', 'user_dietary_constraints', 'user_id');
SELECT public.creeda_apply_owner_policies('public', 'rehab_history', 'user_id');
SELECT public.creeda_apply_owner_policies('public', 'equipment_profiles', 'user_id');
SELECT public.creeda_apply_owner_policies('public', 'user_preferences', 'user_id');
SELECT public.creeda_apply_owner_policies('public', 'performance_profiles', 'user_id');
SELECT public.creeda_apply_owner_policies('public', 'adaptation_profiles', 'user_id');
SELECT public.creeda_apply_owner_policies('public', 'adaptation_profiles_archive', 'user_id');

DROP FUNCTION IF EXISTS public.creeda_apply_authenticated_select_policy(text, text);
DROP FUNCTION IF EXISTS public.creeda_apply_owner_policies(text, text, text);

COMMIT;

NOTIFY pgrst, 'reload schema';
