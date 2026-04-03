-- CREEDA V22: Daily context signals
-- Purpose:
-- 1. Persist optional India-context inputs that explain real-world performance friction
-- 2. Keep context lightweight and role-agnostic for athlete and individual loops
-- 3. Support trust, weekly review, and future India-native engine adjustments

BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_context_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'individual')),
  log_date DATE NOT NULL,
  heat_level TEXT CHECK (heat_level IN ('normal', 'warm', 'hot', 'extreme')),
  humidity_level TEXT CHECK (humidity_level IN ('low', 'moderate', 'high')),
  aqi_band TEXT CHECK (aqi_band IN ('good', 'moderate', 'poor', 'very_poor')),
  commute_minutes INTEGER NOT NULL DEFAULT 0 CHECK (commute_minutes >= 0 AND commute_minutes <= 240),
  exam_stress_score INTEGER NOT NULL DEFAULT 0 CHECK (exam_stress_score >= 0 AND exam_stress_score <= 5),
  fasting_state TEXT CHECK (fasting_state IN ('none', 'light', 'strict')),
  shift_work BOOLEAN NOT NULL DEFAULT FALSE,
  context_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, role, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_context_signals_user_date
  ON public.daily_context_signals(user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_context_signals_role_date
  ON public.daily_context_signals(role, log_date DESC);

ALTER TABLE public.daily_context_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_daily_context_signals_select ON public.daily_context_signals;
DROP POLICY IF EXISTS creeda_daily_context_signals_insert ON public.daily_context_signals;
DROP POLICY IF EXISTS creeda_daily_context_signals_update ON public.daily_context_signals;
DROP POLICY IF EXISTS creeda_daily_context_signals_delete ON public.daily_context_signals;

CREATE POLICY creeda_daily_context_signals_select
  ON public.daily_context_signals
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_daily_context_signals_insert
  ON public.daily_context_signals
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_daily_context_signals_update
  ON public.daily_context_signals
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_daily_context_signals_delete
  ON public.daily_context_signals
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

GRANT ALL ON public.daily_context_signals TO postgres, service_role, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
