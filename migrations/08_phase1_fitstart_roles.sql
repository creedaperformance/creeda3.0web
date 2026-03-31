-- Phase 1 CREEDA Expansion: FitStart Metrics
-- Safely appends new profile attributes without altering the core Intelligence tracking columns

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fitstart_goal TEXT,
ADD COLUMN IF NOT EXISTS fitstart_fitness_level INTEGER,
ADD COLUMN IF NOT EXISTS fitstart_injuries JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fitstart_preferences TEXT,
ADD COLUMN IF NOT EXISTS fitstart_time_available INTEGER,
ADD COLUMN IF NOT EXISTS fitstart_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fitstart_time_taken INTEGER;
