-- ==========================================
-- CREEDA PERFORMANCE V3: ELITE ENGINE UPGRADE (REFINED)
-- ==========================================
-- This migration upgrades the data model to support athlete-specific
-- adaptation modeling, non-linear risk trajectories, and CNS fatigue tracking.
-- NOTE: Adaptation logic is handled in the Backend (Node/TS), not in SQL triggers.

-- 1. EXTEND PROFILES WITH ADAPTATION SCHEMA
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS adaptation_profile JSONB DEFAULT '{
    "fatigue_sensitivity": 0.5,
    "recovery_speed": 0.5,
    "load_tolerance": 0.5,
    "neuromuscular_bias": 0.5,
    "last_updated": null,
    "rolling_14d_scores": []
}'::jsonb;

-- 2. EXTEND READINESS FACTORS FOR V3 METRICS
ALTER TABLE public.readiness_factors
ADD COLUMN IF NOT EXISTS volatility NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentile_score NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS CNS_fatigue NUMERIC DEFAULT 0;

-- 3. EXTEND LOAD BREAKDOWN FOR INFERENCE TRACKING
ALTER TABLE public.load_breakdown
ADD COLUMN IF NOT EXISTS inferred_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inference_confidence FLOAT DEFAULT 1.0;

-- 4. PERFORMANCE INDEXING FOR V3
CREATE INDEX IF NOT EXISTS idx_readiness_factors_volatility ON public.readiness_factors(volatility) WHERE volatility > 15;
CREATE INDEX IF NOT EXISTS idx_load_breakdown_inferred ON public.load_breakdown(inferred_flag) WHERE inferred_flag = TRUE;

COMMENT ON COLUMN public.profiles.adaptation_profile IS 'V3: Athlete-specific physiological response markers. Managed by backend.';
COMMENT ON COLUMN public.readiness_factors.CNS_fatigue IS 'V3: Proxy for central nervous system fatigue based on RT and volatility.';
COMMENT ON COLUMN public.load_breakdown.inference_confidence IS 'V3: AI confidence level for inferred load types (0.0 - 1.0).';
