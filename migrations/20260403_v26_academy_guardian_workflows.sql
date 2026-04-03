-- CREEDA V26: Academy, junior-athlete, and guardian workflow foundations
-- Purpose:
-- 1. Add academy metadata to coach teams
-- 2. Persist guardian and emergency-contact context for junior athletes
-- 3. Support parent handoff and low-cost academy operations

BEGIN;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS academy_name TEXT,
  ADD COLUMN IF NOT EXISTS academy_type TEXT
    CHECK (academy_type IN ('independent', 'school', 'college', 'academy', 'club', 'federation')),
  ADD COLUMN IF NOT EXISTS academy_city TEXT,
  ADD COLUMN IF NOT EXISTS age_band_focus TEXT NOT NULL DEFAULT 'mixed'
    CHECK (age_band_focus IN ('mixed', 'u12', 'u14', 'u16', 'u18', 'senior')),
  ADD COLUMN IF NOT EXISTS parent_handoff_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_cost_mode BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.athlete_guardian_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guardian_name TEXT,
  guardian_relationship TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  consent_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (consent_status IN ('unknown', 'pending', 'confirmed', 'coach_confirmed', 'declined')),
  handoff_preference TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (handoff_preference IN ('whatsapp', 'email', 'coach_led', 'none')),
  notes TEXT,
  last_handoff_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_athlete_guardian_profiles_athlete
  ON public.athlete_guardian_profiles(athlete_id);

ALTER TABLE public.athlete_guardian_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_athlete_guardian_profiles_select ON public.athlete_guardian_profiles;
DROP POLICY IF EXISTS creeda_athlete_guardian_profiles_insert ON public.athlete_guardian_profiles;
DROP POLICY IF EXISTS creeda_athlete_guardian_profiles_update ON public.athlete_guardian_profiles;

CREATE POLICY creeda_athlete_guardian_profiles_select
  ON public.athlete_guardian_profiles
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      athlete_id = (select auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = public.athlete_guardian_profiles.athlete_id
          AND tm.status = 'Active'
          AND t.coach_id = (select auth.uid())
      )
    )
  );

CREATE POLICY creeda_athlete_guardian_profiles_insert
  ON public.athlete_guardian_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND athlete_id = (select auth.uid())
  );

CREATE POLICY creeda_athlete_guardian_profiles_update
  ON public.athlete_guardian_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      athlete_id = (select auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = public.athlete_guardian_profiles.athlete_id
          AND tm.status = 'Active'
          AND t.coach_id = (select auth.uid())
      )
    )
  )
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (
      athlete_id = (select auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = public.athlete_guardian_profiles.athlete_id
          AND tm.status = 'Active'
          AND t.coach_id = (select auth.uid())
      )
    )
  );

GRANT ALL ON public.athlete_guardian_profiles TO postgres, service_role, authenticated;

COMMENT ON COLUMN public.teams.academy_name IS 'Optional academy or organization umbrella name for multi-team coach operations.';
COMMENT ON COLUMN public.teams.parent_handoff_enabled IS 'When enabled, coaches can use guardian handoff workflows for junior athletes on this team.';
COMMENT ON TABLE public.athlete_guardian_profiles IS 'Primary guardian and emergency-contact context for junior athlete and parent handoff workflows.';

COMMIT;

NOTIFY pgrst, 'reload schema';
