-- Web Push subscriptions for Onboarding v2 daily-ritual + Phase 2 reminders.
-- Endpoints/keys are owner-locked; the cron sender uses the service-role client.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  reminder_kind TEXT NOT NULL DEFAULT 'daily_ritual',
  reminder_local_hour INT NOT NULL DEFAULT 7,
  reminder_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (user_id, endpoint),
  CONSTRAINT push_subscriptions_reminder_kind_check CHECK (
    reminder_kind IN ('daily_ritual', 'phase2_progress')
  ),
  CONSTRAINT push_subscriptions_local_hour_check CHECK (
    reminder_local_hour BETWEEN 0 AND 23
  )
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id, active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active_kind
  ON public.push_subscriptions(reminder_kind, active)
  WHERE active = TRUE;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_owner ON public.push_subscriptions;
CREATE POLICY push_subscriptions_owner ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.push_subscriptions
  TO authenticated;

GRANT ALL ON public.push_subscriptions TO service_role;

-- Tracks every reminder send attempt for auditing + dedup.
CREATE TABLE IF NOT EXISTS public.reminder_dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  reminder_kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reminder_dispatch_log_kind_check CHECK (
    reminder_kind IN ('daily_ritual', 'phase2_progress')
  ),
  CONSTRAINT reminder_dispatch_log_channel_check CHECK (
    channel IN ('web_push', 'email', 'no_op')
  ),
  CONSTRAINT reminder_dispatch_log_status_check CHECK (
    status IN ('sent', 'skipped', 'failed', 'gone')
  )
);

CREATE INDEX IF NOT EXISTS idx_reminder_dispatch_log_user
  ON public.reminder_dispatch_log(user_id, sent_at DESC);

ALTER TABLE public.reminder_dispatch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reminder_dispatch_log_owner_read ON public.reminder_dispatch_log;
CREATE POLICY reminder_dispatch_log_owner_read ON public.reminder_dispatch_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.reminder_dispatch_log TO authenticated;
GRANT ALL ON public.reminder_dispatch_log TO service_role;
