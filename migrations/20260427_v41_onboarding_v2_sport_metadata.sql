-- Onboarding v2.1 — store structured sport + goal metadata on profiles so the
-- engine and dashboards can query without parsing free-text labels.
-- Idempotent (uses IF NOT EXISTS / DROP CONSTRAINT IF EXISTS).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_sport_id TEXT,
  ADD COLUMN IF NOT EXISTS position_id TEXT,
  ADD COLUMN IF NOT EXISTS competitive_level TEXT,
  ADD COLUMN IF NOT EXISTS years_in_sport NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS secondary_sport_id TEXT,
  ADD COLUMN IF NOT EXISTS movement_preferences TEXT[],
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS years_active NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS goal_time_horizon TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_competitive_level_check,
  ADD CONSTRAINT profiles_competitive_level_check CHECK (
    competitive_level IS NULL OR competitive_level IN (
      'casual', 'school', 'club', 'district', 'state', 'national', 'pro'
    )
  ),
  DROP CONSTRAINT IF EXISTS profiles_activity_level_check,
  ADD CONSTRAINT profiles_activity_level_check CHECK (
    activity_level IS NULL OR activity_level IN (
      'sedentary', 'light', 'moderate', 'active'
    )
  ),
  DROP CONSTRAINT IF EXISTS profiles_goal_time_horizon_check,
  ADD CONSTRAINT profiles_goal_time_horizon_check CHECK (
    goal_time_horizon IS NULL OR goal_time_horizon IN (
      'four_weeks', 'twelve_weeks', 'six_months', 'one_year', 'ongoing'
    )
  ),
  DROP CONSTRAINT IF EXISTS profiles_years_in_sport_check,
  ADD CONSTRAINT profiles_years_in_sport_check CHECK (
    years_in_sport IS NULL OR (years_in_sport >= 0 AND years_in_sport <= 60)
  ),
  DROP CONSTRAINT IF EXISTS profiles_years_active_check,
  ADD CONSTRAINT profiles_years_active_check CHECK (
    years_active IS NULL OR (years_active >= 0 AND years_active <= 60)
  );

CREATE INDEX IF NOT EXISTS idx_profiles_primary_sport_id
  ON public.profiles(primary_sport_id)
  WHERE primary_sport_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_competitive_level
  ON public.profiles(competitive_level)
  WHERE competitive_level IS NOT NULL;

COMMENT ON COLUMN public.profiles.primary_sport_id IS 'Onboarding v2 structured sport id (e.g. "cricket", "football"). Free-text label remains in primary_sport for backward compat.';
COMMENT ON COLUMN public.profiles.position_id IS 'Onboarding v2 structured position id within the sport.';
COMMENT ON COLUMN public.profiles.competitive_level IS 'Onboarding v2 competitive ladder (casual..pro).';
COMMENT ON COLUMN public.profiles.movement_preferences IS 'Individual persona — multi-select movement chips.';
COMMENT ON COLUMN public.profiles.activity_level IS 'Individual persona — sedentary..active.';
COMMENT ON COLUMN public.profiles.goal_time_horizon IS 'Onboarding v2 — phase 1 goal horizon (4 weeks..ongoing).';
