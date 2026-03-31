-- CREEDA V5: Normal Individual Peak Pathway Expansion
-- Adds deep FitStart profiling + day-to-peak guidance infrastructure

ALTER TABLE public.individual_profiles
  ADD COLUMN IF NOT EXISTS onboarding_version TEXT DEFAULT 'fitstart_v2',
  ADD COLUMN IF NOT EXISTS basic_profile JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS physiology_profile JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lifestyle_profile JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS goal_profile JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sport_profile JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_state JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS peak_state JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS gap_analysis JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS plan_engine JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS journey_state JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS latest_guidance JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fitstart_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE TABLE IF NOT EXISTS public.individual_guidance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
  daily_guidance JSONB DEFAULT '{}'::jsonb,
  weekly_feedback JSONB DEFAULT '{}'::jsonb,
  peak_projection JSONB DEFAULT '{}'::jsonb,
  adaptation_flags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_individual_guidance_user_date
  ON public.individual_guidance_snapshots(user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_individual_profiles_goal_profile
  ON public.individual_profiles USING GIN (goal_profile);

CREATE INDEX IF NOT EXISTS idx_individual_profiles_sport_profile
  ON public.individual_profiles USING GIN (sport_profile);

ALTER TABLE public.individual_guidance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Individuals can manage own guidance snapshots" ON public.individual_guidance_snapshots;
CREATE POLICY "Individuals can manage own guidance snapshots"
  ON public.individual_guidance_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.individual_guidance_snapshots TO postgres, service_role, authenticated;

NOTIFY pgrst, 'reload schema';
