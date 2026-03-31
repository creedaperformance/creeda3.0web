-- ==========================================
-- CREEDA MASTER SCHEMA V1.0 (CONSOLIDATED)
-- ==========================================
-- This script provides a fresh, optimized start for the Creeda database.
-- It combines all 25+ previous migrations into one clean setup.

-- 0. PREPARATION: RESET PUBLIC SCHEMA
-- WARNING: This deletes ALL existing data in the public schema.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

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

-- Teams
CREATE TABLE public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    team_name TEXT NOT NULL,
    sport TEXT NOT NULL,
    purchased_seats INTEGER DEFAULT 15,
    invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    subscription_status TEXT DEFAULT 'active',
    coaching_level TEXT,
    team_type TEXT,
    main_coaching_focus TEXT,
    squad_size_category TEXT,
    training_frequency TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Team Members
CREATE TABLE public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'Active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, athlete_id)
);

-- Diagnostics (8-Step Sport Intelligence Baseline)
CREATE TABLE public.diagnostics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    profile_data JSONB DEFAULT '{}'::jsonb,
    sport_context JSONB DEFAULT '{}'::jsonb,
    training_reality JSONB DEFAULT '{}'::jsonb,
    daily_living JSONB DEFAULT '{}'::jsonb,
    recovery_baseline JSONB DEFAULT '{}'::jsonb,
    physical_status JSONB DEFAULT '{}'::jsonb,
    primary_goal TEXT,
    primary_limiter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily Load Logs (Centralized Readiness Loop)
CREATE TABLE public.daily_load_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Recovery & Energy (Using TEXT for performance enums)
    sleep_hours TEXT,
    sleep_quality TEXT,
    energy_level TEXT,
    body_feel TEXT,
    recovery_feel TEXT,
    fatigue TEXT,
    muscle_soreness TEXT,
    stress_level TEXT,
    mental_readiness TEXT,
    
    -- Physical Status
    current_pain_level INTEGER CHECK (current_pain_level BETWEEN 0 AND 10),
    pain_location TEXT[] DEFAULT '{}'::text[],
    health_status TEXT,
    
    -- Game Day & Context
    competition_today BOOLEAN DEFAULT FALSE,
    competition_tomorrow BOOLEAN DEFAULT FALSE,
    competition_yesterday BOOLEAN DEFAULT FALSE,
    travel_day BOOLEAN DEFAULT FALSE,
    menstrual_status TEXT,
    menstrual_pain INTEGER,
    
    -- Load Training (Add legacy numeric fields for math continuity)
    session_rpe INTEGER,
    duration_minutes INTEGER,
    load_score NUMERIC,
    
    -- High Signal Intelligence (V5 Rebuild)
    day_type TEXT,                      -- training, competition, recovery, travel, rest
    session_importance TEXT,            -- normal, high, match, testing
    yesterday_load_demand TEXT,         -- low, moderate, high
    yesterday_duration_category TEXT,   -- <1h, 1-2h, >2h
    focus_level TEXT,                   -- low, moderate, high
    confidence_level TEXT,              -- low, moderate, high
    sport_specific_daily JSONB DEFAULT '{}'::jsonb,
    intelligence_meta JSONB DEFAULT '{}'::jsonb, -- Stores structured judgements & recommendations
    
    -- Training Context
    planned_training TEXT,
    notes TEXT,
    sport_specific_micro TEXT,
    weekly_performance_assessment TEXT, -- Peak Engine: nearA best / average / poor
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(athlete_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_logs_athlete_date ON public.daily_load_logs (athlete_id, log_date DESC);

-- 2.5 REPAIR: Sync profiles for existing auth users (Required after schema reset)
INSERT INTO public.profiles (id, full_name, email, role, subscription_tier)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'Creeda User'), 
    email, 
    COALESCE(raw_user_meta_data->>'role', 'athlete'),
    COALESCE(raw_user_meta_data->>'subscription_tier', 
        CASE WHEN (raw_user_meta_data->>'role') = 'coach' THEN 'Coach-Pro' ELSE 'Free' END
    )
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. FUNCTIONS (Security Definer to avoid RLS circularity)

CREATE OR REPLACE FUNCTION public.is_coach_of_team(target_team_id uuid) 
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM teams WHERE id = target_team_id AND coach_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_athlete_of_team(target_team_id uuid) 
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = target_team_id AND athlete_id = auth.uid());
$$;

-- Find Profile by Locker Code (Bypass RLS for lookups)
CREATE OR REPLACE FUNCTION public.find_profile_by_locker_code(code text)
RETURNS TABLE (id uuid, role text, full_name text) 
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, role, full_name 
  FROM profiles 
  WHERE locker_code = code;
$$;

-- 4. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_load_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Coaches can view team members profiles" ON profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE t.coach_id = auth.uid() AND tm.athlete_id = profiles.id
    )
);

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
    athlete_id IN (
        SELECT tm.athlete_id FROM team_members tm 
        JOIN teams t ON tm.team_id = t.id 
        WHERE t.coach_id = auth.uid()
    )
);

-- Daily Logs Policies
CREATE POLICY "Athletes can manage own logs" ON daily_load_logs FOR ALL USING (auth.uid() = athlete_id);
CREATE POLICY "Coaches can view team logs" ON daily_load_logs FOR SELECT USING (
    athlete_id IN (
        SELECT tm.athlete_id FROM team_members tm 
        JOIN teams t ON tm.team_id = t.id 
        WHERE t.coach_id = auth.uid()
    )
);

-- 4.5 GRANTS (Crucial for fresh schema resets)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated, anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role, authenticated, anon;

-- 5. TRIGGERS

-- Handle New User (Automatic Profile Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_tier TEXT;
  v_coach_id UUID;
  v_coach_tier TEXT;
  v_locker_code TEXT;
  v_team_id UUID;
  v_sponsored_count INTEGER;
  v_seat_limit INTEGER;
BEGIN
  -- 1. Identify role (default to athlete)
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'athlete');
  
  -- 2. Extract tier from metadata
  v_tier := new.raw_user_meta_data->>'subscription_tier';
  
  -- 3. Extract coach locker code if present
  v_locker_code := new.raw_user_meta_data->>'coach_locker_code';

  -- 4. FORCED OVERRIDE: Coaches CANNOT be Free.
  IF v_role = 'coach' AND (v_tier IS NULL OR v_tier = 'Free') THEN
    v_tier := 'Coach-Pro';
  ELSIF v_tier IS NULL THEN
    v_tier := 'Free';
  END IF;

  -- 5. Handle Coach Linking (if invited)
  IF v_locker_code IS NOT NULL AND v_role = 'athlete' THEN
    SELECT id, subscription_tier INTO v_coach_id, v_coach_tier FROM public.profiles WHERE locker_code = v_locker_code LIMIT 1;
    
    IF v_coach_id IS NOT NULL THEN
      SELECT id INTO v_team_id FROM public.teams WHERE coach_id = v_coach_id LIMIT 1;
      
      IF v_team_id IS NOT NULL THEN
        SELECT count(*) INTO v_sponsored_count FROM public.profiles WHERE coach_id = v_coach_id AND subscription_tier = 'Premium-Sponsored';
        
        v_seat_limit := 15;
        IF v_coach_tier = 'Coach-Pro-Plus' THEN v_seat_limit := 35; END IF;
        
        IF v_sponsored_count < v_seat_limit AND (v_tier = 'Free' OR v_tier = 'Premium-Sponsored') THEN
          v_tier := 'Premium-Sponsored';
        END IF;
      ELSE
        v_coach_id := NULL;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, avatar_url, subscription_tier, coach_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    v_role,
    new.raw_user_meta_data->>'avatar_url',
    v_tier,
    v_coach_id
  );

  IF v_coach_id IS NOT NULL AND v_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (team_id, athlete_id, status)
    VALUES (v_team_id, new.id, 'Active')
    ON CONFLICT (team_id, athlete_id) DO UPDATE SET status = 'Active';
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manage Squad Member (Archive/Restore/Remove)
CREATE OR REPLACE FUNCTION public.manage_squad_member(
    p_athlete_id uuid,
    p_team_id uuid,
    p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_id uuid;
    v_coach_tier text;
    v_purchased_seats integer;
    v_sponsored_count integer;
    v_target_tier text := 'Free';
BEGIN
    SELECT coach_id, purchased_seats INTO v_coach_id, v_purchased_seats FROM teams WHERE id = p_team_id;
    IF v_coach_id IS NULL OR v_coach_id != auth.uid() THEN
        RETURN jsonb_build_object('error', 'Unauthorized');
    END IF;

    IF p_action = 'archive' THEN
        UPDATE team_members SET status = 'Archived' WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        UPDATE profiles SET coach_id = NULL, subscription_tier = 'Free' WHERE id = p_athlete_id;
        RETURN jsonb_build_object('success', true);
    ELSIF p_action = 'restore' THEN
        SELECT subscription_tier INTO v_coach_tier FROM profiles WHERE id = v_coach_id;
        SELECT count(*) INTO v_sponsored_count FROM profiles WHERE coach_id = v_coach_id AND subscription_tier = 'Premium-Sponsored';
        IF v_sponsored_count < v_purchased_seats THEN v_target_tier := 'Premium-Sponsored'; END IF;
        UPDATE team_members SET status = 'Active' WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        UPDATE profiles SET coach_id = v_coach_id, subscription_tier = v_target_tier WHERE id = p_athlete_id;
        RETURN jsonb_build_object('success', true);
    ELSIF p_action = 'remove' THEN
        DELETE FROM team_members WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        UPDATE profiles SET coach_id = NULL, subscription_tier = 'Free' WHERE id = p_athlete_id AND coach_id = v_coach_id;
        RETURN jsonb_build_object('success', true);
    ELSE
        RETURN jsonb_build_object('error', 'Invalid action');
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Automatically Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
