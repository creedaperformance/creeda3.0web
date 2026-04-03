-- CREEDA V19: Final Supabase advisor cleanup
-- 1. Enable RLS on the remaining public tables flagged by Security Advisor
-- 2. Restrict/refine access for referrals and internal rate-limit storage
-- 3. Pin function search_path for database functions flagged as mutable

BEGIN;

-- ==============================================================================
-- 1. REMAINING TABLES FLAGGED BY SECURITY ADVISOR
-- ==============================================================================

DO $$
DECLARE
  has_referrals boolean := to_regclass('public.referrals') IS NOT NULL;
  has_rate_limits boolean := to_regclass('public.rate_limits') IS NOT NULL;
  referrals_has_coach_id boolean := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'referrals'
      AND column_name = 'coach_id'
  );
BEGIN
  IF has_referrals THEN
    EXECUTE 'ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS creeda_referrals_select ON public.referrals';
    EXECUTE 'DROP POLICY IF EXISTS creeda_referrals_insert ON public.referrals';
    EXECUTE 'DROP POLICY IF EXISTS creeda_referrals_update ON public.referrals';
    EXECUTE 'DROP POLICY IF EXISTS creeda_referrals_delete ON public.referrals';

    IF referrals_has_coach_id THEN
      EXECUTE $sql$
        CREATE POLICY creeda_referrals_select
        ON public.referrals
        FOR SELECT
        TO authenticated
        USING ((select auth.uid()) IS NOT NULL AND ((select auth.uid()) = user_id OR (select auth.uid()) = coach_id))
      $sql$;

      EXECUTE $sql$
        CREATE POLICY creeda_referrals_insert
        ON public.referrals
        FOR INSERT
        TO authenticated
        WITH CHECK ((select auth.uid()) IS NOT NULL AND ((select auth.uid()) = user_id OR (select auth.uid()) = coach_id))
      $sql$;

      EXECUTE $sql$
        CREATE POLICY creeda_referrals_update
        ON public.referrals
        FOR UPDATE
        TO authenticated
        USING ((select auth.uid()) IS NOT NULL AND ((select auth.uid()) = user_id OR (select auth.uid()) = coach_id))
        WITH CHECK ((select auth.uid()) IS NOT NULL AND ((select auth.uid()) = user_id OR (select auth.uid()) = coach_id))
      $sql$;

      EXECUTE $sql$
        CREATE POLICY creeda_referrals_delete
        ON public.referrals
        FOR DELETE
        TO authenticated
        USING ((select auth.uid()) IS NOT NULL AND ((select auth.uid()) = user_id OR (select auth.uid()) = coach_id))
      $sql$;
    ELSE
      EXECUTE $sql$
        CREATE POLICY creeda_referrals_select
        ON public.referrals
        FOR SELECT
        TO authenticated
        USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
      $sql$;

      EXECUTE $sql$
        CREATE POLICY creeda_referrals_insert
        ON public.referrals
        FOR INSERT
        TO authenticated
        WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
      $sql$;

      EXECUTE $sql$
        CREATE POLICY creeda_referrals_update
        ON public.referrals
        FOR UPDATE
        TO authenticated
        USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
        WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
      $sql$;

      EXECUTE $sql$
        CREATE POLICY creeda_referrals_delete
        ON public.referrals
        FOR DELETE
        TO authenticated
        USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
      $sql$;
    END IF;
  END IF;

  IF has_rate_limits THEN
    EXECUTE 'ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.rate_limits FROM anon';
    EXECUTE 'REVOKE ALL ON public.rate_limits FROM authenticated';
  END IF;
END $$;

-- ==============================================================================
-- 2. FUNCTION SEARCH PATH HARDENING
-- Supabase flags these when the effective search_path can be attacker-influenced.
-- We pin them to public because these functions reference public-schema objects.
-- ==============================================================================

DO $$
BEGIN
  IF to_regprocedure('public.map_performance_metric(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.map_performance_metric(text) SET search_path = public';
  END IF;
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public';
  END IF;
  IF to_regprocedure('public.ensure_single_active_membership()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.ensure_single_active_membership() SET search_path = public';
  END IF;
  IF to_regprocedure('public.calculate_load_and_readiness()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.calculate_load_and_readiness() SET search_path = public';
  END IF;
  IF to_regprocedure('public.update_v4_intelligence()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_v4_intelligence() SET search_path = public';
  END IF;
  IF to_regprocedure('public.check_rate_limit(text, integer, integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.check_rate_limit(text, integer, integer) SET search_path = public';
  END IF;
  IF to_regprocedure('public.find_profile_by_locker_code(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.find_profile_by_locker_code(text) SET search_path = public';
  END IF;
  IF to_regprocedure('public.determine_creeda_status(numeric, integer, integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.determine_creeda_status(numeric, integer, integer) SET search_path = public';
  END IF;
  IF to_regprocedure('public.is_coach_of_team(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_coach_of_team(uuid) SET search_path = public';
  END IF;
  IF to_regprocedure('public.is_athlete_of_team(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_athlete_of_team(uuid) SET search_path = public';
  END IF;
  IF to_regprocedure('public.join_team_with_locker_code(text, uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.join_team_with_locker_code(text, uuid) SET search_path = public';
  END IF;
  IF to_regprocedure('public.manage_squad_member(uuid, uuid, text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.manage_squad_member(uuid, uuid, text) SET search_path = public';
  END IF;
  IF to_regprocedure('public.calculate_creeda_daily_metrics()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.calculate_creeda_daily_metrics() SET search_path = public';
  END IF;
  IF to_regprocedure('public.calculate_sport_intelligence()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.calculate_sport_intelligence() SET search_path = public';
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
