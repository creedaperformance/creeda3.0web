-- Coach red-flag alerts log. Records every alert we attempt to push to a
-- coach so we can dedupe, audit, and surface in the coach dashboard.

CREATE TABLE IF NOT EXISTS public.coach_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  reason TEXT NOT NULL,
  trigger TEXT NOT NULL,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coach_alerts_level_check CHECK (level IN ('critical', 'warning', 'info')),
  CONSTRAINT coach_alerts_trigger_check CHECK (
    trigger IN ('daily_ritual', 'readiness_recompute', 'movement_baseline', 'manual')
  )
);

CREATE INDEX IF NOT EXISTS idx_coach_alerts_coach_sent
  ON public.coach_alerts(coach_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_alerts_athlete_sent
  ON public.coach_alerts(athlete_id, sent_at DESC);

ALTER TABLE public.coach_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_alerts_coach_read ON public.coach_alerts;
CREATE POLICY coach_alerts_coach_read ON public.coach_alerts
  FOR SELECT TO authenticated USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS coach_alerts_coach_update ON public.coach_alerts;
CREATE POLICY coach_alerts_coach_update ON public.coach_alerts
  FOR UPDATE TO authenticated USING (auth.uid() = coach_id);

GRANT SELECT, UPDATE ON public.coach_alerts TO authenticated;
GRANT ALL ON public.coach_alerts TO service_role;

COMMENT ON TABLE public.coach_alerts IS 'Per-coach red-flag alerts. Server-inserted via service role. Coaches read their own; never see other coaches alerts.';
