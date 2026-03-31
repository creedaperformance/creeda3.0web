-- Migration: Add competition_tomorrow trigger for performance intelligence hierarchy
-- Purpose: Enables Step 1 of the new 5-step scoring hierarchy (Contextual Readiness)

ALTER TABLE public.daily_load_logs 
ADD COLUMN IF NOT EXISTS competition_tomorrow BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.daily_load_logs.competition_tomorrow IS 'Intelligence trigger for pre-competition preparation logic.';
