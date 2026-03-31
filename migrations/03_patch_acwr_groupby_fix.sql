-- ==========================================
-- PATCH 03: ACWR & GROUP BY SYNTAX FIX
-- ==========================================
-- This patch fixes the PostgreSQL syntax error related to log_date grouping
-- and consolidates the redundant triggers on daily_load_logs.

-- 1. CLEANUP: Remove redundant and broken triggers
DROP TRIGGER IF EXISTS tr_calculate_creeda_metrics ON public.daily_load_logs;
DROP TRIGGER IF EXISTS tr_calculate_load_and_readiness ON public.daily_load_logs;

-- 2. INFRASTRUCTURE: Ensure all computed columns exist
ALTER TABLE public.daily_load_logs 
  ADD COLUMN IF NOT EXISTS acute_load_7d NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chronic_load_28d NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acwr_ratio NUMERIC DEFAULT 1.0;

-- 3. CORE LOGIC: Consolidated Master Intelligence Trigger
CREATE OR REPLACE FUNCTION public.calculate_sport_intelligence()
RETURNS TRIGGER AS $$
DECLARE
    v_sleep_score INTEGER;
    v_energy_score INTEGER;
    v_sore_score INTEGER;
    v_stress_score INTEGER;
    v_pain_penalty INTEGER;
    v_raw_readiness INTEGER;
    v_consecutive_count INTEGER;
    v_acute_total NUMERIC;
    v_chronic_total NUMERIC;
    v_acute_avg NUMERIC;
    v_chronic_avg NUMERIC;
BEGIN
    -- STEP 1: Calculate Load Score (Current Session)
    IF NEW.duration_minutes IS NOT NULL AND NEW.session_rpe IS NOT NULL THEN
        NEW.load_score := NEW.duration_minutes * NEW.session_rpe;
    END IF;

    -- STEP 2: Calculate Readiness Components (0-100 scale)
    v_sleep_score := public.map_performance_metric(NEW.sleep_quality);
    v_energy_score := public.map_performance_metric(NEW.energy_level);
    v_sore_score := 100 - public.map_performance_metric(NEW.muscle_soreness); -- Invert
    v_stress_score := 100 - public.map_performance_metric(NEW.stress_level); -- Invert
    v_pain_penalty := COALESCE(NEW.current_pain_level, 0) * 10;

    -- Standard Readiness Formula (Physical-Mental Composite)
    v_raw_readiness := (v_sleep_score * 0.25 + v_energy_score * 0.25 + v_sore_score * 0.25 + (100 - v_stress_score) * 0.15 + (100 - v_pain_penalty) * 0.10);
    
    -- STEP 3: Integrity Layer (Repetition Detection)
    -- FIX: Use subquery to count restricted set to avoid GROUP BY / ORDER BY conflict
    SELECT count(*) INTO v_consecutive_count
    FROM (
        SELECT 1 
        FROM public.daily_load_logs
        WHERE athlete_id = NEW.athlete_id
          AND sleep_quality = NEW.sleep_quality
          AND energy_level = NEW.energy_level
          AND muscle_soreness = NEW.muscle_soreness
          AND id != NEW.id
        ORDER BY log_date DESC
        LIMIT 4
    ) sub;

    IF v_consecutive_count >= 4 THEN
        NEW.trust_score := 0.8; -- Repetition penalty
    ELSE
        NEW.trust_score := 1.0;
    END IF;

    -- STEP 4: Rolling Averages (ACWR)
    -- Acute Total (Last 6 days + Current)
    SELECT COALESCE(SUM(load_score), 0) INTO v_acute_total 
    FROM public.daily_load_logs 
    WHERE athlete_id = NEW.athlete_id 
      AND log_date < NEW.log_date 
      AND log_date >= (NEW.log_date - INTERVAL '6 days');
    
    v_acute_avg := (v_acute_total + COALESCE(NEW.load_score, 0)) / 7.0;

    -- Chronic Total (Last 27 days + Current)
    SELECT COALESCE(SUM(load_score), 0) INTO v_chronic_total 
    FROM public.daily_load_logs 
    WHERE athlete_id = NEW.athlete_id 
      AND log_date < NEW.log_date 
      AND log_date >= (NEW.log_date - INTERVAL '27 days');
    
    v_chronic_avg := (v_chronic_total + COALESCE(NEW.load_score, 0)) / 28.0;

    NEW.acute_load_7d := ROUND(v_acute_avg, 2);
    NEW.chronic_load_28d := ROUND(v_chronic_avg, 2);

    IF v_chronic_avg > 0 THEN
        NEW.acwr_ratio := ROUND(v_acute_avg / v_chronic_avg, 2);
    ELSE
        NEW.acwr_ratio := 1.0;
    END IF;

    -- STEP 5: Final Adjusted Readiness
    NEW.readiness_score := ROUND(v_raw_readiness * NEW.trust_score)::integer;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. ATTACH: Reactivate single consolidated trigger
CREATE TRIGGER tr_calculate_sport_intelligence
BEFORE INSERT OR UPDATE ON public.daily_load_logs
FOR EACH ROW EXECUTE PROCEDURE public.calculate_sport_intelligence();

-- Refresh Cache
NOTIFY pgrst, 'reload schema';
