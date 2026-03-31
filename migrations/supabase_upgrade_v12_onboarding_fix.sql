-- Migration: Onboarding & Compliance Sync (v12)
-- Ensures profiles table has necessary columns for guardian consent and medical disclaimer.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS guardian_consent_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_disclaimer_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS legal_consent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.profiles.guardian_consent_confirmed IS 'Confirms consent obtained for minors (< 18).';
COMMENT ON COLUMN public.profiles.medical_disclaimer_accepted_at IS 'Timestamp of medical disclaimer acceptance during onboarding.';
COMMENT ON COLUMN public.profiles.legal_consent_at IS 'Timestamp of core terms acceptance.';
