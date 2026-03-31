-- CREEDA V4: UNIFIED INTELLIGENCE SCHEMA
-- 3-Pathway Architecture: Athlete, Coach, Individual

-- 1. ROLES & PROFILES
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('athlete', 'coach', 'individual'));

-- 2. INDIVIDUAL PATHWAY
CREATE TABLE IF NOT EXISTS public.individual_profiles (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    work_schedule TEXT, -- student / working / full-time
    fitness_level TEXT, -- beginner / intermediate / advanced
    lifestyle_constraints JSONB DEFAULT '{}'::jsonb,
    current_journey_id TEXT, -- mapping to journey templates
    journey_start_date DATE,
    habit_goals JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. INTELLIGENCE & DECISIONS (TIME-SERIES)
CREATE TABLE IF NOT EXISTS public.computed_intelligence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Normalized Scores (0-100)
    readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
    recovery_capacity INTEGER CHECK (recovery_capacity BETWEEN 0 AND 100),
    load_tolerance INTEGER CHECK (load_tolerance BETWEEN 0 AND 100),
    risk_score NUMERIC, -- ACWR Ratio
    
    -- Decision Metadata
    status TEXT CHECK (status IN ('TRAIN', 'MODIFY', 'REST')),
    reason TEXT,
    action_instruction TEXT,
    intelligence_trace JSONB DEFAULT '{}'::jsonb, -- Why this decision was made
    
    -- Alert Level
    alert_priority TEXT CHECK (alert_priority IN ('Critical', 'Warning', 'Informational')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_intelligence_user_date ON public.computed_intelligence (user_id, log_date DESC);

-- 5. HABITS & RETENTION
CREATE TABLE IF NOT EXISTS public.habits_and_streaks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    habit_type TEXT NOT NULL, -- wellness_log, training_adherence, hydration, etc.
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_logged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, habit_type)
);

-- 7. ADVANCED INTELLIGENCE TRIGGERS

-- A. Hierarchy Logic Function
-- Hierarchy: Injury Risk (ACWR) > Recovery Capacity > Readiness
CREATE OR REPLACE FUNCTION public.determine_creeda_status(
    p_risk_score NUMERIC,
    p_recovery_capacity INTEGER,
    p_readiness_score INTEGER
) RETURNS TABLE (status TEXT, priority TEXT, action TEXT) AS $$
BEGIN
    -- 1. CRITICAL: Injury Risk override
    IF p_risk_score > 1.5 THEN
        RETURN QUERY SELECT 'REST'::text, 'Critical'::text, 'MANDATORY REST: ACWR exceeds safety threshold. High injury risk.'::text;
    
    -- 2. WARNING: Recovery Capacity override
    ELSIF p_recovery_capacity < 30 THEN
        RETURN QUERY SELECT 'MODIFY'::text, 'Warning'::text, 'RECOVER: Structural capacity low. Limit to light mobility work.'::text;
    
    -- 3. NORMAL: Readiness based
    ELSIF p_readiness_score < 40 THEN
        RETURN QUERY SELECT 'MODIFY'::text, 'Warning'::text, 'ADAPT: Low readiness markers. Reduce training volume by 50%.'::text;
    ELSIF p_readiness_score > 85 THEN
        RETURN QUERY SELECT 'TRAIN'::text, 'Informational'::text, 'PEAK: All systems green. Prime day for maximal effort.'::text;
    ELSE
        RETURN QUERY SELECT 'TRAIN'::text, 'Informational'::text, 'READY: Maintain standard training volume.'::text;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- B. Unified Intelligence Calculation
CREATE OR REPLACE FUNCTION public.update_v4_intelligence()
RETURNS TRIGGER AS $$
DECLARE
    v_acute_load NUMERIC;
    v_chronic_load NUMERIC;
    v_acwr NUMERIC;
    v_recovery_cap INTEGER;
    v_readiness_norm INTEGER;
    v_status TEXT;
    v_priority TEXT;
    v_action TEXT;
    v_diagnostic RECORD;
    v_sport_multiplier NUMERIC DEFAULT 1.0;
    v_is_calibration BOOLEAN;
BEGIN
    -- Only run for athletes and individuals
    -- Fetch diagnostic baseline
    SELECT * INTO v_diagnostic FROM public.diagnostics WHERE athlete_id = NEW.athlete_id;
    
    -- 1. Calculate Load (ACWR)
    -- Acute (7d)
    SELECT COALESCE(AVG(load_score), 0) INTO v_acute_load
    FROM public.daily_load_logs
    WHERE athlete_id = NEW.athlete_id 
      AND log_date > NEW.log_date - INTERVAL '7 days'
      AND log_date <= NEW.log_date;
      
    -- Chronic (28d)
    SELECT COALESCE(AVG(load_score), 0) INTO v_chronic_load
    FROM public.daily_load_logs
    WHERE athlete_id = NEW.athlete_id 
      AND log_date > NEW.log_date - INTERVAL '28 days'
      AND log_date <= NEW.log_date;

    -- Ramp-up logic for new users (< 14 days)
    SELECT (COUNT(*) < 14) INTO v_is_calibration
    FROM public.daily_load_logs
    WHERE athlete_id = NEW.athlete_id;

    IF v_chronic_load = 0 THEN
        -- Fallback to Onboarding baseline if exists, else 300 (standard load)
        v_chronic_load := 300; 
    END IF;

    v_acwr := v_acute_load / NULLIF(v_chronic_load, 0);

    -- 2. Normalize Readiness (Sleep, Energy, Soreness, Stress)
    -- Inputs are text/enum -> converted via map_performance_metric (0-100)
    v_readiness_norm := (
        public.map_performance_metric(NEW.sleep_quality) * 0.3 +
        public.map_performance_metric(NEW.energy_level) * 0.3 +
        (100 - public.map_performance_metric(NEW.muscle_soreness)) * 0.2 +
        (100 - public.map_performance_metric(NEW.stress_level)) * 0.2
    );

    -- 3. Calculate Recovery Capacity
    v_recovery_cap := COALESCE(v_diagnostic.physiology_profile->>'recovery_efficiency', '50')::integer;
    -- Adjust by recent sleep trends (last 3 days)
    -- (Omitted complex math for SQL simplicity, can be expanded later)

    -- 4. Determine Status & Hierarchy
    SELECT status, priority, action INTO v_status, v_priority, v_action 
    FROM public.determine_creeda_status(v_acwr, v_recovery_cap, v_readiness_norm);

    -- 5. Upsert to computed_intelligence
    INSERT INTO public.computed_intelligence (
        user_id, log_date, readiness_score, risk_score, 
        recovery_capacity, status, reason, 
        action_instruction, alert_priority, intelligence_trace
    ) VALUES (
        NEW.athlete_id, NEW.log_date, v_readiness_norm, v_acwr,
        v_recovery_cap, v_status, 'Automated Intelligence Update',
        v_action, v_priority, 
        jsonb_build_object(
            'acute_load', v_acute_load,
            'chronic_load', v_chronic_load,
            'is_calibration', v_is_calibration,
            'raw_readiness', v_readiness_norm
        )
    ) ON CONFLICT (user_id, log_date) DO UPDATE SET
        readiness_score = EXCLUDED.readiness_score,
        risk_score = EXCLUDED.risk_score,
        status = EXCLUDED.status,
        action_instruction = EXCLUDED.action_instruction,
        alert_priority = EXCLUDED.alert_priority,
        intelligence_trace = EXCLUDED.intelligence_trace;

    -- 7. Update Streaks
    INSERT INTO public.habits_and_streaks (user_id, habit_type, current_streak, last_logged_at)
    VALUES (NEW.athlete_id, 'wellness_log', 1, now())
    ON CONFLICT (user_id, habit_type) DO UPDATE SET
        current_streak = CASE 
            WHEN public.habits_and_streaks.last_logged_at > now() - INTERVAL '36 hours' THEN public.habits_and_streaks.current_streak + 1
            ELSE 1
        END,
        longest_streak = GREATEST(public.habits_and_streaks.longest_streak, public.habits_and_streaks.current_streak + 1),
        last_logged_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- C. Apply Trigger
DROP TRIGGER IF EXISTS tr_v4_intelligence_update ON public.daily_load_logs;
CREATE TRIGGER tr_v4_intelligence_update
AFTER INSERT OR UPDATE ON public.daily_load_logs
FOR EACH ROW EXECUTE PROCEDURE public.update_v4_intelligence();

-- 8. PERMISSIONS
GRANT ALL ON public.individual_profiles TO postgres, service_role, authenticated;
GRANT ALL ON public.computed_intelligence TO postgres, service_role, authenticated;
GRANT ALL ON public.habits_and_streaks TO postgres, service_role, authenticated;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
