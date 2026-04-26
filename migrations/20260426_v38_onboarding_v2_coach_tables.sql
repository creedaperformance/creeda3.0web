-- Onboarding v2 coach and competition model.

CREATE TABLE IF NOT EXISTS public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  level TEXT NOT NULL,
  size_estimate INT,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  position_norms JSONB,
  load_target_au INT,
  alert_threshold_acwr NUMERIC(3,2) NOT NULL DEFAULT 1.5,
  primary_focus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT squads_size_estimate_check CHECK (size_estimate IS NULL OR size_estimate >= 0),
  CONSTRAINT squads_primary_focus_check CHECK (
    primary_focus IS NULL OR primary_focus IN (
      'rehab', 'peak_velocity', 'avoid_burnout', 'in_season_maintenance', 'preseason_build'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.squad_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  share_level TEXT NOT NULL DEFAULT 'full',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (squad_id, athlete_id),
  CONSTRAINT squad_memberships_status_check CHECK (status IN ('active', 'injured', 'paused', 'left')),
  CONSTRAINT squad_memberships_share_level_check CHECK (share_level IN ('full', 'training_only', 'limited'))
);

CREATE TABLE IF NOT EXISTS public.competition_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  priority TEXT NOT NULL,
  sport TEXT NOT NULL,
  taper_protocol_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT competition_events_priority_check CHECK (priority IN ('A', 'B', 'C'))
);

CREATE INDEX IF NOT EXISTS idx_squads_coach ON public.squads(coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_squad_memberships_athlete ON public.squad_memberships(athlete_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_upcoming ON public.competition_events(user_id, event_date);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS squads_coach_owner ON public.squads;
CREATE POLICY squads_coach_owner ON public.squads
  FOR ALL TO authenticated USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS squad_memberships_coach_owner ON public.squad_memberships;
CREATE POLICY squad_memberships_coach_owner ON public.squad_memberships
  FOR ALL TO authenticated USING (
    auth.uid() IN (SELECT coach_id FROM public.squads WHERE id = squad_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT coach_id FROM public.squads WHERE id = squad_id)
  );

DROP POLICY IF EXISTS squad_memberships_athlete_read ON public.squad_memberships;
CREATE POLICY squad_memberships_athlete_read ON public.squad_memberships
  FOR SELECT TO authenticated USING (auth.uid() = athlete_id);

DROP POLICY IF EXISTS competition_events_owner ON public.competition_events;
CREATE POLICY competition_events_owner ON public.competition_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.squads,
  public.squad_memberships,
  public.competition_events
TO authenticated;

GRANT ALL ON
  public.squads,
  public.squad_memberships,
  public.competition_events
TO service_role;
