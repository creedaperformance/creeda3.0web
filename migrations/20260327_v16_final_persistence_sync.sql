-- CREEDA V16: FINAL PERSISTENCE & INTELLIGENCE SYNC
-- Resolves the trigger crash caused by renamed columns and unified RLS for all pathways.

-- 1. SYNCHRONIZE COLUMN NAMES (Safety check for migration order)
-- PostgreSQL does not support IF EXISTS for RENAME COLUMN, so we use a DO block.
DO $$ 
BEGIN
    -- Sleep
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_load_logs' AND column_name='sleep_quality') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_load_logs' AND column_name='sleep') THEN
        ALTER TABLE public.daily_load_logs RENAME COLUMN sleep_quality TO sleep;
    END IF;
    -- Energy
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_load_logs' AND column_name='energy_level') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_load_logs' AND column_name='energy') THEN
        ALTER TABLE public.daily_load_logs RENAME COLUMN energy_level TO energy;
    END IF;
    -- Soreness
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_load_logs' AND column_name='muscle_soreness') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_load_logs' AND column_name='soreness') THEN
        ALTER TABLE public.daily_load_logs RENAME COLUMN muscle_soreness TO soreness;
    END IF;
    -- Stress
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_load_logs' AND column_name='stress_level') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_load_logs' AND column_name='stress') THEN
        ALTER TABLE public.daily_load_logs RENAME COLUMN stress_level TO stress;
    END IF;
END $$;

-- 2. FIX V4 INTELLIGENCE TRIGGER (Align with renamed columns)
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
    -- Fetch latest diagnostic baseline
    SELECT * INTO v_diagnostic FROM public.diagnostics WHERE athlete_id = NEW.athlete_id ORDER BY created_at DESC LIMIT 1;
    
    -- 1. Calculate Load (ACWR) - Using pre-computed columns from BEFORE trigger if available
    v_acute_load := COALESCE(NEW.acute_load_7d, 0);
    v_chronic_load := COALESCE(NEW.chronic_load_28d, 300);
    v_acwr := COALESCE(NEW.acwr_ratio, 1.0);

    -- 2. Normalize Readiness (Sleep, Energy, Soreness, Stress)
    -- Aligning with RENAMED columns (sleep, energy, soreness, stress)
    -- Inputs are cast to text then to numeric for map_performance_metric compatibility
    v_readiness_norm := (
        public.map_performance_metric(NEW.sleep::text) * 0.3 +
        public.map_performance_metric(NEW.energy::text) * 0.3 +
        (100 - public.map_performance_metric(NEW.soreness::text)) * 0.2 +
        (100 - public.map_performance_metric(NEW.stress::text)) * 0.2
    );

    -- 3. Calculate Recovery Capacity
    v_recovery_cap := COALESCE((v_diagnostic.physiology_profile->>'recovery_efficiency')::integer, 50);

    -- 4. Determine Status & Hierarchy via core logic
    SELECT status, priority, action INTO v_status, v_priority, v_action 
    FROM public.determine_creeda_status(v_acwr, v_recovery_cap, v_readiness_norm);

    -- 5. Upsert to computed_intelligence (Central Dashboard Source)
    INSERT INTO public.computed_intelligence (
        user_id, log_date, readiness_score, risk_score, 
        recovery_capacity, status, reason, 
        action_instruction, alert_priority, intelligence_trace
    ) VALUES (
        NEW.athlete_id, NEW.log_date, v_readiness_norm, v_acwr,
        v_recovery_cap, v_status, 'Unified V16 Sync Update',
        v_action, v_priority, 
        jsonb_build_object(
            'acute_load', v_acute_load,
            'chronic_load', v_chronic_load,
            'raw_readiness', v_readiness_norm,
            'version', 'V16-V4.2'
        )
    ) ON CONFLICT (user_id, log_date) DO UPDATE SET
        readiness_score = EXCLUDED.readiness_score,
        risk_score = EXCLUDED.risk_score,
        status = EXCLUDED.status,
        action_instruction = EXCLUDED.action_instruction,
        alert_priority = EXCLUDED.alert_priority,
        intelligence_trace = EXCLUDED.intelligence_trace;

    -- 6. Update Streaks Logic
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

-- Re-attach the AFTER trigger
DROP TRIGGER IF EXISTS tr_v4_intelligence_update ON public.daily_load_logs;
CREATE TRIGGER tr_v4_intelligence_update
AFTER INSERT OR UPDATE ON public.daily_load_logs
FOR EACH ROW EXECUTE PROCEDURE public.update_v4_intelligence();

-- 3. CONSOLIDATE ROW LEVEL SECURITY (RLS)
-- Ensure uninhibited data flow for all roles while maintaining strict ownership

-- Computed Intelligence
ALTER TABLE public.computed_intelligence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own intelligence" ON public.computed_intelligence;
CREATE POLICY "Users can manage own intelligence" 
    ON public.computed_intelligence FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Individual Guidance Snapshots
ALTER TABLE public.individual_guidance_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own snapshots" ON public.individual_guidance_snapshots;
CREATE POLICY "Users can manage own snapshots" 
    ON public.individual_guidance_snapshots FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. GRANTS (Authenticated Users only)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
