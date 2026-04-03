-- CREEDA V21: Objective test sessions foundation
-- Purpose:
-- 1. Persist phone-based objective test sessions for athlete and individual flows
-- 2. Start with reaction_tap as the first protocol
-- 3. Preserve session-level metadata for future trust, trend, and coach surfaces

BEGIN;

CREATE TABLE IF NOT EXISTS public.objective_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'individual')),
  test_type TEXT NOT NULL CHECK (test_type IN ('reaction_tap')),
  protocol_version TEXT NOT NULL DEFAULT 'reaction_tap_v1',
  source TEXT NOT NULL DEFAULT 'phone_browser' CHECK (source IN ('phone_browser')),
  sample_count INTEGER NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
  false_start_count INTEGER NOT NULL DEFAULT 0 CHECK (false_start_count >= 0),
  average_score_ms INTEGER CHECK (average_score_ms >= 0),
  validated_score_ms INTEGER CHECK (validated_score_ms >= 0),
  best_score_ms INTEGER CHECK (best_score_ms >= 0),
  consistency_ms INTEGER CHECK (consistency_ms >= 0),
  classification TEXT,
  trial_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_objective_test_sessions_user_type
  ON public.objective_test_sessions(user_id, test_type, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_objective_test_sessions_role
  ON public.objective_test_sessions(role, test_type, completed_at DESC);

ALTER TABLE public.objective_test_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_objective_test_sessions_select ON public.objective_test_sessions;
DROP POLICY IF EXISTS creeda_objective_test_sessions_insert ON public.objective_test_sessions;
DROP POLICY IF EXISTS creeda_objective_test_sessions_update ON public.objective_test_sessions;
DROP POLICY IF EXISTS creeda_objective_test_sessions_delete ON public.objective_test_sessions;

CREATE POLICY creeda_objective_test_sessions_select
  ON public.objective_test_sessions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_objective_test_sessions_insert
  ON public.objective_test_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_objective_test_sessions_update
  ON public.objective_test_sessions
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_objective_test_sessions_delete
  ON public.objective_test_sessions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

GRANT ALL ON public.objective_test_sessions TO postgres, service_role, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
