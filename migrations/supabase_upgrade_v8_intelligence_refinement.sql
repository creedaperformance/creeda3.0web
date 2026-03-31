-- ==========================================
-- CREEDA SCHEMA UPDATE: INTELLIGENCE V8
-- ==========================================
-- This update ensures the database supports the new "Precision Refinement"
-- features, including session importance and persistent intelligence outputs.

-- 1. Ensure Daily Load Logs has the new high-signal columns
ALTER TABLE public.daily_load_logs 
ADD COLUMN IF NOT EXISTS session_importance TEXT,            -- normal training, high intensity, match / competition, testing day
ADD COLUMN IF NOT EXISTS intelligence_meta JSONB DEFAULT '{}'::jsonb; -- Stores structured judgements & recommendations

-- 2. Add description for the new metadata field
COMMENT ON COLUMN public.daily_load_logs.intelligence_meta IS 'Stores the AI-generated performance judgement and reasoned recommendations for historical tracking.';

-- 3. Update Teams table (Ensuring V7 context is present)
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS training_frequency TEXT,
ADD COLUMN IF NOT EXISTS main_coaching_focus TEXT;

-- 4. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
