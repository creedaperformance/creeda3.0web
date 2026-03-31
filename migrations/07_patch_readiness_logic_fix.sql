-- Migration: Readiness Calculation Logic Fix (07)
-- Fixes the inversion logic for soreness and stress to correctly handle 'None' states.

CREATE OR REPLACE FUNCTION public.calculate_load_and_readiness()
RETURNS TRIGGER AS $$
DECLARE
    v_sleep_score INTEGER;
    v_energy_score INTEGER;
    v_sore_score INTEGER;
    v_stress_score INTEGER;
    v_pain_penalty INTEGER;
    v_raw_readiness INTEGER;
    v_consecutive_count INTEGER;
BEGIN
    -- 1. Calculate Load Score
    IF NEW.duration_minutes IS NOT NULL AND NEW.session_rpe IS NOT NULL THEN
        NEW.load_score := NEW.duration_minutes * NEW.session_rpe;
    END IF;

    -- 2. Calculate Readiness Components
    -- Based on map_performance_metric: Excellent/None = 100, Good/High = 80, Moderate = 50, Poor/Low = 30
    v_sleep_score := public.map_performance_metric(NEW.sleep_quality);
    v_energy_score := public.map_performance_metric(NEW.energy_level);
    
    -- Soreness: Invert the metric because 'High' (80) soreness is bad, 'None' (100) is good.
    -- Correction: If val is 'None' (100), we want 100. If val is 'High' (80), we want 20.
    v_sore_score := public.map_performance_metric(NEW.muscle_soreness);
    IF NEW.muscle_soreness = 'None' THEN v_sore_score := 100;
    ELSIF NEW.muscle_soreness = 'Low' THEN v_sore_score := 80;
    ELSIF NEW.muscle_soreness = 'Moderate' THEN v_sore_score := 50;
    ELSIF NEW.muscle_soreness = 'High' THEN v_sore_score := 20;
    ELSE v_sore_score := 50;
    END IF;

    -- Stress: Similar logic
    v_stress_score := public.map_performance_metric(NEW.stress_level);
    IF NEW.stress_level = 'None' OR NEW.stress_level = 'Low' THEN v_stress_score := 100;
    ELSIF NEW.stress_level = 'Moderate' THEN v_stress_score := 60;
    ELSIF NEW.stress_level = 'High' THEN v_stress_score := 30;
    ELSE v_stress_score := 80;
    END IF;

    v_pain_penalty := COALESCE(NEW.current_pain_level, 0) * 10;

    -- Standard Readiness Formula (Physical-Mental Composite)
    -- Weighted: Sleep(25%) + Energy(25%) + Soreness(25%) + Stress(15%) + Pain(10%)
    v_raw_readiness := (v_sleep_score * 0.25 + v_energy_score * 0.25 + v_sore_score * 0.25 + v_stress_score * 0.15 + (100 - v_pain_penalty) * 0.10);
    
    -- 3. Integrity Layer (Trust Score)
    -- Repetition Detection
    SELECT count(*) INTO v_consecutive_count
    FROM public.daily_load_logs
    WHERE athlete_id = NEW.athlete_id
      AND sleep_quality = NEW.sleep_quality
      AND energy_level = NEW.energy_level
      AND muscle_soreness = NEW.muscle_soreness
      AND id != NEW.id
      AND log_date > (CURRENT_DATE - INTERVAL '7 days')
    LIMIT 4;

    IF v_consecutive_count >= 4 THEN
        NEW.trust_score := 0.8; -- Repetition penalty
    ELSE
        NEW.trust_score := 1.0;
    END IF;

    -- Final Adjusted Readiness
    NEW.readiness_score := ROUND(v_raw_readiness * NEW.trust_score)::integer;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
