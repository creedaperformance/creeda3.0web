-- Weekly Performance Newspaper — generated every Monday for every active user.
-- The LLM authors a structured payload; the email + in-app card render from it.

CREATE TABLE IF NOT EXISTS public.weekly_newspapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  headline TEXT NOT NULL,
  hero_metric TEXT,
  hero_value TEXT,
  numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  one_win TEXT,
  one_focus TEXT,
  next_week_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_model TEXT,
  ai_input_tokens INT,
  ai_output_tokens INT,
  ai_cost_cents NUMERIC(10,4) NOT NULL DEFAULT 0,
  email_sent_at TIMESTAMPTZ,
  email_status TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_newspaper_per_user_week UNIQUE (user_id, week_start_date),
  CONSTRAINT weekly_newspapers_email_status_check CHECK (
    email_status IS NULL OR email_status IN ('queued', 'sent', 'failed', 'skipped')
  )
);

CREATE INDEX IF NOT EXISTS idx_weekly_newspapers_user
  ON public.weekly_newspapers(user_id, week_start_date DESC);

ALTER TABLE public.weekly_newspapers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_newspapers_owner ON public.weekly_newspapers;
CREATE POLICY weekly_newspapers_owner ON public.weekly_newspapers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.weekly_newspapers TO authenticated;
GRANT ALL ON public.weekly_newspapers TO service_role;

COMMENT ON TABLE public.weekly_newspapers IS 'Per-user weekly performance digest. Authored by the LLM, surfaced as an email + in-app card every Monday.';
