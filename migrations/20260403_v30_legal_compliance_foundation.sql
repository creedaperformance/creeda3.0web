-- CREEDA V30: Legal compliance foundation (DPDP + GDPR aligned)
-- Adds:
-- 1. Profile-level legal consent snapshot fields
-- 2. Consent event ledger (versioned, auditable)
-- 3. Data rights request queue for access/deletion/withdrawal workflows

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS medical_disclaimer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS guardian_consent_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_policy_version TEXT,
  ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_policy_version TEXT,
  ADD COLUMN IF NOT EXISTS ai_acknowledgement_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_processing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.legal_policy_version IS 'Latest accepted terms policy version for this user.';
COMMENT ON COLUMN public.profiles.privacy_policy_version IS 'Latest accepted privacy policy version for this user.';
COMMENT ON COLUMN public.profiles.consent_policy_version IS 'Latest accepted consent acknowledgement version for this user.';
COMMENT ON COLUMN public.profiles.ai_acknowledgement_at IS 'Timestamp user acknowledged AI decision-support limitations.';
COMMENT ON COLUMN public.profiles.data_processing_consent_at IS 'Timestamp user granted explicit data processing consent.';
COMMENT ON COLUMN public.profiles.marketing_consent IS 'Optional marketing communications preference.';
COMMENT ON COLUMN public.profiles.marketing_consent_at IS 'Timestamp of latest marketing communications opt-in.';
COMMENT ON COLUMN public.profiles.consent_updated_at IS 'Timestamp of latest consent bundle update.';

CREATE TABLE IF NOT EXISTS public.user_legal_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'unknown'
    CHECK (role IN ('athlete', 'coach', 'individual', 'unknown')),
  consent_key TEXT NOT NULL
    CHECK (consent_key IN (
      'terms_of_service',
      'privacy_policy',
      'medical_disclaimer',
      'data_processing',
      'ai_decision_support',
      'guardian_consent',
      'marketing_communications'
    )),
  accepted BOOLEAN NOT NULL DEFAULT true,
  policy_version TEXT NOT NULL,
  policy_document_path TEXT NOT NULL,
  lawful_basis TEXT NOT NULL DEFAULT 'consent'
    CHECK (lawful_basis IN ('consent', 'contract', 'legitimate_interest', 'legal_obligation')),
  jurisdiction TEXT NOT NULL DEFAULT 'global'
    CHECK (jurisdiction IN ('india_dpdp', 'gdpr', 'global', 'other')),
  source TEXT NOT NULL DEFAULT 'app'
    CHECK (source IN ('signup', 'onboarding', 'settings', 'api', 'admin', 'app')),
  request_ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_legal_consents_user_time
  ON public.user_legal_consents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_legal_consents_user_key
  ON public.user_legal_consents(user_id, consent_key, created_at DESC);

ALTER TABLE public.user_legal_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_user_legal_consents_select ON public.user_legal_consents;
DROP POLICY IF EXISTS creeda_user_legal_consents_insert ON public.user_legal_consents;

CREATE POLICY creeda_user_legal_consents_select
  ON public.user_legal_consents
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_user_legal_consents_insert
  ON public.user_legal_consents
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

GRANT ALL ON public.user_legal_consents TO postgres, service_role, authenticated;

CREATE TABLE IF NOT EXISTS public.data_rights_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'unknown'
    CHECK (role IN ('athlete', 'coach', 'individual', 'unknown')),
  request_type TEXT NOT NULL
    CHECK (request_type IN (
      'access',
      'correction',
      'deletion',
      'portability',
      'restrict_processing',
      'object_processing',
      'withdraw_consent',
      'nominate_representative',
      'grievance'
    )),
  jurisdiction TEXT NOT NULL DEFAULT 'india_dpdp'
    CHECK (jurisdiction IN ('india_dpdp', 'gdpr', 'global', 'other')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_review', 'fulfilled', 'rejected', 'cancelled')),
  contact_email TEXT,
  details TEXT,
  requested_via TEXT NOT NULL DEFAULT 'in_app'
    CHECK (requested_via IN ('in_app', 'email', 'support', 'api', 'admin')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_data_rights_requests_user_time
  ON public.data_rights_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_rights_requests_status
  ON public.data_rights_requests(status, created_at DESC);

ALTER TABLE public.data_rights_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_data_rights_requests_select ON public.data_rights_requests;
DROP POLICY IF EXISTS creeda_data_rights_requests_insert ON public.data_rights_requests;
DROP POLICY IF EXISTS creeda_data_rights_requests_update ON public.data_rights_requests;
DROP POLICY IF EXISTS creeda_data_rights_requests_delete ON public.data_rights_requests;

CREATE POLICY creeda_data_rights_requests_select
  ON public.data_rights_requests
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_data_rights_requests_insert
  ON public.data_rights_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_data_rights_requests_update
  ON public.data_rights_requests
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND status IN ('new', 'cancelled')
  )
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND status IN ('new', 'cancelled')
  );

CREATE POLICY creeda_data_rights_requests_delete
  ON public.data_rights_requests
  FOR DELETE
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND status = 'new'
  );

GRANT ALL ON public.data_rights_requests TO postgres, service_role, authenticated;

UPDATE public.profiles
SET
  legal_policy_version = COALESCE(legal_policy_version, '2026.04.03'),
  privacy_policy_version = COALESCE(privacy_policy_version, '2026.04.03'),
  consent_policy_version = COALESCE(consent_policy_version, '2026.04.03'),
  consent_updated_at = COALESCE(consent_updated_at, legal_consent_at, timezone('utc'::text, now()))
WHERE
  legal_consent_at IS NOT NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
