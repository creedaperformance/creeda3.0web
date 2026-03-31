-- CREEDA V6: Cross-platform health data integration
-- Adds optional health connection tracking and normalized daily health metrics.

CREATE TABLE IF NOT EXISTS public.health_connections (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  apple_connected BOOLEAN NOT NULL DEFAULT FALSE,
  android_connected BOOLEAN NOT NULL DEFAULT FALSE,
  connection_preference TEXT NOT NULL DEFAULT 'later' CHECK (connection_preference IN ('connect_now', 'later')),
  permission_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT NOT NULL DEFAULT 'never' CHECK (last_sync_status IN ('never', 'success', 'failed')),
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.health_daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
  sleep_hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  heart_rate_avg NUMERIC(6,2),
  hrv NUMERIC(6,2),
  source TEXT NOT NULL CHECK (source IN ('apple', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, metric_date, source)
);

CREATE INDEX IF NOT EXISTS idx_health_daily_metrics_user_date
  ON public.health_daily_metrics(user_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_health_daily_metrics_source
  ON public.health_daily_metrics(source, metric_date DESC);

ALTER TABLE public.health_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own health connections" ON public.health_connections;
CREATE POLICY "Users can manage own health connections"
  ON public.health_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own health daily metrics" ON public.health_daily_metrics;
CREATE POLICY "Users can manage own health daily metrics"
  ON public.health_daily_metrics
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.health_connections TO postgres, service_role, authenticated;
GRANT ALL ON public.health_daily_metrics TO postgres, service_role, authenticated;

NOTIFY pgrst, 'reload schema';
