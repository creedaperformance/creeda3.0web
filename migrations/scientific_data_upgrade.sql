-- Migration: Scientific Data Upgrade
-- Adds high-resolution metrics for better athletic intelligence.

-- 1. Add high-res columns to daily_load_logs
ALTER TABLE public.daily_load_logs 
ADD COLUMN IF NOT EXISTS sleep_latency TEXT,
ADD COLUMN IF NOT EXISTS urine_color TEXT,
ADD COLUMN IF NOT EXISTS motivation TEXT,
ADD COLUMN IF NOT EXISTS life_stress TEXT,
ADD COLUMN IF NOT EXISTS recovery_score_numeric INTEGER;

-- 2. Add baseline chronic load to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS performance_baseline JSONB DEFAULT '{}'::jsonb;

-- 3. Add critical risks to teams
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS critical_risks TEXT[] DEFAULT '{}'::text[];

-- 3. Update existing views if any (none detected that would break)
