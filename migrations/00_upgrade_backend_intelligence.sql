-- ==========================================
-- CREEDA BACKEND INTELLIGENCE UPGRADE (V4.1)
-- Shifting computational load to Supabase Triggers
-- ==========================================

-- 1. [DATA TRANSFORMATION] Map legacy TEXT labels to NUMERIC (1-10)
-- This ensures no data loss during the type cast.

UPDATE public.daily_load_logs
SET 
  sleep_quality = CASE 
    WHEN sleep_quality = 'Excellent' THEN '10'
    WHEN sleep_quality = 'Good' THEN '8'
    WHEN sleep_quality = 'Okay' THEN '5'
    WHEN sleep_quality = 'Poor' THEN '2'
    ELSE '5' END,
  energy_level = CASE 
    WHEN energy_level = 'Peak' THEN '10'
    WHEN energy_level = 'High' THEN '8'
    WHEN energy_level = 'Moderate' THEN '5'
    WHEN energy_level = 'Low' THEN '3'
    WHEN energy_level = 'Drained' THEN '1'
    ELSE '5' END,
  muscle_soreness = CASE 
    WHEN muscle_soreness = 'None' THEN '0'
    WHEN muscle_soreness = 'Light/Fresh' THEN '2'
    WHEN muscle_soreness = 'Normal' THEN '4'
    WHEN muscle_soreness = 'Heavy' THEN '7'
    WHEN muscle_soreness = 'Stiff/Sore' THEN '10'
    ELSE '4' END,
  stress_level = CASE 
    WHEN stress_level = 'None' THEN '0'
    WHEN stress_level = 'Low' THEN '3'
    WHEN stress_level = 'Moderate' THEN '5'
    WHEN stress_level = 'High' THEN '8'
    WHEN stress_level = 'Extremely High' THEN '10'
    ELSE '5' END
WHERE sleep_quality IS NOT NULL OR energy_level IS NOT NULL;

-- 2. [SCHEMA UPGRADE] Alter columns to NUMERIC and apply RENAME
ALTER TABLE public.daily_load_logs 
  ALTER COLUMN sleep_quality TYPE NUMERIC USING sleep_quality::NUMERIC,
  ALTER COLUMN energy_level TYPE NUMERIC USING energy_level::NUMERIC,
  ALTER COLUMN muscle_soreness TYPE NUMERIC USING muscle_soreness::NUMERIC,
  ALTER COLUMN stress_level TYPE NUMERIC USING stress_level::NUMERIC;

ALTER TABLE public.daily_load_logs RENAME COLUMN sleep_quality TO sleep;
ALTER TABLE public.daily_load_logs RENAME COLUMN energy_level TO energy;
ALTER TABLE public.daily_load_logs RENAME COLUMN muscle_soreness TO soreness;
ALTER TABLE public.daily_load_logs RENAME COLUMN stress_level TO stress;

-- 3. [SCHEMA UPGRADE] Add new computed columns (NUMERIC)
ALTER TABLE public.daily_load_logs 
  ADD COLUMN IF NOT EXISTS acute_load_7d NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chronic_load_28d NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acwr_ratio NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS base_readiness NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_factor NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS final_readiness NUMERIC DEFAULT 0;

-- 4. [LOGIC] Create the Calculation Function
CREATE OR REPLACE FUNCTION public.calculate_creeda_daily_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_acute_total NUMERIC;
    v_chronic_total NUMERIC;
    v_acute_avg NUMERIC;
    v_chronic_avg NUMERIC;
BEGIN
    -- A. Calculate Load Score
    NEW.load_score := COALESCE(NEW.session_rpe, 0) * COALESCE(NEW.duration_minutes, 0);

    -- B. Calculate Base Readiness (Weighted Model)
    -- Formula: (Sleep*10*0.25) + (Energy*10*0.30) + ((10-Soreness)*10*0.25) + ((10-Stress)*10*0.20)
    NEW.base_readiness := 
        (COALESCE(NEW.sleep, 5) * 10 * 0.25) + 
        (COALESCE(NEW.energy, 5) * 10 * 0.30) + 
        ((10 - COALESCE(NEW.soreness, 4)) * 10 * 0.25) + 
        ((10 - COALESCE(NEW.stress, 5)) * 10 * 0.20);
    
    -- C. Fetch Historical Load for ACWR
    -- We include the NEW.load_score in the moving averages
    SELECT COALESCE(SUM(load_score), 0) INTO v_acute_total 
    FROM public.daily_load_logs 
    WHERE athlete_id = NEW.athlete_id 
      AND log_date < NEW.log_date 
      AND log_date >= (NEW.log_date - INTERVAL '6 days');
    
    v_acute_avg := (v_acute_total + NEW.load_score) / 7.0;

    SELECT COALESCE(SUM(load_score), 0) INTO v_chronic_total 
    FROM public.daily_load_logs 
    WHERE athlete_id = NEW.athlete_id 
      AND log_date < NEW.log_date 
      AND log_date >= (NEW.log_date - INTERVAL '27 days');
    
    v_chronic_avg := (v_chronic_total + NEW.load_score) / 28.0;

    NEW.acute_load_7d := ROUND(v_acute_avg, 2);
    NEW.chronic_load_28d := ROUND(v_chronic_avg, 2);

    -- D. Calculate ACWR Ratio
    IF v_chronic_avg > 0 THEN
        NEW.acwr_ratio := ROUND(v_acute_avg / v_chronic_avg, 2);
    ELSE
        NEW.acwr_ratio := 1.0;
    END IF;

    -- E. Final Readiness (Dampened by Trust Factor)
    NEW.final_readiness := ROUND(NEW.base_readiness * COALESCE(NEW.trust_factor, 1.0));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. [TRIGGER] Attach to Daily Load Logs
DROP TRIGGER IF EXISTS tr_calculate_creeda_metrics ON public.daily_load_logs;
CREATE TRIGGER tr_calculate_creeda_metrics
BEFORE INSERT OR UPDATE ON public.daily_load_logs
FOR EACH ROW EXECUTE PROCEDURE public.calculate_creeda_daily_metrics();

-- 6. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
