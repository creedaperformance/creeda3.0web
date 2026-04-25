-- CREEDA V37: Rate-limit RPC repair for signup availability
-- Safe to run in Supabase SQL Editor as one script.
--
-- Why this exists:
-- Production signup can be blocked when PostgREST cannot call
-- public.check_rate_limit because the function is missing, grants are stale,
-- the schema cache has not reloaded, or the function search_path was hardened
-- incorrectly. The application now falls back in-memory, but this restores the
-- preferred cross-instance DB limiter.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  last_attempt timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits
  ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.rate_limits
  ALTER COLUMN count SET DEFAULT 0,
  ALTER COLUMN last_attempt SET DEFAULT now();

UPDATE public.rate_limits
SET
  count = COALESCE(count, 0),
  last_attempt = COALESCE(last_attempt, now())
WHERE count IS NULL OR last_attempt IS NULL;

ALTER TABLE public.rate_limits
  ALTER COLUMN count SET NOT NULL,
  ALTER COLUMN last_attempt SET NOT NULL;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RETURN false;
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    RETURN false;
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  DELETE FROM public.rate_limits
  WHERE last_attempt < now() - make_interval(secs => p_window_seconds);

  INSERT INTO public.rate_limits (key, count, last_attempt)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN public.rate_limits.last_attempt < now() - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE public.rate_limits.count + 1
    END,
    last_attempt = now();

  SELECT public.rate_limits.count <= p_limit
  INTO v_allowed
  FROM public.rate_limits
  WHERE public.rate_limits.key = p_key;

  RETURN COALESCE(v_allowed, false);
END;
$$;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limits TO service_role;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer)
  TO anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
