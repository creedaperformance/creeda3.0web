-- AI Sports Scientist chat + medical report analysis + lifestyle deep onboarding.
-- All owner-locked via RLS. Idempotent.

-- ── 1. AI conversations + messages ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  topic TEXT NOT NULL DEFAULT 'general',
  context_snapshot JSONB,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_conversations_topic_check CHECK (topic IN (
    'general', 'training', 'nutrition', 'recovery', 'injury',
    'sleep', 'mental', 'sport_specific', 'medical_report', 'wearable'
  ))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
  ON public.ai_conversations(user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens_input INT,
  tokens_output INT,
  model TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_messages_role_check CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON public.ai_messages(conversation_id, created_at);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_conversations_owner ON public.ai_conversations;
CREATE POLICY ai_conversations_owner ON public.ai_conversations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_messages_owner ON public.ai_messages;
CREATE POLICY ai_messages_owner ON public.ai_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.ai_conversations, public.ai_messages
  TO authenticated;
GRANT ALL ON public.ai_conversations, public.ai_messages TO service_role;

-- ── 2. Medical reports (PDF upload + AI summary) ─────────────────────
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'general',
  source TEXT NOT NULL DEFAULT 'upload',
  file_name TEXT,
  file_size_bytes INT,
  mime_type TEXT,
  raw_text TEXT,
  ai_summary TEXT,
  ai_layman_explanation TEXT,
  ai_red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_model TEXT,
  ai_confidence TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analysed_at TIMESTAMPTZ,
  CONSTRAINT medical_reports_report_type_check CHECK (report_type IN (
    'blood_panel', 'imaging_xray', 'imaging_mri', 'imaging_ct', 'imaging_ultrasound',
    'cardiology_ecg', 'cardiology_echo', 'physio_assessment', 'orthopedist_note',
    'allergy_panel', 'general'
  )),
  CONSTRAINT medical_reports_source_check CHECK (source IN ('upload', 'ai_generated', 'shared'))
);

CREATE INDEX IF NOT EXISTS idx_medical_reports_user_uploaded
  ON public.medical_reports(user_id, uploaded_at DESC);

ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medical_reports_owner ON public.medical_reports;
CREATE POLICY medical_reports_owner ON public.medical_reports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_reports TO authenticated;
GRANT ALL ON public.medical_reports TO service_role;

-- ── 3. Lifestyle deep-profile (individual persona — daily routine) ───
CREATE TABLE IF NOT EXISTS public.lifestyle_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profession TEXT,
  work_pattern TEXT,
  weekly_work_hours INT,
  desk_hours_per_day INT,
  primary_stressors TEXT[],
  typical_wake_time_local TEXT,
  typical_sleep_time_local TEXT,
  typical_meals_per_day INT,
  meal_timing_pattern TEXT,
  alcohol_drinks_per_week INT,
  smoking_status TEXT,
  caffeine_drinks_per_day INT,
  hydration_intent_litres NUMERIC(3,1),
  primary_motivator TEXT,
  fitness_history TEXT,
  exercise_environment TEXT,
  available_days_per_week INT,
  available_minutes_per_session INT,
  has_gym_access BOOLEAN NOT NULL DEFAULT FALSE,
  has_home_equipment BOOLEAN NOT NULL DEFAULT FALSE,
  outdoor_safety_concerns BOOLEAN NOT NULL DEFAULT FALSE,
  caregiver_role BOOLEAN NOT NULL DEFAULT FALSE,
  social_support TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_lifestyle_per_user UNIQUE (user_id),
  CONSTRAINT lifestyle_work_pattern_check CHECK (
    work_pattern IS NULL OR work_pattern IN (
      'desk_office', 'desk_remote', 'mixed', 'on_feet', 'physical_labour',
      'shift_work', 'travel_heavy', 'student', 'unemployed', 'retired', 'other'
    )
  ),
  CONSTRAINT lifestyle_smoking_status_check CHECK (
    smoking_status IS NULL OR smoking_status IN ('never', 'former', 'occasional', 'daily')
  ),
  CONSTRAINT lifestyle_meal_timing_check CHECK (
    meal_timing_pattern IS NULL OR meal_timing_pattern IN (
      'regular', 'irregular', 'intermittent_fasting', 'shift_work_grazing'
    )
  ),
  CONSTRAINT lifestyle_exercise_environment_check CHECK (
    exercise_environment IS NULL OR exercise_environment IN (
      'gym', 'home', 'outdoor', 'mixed'
    )
  ),
  CONSTRAINT lifestyle_primary_motivator_check CHECK (
    primary_motivator IS NULL OR primary_motivator IN (
      'energy', 'mood', 'longevity', 'aesthetics', 'sport_performance',
      'rehab', 'social', 'discipline', 'medical_advice'
    )
  )
);

ALTER TABLE public.lifestyle_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lifestyle_profile_owner ON public.lifestyle_profile;
CREATE POLICY lifestyle_profile_owner ON public.lifestyle_profile
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifestyle_profile TO authenticated;
GRANT ALL ON public.lifestyle_profile TO service_role;

-- ── 4. Wearable connections (real OAuth + manual import fallback) ────
CREATE TABLE IF NOT EXISTS public.wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scopes TEXT[],
  /** Encrypted refresh token blob (Supabase pgsodium recommended in prod). */
  refresh_token_ciphertext TEXT,
  access_token_ciphertext TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wearable_provider_check CHECK (provider IN (
    'apple_health', 'health_connect', 'garmin', 'whoop', 'strava', 'fitbit',
    'oura', 'polar', 'manual'
  )),
  CONSTRAINT wearable_status_check CHECK (status IN ('pending', 'connected', 'expired', 'revoked', 'error')),
  CONSTRAINT one_provider_per_user UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_wearable_connections_user_status
  ON public.wearable_connections(user_id, status);

ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wearable_connections_owner ON public.wearable_connections;
CREATE POLICY wearable_connections_owner ON public.wearable_connections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wearable_connections TO authenticated;
GRANT ALL ON public.wearable_connections TO service_role;

COMMENT ON TABLE public.ai_conversations IS 'AI Sports Scientist chat sessions. One per topic / user-initiated conversation.';
COMMENT ON TABLE public.medical_reports IS 'User-uploaded medical PDFs with extracted text + AI plain-language summary.';
COMMENT ON TABLE public.lifestyle_profile IS 'Individual persona deep profile — profession, work, daily routine, motivators.';
COMMENT ON TABLE public.wearable_connections IS 'OAuth + manual wearable connections, scoped per provider.';
