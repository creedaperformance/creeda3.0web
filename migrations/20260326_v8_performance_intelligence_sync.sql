-- CREEDA V8: Bio-Telemetry Performance Intelligence Sync
-- Aligns database schema with the 10-domain physiological model and elite CNS reaction markers.

-- 1. EXTEND DAILY LOGS FOR OBJECTIVE CNS TRACKING
ALTER TABLE public.daily_load_logs 
ADD COLUMN IF NOT EXISTS reaction_time_ms INTEGER;

-- 2. UPDATE PHYSIOLOGY DOCUMENTATION
-- diagnostics.physiology_profile (JSONB) now supports:
-- endurance, power, agility, strength, neural, recovery, fatigue, load, robustness, coordination

COMMENT ON COLUMN public.diagnostics.physiology_profile IS 'Elite Bio-Telemetry: 10-domain physiological matrix (v4.2 expansion).';
COMMENT ON COLUMN public.daily_load_logs.reaction_time_ms IS 'Objective CNS marker: sub-second reaction performance (ms).';

-- 3. VERIFY STABILITY WAVEFORM INDEX (Ensure coach-level discovery is optimized)
CREATE INDEX IF NOT EXISTS idx_logs_stability_waveform ON public.daily_load_logs (stability_waveform);

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
