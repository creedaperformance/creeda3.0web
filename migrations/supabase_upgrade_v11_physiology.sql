-- Migration: Physiology Profiling Integration (v11)
-- Adds storage support for 10-domain physiology profiling and objective reaction testing in diagnostics.

ALTER TABLE public.diagnostics 
ADD COLUMN IF NOT EXISTS physiology_profile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS reaction_profile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS performance_baseline JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.diagnostics.physiology_profile IS 'Self-perception metrics across 10 physiological domains.';
COMMENT ON COLUMN public.diagnostics.reaction_profile IS 'Objective millisecond response time and confidence.';
COMMENT ON COLUMN public.diagnostics.performance_baseline IS 'Consolidated physiological baseline for trend engine scoring.';

-- Grant permissions if necessary (Diagnostics table already has RLS enabled)
-- Policies are usually table-level, so new columns are automatically covered.
