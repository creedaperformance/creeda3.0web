-- ==========================================
-- CREEDA SCHEMA UPDATE: WELLNESS FORM V5 FIX
-- ==========================================
-- This update ensures the daily_load_logs table contains all high-signal
-- analytics columns required for the new 7-step wellness check-in.

ALTER TABLE public.daily_load_logs 
ADD COLUMN IF NOT EXISTS yesterday_load_demand TEXT,         -- low, moderate, high
ADD COLUMN IF NOT EXISTS yesterday_duration_category TEXT,   -- <1h, 1-2h, >2h
ADD COLUMN IF NOT EXISTS focus_level TEXT,                   -- low, moderate, high
ADD COLUMN IF NOT EXISTS stress_level TEXT,                   -- low, moderate, high
ADD COLUMN IF NOT EXISTS confidence_level TEXT,              -- low, moderate, high
ADD COLUMN IF NOT EXISTS day_type TEXT,                      -- training, competition, recovery, travel, rest
ADD COLUMN IF NOT EXISTS session_importance TEXT,            -- normal, high, match, testing
ADD COLUMN IF NOT EXISTS competition_tomorrow BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sport_specific_daily JSONB DEFAULT '{}'::jsonb;

-- Ensure logic for readiness score is consistent with new mental markers
COMMENT ON COLUMN public.daily_load_logs.confidence_level IS 'Athlete psychological marker for readiness engine.';
COMMENT ON COLUMN public.daily_load_logs.competition_tomorrow IS 'Intelligence trigger for pre-competition preparation logic.';
