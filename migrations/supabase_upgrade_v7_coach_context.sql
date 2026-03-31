-- ==========================================
-- CREEDA SCHEMA UPDATE: COACH CONTEXT V7
-- ==========================================
-- This update adds columns to the teams table to store 
-- rich coaching context collected during onboarding.

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS coaching_level TEXT,
ADD COLUMN IF NOT EXISTS team_type TEXT,
ADD COLUMN IF NOT EXISTS main_coaching_focus TEXT,
ADD COLUMN IF NOT EXISTS squad_size_category TEXT,
ADD COLUMN IF NOT EXISTS training_frequency TEXT;

-- Update Master Schema Record (for documentation clarity)
COMMENT ON COLUMN public.teams.coaching_level IS 'Professional context: Private, Academy, or School/Uni.';
COMMENT ON COLUMN public.teams.team_type IS 'Squad structure: Single, Multiple, or Individuals.';
COMMENT ON COLUMN public.teams.training_frequency IS 'Training intensity baseline for intelligence engine.';
