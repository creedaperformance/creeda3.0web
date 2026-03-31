-- SUPABASE MIGRATION V6: SPORT INTELLIGENCE SYNC
-- Synchronizing database with redesigned Onboarding and Daily Wellness Log (v1.22)

-- 1. Update Diagnostics Table
-- Add primary_limiter field to capture sport-specific bottlenecks
ALTER TABLE public.diagnostics ADD COLUMN IF NOT EXISTS primary_limiter TEXT;

-- 2. Update Daily Load Logs Table
-- First, drop the old numeric check constraints to prevent type mismatch errors
ALTER TABLE public.daily_load_logs 
  DROP CONSTRAINT IF EXISTS daily_load_logs_sleep_quality_check,
  DROP CONSTRAINT IF EXISTS daily_load_logs_recovery_feel_check,
  DROP CONSTRAINT IF EXISTS daily_load_logs_fatigue_check,
  DROP CONSTRAINT IF EXISTS daily_load_logs_muscle_soreness_check,
  DROP CONSTRAINT IF EXISTS daily_load_logs_stress_level_check,
  DROP CONSTRAINT IF EXISTS daily_load_logs_mental_readiness_check;

-- Now change metric columns to TEXT to support discrete performance enums
ALTER TABLE public.daily_load_logs 
  ALTER COLUMN sleep_quality TYPE TEXT,
  ALTER COLUMN recovery_feel TYPE TEXT,
  ALTER COLUMN fatigue TYPE TEXT,
  ALTER COLUMN muscle_soreness TYPE TEXT,
  ALTER COLUMN stress_level TYPE TEXT,
  ALTER COLUMN mental_readiness TYPE TEXT;

-- Add new sport-specific performance markers
ALTER TABLE public.daily_load_logs ADD COLUMN IF NOT EXISTS energy_level TEXT;
ALTER TABLE public.daily_load_logs ADD COLUMN IF NOT EXISTS body_feel TEXT;
ALTER TABLE public.daily_load_logs ADD COLUMN IF NOT EXISTS sport_specific_micro TEXT;

-- 3. Cleanup Legacy Logic
COMMENT ON TABLE public.daily_load_logs IS 'Stores athletic readiness markers using discrete performance enums.';
