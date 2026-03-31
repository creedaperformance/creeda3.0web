-- ==========================================
-- PATCH 01: MISSING ONBOARDING COLUMNS
-- ==========================================
-- This patch adds columns that were missed in the Master Schema V2
-- but are required by the frontend onboarding flows.

-- 1. Update Profiles Table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS medical_disclaimer_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS guardian_consent_confirmed BOOLEAN DEFAULT FALSE;

-- 2. Update Teams Table
-- Add administrative context for coach/squad management
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS coaching_level TEXT,
  ADD COLUMN IF NOT EXISTS team_type TEXT,
  ADD COLUMN IF NOT EXISTS main_coaching_focus TEXT,
  ADD COLUMN IF NOT EXISTS squad_size_category TEXT,
  ADD COLUMN IF NOT EXISTS training_frequency TEXT;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
