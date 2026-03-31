-- ==========================================
-- PATCH 02: RATE LIMITING & LOG COLUMNS
-- ==========================================
-- This patch restores the rate-limiting infrastructure and adds
-- missing columns to public.daily_load_logs required by the wellness flow.

-- 1. [RATE LIMITING INFRASTRUCTURE]
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Cleanup old entries in window (passive cleanup)
    DELETE FROM public.rate_limits WHERE last_attempt < NOW() - (p_window_seconds || ' seconds')::INTERVAL;

    INSERT INTO public.rate_limits (key, count, last_attempt)
    VALUES (p_key, 1, NOW())
    ON CONFLICT (key) DO UPDATE
    SET 
        count = CASE 
            WHEN public.rate_limits.last_attempt < NOW() - (p_window_seconds || ' seconds')::INTERVAL THEN 1
            ELSE public.rate_limits.count + 1
        END,
        last_attempt = NOW();

    RETURN (SELECT count <= p_limit FROM public.rate_limits WHERE key = p_key);
END;
$$;

-- 2. [DAILY LOAD LOGS SCHEMA EXTENSION]
ALTER TABLE public.daily_load_logs
  -- Numeric Wellness (1-10)
  ADD COLUMN IF NOT EXISTS sleep INTEGER,
  ADD COLUMN IF NOT EXISTS energy INTEGER,
  ADD COLUMN IF NOT EXISTS soreness INTEGER,
  ADD COLUMN IF NOT EXISTS stress INTEGER,
  
  -- Context Flags
  ADD COLUMN IF NOT EXISTS competition_today BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS competition_tomorrow BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS competition_yesterday BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_match_day BOOLEAN DEFAULT FALSE,
  
  -- Extended Wellness & Metrics
  ADD COLUMN IF NOT EXISTS sleep_latency TEXT,
  ADD COLUMN IF NOT EXISTS nutrition TEXT,
  ADD COLUMN IF NOT EXISTS hydration_level INTEGER,
  ADD COLUMN IF NOT EXISTS mood_score INTEGER,
  ADD COLUMN IF NOT EXISTS recovery_score INTEGER,
  ADD COLUMN IF NOT EXISTS training_duration TEXT,
  
  -- Computed Metrics (for frontend compatibility)
  ADD COLUMN IF NOT EXISTS acute_load_7d NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chronic_load_28d NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acwr_ratio NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_readiness INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_factor NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS final_readiness INTEGER DEFAULT 0,
  
  -- Complex Data Types
  ADD COLUMN IF NOT EXISTS sport_specific_daily JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS soreness_map JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS menstrual_status TEXT;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
