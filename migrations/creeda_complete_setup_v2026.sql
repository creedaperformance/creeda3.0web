-- ==========================================
-- CREEDA MASTER SETUP V2026.03.28 (CONSOLIDATED)
-- ==========================================
-- This script provides a complete, zero-dependency setup for the CREEDA platform.
-- It integrates all pathwards (Athlete, Coach, Individual),
-- optimizes the V4.2 Intelligence Engine, and enforces high-end security.

-- 0. PREPARATION: RESET PUBLIC SCHEMA (OPTIONAL - UNCOMMENT IF FRESH START DESIRED)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE ENUMS & HELPERS
CREATE OR REPLACE FUNCTION public.map_performance_metric(val text) 
RETURNS integer AS $$
BEGIN
  RETURN CASE 
    WHEN val IN ('Excellent', 'Peak', 'Locked In', 'Optimal', 'Regular', 'Fresh', 'None') THEN 100
    WHEN val IN ('Good', 'High', 'Normal', 'Focused', 'Okay') THEN 80
    WHEN val IN ('Moderate', 'Average', 'Stable', '3') THEN 50
    WHEN val IN ('Poor', 'Low', 'Stiff/Sore', 'Heavy', 'Distracted', 'Minor symptoms', '2') THEN 30
    WHEN val IN ('Drained', 'Very High', 'Critical', 'Not ready', '1', 'Ill / Injury restricted') THEN 10
    ELSE 50
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text PRIMARY KEY,
    count integer DEFAULT 0,
    last_attempt timestamp with time zone DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM rate_limits WHERE last_attempt < now() - (p_window_seconds || ' seconds')::interval;
    INSERT INTO rate_limits (key, count, last_attempt) VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE SET 
        count = CASE WHEN rate_limits.last_attempt < now() - (p_window_seconds || ' seconds')::interval THEN 1 ELSE rate_limits.count + 1 END,
        last_attempt = now();
    RETURN (SELECT count <= p_limit FROM rate_limits WHERE key = p_key);
END;
$$;

-- 3. CORE TABLES

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('athlete', 'coach', 'individual')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    username TEXT UNIQUE,
    mobile_number TEXT,
    avatar_url TEXT,
    gender TEXT DEFAULT 'Male',
    date_of_birth DATE,
    primary_sport TEXT,
    position TEXT,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subscription_tier TEXT DEFAULT 'Free' 
        CHECK (subscription_tier IN ('Free', 'Premium-Solo', 'Premium-Sponsored', 'Athlete-Pro', 'Coach-Pro', 'Coach-Pro-Plus')),
    subscription_status TEXT DEFAULT 'active',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    weight NUMERIC,
    height NUMERIC,
    locker_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    legal_consent_at timestamp with time zone,
    guardian_consent_confirmed boolean DEFAULT false,
    medical_disclaimer_accepted_at timestamp with time zone,
    CONSTRAINT coach_must_be_pro CHECK (NOT (role = 'coach' AND subscription_tier = 'Free'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- Teams & Members
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    team_name TEXT NOT NULL,
    sport TEXT NOT NULL,
    purchased_seats INTEGER DEFAULT 15,
    invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    subscription_status TEXT DEFAULT 'active',
    critical_risks TEXT[] DEFAULT '{}'::text[],
    coaching_level TEXT,
    team_type TEXT,
    main_coaching_focus TEXT,
    squad_size_category TEXT,
    training_frequency TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Pending')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, athlete_id)
);

-- Diagnostics (Sport Intelligence Baseline)
CREATE TABLE IF NOT EXISTS public.diagnostics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    profile_data JSONB DEFAULT '{}'::jsonb,
    sport_context JSONB DEFAULT '{}'::jsonb,
    training_reality JSONB DEFAULT '{}'::jsonb,
    daily_living JSONB DEFAULT '{}'::jsonb,
    recovery_baseline JSONB DEFAULT '{}'::jsonb,
    physical_status JSONB DEFAULT '{}'::jsonb,
    physiology_profile JSONB DEFAULT '{
        "endurance_capacity": 2, "strength_capacity": 2, "explosive_power": 2, "agility_control": 2,
        "reaction_self_perception": 2, "recovery_efficiency": 2, "fatigue_resistance": 2,
        "load_tolerance": 2, "movement_robustness": 2, "coordination_control": 2
    }'::jsonb,
    performance_baseline JSONB DEFAULT '{}'::jsonb,
    reaction_profile JSONB DEFAULT '{}'::jsonb,
    primary_goal TEXT,
    primary_limiter TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily Load Logs (Central Performance Audit)
CREATE TABLE IF NOT EXISTS public.daily_load_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Wellness (Integers 1-10 or modern columns)
    sleep INTEGER,
    energy INTEGER,
    soreness INTEGER,
    stress INTEGER,
    
    -- Legacy text support (mapping compatibility)
    sleep_quality TEXT,
    energy_level TEXT,
    muscle_soreness TEXT,
    stress_level TEXT,
    mental_readiness TEXT,
    motivation TEXT,
    life_stress TEXT,
    
    -- Physical Status
    current_pain_level INTEGER CHECK (current_pain_level BETWEEN 0 AND 10),
    pain_location TEXT[] DEFAULT '{}'::text[],
    health_status TEXT,
    urine_color TEXT,
    thirst_level TEXT,
    menstrual_status TEXT,
    
    -- Context
    day_type TEXT,                      -- training, competition, recovery, travel, rest
    session_importance TEXT,            -- normal, high, match, testing
    competition_today BOOLEAN DEFAULT FALSE,
    competition_tomorrow BOOLEAN DEFAULT FALSE,
    competition_yesterday BOOLEAN DEFAULT FALSE,
    is_match_day BOOLEAN DEFAULT FALSE,
    
    -- Numeric Metrics
    session_rpe INTEGER CHECK (session_rpe BETWEEN 0 AND 10),
    duration_minutes INTEGER,
    load_score NUMERIC DEFAULT 0,
    acute_load_7d NUMERIC DEFAULT 0,
    chronic_load_28d NUMERIC DEFAULT 0,
    acwr_ratio NUMERIC DEFAULT 0,
    
    -- Intelligence Audit (V4.2)
    engine_version TEXT DEFAULT 'v4.2',
    trace_logs TEXT[] DEFAULT '{}'::text[],
    stability_waveform TEXT,
    priority_score NUMERIC DEFAULT 0,
    readiness_score INTEGER DEFAULT 0,
    trust_score NUMERIC DEFAULT 1.0,
    intelligence_meta JSONB DEFAULT '{}'::jsonb, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(athlete_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_logs_athlete_date ON public.daily_load_logs (athlete_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_logs_priority ON public.daily_load_logs (priority_score DESC);

-- 4. PATHWAY EXTENSIONS

-- practitioner_profiles removed

CREATE TABLE IF NOT EXISTS public.individual_profiles (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    work_schedule TEXT,
    fitness_level TEXT,
    lifestyle_constraints JSONB DEFAULT '{}'::jsonb,
    current_journey_id TEXT,
    journey_start_date DATE,
    habit_goals JSONB DEFAULT '[]'::jsonb,
    onboarding_version TEXT DEFAULT 'fitstart_v2',
    basic_profile JSONB DEFAULT '{}'::jsonb,
    physiology_profile JSONB DEFAULT '{}'::jsonb,
    lifestyle_profile JSONB DEFAULT '{}'::jsonb,
    goal_profile JSONB DEFAULT '{}'::jsonb,
    sport_profile JSONB DEFAULT '{}'::jsonb,
    current_state JSONB DEFAULT '{}'::jsonb,
    peak_state JSONB DEFAULT '{}'::jsonb,
    gap_analysis JSONB DEFAULT '{}'::jsonb,
    plan_engine JSONB DEFAULT '{}'::jsonb,
    journey_state JSONB DEFAULT '{}'::jsonb,
    latest_guidance JSONB DEFAULT '{}'::jsonb,
    fitstart_completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. INTELLIGENCE & INFRASTRUCTURE

CREATE TABLE IF NOT EXISTS public.computed_intelligence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
    recovery_capacity INTEGER CHECK (recovery_capacity BETWEEN 0 AND 100),
    load_tolerance INTEGER CHECK (load_tolerance BETWEEN 0 AND 100),
    risk_score NUMERIC,
    status TEXT CHECK (status IN ('TRAIN', 'MODIFY', 'REST')),
    reason TEXT,
    action_instruction TEXT,
    alert_priority TEXT CHECK (alert_priority IN ('Critical', 'Warning', 'Informational')),
    intelligence_trace JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.habits_and_streaks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    habit_type TEXT NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_logged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, habit_type)
);

CREATE TABLE IF NOT EXISTS public.individual_guidance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
  daily_guidance JSONB DEFAULT '{}'::jsonb,
  weekly_feedback JSONB DEFAULT '{}'::jsonb,
  peak_projection JSONB DEFAULT '{}'::jsonb,
  adaptation_flags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    trigger_reason TEXT,
    urgency TEXT CHECK (urgency IN ('Low', 'Medium', 'High')),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Booked', 'Completed', 'Ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Platform (Ecosystem)
-- platform_practitioners removed

CREATE TABLE IF NOT EXISTS platform_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    skill_level TEXT NOT NULL,
    registration_link TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. INTELLIGENCE ENGINE (FUNCTIONS & TRIGGERS)

-- A. Hierarchy Logic
CREATE OR REPLACE FUNCTION public.determine_creeda_status(
    p_risk_score NUMERIC,
    p_recovery_capacity INTEGER,
    p_readiness_score INTEGER
) RETURNS TABLE (status TEXT, priority TEXT, action TEXT) AS $$
BEGIN
    IF p_risk_score > 1.5 THEN
        RETURN QUERY SELECT 'REST'::text, 'Critical'::text, 'MANDATORY REST: ACWR exceeds safety threshold. High injury risk.'::text;
    ELSIF p_recovery_capacity < 30 THEN
        RETURN QUERY SELECT 'MODIFY'::text, 'Warning'::text, 'RECOVER: Structural capacity low. Limit to light mobility work.'::text;
    ELSIF p_readiness_score < 40 THEN
        RETURN QUERY SELECT 'MODIFY'::text, 'Warning'::text, 'ADAPT: Low readiness markers. Reduce training volume by 50%.'::text;
    ELSIF p_readiness_score > 85 THEN
        RETURN QUERY SELECT 'TRAIN'::text, 'Informational'::text, 'PEAK: All systems green. Prime day for maximal effort.'::text;
    ELSE
        RETURN QUERY SELECT 'TRAIN'::text, 'Informational'::text, 'READY: Maintain standard training volume.'::text;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- B. Readiness Calculation (Sync Trigger)
CREATE OR REPLACE FUNCTION public.calculate_load_and_readiness()
RETURNS TRIGGER AS $$
DECLARE
    v_sleep_val INTEGER; v_energy_val INTEGER; v_sore_val INTEGER; v_stress_val INTEGER;
BEGIN
    -- 1. Load Calculation
    IF NEW.duration_minutes IS NOT NULL AND NEW.session_rpe IS NOT NULL THEN
        NEW.load_score := NEW.duration_minutes * NEW.session_rpe;
    END IF;

    -- 2. Readiness Normalization
    v_sleep_val := COALESCE(NEW.sleep, public.map_performance_metric(NEW.sleep_quality));
    v_energy_val := COALESCE(NEW.energy, public.map_performance_metric(NEW.energy_level));
    v_sore_val := COALESCE(NEW.soreness, 100 - public.map_performance_metric(NEW.muscle_soreness));
    v_stress_val := COALESCE(NEW.stress, 100 - public.map_performance_metric(NEW.stress_level));

    NEW.readiness_score := (v_sleep_val * 0.3 + v_energy_val * 0.3 + (100 - v_sore_val) * 0.2 + (100 - v_stress_val) * 0.2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calculate_load_and_readiness ON public.daily_load_logs;
CREATE TRIGGER tr_calculate_load_and_readiness
BEFORE INSERT OR UPDATE ON public.daily_load_logs
FOR EACH ROW EXECUTE PROCEDURE public.calculate_load_and_readiness();

-- C. V4.2 Unified Decision Engine (Async Trigger)
CREATE OR REPLACE FUNCTION public.update_v4_intelligence()
RETURNS TRIGGER AS $$
DECLARE
    v_acute_load NUMERIC; v_chronic_load NUMERIC; v_acwr NUMERIC;
    v_recovery_cap INTEGER; v_readiness_norm INTEGER;
    v_status TEXT; v_priority TEXT; v_action TEXT;
    v_diagnostic RECORD; v_is_calibration BOOLEAN;
BEGIN
    SELECT * INTO v_diagnostic FROM public.diagnostics WHERE athlete_id = NEW.athlete_id ORDER BY created_at DESC LIMIT 1;
    
    -- Load Context
    SELECT COALESCE(AVG(load_score), 0) INTO v_acute_load FROM public.daily_load_logs WHERE athlete_id = NEW.athlete_id AND log_date > NEW.log_date - INTERVAL '7 days';
    SELECT COALESCE(AVG(load_score), 0) INTO v_chronic_load FROM public.daily_load_logs WHERE athlete_id = NEW.athlete_id AND log_date > NEW.log_date - INTERVAL '28 days';
    
    v_acwr := v_acute_load / NULLIF(v_chronic_load, 0);
    v_readiness_norm := NEW.readiness_score;
    v_recovery_cap := COALESCE((v_diagnostic.physiology_profile->>'recovery_efficiency')::integer, 50);

    SELECT status, priority, action INTO v_status, v_priority, v_action 
    FROM public.determine_creeda_status(COALESCE(v_acwr, 1.0), v_recovery_cap, v_readiness_norm);

    INSERT INTO public.computed_intelligence (
        user_id, log_date, readiness_score, risk_score, recovery_capacity, status, action_instruction, alert_priority, intelligence_trace
    ) VALUES (
        NEW.athlete_id, NEW.log_date, v_readiness_norm, v_acwr, v_recovery_cap, v_status, v_action, v_priority, 
        jsonb_build_object('acute_load', v_acute_load, 'chronic_load', v_chronic_load, 'version', 'V16-V4.2')
    ) ON CONFLICT (user_id, log_date) DO UPDATE SET
        readiness_score = EXCLUDED.readiness_score, risk_score = EXCLUDED.risk_score, status = EXCLUDED.status, 
        action_instruction = EXCLUDED.action_instruction, alert_priority = EXCLUDED.alert_priority, intelligence_trace = EXCLUDED.intelligence_trace;

    INSERT INTO public.habits_and_streaks (user_id, habit_type, current_streak, last_logged_at)
    VALUES (NEW.athlete_id, 'wellness_log', 1, now())
    ON CONFLICT (user_id, habit_type) DO UPDATE SET
        current_streak = CASE WHEN public.habits_and_streaks.last_logged_at > now() - INTERVAL '36 hours' THEN public.habits_and_streaks.current_streak + 1 ELSE 1 END,
        longest_streak = GREATEST(public.habits_and_streaks.longest_streak, public.habits_and_streaks.current_streak + 1),
        last_logged_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_v4_intelligence_update ON public.daily_load_logs;
CREATE TRIGGER tr_v4_intelligence_update
AFTER INSERT OR UPDATE ON public.daily_load_logs
FOR EACH ROW EXECUTE PROCEDURE public.update_v4_intelligence();

-- D. Auth & Membership
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, avatar_url, subscription_tier)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Athlete'), new.email, COALESCE(new.raw_user_meta_data->>'role', 'athlete'),
    new.raw_user_meta_data->>'avatar_url', CASE WHEN (new.raw_user_meta_data->>'role') = 'coach' THEN 'Coach-Pro' ELSE 'Free' END);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Atomic Join Team
CREATE OR REPLACE FUNCTION public.join_team_with_locker_code(p_locker_code text, p_athlete_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_team_id uuid; v_coach_id uuid; v_purchased_seats integer; v_sponsored_count integer; v_target_tier text := 'Free';
BEGIN
    SELECT id, coach_id, purchased_seats INTO v_team_id, v_coach_id, v_purchased_seats FROM teams WHERE invite_code = p_locker_code FOR UPDATE;
    IF v_team_id IS NULL THEN RETURN jsonb_build_object('error', 'Invalid locker code.'); END IF;
    SELECT count(*) INTO v_sponsored_count FROM profiles WHERE coach_id = v_coach_id AND subscription_tier = 'Premium-Sponsored';
    IF v_sponsored_count < v_purchased_seats THEN v_target_tier := 'Premium-Sponsored'; END IF;
    INSERT INTO team_members (team_id, athlete_id, status) VALUES (v_team_id, p_athlete_id, 'Active') ON CONFLICT (team_id, athlete_id) DO UPDATE SET status = 'Active';
    UPDATE profiles SET coach_id = v_coach_id, subscription_tier = v_target_tier, onboarding_completed = true WHERE id = p_athlete_id;
    RETURN jsonb_build_object('success', true, 'team_id', v_team_id, 'tier_allocated', v_target_tier);
END;
$$;

-- 7. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_load_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computed_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits_and_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_guidance_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper: Is Athlete of Team (Active)
CREATE OR REPLACE FUNCTION public.is_athlete_of_team(target_team_id uuid) 
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = target_team_id AND athlete_id = auth.uid() AND status = 'Active');
$$;

DROP POLICY IF EXISTS "Own profile access" ON profiles;
CREATE POLICY "Own profile access" ON profiles FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "Coach/Athlete Visibility" ON profiles;
CREATE POLICY "Coach/Athlete Visibility" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE (tm.athlete_id = auth.uid() AND t.coach_id = profiles.id) OR (t.coach_id = auth.uid() AND tm.athlete_id = profiles.id)));
DROP POLICY IF EXISTS "Team access" ON teams;
CREATE POLICY "Team access" ON teams FOR SELECT USING (coach_id = auth.uid() OR public.is_athlete_of_team(id));
DROP POLICY IF EXISTS "Coach manage team" ON teams;
CREATE POLICY "Coach manage team" ON teams FOR ALL USING (coach_id = auth.uid());
DROP POLICY IF EXISTS "Membership access" ON team_members;
CREATE POLICY "Membership access" ON team_members FOR SELECT USING (athlete_id = auth.uid() OR EXISTS (SELECT 1 FROM teams WHERE id = team_id AND coach_id = auth.uid()));
DROP POLICY IF EXISTS "Coach manage roster" ON team_members;
CREATE POLICY "Coach manage roster" ON team_members FOR ALL USING (EXISTS (SELECT 1 FROM teams WHERE id = team_id AND coach_id = auth.uid()));
DROP POLICY IF EXISTS "Own diagnostics" ON diagnostics;
CREATE POLICY "Own diagnostics" ON diagnostics FOR ALL USING (auth.uid() = athlete_id);
DROP POLICY IF EXISTS "Own logs" ON daily_load_logs;
CREATE POLICY "Own logs" ON daily_load_logs FOR ALL USING (auth.uid() = athlete_id);
DROP POLICY IF EXISTS "Own intelligence" ON computed_intelligence;
CREATE POLICY "Own intelligence" ON computed_intelligence FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own streaks" ON habits_and_streaks;
CREATE POLICY "Own streaks" ON habits_and_streaks FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own snapshots" ON individual_guidance_snapshots;
CREATE POLICY "Own snapshots" ON individual_guidance_snapshots FOR ALL USING (auth.uid() = user_id);

-- 8. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated;

NOTIFY pgrst, 'reload schema';
