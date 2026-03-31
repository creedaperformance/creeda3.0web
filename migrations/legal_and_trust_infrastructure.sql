-- ==========================================
-- LEGAL & TRUST INFRASTRUCTURE (SIGN-OFF)
-- ==========================================

-- 1. [CONSENT TRACKING]
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS legal_consent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS guardian_consent_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS medical_disclaimer_accepted_at timestamp with time zone;

COMMENT ON COLUMN public.profiles.legal_consent_at IS 'Timestamp of core Terms & Privacy acceptance at signup.';
COMMENT ON COLUMN public.profiles.guardian_consent_confirmed IS 'For minor athletes (age < 18), confirms guardian or coach consent obtained.';
COMMENT ON COLUMN public.profiles.medical_disclaimer_accepted_at IS 'Timestamp of specific medical/advisory disclaimer acceptance during onboarding.';
