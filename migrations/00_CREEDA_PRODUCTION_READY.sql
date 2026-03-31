-- 1. CORE PATHWAY TABLES (ATHLETE, COACH, INDIVIDUAL)
-- Extends the profiles table and initializes the V4 Intelligence Architecture.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extend Profiles with production flags
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fitstart_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('athlete', 'coach', 'individual'));

-- 1. MARKETPLACE TABLES (EVENTS)

CREATE TABLE IF NOT EXISTS public.platform_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    skill_level TEXT NOT NULL,
    registration_link TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- 3. INTELLIGENCE & DECISIONS (TIME-SERIES)
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

-- 4. REFERRAL MARKETPLACE
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Target (Athlete/Individual)
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Replaced practitioner_id with coach_id for clarity if needed, or just remove it.
    -- Since we are removing practitioner, and coach is the other guiding role, let's keep it but rename or remove. 
    -- The user said COMPLETELY REMOVE. So I'll remove it.
    trigger_reason TEXT,
    urgency TEXT CHECK (urgency IN ('Low', 'Medium', 'High')),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Booked', 'Completed', 'Ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 6. PERMISSIONS & SCHEMA RELOAD
GRANT ALL ON public.platform_events TO postgres, service_role, authenticated;
GRANT ALL ON public.individual_profiles TO postgres, service_role, authenticated;
GRANT ALL ON public.computed_intelligence TO postgres, service_role, authenticated;
GRANT ALL ON public.referrals TO postgres, service_role, authenticated;
GRANT ALL ON public.habits_and_streaks TO postgres, service_role, authenticated;

-- 7. CLEAN SLATE (PURGE ALL FAKE/SEED DATA)
TRUNCATE TABLE public.platform_events CASCADE;
TRUNCATE TABLE public.daily_load_logs CASCADE;
TRUNCATE TABLE public.computed_intelligence CASCADE;
TRUNCATE TABLE public.referrals CASCADE;
TRUNCATE TABLE public.diagnostics CASCADE;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
