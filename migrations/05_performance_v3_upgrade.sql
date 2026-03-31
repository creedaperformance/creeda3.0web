-- ==========================================
-- CREEDA PERFORMANCE V3: CONSOLIDATED UPGRADE
-- ==========================================
-- Includes all requirements from v2 (Load Breakdown, Factors, Trust Logs)
-- and v3 (Adaptation Engine, CNS Fatigue, Non-linear metrics).

-- 1. EXTEND PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS physiology_weights JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS adaptation_profile JSONB DEFAULT '{
    "fatigue_sensitivity": 0.5,
    "recovery_speed": 0.5,
    "load_tolerance": 0.5,
    "neuromuscular_bias": 0.5,
    "last_updated": null,
    "history_14d": []
}'::jsonb;

-- 2. CREATE LOAD BREAKDOWN TABLE
CREATE TABLE IF NOT EXISTS public.load_breakdown (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    session_id UUID, -- Optional link to a specific session
    total_load NUMERIC NOT NULL,
    neuromuscular_load NUMERIC,
    metabolic_load NUMERIC,
    mechanical_load NUMERIC,
    rpe INTEGER CHECK (rpe BETWEEN 0 AND 10),
    duration INTEGER,
    inferred_flag BOOLEAN DEFAULT FALSE,
    inference_confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.load_breakdown ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes can manage own load breakdown" ON public.load_breakdown FOR ALL USING (auth.uid() = athlete_id);
CREATE POLICY "Coaches can view team load breakdown" ON public.load_breakdown FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE t.coach_id = auth.uid() AND tm.athlete_id = load_breakdown.athlete_id AND tm.status = 'Active'
    )
);

-- 3. CREATE READINESS FACTORS TABLE
CREATE TABLE IF NOT EXISTS public.readiness_factors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sleep_score INTEGER,
    energy_score INTEGER,
    soreness_score INTEGER,
    mental_score INTEGER,
    load_impact INTEGER,
    readiness_score_final INTEGER,
    confidence_score NUMERIC DEFAULT 1.0,
    volatility NUMERIC DEFAULT 0,
    percentile_score NUMERIC DEFAULT 50,
    CNS_fatigue NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(athlete_id, date)
);

ALTER TABLE public.readiness_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes can manage own factors" ON public.readiness_factors FOR ALL USING (auth.uid() = athlete_id);
CREATE POLICY "Coaches can view team factors" ON public.readiness_factors FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE t.coach_id = auth.uid() AND tm.athlete_id = readiness_factors.athlete_id AND tm.status = 'Active'
    )
);

-- 4. CREATE DATA TRUST LOGS TABLE
CREATE TABLE IF NOT EXISTS public.data_trust_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    repetition_flag BOOLEAN DEFAULT FALSE,
    contradiction_flag BOOLEAN DEFAULT FALSE,
    anomaly_flag BOOLEAN DEFAULT FALSE,
    trust_score NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.data_trust_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes can view own trust logs" ON public.data_trust_logs FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Coaches can view team trust logs" ON public.data_trust_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE t.coach_id = auth.uid() AND tm.athlete_id = data_trust_logs.athlete_id AND tm.status = 'Active'
    )
);

-- 5. PERFORMANCE INDEXING
CREATE INDEX IF NOT EXISTS idx_load_breakdown_athlete_date ON public.load_breakdown(athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_factors_athlete_date ON public.readiness_factors(athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_trust_logs_athlete_created ON public.data_trust_logs(athlete_id, created_at DESC);

-- 6. COMMENTS
COMMENT ON TABLE public.load_breakdown IS 'V3: High-fidelity load metrics per session.';
COMMENT ON TABLE public.readiness_factors IS 'V3: Exploded readiness markers for non-linear modeling.';
COMMENT ON TABLE public.data_trust_logs IS 'V3: Integrity layer for performance monitoring.';
