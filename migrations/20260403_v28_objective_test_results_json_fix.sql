BEGIN;

ALTER TABLE public.objective_test_sessions
  ADD COLUMN IF NOT EXISTS results_json JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.objective_test_sessions.results_json IS
  'Protocol-specific structured test output used by multi-metric objective testing workflows.';

COMMIT;

NOTIFY pgrst, 'reload schema';
