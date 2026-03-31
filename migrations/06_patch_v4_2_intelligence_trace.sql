-- ==========================================
-- CREEDA V4.2: INTELLIGENCE PERSISTENCE PATCH
-- ==========================================
-- Adds dedicated audit columns for the V4.2 Decision Trace Engine,
-- Stability Waveforms, and Normalized Priority Scoring.

-- 1. EXTEND DAILY LOAD LOGS (Primary Record Audit)
ALTER TABLE public.daily_load_logs 
ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT 'v4',
ADD COLUMN IF NOT EXISTS trace_logs TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS stability_waveform TEXT,
ADD COLUMN IF NOT EXISTS priority_score NUMERIC DEFAULT 0;

-- 2. EXTEND READINESS FACTORS (Analytics Breakdown)
ALTER TABLE public.readiness_factors
ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT 'v4',
ADD COLUMN IF NOT EXISTS trace_logs TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS stability_waveform TEXT,
ADD COLUMN IF NOT EXISTS fatigue_memory NUMERIC DEFAULT 0;

-- 3. INDEXING FOR COACH SQUAD DISCOVERY
CREATE INDEX IF NOT EXISTS idx_logs_priority ON public.daily_load_logs (priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_logs_stability ON public.daily_load_logs (stability_waveform);

-- 4. COMMENTARY
COMMENT ON COLUMN public.daily_load_logs.trace_logs IS 'V4.2: Human-readable mathematical rationale for transparency audit.';
COMMENT ON COLUMN public.daily_load_logs.stability_waveform IS 'V4.2: Qualitative indicator of data stability (stable, slight_waveform, jagged_waveform).';
COMMENT ON COLUMN public.daily_load_logs.priority_score IS 'V4.2: Normalized rank (Risk * 0.5 + Uncertainty * 0.3 + Trend * 0.2).';
