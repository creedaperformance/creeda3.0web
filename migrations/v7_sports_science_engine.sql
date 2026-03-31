-- Migration: CREEDA Digital Sports Scientist Transformation (Core Intelligence Engine)
-- Establishes the foundation for dynamic workout, rehab, and nutrition generation

BEGIN;

-- ==============================================================================
-- 1. EXERCISE & EQUIPMENT ONTOLOGY (The S&C Brain)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    movement_pattern TEXT NOT NULL,          -- e.g., 'SQUAT', 'HINGE'
    body_part TEXT,                          -- e.g., 'LOWER_BODY', 'POSTERIOR_CHAIN'
    sport_tags TEXT[] DEFAULT '{}',          
    contraindications TEXT[] DEFAULT '{}',   
    progression_level INT NOT NULL DEFAULT 1, 
    metabolic_score INT DEFAULT 50,          -- 0-100 energy demand
    neuromuscular_score INT DEFAULT 50,      -- 0-100 CNS demand
    difficulty_level INT DEFAULT 1,          -- 1-5
    equipment_required TEXT[] DEFAULT '{}', 
    video_url TEXT,
    base_load_metric TEXT DEFAULT 'rpe',     
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.exercise_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    variant_type TEXT NOT NULL,              -- e.g., 'home', 'gym', 'low-impact'
    name TEXT NOT NULL,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.equipment_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    available_equipment TEXT[] DEFAULT '{}', -- e.g., ['dumbbells', 'bands', 'barbell', 'kettlebell']
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    session_duration_minutes INT DEFAULT 45,
    preferred_training_style TEXT,           -- e.g., 'hypertrophy', 'endurance', 'power'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. REHAB INTELLIGENCE (The Physio Brain)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rehab_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    injury_type TEXT NOT NULL,               -- e.g., 'hamstring', 'acl'
    stage INT NOT NULL CHECK (stage >= 1 AND stage <= 5),
    exercises JSONB NOT NULL DEFAULT '[]',   -- Array of { exercise_id, sets, reps, tempo }
    progression_rules JSONB NOT NULL DEFAULT '{"pain_threshold": 3}'
);

-- Note: rehab_history already exists somewhat in V5, but we ensure it matches the new spec
CREATE TABLE IF NOT EXISTS public.rehab_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    injury_type TEXT NOT NULL,
    stage INT NOT NULL,
    pain_score INT NOT NULL CHECK (pain_score >= 0 AND pain_score <= 10),
    response TEXT,                           -- 'progressed', 'regressed', 'held'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. NUTRITION & METABOLISM (The Dietician Brain)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'OTHER',           -- 'PROTEIN', 'CARB', 'FAT', etc
    protein_per_100g NUMERIC(5,2) DEFAULT 0,
    carbs_per_100g NUMERIC(5,2) DEFAULT 0,
    fat_per_100g NUMERIC(5,2) DEFAULT 0,
    cals_per_100g NUMERIC(5,2) DEFAULT 0,
    micronutrient_dense BOOLEAN DEFAULT true,
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_jain BOOLEAN DEFAULT false,
    allergens TEXT[] DEFAULT '{}'            
);

CREATE TABLE IF NOT EXISTS public.food_substitutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id UUID REFERENCES public.foods(id) ON DELETE CASCADE,
    substitute_food_id UUID REFERENCES public.foods(id) ON DELETE CASCADE,
    condition TEXT NOT NULL                  -- e.g., 'veg', 'jain', 'allergy', 'dislike'
);

CREATE TABLE IF NOT EXISTS public.meal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_type TEXT NOT NULL,                 -- 'breakfast', 'lunch', 'dinner', 'snack'
    food_ids UUID[] DEFAULT '{}',
    primary_goal TEXT,                       -- 'fat_loss', 'muscle_gain', 'sport_performance'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_dietary_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    diet_type TEXT DEFAULT 'omnivore',       -- 'omnivore', 'veg', 'vegan', 'jain'
    allowed_meats TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    dislikes TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.adaptation_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    fatigue_sensitivity NUMERIC(3,2) DEFAULT 0.5,
    recovery_speed NUMERIC(3,2) DEFAULT 0.5,
    load_tolerance NUMERIC(3,2) DEFAULT 0.5,
    neuromuscular_bias NUMERIC(3,2) DEFAULT 0.5,
    learning_rate NUMERIC(4,3) DEFAULT 0.05,
    -- EWMA Layers
    ewma_readiness_avg NUMERIC(5,2) DEFAULT 70.0,
    ewma_fatigue_avg NUMERIC(5,2) DEFAULT 30.0,
    strength_progression_rate NUMERIC(5,2) DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.performance_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    estimated_1rm JSONB DEFAULT '{}',          -- { exercise_id: weight }
    strength_level TEXT DEFAULT 'BEGINNER',    -- BEGINNER, INTERMEDIATE, ELITE
    mobility_score INT DEFAULT 70,
    is_calibrated BOOLEAN DEFAULT false,
    session_count INT DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. CONTEXT WEIGHTING SYSTEM (The Architectural Profiler)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sport_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport TEXT UNIQUE NOT NULL,
    movement_demands JSONB DEFAULT '{}',     -- Relative weighting of planes of motion
    injury_risks TEXT[] DEFAULT '{}',        -- Common injury zones
    energy_system JSONB DEFAULT '{"aerobic": 0, "anaerobic_lactic": 0, "anaerobic_alactic": 0}'
);

CREATE TABLE IF NOT EXISTS public.position_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport TEXT REFERENCES public.sport_profiles(sport) ON DELETE CASCADE,
    position TEXT NOT NULL,
    position_demands JSONB DEFAULT '{}',
    training_bias TEXT,                      -- e.g., 'power', 'endurance'
    injury_bias TEXT[] DEFAULT '{}',
    UNIQUE(sport, position)
);

CREATE TABLE IF NOT EXISTS public.goal_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_name TEXT UNIQUE NOT NULL,             
    target_caloric_modifier NUMERIC(3,2) DEFAULT 1.0,
    protein_ratio NUMERIC(3,2) DEFAULT 0.3,
    carb_ratio NUMERIC(3,2) DEFAULT 0.4,
    fat_ratio NUMERIC(3,2) DEFAULT 0.3,
    sessions_per_week_recommended INT DEFAULT 3,
    training_bias JSONB DEFAULT '{}',        
    nutrition_bias JSONB DEFAULT '{}',       
    recovery_bias TEXT                       
);

-- ==============================================================================
-- 5. INTELLIGENCE & DIAGNOSTICS (The Data Vault)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_data JSONB DEFAULT '{}',
    sport_context JSONB DEFAULT '{}',
    training_reality JSONB DEFAULT '{}',
    daily_living JSONB DEFAULT '{}',
    recovery_baseline JSONB DEFAULT '{}',
    physical_status JSONB DEFAULT '{}',
    physiology_profile JSONB DEFAULT '{}',
    reaction_profile JSONB DEFAULT '{}',
    primary_goal TEXT,
    performance_baseline JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.computed_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    readiness_score INT,
    recovery_capacity INT,
    load_tolerance INT,
    risk_score INT,
    status TEXT,
    reason TEXT,
    action_instruction TEXT,
    alert_priority TEXT,
    intelligence_trace JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.adaptation_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    fatigue_sensitivity NUMERIC(3,2) DEFAULT 0.5,
    recovery_speed NUMERIC(3,2) DEFAULT 0.5,
    load_tolerance NUMERIC(3,2) DEFAULT 0.5,
    neuromuscular_bias NUMERIC(3,2) DEFAULT 0.5,
    learning_rate NUMERIC(4,3) DEFAULT 0.05,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.adaptation_profiles_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metrics_snapshot JSONB NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMIT;
