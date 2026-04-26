-- Onboarding v2 profile foundation.
-- Adds persona routing, calibration confidence, and phase tracking without
-- replacing the existing role/onboarding columns used by current routes.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS persona TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_phase INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_calibration_pct INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dominant_hand TEXT,
  ADD COLUMN IF NOT EXISTS dominant_leg TEXT,
  ADD COLUMN IF NOT EXISTS biological_sex TEXT,
  ADD COLUMN IF NOT EXISTS gender_identity TEXT,
  ADD COLUMN IF NOT EXISTS guardian_consent_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS guardian_email TEXT;

UPDATE public.profiles
SET persona = role
WHERE persona IS NULL
  AND role IN ('athlete', 'individual', 'coach');

UPDATE public.profiles
SET persona = 'individual'
WHERE persona IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN persona SET DEFAULT 'individual',
  ALTER COLUMN persona SET NOT NULL,
  DROP CONSTRAINT IF EXISTS profiles_persona_check,
  ADD CONSTRAINT profiles_persona_check CHECK (persona IN ('athlete', 'individual', 'coach')),
  DROP CONSTRAINT IF EXISTS profiles_onboarding_phase_check,
  ADD CONSTRAINT profiles_onboarding_phase_check CHECK (onboarding_phase BETWEEN 0 AND 3),
  DROP CONSTRAINT IF EXISTS profiles_profile_calibration_pct_check,
  ADD CONSTRAINT profiles_profile_calibration_pct_check CHECK (profile_calibration_pct BETWEEN 0 AND 100),
  DROP CONSTRAINT IF EXISTS profiles_dominant_hand_check,
  ADD CONSTRAINT profiles_dominant_hand_check CHECK (dominant_hand IS NULL OR dominant_hand IN ('left', 'right', 'ambidextrous')),
  DROP CONSTRAINT IF EXISTS profiles_dominant_leg_check,
  ADD CONSTRAINT profiles_dominant_leg_check CHECK (dominant_leg IS NULL OR dominant_leg IN ('left', 'right', 'ambidextrous')),
  DROP CONSTRAINT IF EXISTS profiles_biological_sex_check,
  ADD CONSTRAINT profiles_biological_sex_check CHECK (biological_sex IS NULL OR biological_sex IN ('male', 'female', 'intersex', 'prefer_not_to_say'));

CREATE INDEX IF NOT EXISTS idx_profiles_persona ON public.profiles(persona);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_phase ON public.profiles(onboarding_phase);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_calibration ON public.profiles(profile_calibration_pct);

ALTER TABLE IF EXISTS public.diagnostics
  ADD COLUMN IF NOT EXISTS onboarding_v2_phase INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_calibration_pct INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS readiness_confidence_tier TEXT,
  ADD COLUMN IF NOT EXISTS readiness_confidence_pct INT;

ALTER TABLE IF EXISTS public.diagnostics
  DROP CONSTRAINT IF EXISTS diagnostics_onboarding_v2_phase_check,
  ADD CONSTRAINT diagnostics_onboarding_v2_phase_check CHECK (onboarding_v2_phase BETWEEN 0 AND 3),
  DROP CONSTRAINT IF EXISTS diagnostics_profile_calibration_pct_check,
  ADD CONSTRAINT diagnostics_profile_calibration_pct_check CHECK (profile_calibration_pct BETWEEN 0 AND 100),
  DROP CONSTRAINT IF EXISTS diagnostics_readiness_confidence_tier_check,
  ADD CONSTRAINT diagnostics_readiness_confidence_tier_check CHECK (
    readiness_confidence_tier IS NULL OR readiness_confidence_tier IN ('low', 'medium', 'high', 'locked')
  ),
  DROP CONSTRAINT IF EXISTS diagnostics_readiness_confidence_pct_check,
  ADD CONSTRAINT diagnostics_readiness_confidence_pct_check CHECK (
    readiness_confidence_pct IS NULL OR readiness_confidence_pct BETWEEN 0 AND 100
  );

ALTER TABLE IF EXISTS public.adaptive_form_profiles
  ADD COLUMN IF NOT EXISTS onboarding_v2_phase INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_seconds INT,
  ADD COLUMN IF NOT EXISTS confidence_pct INT;

ALTER TABLE IF EXISTS public.adaptive_form_profiles
  DROP CONSTRAINT IF EXISTS adaptive_form_profiles_onboarding_v2_phase_check,
  ADD CONSTRAINT adaptive_form_profiles_onboarding_v2_phase_check CHECK (onboarding_v2_phase BETWEEN 0 AND 3),
  DROP CONSTRAINT IF EXISTS adaptive_form_profiles_completion_seconds_check,
  ADD CONSTRAINT adaptive_form_profiles_completion_seconds_check CHECK (
    completion_seconds IS NULL OR completion_seconds BETWEEN 0 AND 900
  ),
  DROP CONSTRAINT IF EXISTS adaptive_form_profiles_confidence_pct_check,
  ADD CONSTRAINT adaptive_form_profiles_confidence_pct_check CHECK (
    confidence_pct IS NULL OR confidence_pct BETWEEN 0 AND 100
  );

COMMENT ON COLUMN public.profiles.persona IS 'Onboarding v2 persona router. Kept separate from role so future settings changes do not break access control.';
COMMENT ON COLUMN public.profiles.profile_calibration_pct IS 'Visible profile calibration meter percentage for confidence-tiered scoring.';
