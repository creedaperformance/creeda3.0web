CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'individual', 'coach')),
  week_start DATE NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  focus TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT weekly_reviews_user_role_week_key UNIQUE (user_id, role, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_role_week
  ON public.weekly_reviews(user_id, role, week_start DESC);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_weekly_reviews_select ON public.weekly_reviews;
DROP POLICY IF EXISTS creeda_weekly_reviews_insert ON public.weekly_reviews;
DROP POLICY IF EXISTS creeda_weekly_reviews_update ON public.weekly_reviews;
DROP POLICY IF EXISTS creeda_weekly_reviews_delete ON public.weekly_reviews;

CREATE POLICY creeda_weekly_reviews_select
  ON public.weekly_reviews
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY creeda_weekly_reviews_insert
  ON public.weekly_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY creeda_weekly_reviews_update
  ON public.weekly_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY creeda_weekly_reviews_delete
  ON public.weekly_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT ALL ON public.weekly_reviews TO postgres, service_role, authenticated;
