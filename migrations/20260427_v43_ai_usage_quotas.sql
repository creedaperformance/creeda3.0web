-- AI usage tracking + per-user rate limits.
-- Idempotent (uses IF NOT EXISTS / DROP IF EXISTS).

-- ── 1. Add cost_cents directly to ai_messages so each row is self-describing
ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS cost_cents NUMERIC(10,4) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ai_messages_user_created
  ON public.ai_messages(user_id, created_at DESC);

-- ── 2. Per-user daily aggregates (denormalised for cheap quota checks)
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cost_cents NUMERIC(10,4) NOT NULL DEFAULT 0,
  blocked_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_usage_row_per_user_date UNIQUE (user_id, date),
  CONSTRAINT ai_usage_daily_message_count_check CHECK (message_count >= 0),
  CONSTRAINT ai_usage_daily_blocked_count_check CHECK (blocked_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date
  ON public.ai_usage_daily(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_date
  ON public.ai_usage_daily(date DESC);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_daily_owner_read ON public.ai_usage_daily;
CREATE POLICY ai_usage_daily_owner_read ON public.ai_usage_daily
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_usage_daily_owner_write ON public.ai_usage_daily;
CREATE POLICY ai_usage_daily_owner_write ON public.ai_usage_daily
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.ai_usage_daily TO authenticated;
GRANT ALL ON public.ai_usage_daily TO service_role;

-- ── 3. Per-user limit overrides on profiles (default to NULL → use config)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_daily_message_limit INT,
  ADD COLUMN IF NOT EXISTS ai_monthly_cost_limit_cents INT,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ai_daily_message_limit_check,
  ADD CONSTRAINT profiles_ai_daily_message_limit_check CHECK (
    ai_daily_message_limit IS NULL OR ai_daily_message_limit BETWEEN 0 AND 5000
  ),
  DROP CONSTRAINT IF EXISTS profiles_ai_monthly_cost_limit_check,
  ADD CONSTRAINT profiles_ai_monthly_cost_limit_check CHECK (
    ai_monthly_cost_limit_cents IS NULL OR ai_monthly_cost_limit_cents >= 0
  );

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON public.profiles(is_admin)
  WHERE is_admin = TRUE;

-- ── 4. Atomic increment function — used by API routes pre/post AI call.
-- Rolls forward today's row, returns the new totals so the caller can decide
-- whether to allow the request.
CREATE OR REPLACE FUNCTION public.ai_usage_record(
  p_user_id UUID,
  p_input_tokens INT,
  p_output_tokens INT,
  p_cost_cents NUMERIC,
  p_blocked BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  message_count INT,
  input_tokens INT,
  output_tokens INT,
  cost_cents NUMERIC,
  blocked_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO public.ai_usage_daily AS u (
    user_id, date, message_count, input_tokens, output_tokens, cost_cents, blocked_count, updated_at
  )
  VALUES (
    p_user_id,
    v_today,
    CASE WHEN p_blocked THEN 0 ELSE 1 END,
    GREATEST(0, COALESCE(p_input_tokens, 0)),
    GREATEST(0, COALESCE(p_output_tokens, 0)),
    GREATEST(0::numeric, COALESCE(p_cost_cents, 0)),
    CASE WHEN p_blocked THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    message_count = u.message_count + (CASE WHEN p_blocked THEN 0 ELSE 1 END),
    input_tokens = u.input_tokens + GREATEST(0, COALESCE(p_input_tokens, 0)),
    output_tokens = u.output_tokens + GREATEST(0, COALESCE(p_output_tokens, 0)),
    cost_cents = u.cost_cents + GREATEST(0::numeric, COALESCE(p_cost_cents, 0)),
    blocked_count = u.blocked_count + (CASE WHEN p_blocked THEN 1 ELSE 0 END),
    updated_at = NOW();

  RETURN QUERY
  SELECT
    u.message_count,
    u.input_tokens,
    u.output_tokens,
    u.cost_cents,
    u.blocked_count
  FROM public.ai_usage_daily u
  WHERE u.user_id = p_user_id AND u.date = v_today;
END;
$func$;

REVOKE ALL ON FUNCTION public.ai_usage_record(UUID, INT, INT, NUMERIC, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_usage_record(UUID, INT, INT, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_usage_record(UUID, INT, INT, NUMERIC, BOOLEAN) TO service_role;

COMMENT ON TABLE public.ai_usage_daily IS 'Daily per-user AI token + cost rollup. Updated via ai_usage_record() RPC.';
COMMENT ON COLUMN public.profiles.ai_daily_message_limit IS 'Per-user override of the global daily AI message cap. NULL = use env-configured default.';
COMMENT ON COLUMN public.profiles.is_admin IS 'When true, this user can view the AI usage admin dashboard. Bootstrapped via the ADMIN_EMAILS env var on first login.';
