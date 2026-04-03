-- CREEDA V20: Canonical health-sync foundation + coach intervention workflow
-- Purpose:
-- 1. Re-establish health_connections and health_daily_metrics as the one supported device-data path
-- 2. Add persistent coach_interventions for intervention and low-data queues
-- 3. Keep RLS aligned with authenticated owner/coach access

BEGIN;

-- ==============================================================================
-- 1. CANONICAL HEALTH-SYNC TABLES
-- This migration intentionally supersedes the temporary removal in
-- 20260326_v7_health_removal.sql. The application depends on these tables for
-- device-aware trust, recovery blending, and onboarding preferences.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.health_connections (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  apple_connected BOOLEAN NOT NULL DEFAULT FALSE,
  android_connected BOOLEAN NOT NULL DEFAULT FALSE,
  connection_preference TEXT NOT NULL DEFAULT 'later' CHECK (connection_preference IN ('connect_now', 'later')),
  permission_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT NOT NULL DEFAULT 'never' CHECK (last_sync_status IN ('never', 'success', 'failed')),
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.health_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
  sleep_hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  heart_rate_avg NUMERIC(6,2),
  hrv NUMERIC(6,2),
  source TEXT NOT NULL CHECK (source IN ('apple', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, metric_date, source)
);

CREATE INDEX IF NOT EXISTS idx_health_daily_metrics_user_date
  ON public.health_daily_metrics(user_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_health_daily_metrics_source
  ON public.health_daily_metrics(source, metric_date DESC);

ALTER TABLE public.health_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_health_connections_select ON public.health_connections;
DROP POLICY IF EXISTS creeda_health_connections_insert ON public.health_connections;
DROP POLICY IF EXISTS creeda_health_connections_update ON public.health_connections;
DROP POLICY IF EXISTS creeda_health_connections_delete ON public.health_connections;

CREATE POLICY creeda_health_connections_select
  ON public.health_connections
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_health_connections_insert
  ON public.health_connections
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_health_connections_update
  ON public.health_connections
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_health_connections_delete
  ON public.health_connections
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

DROP POLICY IF EXISTS creeda_health_daily_metrics_select ON public.health_daily_metrics;
DROP POLICY IF EXISTS creeda_health_daily_metrics_insert ON public.health_daily_metrics;
DROP POLICY IF EXISTS creeda_health_daily_metrics_update ON public.health_daily_metrics;
DROP POLICY IF EXISTS creeda_health_daily_metrics_delete ON public.health_daily_metrics;

CREATE POLICY creeda_health_daily_metrics_select
  ON public.health_daily_metrics
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_health_daily_metrics_insert
  ON public.health_daily_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_health_daily_metrics_update
  ON public.health_daily_metrics
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_health_daily_metrics_delete
  ON public.health_daily_metrics
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

GRANT ALL ON public.health_connections TO postgres, service_role, authenticated;
GRANT ALL ON public.health_daily_metrics TO postgres, service_role, authenticated;

-- ==============================================================================
-- 2. COACH INTERVENTION STATE
-- Stores both actionable athlete interventions and low-data follow-up items.
-- One row per coach/athlete/team/queue/day keeps the state durable without
-- fighting the daily intelligence generation model.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.coach_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('intervention', 'low_data')),
  source_log_date DATE NOT NULL,
  reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT,
  priority TEXT NOT NULL DEFAULT 'Informational' CHECK (priority IN ('Critical', 'Warning', 'Informational')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (coach_id, athlete_id, team_id, queue_type, source_log_date)
);

CREATE INDEX IF NOT EXISTS idx_coach_interventions_coach_status
  ON public.coach_interventions(coach_id, status, queue_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_interventions_athlete
  ON public.coach_interventions(athlete_id, queue_type, source_log_date DESC);

ALTER TABLE public.coach_interventions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_coach_interventions_select ON public.coach_interventions;
DROP POLICY IF EXISTS creeda_coach_interventions_insert ON public.coach_interventions;
DROP POLICY IF EXISTS creeda_coach_interventions_update ON public.coach_interventions;
DROP POLICY IF EXISTS creeda_coach_interventions_delete ON public.coach_interventions;

CREATE POLICY creeda_coach_interventions_select
  ON public.coach_interventions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = coach_id);

CREATE POLICY creeda_coach_interventions_insert
  ON public.coach_interventions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = coach_id);

CREATE POLICY creeda_coach_interventions_update
  ON public.coach_interventions
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = coach_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = coach_id);

CREATE POLICY creeda_coach_interventions_delete
  ON public.coach_interventions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = coach_id);

GRANT ALL ON public.coach_interventions TO postgres, service_role, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
