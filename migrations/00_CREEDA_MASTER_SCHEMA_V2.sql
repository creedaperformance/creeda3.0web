-- ==========================================
-- CREEDA MASTER SCHEMA V2.0 (CONSOLIDATED)
-- ==========================================
-- This script provides a fresh, optimized start for the Creeda database.
-- It combines all migrations and feature updates (up to Phase 23) into one clean setup.
-- Includes:
-- 1. Phase 22 Biological domains in Diagnostics.
-- 2. Phase 23 Integrity Layer (Trust Score) in Daily Logs.
-- 3. Case-Insensitive Username Management.
-- 4. Database-level intelligence triggers for Load and Readiness.

-- 0. PREPARATION: RESET PUBLIC SCHEMA
-- WARNING: This deletes ALL existing data in the public schema.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FUNCTIONS (Core Shared Logic)

-- Map discrete performance enums to 0-100 scores
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

-- 3. TABLES

-- Profiles (Extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('athlete', 'coach')),
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
    CONSTRAINT coach_must_be_pro CHECK (NOT (role = 'coach' AND subscription_tier = 'Free'))
);

-- Case-Insensitive Username Index
CREATE UNIQUE INDEX idx_profiles_username_lower ON public.profiles (LOWER(username));

-- Teams
CREATE TABLE public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    team_name TEXT NOT NULL,
    sport TEXT NOT NULL,
    purchased_seats INTEGER DEFAULT 15,
    invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    subscription_status TEXT DEFAULT 'active',
    critical_risks TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Team Members
CREATE TABLE public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Pending')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, athlete_id)
);

-- Diagnostics (8-Step Sport Intelligence Baseline + Phase 22 Physiology)
CREATE TABLE public.diagnostics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Structured Intelligence Blocks (JSONB for extensibility)
    profile_data JSONB DEFAULT '{}'::jsonb,
    sport_context JSONB DEFAULT '{}'::jsonb,
    training_reality JSONB DEFAULT '{}'::jsonb,
    daily_living JSONB DEFAULT '{}'::jsonb,
    recovery_baseline JSONB DEFAULT '{}'::jsonb,
    physical_status JSONB DEFAULT '{}'::jsonb,
    
    -- Phase 22: Biological Map (10 Domains)
    physiology_profile JSONB DEFAULT '{
        "endurance_capacity": 2,
        "strength_capacity": 2,
        "explosive_power": 2,
        "agility_control": 2,
        "reaction_self_perception": 2,
        "recovery_efficiency": 2,
        "fatigue_resistance": 2,
        "load_tolerance": 2,
        "movement_robustness": 2,
        "coordination_control": 2
    }'::jsonb,
    
    -- Phase 21: Objective Baseline
    performance_baseline JSONB DEFAULT '{}'::jsonb,
    reaction_profile JSONB DEFAULT '{}'::jsonb,
    
    primary_goal TEXT,
    primary_limiter TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily Load Logs (Phase 23 Readiness Loop)
CREATE TABLE public.daily_load_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Wellness Markers (Performance Enums)
    sleep_hours TEXT,
    sleep_quality TEXT,
    energy_level TEXT,
    body_feel TEXT,
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
    
    -- Context
    day_type TEXT,                      -- training, competition, recovery, travel, rest
    session_importance TEXT,            -- normal, high, match, testing
    yesterday_load_demand TEXT,         -- low, moderate, high
    
    -- Load Metrics (Numeric)
    session_rpe INTEGER CHECK (session_rpe BETWEEN 0 AND 10),
    duration_minutes INTEGER,
    load_score NUMERIC DEFAULT 0,
    
    -- Computed Intelligence (Phase 23)
    readiness_score INTEGER DEFAULT 0,  -- Final adjusted score (0-100)
    trust_score NUMERIC DEFAULT 1.0,    -- Integrity Layer (0.6, 0.8, 1.0)
    intelligence_meta JSONB DEFAULT '{}'::jsonb, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(athlete_id, log_date)
);

CREATE INDEX idx_logs_athlete_date ON public.daily_load_logs (athlete_id, log_date DESC);

-- 4. BUSINESS LOGIC (Triggers & Functions)

-- A. Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, avatar_url, subscription_tier)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Creeda Athlete'), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'athlete'),
    new.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'coach' THEN 'Coach-Pro' 
      ELSE COALESCE(new.raw_user_meta_data->>'subscription_tier', 'Free')
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- B. Ensure Single Active Membership
CREATE OR REPLACE FUNCTION public.ensure_single_active_membership()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Active' THEN
        UPDATE public.team_members
        SET status = 'Archived'
        WHERE athlete_id = NEW.athlete_id
        AND id != NEW.id
        AND status = 'Active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_single_active_membership
BEFORE INSERT OR UPDATE ON public.team_members
FOR EACH ROW EXECUTE PROCEDURE public.ensure_single_active_membership();

-- C. Intelligence Trigger: Calculate Load and Readiness
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
    v_sleep_score := public.map_performance_metric(NEW.sleep_quality);
    v_energy_score := public.map_performance_metric(NEW.energy_level);
    v_sore_score := 100 - public.map_performance_metric(NEW.muscle_soreness); -- Invert because 100 in map = 'None' soreness
    v_stress_score := 100 - public.map_performance_metric(NEW.stress_level); -- Invert because 100 in map = 'None' stress
    v_pain_penalty := COALESCE(NEW.current_pain_level, 0) * 10;

    -- Standard Readiness Formula (Physical-Mental Composite)
    v_raw_readiness := (v_sleep_score * 0.25 + v_energy_score * 0.25 + v_sore_score * 0.25 + (100 - v_stress_score) * 0.15 + (100 - v_pain_penalty) * 0.10);
    
    -- 3. Integrity Layer (Trust Score)
    -- Simplified Repetition Detection
    SELECT count(*) INTO v_consecutive_count
    FROM public.daily_load_logs
    WHERE athlete_id = NEW.athlete_id
      AND sleep_quality = NEW.sleep_quality
      AND energy_level = NEW.energy_level
      AND muscle_soreness = NEW.muscle_soreness
      AND id != NEW.id
    ORDER BY log_date DESC
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


CREATE TRIGGER tr_calculate_load_and_readiness
BEFORE INSERT OR UPDATE ON public.daily_load_logs
FOR EACH ROW EXECUTE PROCEDURE public.calculate_load_and_readiness();

-- 5. ROW LEVEL SECURITY (RLS) policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_load_logs ENABLE ROW LEVEL SECURITY;

-- Helper: Is Coach of Team
CREATE OR REPLACE FUNCTION public.is_coach_of_team(target_team_id uuid) 
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM teams WHERE id = target_team_id AND coach_id = auth.uid());
$$;

-- Helper: Is Athlete of Team (Active)
CREATE OR REPLACE FUNCTION public.is_athlete_of_team(target_team_id uuid) 
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = target_team_id AND athlete_id = auth.uid() AND status = 'Active');
$$;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Coach reciprocal visibility" ON profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.athlete_id = auth.uid() AND t.coach_id = profiles.id AND tm.status = 'Active'
    ) OR EXISTS (
        SELECT 1 FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE t.coach_id = auth.uid() AND tm.athlete_id = profiles.id AND tm.status = 'Active'
    )
);
CREATE POLICY "Users can search other profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Teams Policies
CREATE POLICY "Users can view active teams" ON teams FOR SELECT USING (coach_id = auth.uid() OR public.is_athlete_of_team(id));
CREATE POLICY "Coaches can manage own teams" ON teams FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Public can view team by invite_code" ON teams FOR SELECT USING (true);

-- Team Members Policies
CREATE POLICY "Users can view memberships" ON team_members FOR SELECT USING (athlete_id = auth.uid() OR public.is_coach_of_team(team_id));
CREATE POLICY "Coaches can manage roster" ON team_members FOR ALL USING (public.is_coach_of_team(team_id));
CREATE POLICY "Athletes can join teams" ON team_members FOR INSERT WITH CHECK (athlete_id = auth.uid());

-- Diagnostics Policies
CREATE POLICY "Athletes can manage own diagnostics" ON diagnostics FOR ALL USING (auth.uid() = athlete_id);
CREATE POLICY "Coaches can view athletes diagnostics" ON diagnostics FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE t.coach_id = auth.uid() AND tm.athlete_id = diagnostics.athlete_id AND tm.status = 'Active'
    )
);

-- Daily Logs Policies
CREATE POLICY "Athletes can manage own logs" ON daily_load_logs FOR ALL USING (auth.uid() = athlete_id);
CREATE POLICY "Coaches can view team logs" ON daily_load_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE t.coach_id = auth.uid() AND tm.athlete_id = daily_load_logs.athlete_id AND tm.status = 'Active'
    )
);

-- 6. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated, anon;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
